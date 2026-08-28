"use client";

/** منبعِ تغذیه — ابتدای مسیرِ مدار، سمتِ راست.
 *
 *  چیدمان عمداً از راست به چپ است: باتری سمتِ راست، خانه‌ها به ترتیبِ خواندنِ
 *  فارسی، و لامپ در انتهای سمتِ چپ. همان جهتی که پالسِ تشخیصی هم می‌رود.
 *
 *  کاملاً تزئینی است و هیچ رویدادی نمی‌گیرد؛ `data-gc-terminal` نقطه‌ای است
 *  که سیم از آن بیرون می‌آید و مختصاتش از خودِ DOM خوانده می‌شود. */
export default function PowerSource({
  live,
  hostRef,
}: {
  live: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={hostRef} className="gc-power" data-live={live || undefined} aria-hidden>
      <svg width="52" height="72" viewBox="0 0 52 72" fill="none">
        <rect x="8" y="4" width="14" height="5" rx="1.6" fill="var(--gc-metal)" />
        <rect
          x="4"
          y="9"
          width="44"
          height="54"
          rx="7"
          fill="var(--gc-board-elevated)"
          stroke="var(--gc-border-strong)"
          strokeWidth="1.6"
        />
        {/* نوارِ شارژ — سه پله، برای حسِ «دستگاه» بدونِ شلوغی. */}
        <rect className="gc-power-cell" x="11" y="16" width="30" height="8" rx="2.5" />
        <rect className="gc-power-cell" x="11" y="28" width="30" height="8" rx="2.5" />
        <rect className="gc-power-cell" x="11" y="40" width="30" height="8" rx="2.5" />
        <path
          d="M22 53h8M26 53v5"
          stroke="var(--gc-text-muted)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="gc-endcap-label">باتری</span>
      <span
        data-gc-terminal
        style={{
          position: "absolute",
          top: "36px",
          insetInlineEnd: "4px",
          width: 2,
          height: 2,
        }}
      />
    </div>
  );
}
