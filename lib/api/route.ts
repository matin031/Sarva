import type { NextRequest } from "next/server";
import {
  REQUEST_ID_HEADER,
  logger,
  markReported,
  newRequestId,
  normalizeRequestId,
  runWithRequestContext,
  wasReported,
} from "@/lib/observability";

/**
 * پوششِ Route Handler ها.
 *
 * چهار کار می‌کند و هر چهارتا را دقیقاً یک بار:
 *
 *   ۱) شناسهٔ درخواست را از هدرِ نوشتهٔ proxy.ts می‌گیرد (و اگر نبود یا معتبر
 *      نبود، خودش می‌سازد) و زمینهٔ AsyncLocalStorage را باز می‌کند. از این
 *      لحظه هر لاگی در هر عمقی — دیتابیس، ایمیل، آپلود — همان شناسه را دارد.
 *
 *   ۲) همان شناسه را روی پاسخ می‌گذارد، تا کاربری که خطا دیده بتواند بگوید
 *      «کد پیگیری من این است» و شما همان یک عدد را در لاگ بگردید.
 *
 *   ۳) یک خط لاگ در پایان درخواست: مسیر، متد، وضعیت، مدت.
 *
 *   ۴) تورِ ایمنی: اگر خطایی از دستِ try/catch خودِ route فرار کرد، اینجا
 *      گرفته می‌شود و همان قرارداد پاسخ (`{ ok:false, errors:[…] }`) با کد
 *      ۵۰۰ برمی‌گردد — نه صفحهٔ خطای خامِ Next.
 *
 * آنچه **نمی‌کند**: بدنهٔ درخواست یا پاسخ را نمی‌خواند و لاگ نمی‌کند. یک بار
 * خواندنِ بدنه یعنی خرابیِ خودِ route (استریم فقط یک بار خوانده می‌شود)، و
 * ذخیره‌اش یعنی ریختنِ رمز و متن کاربر در لاگ.
 *
 * ⚠️ عمداً "server-only" ندارد و به @/lib/db وصل نیست: باید در `node --test`
 * مستقیم قابل صدا زدن باشد. ثبت در جدول خطا با import پویا انجام می‌شود.
 */

type RouteHandler<C> = (request: NextRequest, context: C) => Response | Promise<Response>;

const NO_STORE = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
} as const;

/** نسبتِ پاسخ‌های موفقی که لاگ می‌شوند. ۱ یعنی همه. */
function successSampleRate(): number {
  const raw = Number(process.env.HTTP_LOG_SAMPLE ?? 1);
  if (!Number.isFinite(raw)) return 1;
  return Math.min(Math.max(raw, 0), 1);
}

/** آستانهٔ «این درخواست کند بود» — یک درخواستِ کند همیشه لاگ می‌شود، حتی اگر
 *  نمونه‌گیری آن را رد کرده باشد. */
function slowRequestMs(): number {
  const raw = Number(process.env.HTTP_SLOW_REQUEST_MS ?? 1500);
  return Number.isFinite(raw) && raw > 0 ? raw : 1500;
}

type Outcome = "success" | "client_error" | "rate_limited" | "server_error";

function outcomeOf(status: number): Outcome {
  if (status >= 500) return "server_error";
  if (status === 429) return "rate_limited";
  if (status >= 400) return "client_error";
  return "success";
}

/**
 * سطح لاگ از روی وضعیت.
 *
 * قاعدهٔ مهم: خطای اعتبارسنجی و ۴۰۱/۴۰۳ **خطا نیستند**. رمز اشتباه، فرم ناقص
 * و «وارد نشده‌اید» رفتار عادیِ روزمرهٔ یک سایت‌اند؛ اگر error حساب شوند،
 * فهرست خطاها آن‌قدر شلوغ می‌شود که خطای واقعی در آن گم می‌شود.
 */
function levelOf(outcome: Outcome): "info" | "warn" | "error" {
  if (outcome === "server_error") return "error";
  if (outcome === "rate_limited") return "warn";
  return "info";
}

const EVENT: Record<Outcome, string> = {
  success: "http.request.completed",
  client_error: "http.request.rejected",
  rate_limited: "http.request.rate_limited",
  server_error: "http.request.failed",
};

