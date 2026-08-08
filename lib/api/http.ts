import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { AuthError } from "@/lib/auth/types";
import type { CookieSpec } from "@/lib/auth/cookies";

/**
 * شکل پاسخ همهٔ endpoint ها.
 *
 * عمداً همان `ActionResult<T>` است که کد موجود در سرتاسر پروژه استفاده می‌کند
 * ({ ok: true, data } | { ok: false, errors: string[] })، تا کامپوننت‌هایی که
 * قرار است در فاز ۶ و ۷ به این API وصل شوند شکل تازه‌ای یاد نگیرند.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

export function ok<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status });
}

export function fail(errors: string | string[], status = 400): NextResponse<ApiResult<never>> {
  return NextResponse.json<ApiResult<never>>(
    { ok: false, errors: Array.isArray(errors) ? errors : [errors] },
    { status },
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
 * پشت Caddy، آدرس سوکت همیشه خودِ کانتینر پروکسی است؛ آدرس واقعی در
 * X-Forwarded-For می‌آید که Caddy ست می‌کند. اولین عضو زنجیره نزدیک‌ترین چیز
 * به کلاینت است.
 *
 * چون این هدر را در معماری فعلی *فقط* پروکسیِ خودمان می‌نویسد، قابل اعتماد
 * است. اگر روزی کسی مستقیم به پورت ۳۰۰۰ برسد می‌تواند جعلش کند — به همین دلیل
 * در docker-compose پورت اپ منتشر نشده و فقط `expose` است.
 */
export function requestMeta(request: Request): { userAgent: string | null; ip: string | null } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return {
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    ip: ip && ip.length <= 45 ? ip : null,
  };
}

/**
 * خطاهای پیش‌بینی‌نشده را به پاسخ تبدیل می‌کند.
 *
 * AuthError پیام و کدِ خودش را دارد و مستقیم نمایش داده می‌شود. هر چیز دیگری
 * یک پیام عمومی می‌گیرد و متن اصلی فقط به لاگ می‌رود: پیام خام پستگرس نام
 * جدول و ستون را لو می‌دهد و چیزی نیست که کاربر باید ببیند.
 */
export function handleError(err: unknown): NextResponse<ApiResult<never>> {
  if (err instanceof AuthError) return fail(err.message, err.status);

  console.error("[api] خطای مدیریت‌نشده:", err);
  return fail("خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.", 500);
}
