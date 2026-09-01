import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { AuthError } from "@/lib/auth/types";
import type { CookieSpec } from "@/lib/auth/cookies";
import {
  REQUEST_ID_HEADER,
  currentRequestContext,
  currentRequestId,
  logger,
} from "@/lib/observability";

/**
 * شکل پاسخ همهٔ endpoint ها.
 *
 * عمداً همان `ActionResult<T>` است که کد موجود در سرتاسر پروژه استفاده می‌کند
 * ({ ok: true, data } | { ok: false, errors: string[] })، تا کامپوننت‌هایی که
 * قرار است در فاز ۶ و ۷ به این API وصل شوند شکل تازه‌ای یاد نگیرند.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

/**
 * هر پاسخ این API به کوکی سشن وابسته است، پس هیچ‌کدام نباید کش شوند.
 *
 * `dynamic = "force-dynamic"` فقط به Next می‌گوید صفحه را از پیش نساز؛ به
 * مرورگر و به هر پروکسیِ میانی چیزی نمی‌گوید. بدون این هدر، دکمهٔ back مرورگر
 * یا یک کش اشتراکی می‌تواند پاسخِ کاربر قبلی را به کاربر بعدیِ همان دستگاه
 * بدهد — چیزی که lib/api/client.ts با `cache: "no-store"` فقط برای
 * درخواست‌های خودش حل کرده بود، نه برای ناوبری معمولی.
 */
const NO_STORE = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
} as const;

export function ok<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status, headers: NO_STORE });
}

export function fail(errors: string | string[], status = 400): NextResponse<ApiResult<never>> {
  return NextResponse.json<ApiResult<never>>(
    { ok: false, errors: Array.isArray(errors) ? errors : [errors] },
    { status, headers: NO_STORE },
  );
}

/** کوکی‌ها را روی یک پاسخ می‌نشاند و خودش را برمی‌گرداند. */
export function withCookies<T>(response: NextResponse<T>, cookies: CookieSpec[]): NextResponse<T> {
  for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
  return response;
}

/**
 * بدنهٔ JSON را می‌خواند و اعتبارسنجی می‌کند.
 *
 * خروجی یک اتحادِ تفکیک‌شده است و نه throw، چون هر فراخوان می‌خواهد خطای
 * اعتبارسنجی را به شکل خودش برگرداند.
 */
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse<ApiResult<never>> }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: fail("بدنهٔ درخواست JSON معتبر نیست.", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // پیام‌های زاد مستقیم برگردانده می‌شوند چون خودمان در هر شِما پیام فارسی
    // نوشته‌ایم؛ اگر روزی شِمایی بدون پیام ماند، متن انگلیسیِ زاد دیده می‌شود
    // که زشت است ولی نشتِ اطلاعات نیست.
    return {
      ok: false,
      response: fail(parsed.error.issues.map((i) => i.message), 400),
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * IP و User-Agent درخواست.
 *
 * ⚠️ اینجا قبلاً یک اشتباه امنیتی جدی بود و توضیحش می‌ارزد، چون همان اشتباه
 * در اکثر پروژه‌ها تکرار می‌شود.
 *
 * کد قبلی **اولین** عضو زنجیرهٔ X-Forwarded-For را برمی‌داشت، با این استدلال
 * که «این هدر را فقط پروکسی خودمان می‌نویسد، پس قابل اعتماد است». آن استدلال
 * غلط بود: Caddy — مثل هر reverse proxy استانداردی — مقدارِ ورودی را حذف
 * نمی‌کند، بلکه IP کلاینت را به **انتهایش** اضافه می‌کند.
 *
 * یعنی مهاجمی که این را می‌فرستد:
 *
 *     X-Forwarded-For: 1.2.3.4
 *
 * هدری به اپ می‌رساند که مقدارش «1.2.3.4, <IP واقعی>» است — و کد قبلی
 * `1.2.3.4` را برمی‌داشت. با عوض کردن این یک رشته در هر درخواست، *همهٔ*
 * محدودیت‌های مبتنی بر IP دور زده می‌شدند: login-ip، register، forgot-ip،
 * reset-ip و OTP_MAX_PER_IP.
 *
 * راه حل: **آخرین** عضو زنجیره خوانده می‌شود، نه اولی. آن یکی را همیشه
 * نزدیک‌ترین پروکسی به ما (یعنی خودمان) نوشته و مهاجم نمی‌تواند بعد از آن
 * چیزی اضافه کند — هر چه او تزریق کند جلوتر در زنجیره می‌افتد و نادیده گرفته
 * می‌شود. این کار درست می‌ماند چه Caddy مقدار قبلی را نگه دارد و چه (طبق
 * تنظیم فعلیِ Caddyfile) بازنویسی‌اش کند.
 *
 * TRUSTED_PROXY_HOPS برای وقتی است که روزی پروکسی دیگری هم جلوی Caddy بنشیند
 * (مثلاً Cloudflare یا یک load balancer): با مقدار ۲، عضوِ یکی‌مانده‌به‌آخر
 * خوانده می‌شود. پیش‌فرض ۱ است که با معماری فعلی می‌خواند.
 *
 * X-Real-IP عمداً دیگر خوانده نمی‌شود: Caddy آن را اصلاً ست نمی‌کند، پس هر
 * مقداری که در آن بیاید مستقیماً از خودِ کلاینت آمده و کاملاً جعلی است.
 */
function trustedHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

/** فقط چیزی که واقعاً شبیه IP است. یک رشتهٔ دلخواه در این هدر نباید به کلید
 *  محدودیت نرخ (یا به ستون inet در دیتابیس) برسد. */
function normalizeIp(value: string | undefined): string | null {
  const ip = value?.trim();
  if (!ip || ip.length > 45) return null;

  // IPv4 با بازهٔ درست هر بخش، یا هر چیزی که شکل IPv6 دارد (hex و دونقطه).
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (ipv4) {
    return ipv4.slice(1).every((part) => Number(part) <= 255) ? ip : null;
  }
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":")) return ip;

  return null;
}

