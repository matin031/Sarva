/** سیاستِ «کلیدِ کپچا نیست، چه کنم؟» — جدا از lib/auth/turnstile.ts چون آن
 *  فایل `server-only` را import می‌کند و بیرون از باندل Next بار نمی‌شود. */

export type MissingKeyPolicy = "allow" | "deny";

/**
 * ⚠️ تا دیروز نبودِ `TURNSTILE_SECRET_KEY` در *هر* محیطی یعنی «همه چیز را
 * قبول کن» — از جمله production. یک متغیرِ محیطیِ جاافتاده (یا پاک‌شده در یک
 * deploy) کپچا را بی‌صدا خاموش می‌کرد: نه خطایی، نه تفاوتی در رفتار. بدترین
 * شکلِ fail-open، چون *غیبتِ* محافظ شبیه سلامت به نظر می‌رسد.
 *
 * حالا خاموشی باید اعلام شود: در production فقط `TURNSTILE_OPTIONAL=true`
 * — دقیقاً همین رشته — کپچا را اختیاری می‌کند.
 */
export function missingKeyPolicy(
  env: { NODE_ENV?: string; TURNSTILE_OPTIONAL?: string } = process.env,
): MissingKeyPolicy {
  if (env.NODE_ENV !== "production") return "allow";
  return env.TURNSTILE_OPTIONAL === "true" ? "allow" : "deny";
}
