"use client";
import { useEffect, useRef, useState } from "react";

interface FakeWaveformProps {
  barCount?: number;
  active?: boolean;
}

export function FakeWaveform({
  barCount = 36,
  active = false,
}: FakeWaveformProps) {
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  // فاز اولیه‌ی هر بار، تا حرکت هر بار با بقیه کمی متفاوت باشه (نه یکنواخت)
  const phasesRef = useRef(
    Array.from({ length: barCount }, () => Math.random() * Math.PI * 2),
  );

  function computeHeights(t: number) {
    return phasesRef.current.map((phase, i) => {
      const wave =
        Math.sin(t * 0.8 + phase) * 0.5 +
        Math.sin(t * 0.35 + phase * 1.7) * 0.3 +
        Math.sin(t * 1.3 + i * 0.4) * 0.2;
      // نگاشت به بازه‌ی 20% تا 75% ارتفاع
      return 20 + ((wave + 1) / 2) * 55;
    });
  }

  // مقدار اولیه: یک snapshot ثابت از شکل موج (نه فلت)، تا حتی قبل از انیمیشن هم شبیه واقعی باشه
  const [heights, setHeights] = useState<number[]>(() => computeHeights(0));

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const animate = () => {
      tRef.current += 0.02;
      setHeights(computeHeights(tRef.current));
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return (
    <div className="flex items-center gap-x-2 w-full">
      <div className="flex w-full items-center justify-between flex-1 h-7 sm:h-8 overflow-hidden">
        {heights.map((h, i) => (
          <div
            key={i}
            className={`w-0.75 rounded-full shrink-0 ${
              active ? "bg-primary/70" : " bg-muted-foreground"
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div
        className={`${
          active ? " bg-primary/20" : "bg-primary/20 text-primary"
        } size-6 sm:size-8 shrink-0 rounded-full
        flex items-center justify-center`}
      >
        {!active ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