export function requestMeta(request: Request): { userAgent: string | null; ip: string | null } {
  const chain = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // از انتها شمرده می‌شود: hop=1 یعنی آخرین عضو.
  const candidate = chain[chain.length - trustedHops()];

  return {
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    ip: normalizeIp(candidate),
  };
}

/**
 * آیا این درخواست از سایت دیگری آمده؟
 *
 * لایهٔ دومِ محافظت در برابر CSRF. لایهٔ اول `SameSite=lax` روی کوکی‌هاست که
 * کار خودش را می‌کند — ولی تک‌لایه است: اگر روزی کسی برای یک اپ موبایل آن را
 * به `none` تغییر بدهد، در کاملاً باز می‌شود بدون اینکه چیزی هشدار بدهد.
 *
 * دو سیگنال بررسی می‌شود و هر دو را خودِ مرورگر می‌نویسد (کد صفحه نمی‌تواند
 * جعلشان کند):
 *
 *   • Sec-Fetch-Site — مرورگرهای امروزی روی هر درخواست می‌فرستندش.
 *   • Origin — روی هر POST/PATCH/DELETE فرستاده می‌شود.
 *
 * نبودنِ هر دو، درخواست را رد نمی‌کند: یک کلاینت غیرمرورگری (curl، اسکریپت
 * تست) هیچ‌کدام را نمی‌فرستد و کوکی هم ندارد، پس چیزی برای سوءاستفاده نیست.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    // same-origin = خودِ سایت، none = تایپ مستقیم در نوار آدرس.
    // same-site و cross-site هر دو یعنی از جای دیگری آمده.
    return secFetchSite !== "same-origin" && secFetchSite !== "none";
  }

  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // Origin بدشکل — از یک مرورگر سالم نمی‌آید.
    return true;
  }

  const allowed = new Set<string>();
  const host = request.headers.get("host");
  if (host) allowed.add(host);

  // آدرس پیکربندی‌شدهٔ سایت هم پذیرفته می‌شود، برای حالتی که پروکسی هدر Host
  // را عوض کند.
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      allowed.add(new URL(configured).host);
    } catch {
      /* آدرس بدشکل در .env نباید درخواست‌های سالم را بشکند */
    }
  }

  return !allowed.has(originHost);
}

/** پاسخ آماده برای درخواست بین‌سایتی. */
export function crossSiteRejection(): NextResponse<ApiResult<never>> {
  return fail("این درخواست از مبدأ نامعتبری آمده است.", 403);
}

/**
 * خطاهای پیش‌بینی‌نشده را به پاسخ تبدیل می‌کند.
 *
 * AuthError پیام و کدِ خودش را دارد و مستقیم نمایش داده می‌شود. هر چیز دیگری
 * یک پیام عمومی می‌گیرد و متن اصلی فقط به لاگ می‌رود: پیام خام پستگرس نام
 * جدول و ستون را لو می‌دهد و چیزی نیست که کاربر باید ببیند.
 */
export function handleError(err: unknown, context?: string): NextResponse<ApiResult<never>> {
  // AuthError یک خطای *مورد انتظار* است («وارد نشده‌اید»)، نه نشانهٔ خرابی.
  // ثبتش در لاگ خطا فقط آن را با هزاران ردیف بی‌معنی پر می‌کرد.
  if (err instanceof AuthError) return fail(err.message, err.status);

  const requestId = currentRequestId();

  // ثبت — هم یک خط JSON در stdout و هم یک ردیف در app_error_log، با یک
  // شناسهٔ مشترک. هر دو کار داخل recordError انجام می‌شود تا یک نقطهٔ واحد
  // برای «گزارش خطا» باشد و ثبت تکراری ممکن نشود (خودش با wasReported
  // جلوی ردیف دوم را می‌گیرد، اگر wrapper یا onRequestError زودتر رسیده
  // باشند).
  //
  // import پویاست تا این ماژول (که proxy.ts هم از آن استفاده می‌کند) وابستگیِ
  // دیتابیس را وارد باندل خودش نکند، و بی‌انتظار است تا ثبت لاگ پاسخ کاربر را
  // معطل نکند.
  void import("@/lib/admin/audit")
    .then((m) =>
      m.recordError("api", err, context, {
        requestId,
        metadata: { route: currentRequestContext()?.route, method: currentRequestContext()?.method },
      }),
    )
    .catch(() => {
      // ماژول ثبت بار نشد — دستِ‌کم خطا در stdout بماند، وگرنه کاملاً گم
      // می‌شود.
      logger.error("خطای مدیریت‌نشدهٔ API", {
        event: "app.error.recorded",
        err,
        error_source: "api",
        error_context: context,
        request_id: requestId ?? undefined,
      });
    });

  // شناسه در پاسخ می‌آید تا کاربری که خطا دیده بتواند بگوید «کد پیگیری من این
  // است» — و شما همان یک عدد را در لاگ و در /admin/activity بگردید.
  const response = fail("خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.", 500);
  if (requestId) response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
