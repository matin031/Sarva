"use client";

export type LampState = "off" | "receiving" | "turningOn" | "on" | "flicker" | "failed";

/** لامپ — پایانِ مسیرِ مدار.
 *
 *  SVG و CSS، بدونِ Three.js: هندسه ساده می‌ماند و هزینهٔ رندر ناچیز است.
 *  هیچ منطقِ دستوری‌ای اینجا نیست؛ لامپ فقط حالتی را که به آن داده می‌شود
 *  نشان می‌دهد.
 *
 *  حالتِ `failed` عمداً «خرابیِ کوچک» است نه انفجار: یک ترکِ نازک روی حباب و
 *  یک پفِ دودِ محو. هدف آموزش است، نه ترساندن. */
export default function Lamp({
  state,
  turnOnMs,
  flickerMs,
  reducedMotion,
  hostRef,
}: {
  state: LampState;
  turnOnMs: number;
  flickerMs: number;
  reducedMotion: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  const label =
    state === "on"
      ? "لامپ روشن شد"
      : state === "failed"
        ? "لامپ روشن نشد"
        : "لامپ خاموش است";

  return (
    <div
      ref={hostRef}
      className="gc-lamp"
      data-state={state}
      data-reduced={reducedMotion || undefined}
      style={
        {
          "--gc-lamp-on-ms": `${turnOnMs}ms`,
          "--gc-lamp-flicker-ms": `${flickerMs}ms`,
        } as React.CSSProperties
      }
      role="img"
      aria-label={label}
    >
      <svg width="72" height="90" viewBox="0 0 72 90" fill="none">
        <defs>
          <radialGradient id="gcLampHalo" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="var(--gc-lamp-on)" stopOpacity="0.85" />
            <stop offset="55%" stopColor="var(--gc-lamp-on)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--gc-lamp-on)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gcLampGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gc-lamp-glass-a)" />
            <stop offset="100%" stopColor="var(--gc-lamp-glass-b)" />
          </linearGradient>
        </defs>

        <circle className="gc-lamp-halo" cx="36" cy="34" r="33" fill="url(#gcLampHalo)" />

        <path
          className="gc-lamp-glass"
          d="M36 7c-11.6 0-20 8.8-20 20 0 7.8 4 12 7 15.8 2 2.5 3 4.1 3 7H46c0-2.9 1-4.5 3-7 3-3.8 7-8 7-15.8C56 15.8 47.6 7 36 7Z"
          fill="url(#gcLampGlass)"
        />
        {/* بازتابِ نازکِ شیشه — عمق می‌دهد بدونِ شلوغی. */}
        <path
          className="gc-lamp-shine"
          d="M25 20c2.4-4.4 6-6.8 10-7.2"
          stroke="var(--gc-lamp-shine)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path className="gc-lamp-filament" d="M29 36c1.8-5 3-8 7-8s5.2 3 7 8" />
        <path className="gc-lamp-filament-leg" d="M29 36v6M43 36v6" />

        {/* ترکِ حبابِ خراب — فقط در حالتِ شکست دیده می‌شود. */}
        <path
          className="gc-lamp-crack"
          d="M31 18l4 6-3 4 5 3"
          stroke="var(--gc-lamp-crack)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        <rect x="25" y="52" width="22" height="5" rx="1.8" fill="var(--gc-metal)" />
        <rect x="26" y="59" width="20" height="5" rx="1.8" fill="var(--gc-metal)" />
        <rect x="27" y="66" width="18" height="5" rx="1.8" fill="var(--gc-metal)" />
        <rect
          x="29"
          y="73"
          width="14"
          height="7"
          rx="2"
          fill="var(--gc-board-elevated)"
          stroke="var(--gc-border-strong)"
          strokeWidth="1.2"
        />
      </svg>
      <span className="gc-endcap-label">لامپ</span>
      <span
        data-gc-terminal
        style={{
          position: "absolute",
          top: "56px",
          insetInlineStart: "6px",
          width: 2,
          height: 2,
        }}
      />
    </div>
  );
}
