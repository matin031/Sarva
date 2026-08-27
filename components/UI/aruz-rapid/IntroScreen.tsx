"use client";

import Link from "next/link";
import type { RapidAruzDifficulty } from "@/lib/aruz-rapid/types";
import type { RapidAruzConfig } from "@/lib/aruz-rapid/config";

const STEPS = [
  "متنِ کاملِ اعراب‌گذاری‌شده را چند ثانیه ببین و در ذهنت تقطیعش کن.",
  "متن پوشانده می‌شود و واحدها یکی‌یکی می‌آیند؛ کوتاه یا بلند بودنشان را بزن.",
  "هر پاسخِ درست کمی از متن را باز می‌کند — یک اشتباه یا یک وقت‌تمام، و از واحدِ اول شروع می‌کنی.",
];

const LEVELS: { value: RapidAruzDifficulty; title: string; hint: string }[] = [
  { value: 1, title: "واژه", hint: "یک واژهٔ کوتاه" },
  { value: 2, title: "ترکیب", hint: "چند واژه با هم" },
  { value: 3, title: "مصراع", hint: "یک مصراعِ کامل" },
];

export default function IntroScreen({
  config,
  onStart,
  loading,
}: {
  config: RapidAruzConfig;
  onStart: (difficulty: RapidAruzDifficulty) => void;
  loading: boolean;
}) {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  return (
    <div dir="rtl" className="container mx-auto max-w-xl py-8 sm:py-12">
      <Link
        href="/game"
        className="mb-6 inline-flex items-center gap-x-1 text-sm text-muted-foreground transition-[transform,border-color,filter,color] hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        بازگشت به کهکشانِ بازی‌ها
      </Link>

      <div className="glass relative z-20 overflow-hidden rounded-3xl p-6 text-center sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-1.5 text-xs font-semibold text-primary">
          تمرینِ تقطیع
        </span>

        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">تقطیعِ سریع</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          هجای کوتاه <span className="aruzr-symbol-inline">{config.shortSymbol}</span> یا هجای بلند{" "}
          <span className="aruzr-symbol-inline">{config.longSymbol}</span>؟ سریع تصمیم بگیر.
        </p>

        <ol className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 text-right">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground sm:text-base">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {fa(i + 1)}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-xs font-semibold text-muted-foreground">کدام سطح؟</p>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              data-level={level.value}
              disabled={loading}
              onClick={() => onStart(level.value)}
              className="group flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card px-2 py-3 transition-[transform,border-color,filter,color] hover:border-primary/60 hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              <span className="text-base font-bold text-foreground">{level.title}</span>
              <span className="text-[11px] text-muted-foreground">{level.hint}</span>
              <span className="text-[11px] font-semibold text-primary">
                {fa(config.answerTimeByDifficulty[level.value] / 1000)} ثانیه برای هر واحد
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          روی رایانه می‌توانی از کلیدِ <kbd className="aruzr-kbd">U</kbd> برای کوتاه و{" "}
          <kbd className="aruzr-kbd">-</kbd> برای بلند استفاده کنی.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-amber-500/90">
          متن‌های این نسخه نمونهٔ نمایشی‌اند و هنوز مرجعِ آموزشیِ سروا نیستند.
        </p>
      </div>
    </div>
  );
}
