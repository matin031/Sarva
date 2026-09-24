"use client";

export type LampState = "off" | "receiving" | "turningOn" | "on" | "flicker" | "failed";

/** لامپ — پایانِ مسیرِ مدار.
 *
 *  SVG و CSS، بدونِ Three.js: هندسه ساده می‌ماند و هزینهٔ رندر ناچیز است.
 *  هیچ منطقِ دستوری‌ای اینجا نیست؛ لامپ فقط حالتی را که به آن داده می‌شود
 *  نشان می‌دهد.
 *
 *  روی گوشیِ ایستاده لامپ زیرِ ستون *آویزان* است: شیوه‌نامه قابِ آن را ۱۸۰
 *  درجه می‌چرخاند و `data-gc-terminal` که روی نوکِ سرپیچ نشسته، بالا می‌آید.
 *
 *  حالتِ `failed` عمداً «خرابیِ کوچک» است نه انفجار: یک ترکِ نازک روی حباب و
 *  خاموشی. هدف آموزش است، نه ترساندن. */
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
      <span className="gc-endcap-art">
        {/* هالهٔ نور، یک دایرهٔ گرادیانیِ جدا و نه `drop-shadow`: فیلتر سایه را
            دورِ سرپیچِ مستطیلی هم می‌انداخت و نور کشیده دیده می‌شد. */}
        <span className="gc-lamp-bloom" aria-hidden />
        <svg viewBox="0 0 60 80" fill="none">
          <path
            className="gc-lamp-glass"
            d="M30 7a19 19 0 0 0-11.5 34.1c2.2 1.7 3.5 4.2 3.5 7V51h16v-2.9c0-2.8 1.3-5.3 3.5-7A19 19 0 0 0 30 7Z"
          />
          <path className="gc-lamp-shine" d="M20.5 24a10 10 0 0 1 6.5-9" />
          <path className="gc-lamp-filament" d="M25.5 48V39M34.5 48V39M25.5 39q2.25-5.5 4.5 0t4.5 0" />
          <path className="gc-lamp-crack" d="M27 14l3.5 5-3 3.5 4.5 3" />
          <rect className="gc-lamp-base" x="21.5" y="53" width="17" height="5" rx="2" />
          <rect className="gc-lamp-base" x="22.5" y="60" width="15" height="5" rx="2" />
          <path className="gc-lamp-base" d="M25.5 67h9l-2 4.5h-5z" />
        </svg>
        <span data-gc-terminal className="gc-terminal" />
      </span>
    </div>
  );
}
