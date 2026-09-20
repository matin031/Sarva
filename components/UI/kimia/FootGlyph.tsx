"use client";

/**
 * نشانهٔ یک رکن: الگوی هجایی‌اش، به‌شکلِ هندسی.
 *
 * ⚠️ چرا الگوی هجایی و نه یک آیکونِ دلبخواه:
 *
 * هر ماده باید نشانه‌ای داشته باشد که فقط با رنگ شناخته نشود (کوررنگی، و
 * شانزده رنگ روی یک صفحه). ساده‌ترین راه، شانزده شکلِ هندسیِ تصادفی بود —
 * مثلث، لوزی، ستاره. رد شد، چون آن شانزده شکل *چیزی یاد نمی‌دهند*؛ فقط یک
 * کدِ دیگر برای حفظ کردن‌اند.
 *
 * الگوی هجایی هم یکتاست (هیچ دو رکنِ این کاتالوگ الگوی یکسان ندارند —
 * `tests/kimia/visuals.test.ts`) و هم *تعریفِ خودِ رکن* است. یعنی رَک
 * هم‌زمان جدولِ ارکان هم هست.
 *
 * ⚠️ قوس = هجای کوتاه، خط = هجای بلند. همان قراردادِ «کوتاه یا بلند؟»
 * (`U` و `_` در `lib/aruz-rapid/config.ts`)، فقط کشیده‌شده به‌جای
 * نوشته‌شده — تا در قلم‌های مختلف و اندازه‌های ریز از هم قابلِ تشخیص
 * بمانند.
 *
 * ⚠️ و راست‌به‌چپ خوانده می‌شود: اولین هجا سمتِ راست است، مثلِ خودِ مصراع.
 * رشتهٔ `ARKAN` به‌ترتیبِ ASCII نوشته شده (`U---`)، پس اینجا معکوس می‌شود.
 */
export default function FootGlyph({
  pattern,
  className = "",
}: {
  /** مثلاً `U---`. رشتهٔ خالی چیزی رندر نمی‌کند. */
  pattern: string;
  className?: string;
}) {
  if (!pattern) return null;

  // راست‌به‌چپ: اولین هجا در سمتِ راستِ نشانه می‌نشیند.
  const marks = [...pattern].reverse();

  /* هندسهٔ ثابت، و عرضِ viewBox از تعدادِ هجاها می‌آید. اندازهٔ نهایی را CSS
     تعیین می‌کند؛ اینجا فقط نسبت‌ها مهم‌اند. */
  const UNIT = 10;
  const GAP = 3;
  const H = 12;
  const width = marks.length * UNIT + (marks.length - 1) * GAP;

  return (
    <svg
      className={`km-glyph ${className}`}
      viewBox={`0 0 ${width} ${H}`}
      width={width}
      height={H}
      fill="none"
      aria-hidden
      focusable="false"
    >
      {marks.map((mark, i) => {
        const x = i * (UNIT + GAP);
        return mark === "-" ? (
          // هجای بلند — یک میلهٔ افقی
          <rect key={i} x={x} y={H / 2 - 1.1} width={UNIT} height={2.2} rx={1.1} fill="currentColor" />
        ) : (
          // هجای کوتاه — قوسی باز به بالا، همان شکلِ «U»
          <path
            key={i}
            d={`M ${x + 1} ${H / 2 - 2.6} L ${x + 1} ${H / 2 + 0.4} A ${UNIT / 2 - 1} ${UNIT / 2 - 1} 0 0 0 ${x + UNIT - 1} ${H / 2 + 0.4} L ${x + UNIT - 1} ${H / 2 - 2.6}`}
            stroke="currentColor"
            strokeWidth={2.1}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
