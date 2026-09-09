/**
 * پول — یک نقطه، یک واحد.
 *
 * ⚠️ این فایل عمداً «server-only» نیست: قیمت هم در سرور محاسبه می‌شود و هم
 * در مرورگر *نمایش* داده می‌شود. اما دقت کنید که چه چیزی اینجا هست و چه
 * چیزی نیست:
 *
 *   • اینجا فقط **تبدیل و قالب‌بندی** است.
 *   • هیچ‌جا مبلغ *تعیین* نمی‌شود. مبلغِ هر خرید از `plus_plan_versions`
 *     خوانده می‌شود و مرورگر فقط شناسهٔ انتخاب را می‌فرستد.
 *
 * ── چرا ریال در دیتابیس و تومان در رابط کاربری ──────────────────────────────
 * درگاه‌های ایرانی مبلغ را به ریال می‌گیرند و دانش‌آموز ایرانی با تومان فکر
 * می‌کند. اگر این تبدیل در کامپوننت‌ها پخش می‌شد، دیر یا زود یک جا
 * `amount * 10` می‌ماند و یک جا نه — و آن باگ به‌شکلِ «فاکتور ده برابر» خودش
 * را نشان می‌دهد، نه به‌شکلِ یک خطای واضح.
 *
 * پس: **دیتابیس همیشه ریال. رابط کاربری همیشه با واحد.** عددِ بی‌واحد
 * (`۱۹۹۰۰۰`) هرگز به کاربر نشان داده نمی‌شود.
 */

/** واحدِ متعارفِ ذخیره‌سازی. تنها مقدارِ مجاز در ستون‌های `currency`. */
export const CANONICAL_CURRENCY = "IRR" as const;
export type Currency = typeof CANONICAL_CURRENCY;

/** ۱ تومان = ۱۰ ریال. تنها جایی از کلِ پروژه که این عدد نوشته شده. */
const RIALS_PER_TOMAN = 10;

/**
 * تومان → ریال.
 *
 * ورودی باید عددِ صحیح باشد. «۱۹۹٬۹۰۰٫۵ تومان» یعنی جایی محاسبه اشتباه شده،
 * و گردکردنِ بی‌صدا آن اشتباه را تا فاکتور می‌برد.
 */
export function tomansToRials(tomans: number): number {
  if (!Number.isFinite(tomans) || !Number.isInteger(tomans) || tomans < 0) {
    throw new RangeError("مبلغ تومان باید عددی صحیح و نامنفی باشد.");
  }
  return tomans * RIALS_PER_TOMAN;
}

/**
 * ریال → تومان.
 *
 * ⚠️ اگر مبلغِ ریالی مضربِ ۱۰ نباشد، اینجا خطا می‌دهد و گرد نمی‌کند. مبلغی که
 * به تومانِ صحیح تبدیل نمی‌شود یعنی یا از درگاه چیزِ غیرمنتظره‌ای آمده یا
 * محاسبه‌ای اشتباه بوده — و در هر دو حالت، نمایشِ عددِ گردشده به کاربر یعنی
 * پنهان کردنِ مسئله.
 */
export function rialsToTomans(rials: number): number {
  if (!Number.isFinite(rials) || !Number.isInteger(rials) || rials < 0) {
    throw new RangeError("مبلغ ریال باید عددی صحیح و نامنفی باشد.");
  }
  if (rials % RIALS_PER_TOMAN !== 0) {
    throw new RangeError(`مبلغ ${rials} ریال به تومانِ صحیح تبدیل نمی‌شود.`);
  }
  return rials / RIALS_PER_TOMAN;
}

/** جداکنندهٔ هزارگان با ارقام فارسی — همان قالبی که بقیهٔ سایت دارد. */
function faNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}

/**
 * مبلغِ ریالی، آمادهٔ نمایش: «۱۹۹٬۰۰۰ تومان».
 *
 * برای مبلغِ صفر «رایگان» برمی‌گرداند، چون «۰ تومان» روی یک دکمهٔ خرید بیشتر
 * شبیه باگ است تا قیمت.
 */
export function formatRials(rials: number): string {
  if (rials === 0) return "رایگان";
  return `${faNumber(rialsToTomans(rials))} تومان`;
}

/** همان قالب، ولی بدون واژهٔ «تومان» — برای جایی که واحد جداگانه نوشته شده. */
export function formatRialsAmountOnly(rials: number): string {
  return faNumber(rialsToTomans(rials));
}

/** برچسبِ فارسیِ واحد، برای فاکتور و جدول. */
export const CURRENCY_LABEL: Record<Currency, string> = {
  IRR: "تومان",
};
