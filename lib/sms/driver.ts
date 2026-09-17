/**
 * نامِ سرویسِ پیامک → یک مقدارِ متعارف.
 *
 * ⚠️ چرا اصلاً نرمال‌سازی لازم است: مقدارِ درایور در `app_settings` می‌نشیند و
 * ردیف‌های قدیمی همان‌جا می‌مانند. تا پیش از این، گزینهٔ SMS.ir در پنل با
 * مقدارِ `sms_ir` ذخیره می‌شد؛ اگر کد فقط `smsir` را می‌شناخت، سایتی که از
 * قبل روی SMS.ir تنظیم شده بود بی‌صدا به حالتِ غیرفعال برمی‌گشت — یعنی هیچ
 * کدی ارسال نمی‌شد و هیچ خطایی هم دیده نمی‌شد.
 *
 * ⚠️ بدونِ import و بدونِ `server-only`: هم `lib/sms` و هم اسکریپتِ عیب‌یابی و
 * هم تست‌ها از همین یک تعریف استفاده می‌کنند.
 */

/** درایورهایی که واقعاً وجود دارند. سومی‌ای در کار نیست. */
export type SmsDriver = "mock" | "smsir";

/** نام‌هایی که به «غیرفعال» ترجمه می‌شوند. خالی بودنِ تنظیم هم همین است. */
const MOCK_ALIASES = new Set(["", "mock", "off", "none", "disabled"]);

/** شکل‌های مختلفی که SMS.ir ممکن است با آن‌ها ذخیره شده باشد. */
const SMSIR_ALIASES = new Set(["smsir", "sms_ir", "sms-ir", "sms.ir", "smsir_ir"]);

/**
 * مقدارِ ذخیره‌شده → درایور، یا `null` اگر اصلاً شناخته‌شده نباشد.
 *
 * ⚠️ `null` با `"mock"` یکی نیست: اولی یعنی «مقداری ثبت شده که سروا
 * نمی‌شناسد» و باید در لاگ و در کارتِ وضعیتِ پنل دیده شود؛ دومی یعنی مدیر
 * عمداً پیامک را خاموش گذاشته.
 */
export function normalizeSmsDriver(raw: string | null | undefined): SmsDriver | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (MOCK_ALIASES.has(value)) return "mock";
  if (SMSIR_ALIASES.has(value)) return "smsir";
  return null;
}
