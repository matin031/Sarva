"use client";

import { KIMIA_COPY } from "@/lib/kimia/copy";
import { MAX_ATTEMPTS } from "@/lib/kimia/round-state";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/**
 * چند تلاش مانده — سه نقطهٔ کوچک کنار خط وضعیت.
 *
 * ⚠️ **رنگ تنها نشانه نیست.** نقطهٔ سوخته هم رنگش می‌رود و هم توخالی
 * می‌شود، و کل ردیف یک `aria-label` کامل دارد («۲ تلاش باقی‌مانده»). برای
 * صفحه‌خوان نقطه‌ها اصلاً وجود ندارند؛ آن جمله تنها چیزی است که می‌شنود.
 *
 * ⚠️ و جایش همیشه رزرو است، حتی وقتی چیزی برای نشان دادن نیست
 * (`data-empty`). ردیف اقدام یک خط است و آمدن و رفتن سه نقطه، دکمه‌ها را
 * چند پیکسل جابه‌جا می‌کرد — همان چند صدم CLS که بقیهٔ این صفحه با
 * زحمت صفر شده.
 *
 * ⚠️ شمارنده هیچ‌وقت خودش نمی‌شمارد. عددی که می‌گیرد از پاسخ سرور آمده
 * (`verdict.remaining`)؛ تنها استثنا مهمان است که ردیفی در دیتابیس ندارد
 * و شمارشش در `KimiaGame` انجام می‌شود — با یک کامنت صریح که سنجهٔ
 * امنیتی نیست.
 */
export default function AttemptDots({
  remaining,
  hidden = false,
}: {
  /** از سرور. برای مهمان، شمارش محلی. */
  remaining: number;
  /** پیش از اولین تلاش چیزی نشان داده نمی‌شود، ولی جا می‌ماند. */
  hidden?: boolean;
}) {
  const left = Math.max(0, Math.min(MAX_ATTEMPTS, remaining));
  const label = left === 1 ? KIMIA_COPY.lastAttempt : KIMIA_COPY.attemptsLeft(toFa(left));

  return (
    <p
      className="km-tries"
      data-empty={hidden || undefined}
      data-low={!hidden && left === 1 ? "" : undefined}
      title={hidden ? undefined : label}
    >
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
        <span key={i} className="km-try-dot" data-spent={i >= left ? "" : undefined} aria-hidden />
      ))}
      {/* ⚠️ متن و نه `aria-label`.
          `aria-label` روی یک `<p>` را استاندارد ARIA ممنوع کرده (عنصری
          که نقشی با قابلیت نام‌گذاری ندارد) و axe هم «جدی» علامتش زد.
          یک متن پنهان همان جمله را می‌گوید، در هر صفحه‌خوانی کار می‌کند،
          و `aria-live` نمی‌خواهد چون خط وضعیتِ کناری خودش نتیجه را
          اعلام می‌کند. */}
      {hidden ? null : <span className="sr-only">{label}</span>}
    </p>
  );
}
