"use client";

/** منبعِ تغذیه — ابتدای مسیرِ مدار در سمتِ راست (ابتدای خواندنِ فارسی).
 *
 *  کاملاً تزئینی است و هیچ رویدادِ اشاره‌گری نمی‌گیرد؛ `data-gc-terminal`
 *  نقطه‌ای است که سیم از آن بیرون می‌آید و مختصاتش از خودِ DOM خوانده می‌شود،
 *  نه از عددی که در کد نوشته شده باشد. */
export default function PowerSource({
  live,
  hostRef,
}: {
  live: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={hostRef} className="gc-power" data-live={live || undefined} aria-hidden>
      <svg width="44" height="56" viewBox="0 0 44 56" fill="none">
        <rect
          x="7"
          y="10"
          width="30"
          height="38"
          rx="6"
          fill="var(--gc-board-elevated)"
          stroke="var(--gc-border-strong)"
          strokeWidth="1.5"
        />
        <rect x="17" y="5" width="10" height="6" rx="2" fill="var(--gc-metal)" />
        <rect
          className="gc-power-core"
          x="13"
          y="17"
          width="18"
          height="10"
          rx="3"
          fill="var(--gc-wire)"
        />
        <path
          d="M18 32h8M22 32v8M16 40h12"
          stroke="var(--gc-text-muted)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span>باتری</span>
      <span
        data-gc-terminal
        style={{
          position: "absolute",
          top: "28px",
          insetInlineEnd: "2px",
          width: 2,
          height: 2,
        }}
      />
    </div>
  );
}