/** هدر را روی پاسخ می‌نشاند. پاسخِ redirect هدرِ قفل‌شده دارد و set رویش
 *  throw می‌کند — آنجا پاسخ بازساخته می‌شود. */
function withRequestId(response: Response, requestId: string): Response {
  try {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  } catch {
    try {
      const headers = new Headers(response.headers);
      headers.set(REQUEST_ID_HEADER, requestId);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  }
}

/** پاسخِ ۵۰۰ با همان قراردادِ همیشگی. متن فنی هرگز به کاربر نمی‌رسد. */
function serverErrorResponse(requestId: string): Response {
  return Response.json(
    {
      ok: false,
      errors: ["خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید."],
    },
    { status: 500, headers: { ...NO_STORE, [REQUEST_ID_HEADER]: requestId } },
  );
}

/**
 * آیا این خطا «مورد انتظار» است؟
 *
 * AuthError (و هر خطای دیگری که `status` زیر ۵۰۰ روی خودش دارد) یعنی «کاربر
 * اجازه ندارد» یا «ورودی غلط بود» — نه خرابی سرور. این‌ها نباید در جدول خطا
 * ثبت شوند وگرنه هر بار که کسی لاگین‌نشده جایی سر می‌زند یک ردیف ساخته
 * می‌شود.
 *
 * تشخیص از روی شکل و نه با `instanceof AuthError`، تا این فایل به lib/auth
 * وصل نشود و در تست بدون Next قابل بارگذاری بماند.
 */
function expectedStatus(error: unknown): number | null {
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number" && status >= 400 && status < 500) return status;
  }
  return null;
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return message && message.length <= 300 ? message : "درخواست انجام نشد.";
}

/**
 * ثبت در جدول خطا — با import پویا، دقیقاً به همان دلیلِ handleError:
 * این ماژول نباید وابستگیِ دیتابیس را وارد باندلِ هر route کند.
 *
 * `wasReported` جلوی ردیف تکراری را می‌گیرد: اگر خودِ route با handleError
 * خطا را ثبت کرده باشد، اینجا دوباره ثبت نمی‌شود.
 */
function reportOnce(error: unknown, context: string, requestId: string): void {
  if (wasReported(error)) return;
  markReported(error);

  void import("@/lib/admin/audit")
    .then((m) => m.recordError("api", error, context, { requestId }))
    .catch(() => {
      /* دیتابیس خراب است یا ماژول بار نشد؛ خطِ لاگِ بالا همچنان هست. */
    });
}

/**
 * @param route قالبِ مسیر، مثل `/api/v1/auth/login`. دستی داده می‌شود و نه از
 *   روی URL خوانده می‌شود، چون URL می‌تواند شناسه و پارامترِ حساس داشته باشد.
 */
export function withRoute<C = unknown>(route: string, handler: RouteHandler<C>): RouteHandler<C> {
  return async (request: NextRequest, context: C): Promise<Response> => {
    const requestId =
      normalizeRequestId(request.headers.get(REQUEST_ID_HEADER)) ?? newRequestId();
    const method = (request.method || "GET").toUpperCase();
    const startedAt = performance.now();

    return runWithRequestContext({ requestId, route, method }, async () => {
      let response: Response;
      let threw: unknown = null;

      try {
        response = await handler(request, context);
      } catch (error) {
        threw = error;

        const status = expectedStatus(error);
        if (status !== null) {
          // خطای مورد انتظار: پاسخِ خودش، بدون ثبت در جدول خطا.
          response = Response.json(
            { ok: false, errors: [safeMessage(error)] },
            { status, headers: { ...NO_STORE } },
          );
        } else {
          reportOnce(error, `${method} ${route}`, requestId);
          response = serverErrorResponse(requestId);
        }
      }

      const durationMs = Math.round(performance.now() - startedAt);
      const status = response.status;
      const outcome = outcomeOf(status);
      const level = levelOf(outcome);

      const sampledOut =
        level === "info" && outcome === "success" && durationMs < slowRequestMs()
          ? Math.random() >= successSampleRate()
          : false;

      if (!sampledOut) {
        logger[level]("درخواست پردازش شد", {
          event: EVENT[outcome],
          route,
          method,
          status_code: status,
          duration_ms: durationMs,
          outcome,
          ...(threw && outcome === "server_error" ? { err: threw } : {}),
        });
      }

      return withRequestId(response, requestId);
    });
  };
}
