"use client";

/** منبعِ تغذیه — ابتدای مسیرِ مدار.
 *
 *  افقی: سمتِ راست، سرِ باتری رو به خانه‌ها (چپ). ایستاده (گوشی): بالای ستون
 *  و سیم از زیرش بیرون می‌آید. جای `data-gc-terminal` را شیوه‌نامه تعیین
 *  می‌کند، نه این فایل، چون در دو چیدمان فرق دارد؛ مختصاتش از خودِ DOM
 *  خوانده می‌شود.
 *
 *  کاملاً تزئینی است و هیچ رویدادی نمی‌گیرد. */
export default function PowerSource({
  live,
  hostRef,
}: {
  live: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={hostRef} className="gc-power" data-live={live || undefined} aria-hidden>
      <span className="gc-endcap-art">
        <svg viewBox="0 0 64 40" fill="none">
          <rect className="gc-power-nub" x="2" y="14" width="6" height="12" rx="2" />
          <rect className="gc-power-body" x="8" y="5" width="52" height="30" rx="7" />
          <rect className="gc-power-cell" x="14" y="11" width="11" height="18" rx="2.5" />
          <rect className="gc-power-cell" x="28.5" y="11" width="11" height="18" rx="2.5" />
          <rect className="gc-power-cell" x="43" y="11" width="11" height="18" rx="2.5" />
        </svg>
        <span data-gc-terminal className="gc-terminal" />
      </span>
    </div>
  );
}
