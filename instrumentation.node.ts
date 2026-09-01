import type { Instrumentation } from "next";
import {
  REQUEST_ID_HEADER,
  logger,
  normalizeRequestId,
  runWithRequestContext,
  sanitizeRoutePath,
  sanitizeUrl,
  serializeError,
} from "@/lib/observability";

/**
 * بخشِ Node-only رصدپذیری.
 *
 * فقط از `instrumentation.ts` و فقط وقتی `NEXT_RUNTIME === "nodejs"` بار
 * می‌شود. اینجا آزادانه می‌شود به دیتابیس و `node:*` دست زد.
 */

// ---------------------------------------------------------------------------
// شروع و پایان
// ---------------------------------------------------------------------------

logger.info("سرور سروا بالا آمد", {
  event: "app.started",
  node_version: process.version,
  pid: process.pid,
  log_level: process.env.LOG_LEVEL ?? "(پیش‌فرض)",
});

/**
 * لاگِ خاموش شدن.
 *
 * ⚠️ نکتهٔ ظریفی که اگر رعایت نشود کانتینر را ده ثانیه معطل می‌کند: در Node،
 * ثبتِ یک شنوندهٔ SIGTERM رفتار پیش‌فرض (یعنی «بمیر») را لغو می‌کند. اگر
 * کسی جز ما هم شنونده نداشته باشد، پروسه با `docker compose stop` نمی‌میرد و
 * منتظر SIGKILL می‌ماند.
 *
 * اینجا امن است چون خودِ Next در `start-server` هر دو سیگنال را می‌گیرد و در
 * پایانِ کارش `process.exit` می‌زند. پس شنوندهٔ ما فقط یک خط لاگ اضافه
 * می‌کند و مسیر خروج را دست نمی‌زند. `once` هم هست تا در ری‌استارت‌های پیاپیِ
 * حالت توسعه انباشته نشود.
 */
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    logger.info("سرور در حال خاموش شدن است", { event: "app.stopping", signal });
  });
}

// خطای واقعاً مدیریت‌نشده. Next خودش این‌ها را نمی‌گیرد و بدون این خط، تنها
// چیزی که می‌ماند یک stack خام در stdout است بدون هیچ زمینه‌ای.
process.on("unhandledRejection", (reason) => {
  logger.error("Promise رد شده و گرفته‌نشده", { event: "app.unhandled_rejection", err: reason });
});

// ---------------------------------------------------------------------------
// گزارش خطاهای گرفته‌نشدهٔ Next
// ---------------------------------------------------------------------------

/**
 * خطاهایی که خطا نیستند.
 *
 * `redirect()` و `notFound()` در Next با throw کار می‌کنند و digest شان با
 * این پیشوندها شروع می‌شود. ثبتشان یعنی پر شدنِ فهرست خطا با چیزی که رفتار
 * عادیِ اپ است.
 *
 * AuthError هم همین‌طور: «وارد نشده‌اید» یک خطای مورد انتظار است.
 */
const CONTROL_FLOW_DIGESTS = [
  "NEXT_REDIRECT",
  "NEXT_NOT_FOUND",
  "NEXT_HTTP_ERROR_FALLBACK",
  "DYNAMIC_SERVER_USAGE",
  "BAILOUT_TO_CLIENT_SIDE_RENDERING",
];

function isExpected(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest === "string" && CONTROL_FLOW_DIGESTS.some((d) => digest.startsWith(d))) {
    return true;
  }

  // AuthError و هر خطای دیگری که خودش وضعیت ۴xx اعلام می‌کند: اجازه ندارد،
  // ورودی غلط، سقف نرخ. این‌ها خرابی سرور نیستند.
  if (error.name === "AuthError") return true;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && status >= 400 && status < 500) return true;

  // خطای اعتبارسنجی zod — کاربر ورودی بد داده، سرور سالم است.
  if (error.name === "ZodError") return true;

  return false;
}

/** `routeType` را به یکی از منبع‌های موجودِ app_error_log نگاشت می‌کند. */
function sourceFor(routeType: string | undefined): "api" | "action" | "other" {
  if (routeType === "route") return "api";
  if (routeType === "action") return "action";
  return "other";
}

type RequestInfo = Parameters<NonNullable<Instrumentation.onRequestError>>[1];
type ErrorContext = Parameters<NonNullable<Instrumentation.onRequestError>>[2];

export async function reportRequestError(
  error: unknown,
  request: RequestInfo,
  context: ErrorContext,
): Promise<void> {
  if (isExpected(error)) return;

  // شناسه از هدری که proxy.ts نوشته. اینجا زمینهٔ AsyncLocalStorage در دست
  // نیست — onRequestError یک فراخوانِ جداست — پس هدر تنها راه است.
  const header = request.headers?.[REQUEST_ID_HEADER];
  const requestId =
    normalizeRequestId(Array.isArray(header) ? header[0] : header) ?? null;

  const method = (request.method ?? "GET").toUpperCase();

  // routePath قالبِ مسیر است (`/panel/[id]`) و امن‌ترین چیزی است که داریم.
  // اگر نبود، مسیر واقعی پاک‌سازی می‌شود: پارامترهای حساس حذف و شناسه‌ها
  // یکسان‌سازی می‌شوند.
  const route =
    context.routePath || sanitizeRoutePath(sanitizeUrl(request.path ?? "").split("?")[0]);

  const serialized = serializeError(error);

  const metadata = {
    route,
    method,
    router_kind: context.routerKind,
    route_type: context.routeType,
    render_source: context.renderSource,
    revalidate_reason: context.revalidateReason,
    // ⚠️ عمداً فقط مسیرِ پاک‌سازی‌شده. هدرها (کوکی، Authorization) و بدنه
    // هرگز.
    path: sanitizeUrl(request.path ?? ""),
    digest: serialized.digest,
  };

  const run = async () => {
    try {
      const { recordError } = await import("@/lib/admin/audit");
      await recordError(
        sourceFor(context.routeType),
        error,
        `${context.routeType ?? "render"} ${route}`,
        { requestId, metadata },
      );
    } catch (err) {
      // دیتابیس در دسترس نیست. خطِ لاگ پایین آخرین چیزی است که می‌ماند —
      // و عمداً *به دیتابیس برنمی‌گردیم* تا حلقه نسازیم.
      logger.error("ثبت خطای Next ناموفق بود", {
        event: "app.error.record_failed",
        err,
        request_id: requestId ?? undefined,
        route,
      });
      logger.error(serialized.message, {
        event: "app.error.recorded",
        err: error,
        error_source: sourceFor(context.routeType),
        request_id: requestId ?? undefined,
        ...metadata,
      });
    }
  };

  // زمینه باز می‌شود تا لاگ‌های داخلِ recordError هم همان شناسه را داشته
  // باشند.
  if (requestId) {
    await runWithRequestContext({ requestId, route, method }, run);
  } else {
    await run();
  }
}
