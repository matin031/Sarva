"use client";

export type LampState = "off" | "receivingCurrent" | "turningOn" | "on";

/** لامپ — پایانِ مسیرِ مدار.
 *
 *  SVG و CSS، بدونِ Three.js: هندسه ساده می‌ماند، تایپوگرافیِ فارسی و لمس دقیق
 *  دست‌نخورده می‌ماند و هزینهٔ رندر ناچیز است.
 *
 *  هیچ منطقِ دستوری‌ای اینجا نیست؛ لامپ فقط حالتی را که به آن داده می‌شود
 *  نشان می‌دهد. */
export default function Lamp({
  state,
  turnOnMs,
  hostRef,
}: {
  state: LampState;
  turnOnMs: number;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={hostRef}
      className="gc-lamp"
      data-state={state}
      style={{ "--gc-lamp-on-ms": `${turnOnMs}ms` } as React.CSSProperties}
      role="img"
      aria-label={state === "on" ? "لامپ روشن شد" : "لامپ خاموش است"}
    >
      <svg width="66" height="82" viewBox="0 0 66 82" fill="none">
        <defs>
          <radialGradient id="gcLampHalo" cx="50%" cy="42%" r="50%">
            <stop offset="0%" stopColor="var(--gc-lamp-on)" stopOpacity="0.75" />
            <stop offset="60%" stopColor="var(--gc-lamp-on)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--gc-lamp-on)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="gc-lamp-halo" cx="33" cy="32" r="31" fill="url(#gcLampHalo)" />

        <path
          className="gc-lamp-glass"
          d="M33 6c-11 0-19 8.4-19 19 0 7.4 3.8 11.4 6.6 15 1.9 2.4 2.9 3.9 2.9 6.6h19c0-2.7 1-4.2 2.9-6.6 2.8-3.6 6.6-7.6 6.6-15C52 14.4 44 6 33 6Z"
        />
        <path
          className="gc-lamp-filament"
          d="M27 34c1.6-4.4 2.6-7 6-7s4.4 2.6 6 7"
        />
        <rect
          x="23"
          y="50"
          width="20"
          height="5"
          rx="1.6"
          fill="var(--gc-metal)"
        />
        <rect
          x="24"
          y="57"
          width="18"
          height="5"
          rx="1.6"
          fill="var(--gc-metal)"
        />
        <rect
          x="26"
          y="64"
          width="14"
          height="7"
          rx="2"
          fill="var(--gc-board-elevated)"
          stroke="var(--gc-border-strong)"
          strokeWidth="1.2"
        />
      </svg>
      <span>لامپ</span>
      <span
        data-gc-terminal
        style={{
          position: "absolute",
          top: "48px",
          insetInlineStart: "4px",
          width: 2,
          height: 2,
        }}
      />
    </div>
  );
}
