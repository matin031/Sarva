/**
 * ساختِ ردیفِ `app_error_log` — جدا از نوشتنش.
 *
 * چرا جدا: نوشتن به دیتابیس نیاز دارد و ساختن نه. با این تفکیک می‌شود در یک
 * تست ساده ثابت کرد که «هیچ رمز، توکن، ایمیل یا پارامتر SQL وارد ردیف
 * نمی‌شود» و «اثرانگشت پایدار است» — بدون بالا آوردن پستگرس.
 *
 * lib/admin/audit.ts این را صدا می‌زند و فقط `execute` را روی نتیجه‌اش انجام
 * می‌دهد.
 */

import { createHash } from "node:crypto";
import { redactRecord } from "./redact";
import { serializeError } from "./serialize";

/** منبع خطا — همان مقادیری که ستون `source` می‌پذیرد. */
export type ErrorSource = "api" | "action" | "mail" | "sms" | "db" | "upload" | "other";

export type ErrorRecord = {
  source: ErrorSource;
  message: string;
  context: string | null;
  /** stack، پاک‌سازی‌شده. */
  detail: string | null;
  fingerprint: string;
  errorName: string;
  errorCode: string | null;
  digest: string | null;
  environment: string;
  release: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
};

/**
 * «همان خطا»؟
 *
 * اعداد از پیام حذف می‌شوند تا «کاربر 42 پیدا نشد» و «کاربر 91 پیدا نشد» یک
 * ردیف باشند — وگرنه یک خطای تکرارشونده جدول را پر می‌کند و خودش تبدیل به
 * مشکل بعدی می‌شود. uuid ها هم به همین دلیل یکسان‌سازی می‌شوند.
 *
 * نسبت به نسخهٔ قبلی دو ورودی اضافه شده — نام کلاس خطا و کد ماشینی‌اش — چون
 * یکسان‌سازیِ اعداد گاهی *زیادی* ادغام می‌کرد: یک `TypeError` و یک خطای
 * پستگرس که تصادفاً پیام مشابهی داشتند یک ردیف می‌شدند و شمارنده‌شان چیزی
 * نمی‌گفت.
 *
 * ⚠️ stack عمداً در اثرانگشت نیست: در build ای که کد را باندل و minify
 * می‌کند، شمارهٔ خط و نام فایل با هر deploy عوض می‌شوند. اثرانگشتی که به
 * stack بسته باشد، بعد از هر انتشار همهٔ خطاهای قدیمی را «تازه» نشان می‌دهد.
 */
export function errorFingerprint(
  source: string,
  name: string,
  code: string | null,
  message: string,
  context: string | null,
): string {
  const normalized = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "«شناسه»")
    .replace(/\d+/g, "«عدد»")
    .slice(0, 500);

  return createHash("sha256")
    .update(`${source}|${name}|${code ?? ""}|${context ?? ""}|${normalized}`)
    .digest("hex")
    .slice(0, 32);
}

export function buildErrorRecord(
  source: ErrorSource,
  error: unknown,
  context: string | null,
  extra: { requestId?: string | null; metadata?: Record<string, unknown> } = {},
): ErrorRecord {
  const serialized = serializeError(error);
  const ctx = context?.slice(0, 300) ?? null;
  const message = (serialized.message || "خطای بدون پیام").slice(0, 1000);

  return {
    source,
    message,
    context: ctx,
    detail: serialized.stack ?? null,
    fingerprint: errorFingerprint(source, serialized.name, serialized.code ?? null, message, ctx),
    errorName: serialized.name.slice(0, 120),
    errorCode: serialized.code?.slice(0, 60) ?? null,
    digest: serialized.digest?.slice(0, 120) ?? null,
    environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    release: process.env.APP_RELEASE?.slice(0, 64) || null,
    requestId: extra.requestId ?? null,
    // نمایهٔ عملیاتی و نه ممیزی: این ستون برای زمینهٔ فنی است، نه برای
    // نگه داشتنِ هویت کاربر.
    metadata: redactRecord(extra.metadata, { profile: "operational" }),
  };
}
