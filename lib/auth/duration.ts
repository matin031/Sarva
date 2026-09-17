/**
 * خواندنِ مدت از متغیرِ محیطی — «15m» / «30d» / «3600» → ثانیه.
 *
 * ⚠️ عمداً بدونِ `"server-only"` و جدا از `./config`.
 *
 * `lib/auth/config.ts` خودش `server-only` است و آزمون‌های `node --test`
 * موقعِ import کردنش استثنا می‌گیرند. این تابع هیچ رازی نمی‌خواند و هیچ
 * اتصالی ندارد، ولی **مدتِ ورودِ کاربر را همین تعیین می‌کند** — و آن عدد
 * تنها چیزی است که بینِ کاربر و «چرا بیرون انداخته شدم؟» ایستاده.
 * (همان استدلالِ `lib/db/errors.ts`.)
 */

/**
 * ⚠️ روی ورودیِ بدشکل **throw نمی‌کند**.
 *
 * این عمدی است: یک `.env` با تایپوی «30 days» نباید کلِ سایت را پایین
 * بیاورد. ولی هزینه‌اش این است که همان تایپو بی‌صدا مدتِ ورود را به
 * پیش‌فرض برمی‌گرداند و تنها نشانه‌اش یک خطِ warn در لاگِ سرور است — پس
 * اگر کسی گزارش داد «زودتر از انتظار بیرون انداخته می‌شوم»، اولین جایی که
 * باید نگاه کرد همین است.
 */
export function parseDuration(input: string | undefined, fallbackSeconds: number): number {
  if (!input) return fallbackSeconds;
  const match = /^(\d+)\s*([smhd])?$/i.exec(input.trim());
  if (!match) {
    console.warn(`[auth] مدت نامعتبر «${input}» — از پیش‌فرض ${fallbackSeconds}s استفاده شد.`);
    return fallbackSeconds;
  }
  const unit = (match[2] ?? "s").toLowerCase() as "s" | "m" | "h" | "d";
  return Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}
