"use client";

import React from "react";

type BookLoaderProps = {
  size?: number;
  color?: string; // رنگ خط‌ها
  ghostColor?: string; // رنگ محو پس‌زمینه‌ی خط
  duration?: number; // مدت هر چرخه (ثانیه)
  strokeWidth?: number;
  glow?: boolean;
  background?: string; // پیش‌فرض شفاف
  className?: string;
};

export default function BookLoader({
  size = 160,
  color = "#2fe3e0",
  ghostColor = "#1d8a8a",
  duration = 2.4,
  strokeWidth = 20,
  glow = true,
  background = "transparent",
  className,
}: BookLoaderProps) {
  // هر دو نیمه از نوک پایین (V) شروع و به سمت بالا کشیده می‌شن
  const leftHalf =
    "M 240 311 L 232 302 C 194 281 130 283 88 271 Q 74 268 74 250 L 74 113 Q 74 68 120 68 L 158 68 C 192 68 224 72 240 90";
  const rightHalf =
    "M 240 311 L 248 302 C 286 281 350 283 392 271 Q 406 268 406 250 L 406 113 Q 406 68 360 68 L 322 68 C 288 68 256 72 240 90";
  // خط وسط حالا یک‌تکه‌ی پیوسته از پایین به بالا
  const spine = "M 240 305 L 240 96";

  const paths = [leftHalf, rightHalf, spine];
  const animname = "bookDraw";

  const ghostProps = {
    fill: "none",
    stroke: ghostColor,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    opacity: 0.2,
  };

  const drawProps = {
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    pathLength: 1,
    strokeDasharray: 1,
    style: {
      animation: `${animname} ${duration}s ease-in-out infinite`,
    } as React.CSSProperties,
  };

  return (
    <svg
      className={className}
      width={size}
      height={size * (420 / 480)}
      viewBox="0 0 480 420"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="loading"
    >
      <style>{`
        @keyframes ${animname} {
          0%   { stroke-dashoffset: 1; opacity: 0; }
          12%  { opacity: 1; }
          70%  { stroke-dashoffset: 0; opacity: 1; }
          84%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>

      {glow && (
        <defs>
          <filter id="bookGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {background !== "transparent" && (
        <rect width="480" height="420" rx="28" fill={background} />
      )}

      {/* لایه‌ی محو: شکل همیشه دیده می‌شه */}
      <g {...ghostProps}>
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* لایه‌ی رنگی: از پایین شروع، به دو طرف بالا */}
      <g filter={glow ? "url(#bookGlow)" : undefined}>
        {paths.map((d, i) => (
          <path key={i} d={d} {...drawProps} />
        ))}
      </g>
    </svg>
  );
}
