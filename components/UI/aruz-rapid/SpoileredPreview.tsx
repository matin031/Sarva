"use client";

import { splitWords } from "@/lib/aruz-rapid/license";

/**
 * مصراعِ کاملِ اعراب‌گذاری‌شده، با پوششِ اسپویلر و آشکارسازیِ تدریجی.
 *
 * دو لایه، هر دو دقیقاً همان یک رشته با همان فونت، اندازه، وزن و ارتفاعِ
 * خط. متن به هیچ span ای شکسته نمی‌شود — اگر می‌شکست، اتصالِ حروف، جای
 * اعراب و کرنینگِ فارسی خراب می‌شد. تنها چیزی که عوض می‌شود، ناحیهٔ
 * دیده‌شدنِ لایهٔ رویی است (mask)، نه خودِ متن.
 *
 * آشکارسازی از راست شروع می‌شود، یعنی از آغازِ خواندنِ فارسی. جهتِ گرادیان
 * فیزیکی است (to left) و به dir وابسته نیست.
 *
 * کلمه‌های اختیاردار (`marks`) در هر دو لایه span می‌گیرند — فقط کلمهٔ کامل،
 * پس اتصالِ حروف نمی‌شکند؛ و بی‌تغییرِ فونت، پس متریکِ دو لایه یکی می‌ماند.
 */
export default function SpoileredPreview({
  text,
  reveal,
  spoilered,
  accessible,
  label,
  complete = false,
  featherPx = 7,
  marks,
  children,
}: {
  text: string;
  /** ۰..۱ */
  reveal: number;
  /** آیا لایهٔ پوشاننده روی متن باشد؟ */
  spoilered: boolean;
  /** آیا متن برای صفحه‌خوان خوانده شود؟ در میانهٔ بازی نباید پاسخ لو برود. */
  accessible: boolean;
  label?: string;
  /** لحظهٔ تکمیل: یک حلقهٔ نورِ کوتاه دورِ قاب. */
  complete?: boolean;
  featherPx?: number;
  /** شمارهٔ کلمه‌های اختیاردار (همان `splitWords`). */
  marks?: ReadonlySet<number>;
  /** زیرِ متن، داخلِ همان قاب (یادداشتِ اختیار). */
  children?: React.ReactNode;
}) {
  const clamped = Math.min(Math.max(reveal, 0), 1);
  const feather = clamped <= 0 ? 0 : featherPx;
  const body = marks?.size
    ? splitWords(text).map((t, i) =>
        i % 2 === 0 && marks.has(i / 2) ? (
          <span key={i} className="aruzr-lic-word">
            {t}
          </span>
        ) : (
          t
        ),
      )
    : text;

  return (
    <div
      className="aruzr-panel"
      data-state={spoilered ? "veiled" : "open"}
      data-complete={complete ? "true" : "false"}
      data-license={marks?.size ? "true" : "false"}
      dir="rtl"
      lang="fa"
    >
      {label ? <div className="aruzr-panel-label">{label}</div> : null}

      <div className="aruzr-preview">
        <div className="aruzr-preview-scroll">
          <div
            className="aruzr-text-stack"
            style={
              {
                "--aruzr-reveal": spoilered ? clamped : 1,
                "--aruzr-feather": `${spoilered ? feather : 0}px`,
              } as React.CSSProperties
            }
          >
            {/* لایهٔ پوشاننده: همان متن، ولی خوانده نمی‌شود. رنگِ متن شفاف
                است و فقط هالهٔ نرمی از آن می‌ماند — بدون فیلترِ سنگین. */}
            <span aria-hidden="true" className="aruzr-text aruzr-text-spoiler" data-spoilered={spoilered ? "true" : "false"}>
              {body}
            </span>
            {/* لایهٔ دیده‌شونده: همان رشتهٔ کامل، فقط برشی از آن پیداست. */}
            <span aria-hidden="true" className="aruzr-text aruzr-text-visible">
              {body}
            </span>
          </div>
        </div>
      </div>

      {children}

      {/* تنها نسخهٔ قابلِ خواندن برای صفحه‌خوان — نه در میانهٔ بازی. */}
      {accessible ? <p className="sr-only">{text}</p> : null}
    </div>
  );
}
