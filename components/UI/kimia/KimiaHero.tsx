"use client";

import { resultantMix } from "@/lib/kimia/mix";
import { sequenceColors } from "@/lib/kimia/visuals";
import type { FootKey } from "@/lib/kimia/types";

/**
 * تصویرِ صفحهٔ شروع: یک بالن که ارکانِ یک وزنِ واقعی لایه‌لایه در آن
 * نشسته‌اند و هر چند ثانیه یک بار به یک اکسیرِ یکدست بدل می‌شوند.
 *
 * ⚠️ رنگ‌ها و ارکان ساختگی نیستند: وزنِ «بشنو این نی…» است و رنگ‌ها از همان
 * `sequenceColors` و `resultantMix`ی می‌آیند که خودِ بازی استفاده می‌کند.
 * یعنی چیزی که تازه‌وارد اینجا می‌بیند، همان است که در بازی خواهد دید.
 *
 * ⚠️ هیچ جاوااسکریپتی در حلقه نیست: یک خطِ زمانیِ CSS ِ ۹ ثانیه‌ای که فقط
 * `opacity` و `transform` را حرکت می‌دهد، و با `prefers-reduced-motion`
 * روی قابِ لایه‌ای می‌ایستد. نسخهٔ قبل (پیش‌نمایشِ زندهٔ خودِ بازی) یک
 * حلقهٔ async با IntersectionObserver داشت و روی صفحه چند تکهٔ ریز و پراکنده
 * می‌ساخت؛ این یک شیء است.
 *
 * تزئینی است (`aria-hidden`)؛ تیتر و لید همان را می‌گویند.
 */
const FEET = ["فاعلاتن", "فاعلاتن", "فاعلن"] as const satisfies readonly FootKey[];
const VERSE = "بشنو این نی چون شکایت می‌کند";

/* بدنهٔ بالن: گردنِ باریک و حبابِ گرد (مرکز ۱۲۰،۲۰۰ و شعاعِ ۹۰). */
const BODY = "M104 20V111.4A90 90 0 1 0 136 111.4V20Z";
/* سطحِ مایع (y=۱۵۸) تا کفِ حباب. */
const TOP = 158;
const BOTTOM = 290;

const BUBBLES = [
  { x: 92, r: 3, d: 0 },
  { x: 128, r: 2.2, d: 1.1 },
  { x: 150, r: 3.4, d: 2.3 },
  { x: 108, r: 1.8, d: 3.2 },
  { x: 140, r: 2.6, d: 4.4 },
  { x: 84, r: 2, d: 5.1 },
];

const SPARKS = [
  { x: 52, y: 150, s: 1 },
  { x: 196, y: 128, s: 0.8 },
  { x: 184, y: 250, s: 0.65 },
  { x: 40, y: 236, s: 0.7 },
  { x: 120, y: 64, s: 0.55 },
];

export default function KimiaHero() {
  const colors = sequenceColors(FEET);
  const mix = resultantMix(colors);
  const band = (BOTTOM - TOP) / FEET.length;
  /* اولین رکن اولین ریخته‌شده است، پس تهِ ظرف می‌نشیند. */
  const stops = colors.flatMap((c, i) => {
    const from = (i * band) / (BOTTOM - TOP);
    const to = ((i + 1) * band) / (BOTTOM - TOP);
    return [
      { o: 1 - to + 0.04, c },
      { o: 1 - from - 0.04, c },
    ];
  });

  return (
    <div className="km-hero" aria-hidden style={{ "--km-mix": mix } as React.CSSProperties}>
      <div className="km-hero-stage">
        <span className="km-hero-glow" />
        <svg className="km-hero-flask" viewBox="0 0 240 310" fill="none">
          <defs>
            <clipPath id="km-hero-clip">
              <path d={BODY} />
            </clipPath>
            <linearGradient id="km-hero-layers" x1="0" y1={TOP} x2="0" y2={BOTTOM} gradientUnits="userSpaceOnUse">
              {stops
                .slice()
                .sort((a, b) => a.o - b.o)
                .map((s, i) => (
                  <stop key={i} offset={Math.min(1, Math.max(0, s.o))} stopColor={s.c} />
                ))}
            </linearGradient>
            <radialGradient id="km-hero-depth" cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
              <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.22" />
            </radialGradient>
            <linearGradient id="km-hero-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <ellipse className="km-hero-shadow" cx="120" cy="298" rx="72" ry="7" />
          <path className="km-hero-glass" d={BODY} />

          <g clipPath="url(#km-hero-clip)">
            <rect x="0" y={TOP} width="240" height={BOTTOM - TOP + 20} fill="url(#km-hero-layers)" />
            <rect className="km-hero-mixed" x="0" y={TOP} width="240" height={BOTTOM - TOP + 20} fill={mix} />
            <g className="km-hero-wave">
              <path
                d={`M-240 ${TOP}q30 -7 60 0t60 0t60 0t60 0t60 0t60 0t60 0t60 0V${TOP + 14}H-240Z`}
                fill={colors[colors.length - 1]}
              />
            </g>
            <g className="km-hero-wave km-hero-wave-mixed">
              <path
                d={`M-240 ${TOP}q30 -7 60 0t60 0t60 0t60 0t60 0t60 0t60 0t60 0V${TOP + 14}H-240Z`}
                fill={mix}
              />
            </g>
            {BUBBLES.map((b, i) => (
              <circle
                key={i}
                className="km-hero-bubble"
                cx={b.x}
                cy={BOTTOM - 12}
                r={b.r}
                style={{ animationDelay: `${b.d}s` }}
              />
            ))}
            <rect className="km-hero-depth" x="0" y="0" width="240" height="310" fill="url(#km-hero-depth)" />
            <rect className="km-hero-sheen" x="-80" y="0" width="80" height="310" fill="url(#km-hero-sheen)" />
          </g>

          {/* لبه و بازتابِ شیشه — روی مایع. */}
          <path className="km-hero-edge" d={BODY} />
          <path className="km-hero-shine" d="M60 176a64 64 0 0 1 30-52" />
          <path className="km-hero-shine km-hero-shine-thin" d="M112 32v62" />
          <rect className="km-hero-rim" x="97" y="12" width="46" height="11" rx="5.5" />

          {SPARKS.map((s, i) => (
            <path
              key={i}
              className="km-hero-spark"
              style={{ transformOrigin: `${s.x}px ${s.y}px`, animationDelay: `${i * 0.07}s`, ["--s" as string]: s.s }}
              d={`M${s.x} ${s.y - 9}l2 7 7 2-7 2-2 7-2-7-7-2 7-2z`}
            />
          ))}
        </svg>
      </div>

      <ol className="km-hero-feet">
        {FEET.map((foot, i) => (
          <li key={i} style={{ "--km-ink": colors[i], animationDelay: `${i * 0.12}s` } as React.CSSProperties}>
            <span className="km-hero-dot" />
            {foot}
          </li>
        ))}
      </ol>
      <p className="km-hero-verse game-verse">{VERSE}</p>
    </div>
  );
}
