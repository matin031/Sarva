"use client";

/**
 * متنِ کاملِ اعراب‌گذاری‌شده، با پوششِ اسپویلر و آشکارسازیِ تدریجی.
 *
 * دو لایه، هر دو دقیقاً همان یک رشته با همان فونت، اندازه، وزن و ارتفاعِ
 * خط. متن به هیچ span ای شکسته نمی‌شود — اگر می‌شکست، اتصالِ حروف، جای
 * اعراب و کرنینگِ فارسی خراب می‌شد. تنها چیزی که عوض می‌شود، ناحیهٔ
 * دیده‌شدنِ لایهٔ رویی است (mask)، نه خودِ متن.
 *
 * آشکارسازی از راست شروع می‌شود، یعنی از آغازِ خواندنِ فارسی. جهتِ گرادیان
 * فیزیکی است (to left) و به dir وابسته نیست.
 */
export default function SpoileredPreview({
  text,
  reveal,
  spoilered,
  accessible,
  featherPx = 6,
  className = "",
}: {
  text: string;
  /** ۰..۱ */
  reveal: number;
  /** آیا لایهٔ مه‌آلود روی متن باشد؟ */
  spoilered: boolean;
  /** آیا متن برای صفحه‌خوان خوانده شود؟ در میانهٔ بازی نباید پاسخ لو برود. */
  accessible: boolean;
  featherPx?: number;
  className?: string;
}) {
  const clamped = Math.min(Math.max(reveal, 0), 1);
  const feather = clamped <= 0 ? 0 : featherPx;

  return (
    <div className={`aruzr-preview ${className}`} dir="rtl" lang="fa">
      <div className="aruzr-preview-scroll custom-scrollbar">
        <div className="aruzr-text-stack">
          {/* لایهٔ اسپویلر: همان متن، ولی خوانده نمی‌شود. رنگِ متن شفاف است و
              فقط هالهٔ نرمی از آن می‌ماند — بدون فیلترِ سنگین. */}
          <span
            aria-hidden="true"
            className="aruzr-text aruzr-text-spoiler"
            data-spoilered={spoilered ? "true" : "false"}
          >
            {text}
          </span>
          {/* لایهٔ دیده‌شونده: همان رشتهٔ کامل، فقط برشی از آن پیداست. */}
          <span
            aria-hidden="true"
            className="aruzr-text aruzr-text-visible"
            style={
              {
                "--aruzr-reveal": spoilered ? clamped : 1,
                "--aruzr-feather": `${spoilered ? feather : 0}px`,
              } as React.CSSProperties
            }
          >
            {text}
          </span>
        </div>
      </div>

      {/* تنها نسخهٔ قابلِ خواندن برای صفحه‌خوان — نه در میانهٔ بازی. */}
      {accessible ? <p className="sr-only">{text}</p> : null}
    </div>
  );
}
