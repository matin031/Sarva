"use client";

/**
 * پوششِ «گوشی را افقی کن».
 *
 * ⚠️ این یک پیام نیست، یک *گِیت* است. تا وقتی روی صفحه است، بازیِ زیرش نه
 * کلیک می‌گیرد، نه با Tab قابلِ رسیدن است و نه برای صفحه‌خوان وجود دارد
 * (`inert` روی درختِ بازی، در `RoleHuntGame`). دلیلش این است که یک لمسِ
 * اتفاقی روی ستاره‌ای که زیرِ پوشش دیده نمی‌شود، یک پاسخِ غلط در تحلیلِ
 * دانش‌آموز ثبت می‌کند.
 *
 * ⚠️ `fixed` و نه `absolute`: روی گوشی صفحه اسکرول می‌خورد و پوششِ مطلق با
 * اسکرول بالا می‌رفت و بازی از زیرش بیرون می‌زد.
 */
export default function OrientationGate({ reduced }: { reduced: boolean }) {
  return (
    <div
      className="rh-gate"
      data-reduced={reduced ? "true" : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rh-gate-title"
      aria-describedby="rh-gate-body"
    >
      <div className="rh-gate-inner">
        {/* نشانهٔ چرخشِ گوشی — یک مستطیلِ گرد و یک کمانِ چرخش. عمداً
            تصویرسازیِ شلوغ نیست: همان زبانِ خطیِ بقیهٔ بازی. */}
        <svg
          className="rh-gate-icon"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            x="20.5"
            y="8.5"
            width="23"
            height="39"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M14 52a24 24 0 0 0 36 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 4"
          />
          <path
            d="M50 44v8h-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h2 id="rh-gate-title" className="game-display rh-gate-title">
          گوشی را افقی کن
        </h2>
        <p id="rh-gate-body" className="rh-gate-body">
          برای بازی بهتر، گوشی را به حالت افقی بچرخان.
        </p>
      </div>
    </div>
  );
}
