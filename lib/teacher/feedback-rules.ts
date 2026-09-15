/**
 * قاعده‌های بازخورد — منطقِ خالص، مشترکِ سرور و کلاینت.
 *
 * ⚠️ بدونِ `"server-only"` عمداً: فرمِ بازخورد یک کامپوننتِ کلاینت است و
 * باید همین فهرست‌ها و همین سقف‌ها را بشناسد. دو تعریفِ جدا یعنی فرمی که
 * چیزی را می‌پذیرد و سرور ردش می‌کند.
 */

/** دسته‌های بازخورد — باید مو‌به‌مو با CHECK مهاجرت ۰۱۳ یکی باشد. */
export const FEEDBACK_CATEGORIES = [
  "general",
  "aruz",
  "grammar",
  "game",
  "exam",
  "activity",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  general: "عمومی",
  aruz: "عروض",
  grammar: "نقش دستوری",
  game: "بازی",
  exam: "آزمون",
  activity: "فعالیت خاص",
};

/** نوعِ چیزی که بازخورد به آن ارجاع می‌دهد. */
export const RELATED_TYPES = ["exam_attempt", "quiz_attempt", "activity"] as const;

export type RelatedType = (typeof RELATED_TYPES)[number];

export const RELATED_TYPE_LABEL: Record<RelatedType, string> = {
  exam_attempt: "کارنامهٔ آزمون",
  quiz_attempt: "تلاش کوییز",
  activity: "فعالیت",
};

/** سقفِ متنِ بازخورد — همان عددِ ستونِ دیتابیس. */
export const MAX_FEEDBACK_LENGTH = 2000;

/** طولِ پیش‌نمایشی که در ردیفِ اعلان می‌نشیند. */
export const FEEDBACK_PREVIEW_LENGTH = 120;

/**
 * پیش‌نمایشِ کوتاهِ متن، برای ردیفِ اعلان.
 *
 * ⚠️ چرا کلِ متن در اعلان تکرار نمی‌شود: متنِ کامل در
 * `teacher_feedback.message` است و صفحهٔ بازخوردها از همان‌جا می‌خواند.
 * دو نسخه از یک متن یعنی با اولین ویرایشِ بازخورد از هم جدا می‌افتند، و
 * آن‌وقت اعلان چیزی می‌گوید که دیگر نوشته نشده.
 *
 * ⚠️ فضاهای سفید و خطوط جمع می‌شوند: یک متنِ چندخطی در یک ردیفِ اعلان
 * بی‌ریخت می‌شود و می‌تواند ارتفاعِ کارت را بی‌دلیل بلند کند.
 */
export function feedbackPreview(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  if (flat.length <= FEEDBACK_PREVIEW_LENGTH) return flat;
  return `${flat.slice(0, FEEDBACK_PREVIEW_LENGTH - 1)}…`;
}
