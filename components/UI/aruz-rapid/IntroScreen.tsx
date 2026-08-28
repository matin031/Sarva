"use client";

import Link from "next/link";

/**
 * صفحهٔ آغاز.
 *
 * نسخهٔ قبلی سه کارتِ سطح داشت (واژه / ترکیب / مصراع) و سه بندِ توضیح. هر
 * دو غلط بودند: محصول فقط مصراع دارد، و کسی پیش از بازی پاراگراف نمی‌خواند.
 * حالا: یک نمایشِ کوچکِ خودِ مکانیزم، چهار جملهٔ کوتاه، یک دکمه.
 */

const STEPS = [
  "مصراع را با اعرابِ کامل ببین.",
  "متن پوشیده می‌شود و واحدها یکی‌یکی می‌آیند.",
  "برای هر واحد U یا _ را بزن.",
  "هر خطا، تو را به واحدِ اولِ همان مصراع برمی‌گرداند.",
];

export default function IntroScreen({
  shortSymbol,
  longSymbol,
  onStart,
  loading,
}: {
  shortSymbol: string;
  longSymbol: string;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <div dir="rtl" className="container mx-auto max-w-lg py-8 sm:py-12">
      <Link
        href="/game"
        className="mb-5 inline-flex items-center gap-x-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        بازگشت به کهکشانِ بازی‌ها
      </Link>

      <div className="aruzr-card aruzr-surface p-6 text-center sm:p-8">
        {/* نمایشِ کوچکِ خودِ مکانیزم: بخشی از مصراع باز، بقیه پوشیده. */}
        <div className="aruzr-panel" aria-hidden="true">
          <div className="aruzr-preview">
            <div className="aruzr-preview-scroll">
              <div
                className="aruzr-text-stack"
                style={{ "--aruzr-reveal": 0.42, "--aruzr-feather": "7px" } as React.CSSProperties}
              >
                <span className="aruzr-text aruzr-text-spoiler" data-spoilered="true">
                  تَوانا بُوَد هَر کِه دانا بُوَد
                </span>
                <span className="aruzr-text aruzr-text-visible">
                  تَوانا بُوَد هَر کِه دانا بُوَد
                </span>
              </div>
            </div>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black text-[color:var(--aruzr-text)] sm:text-3xl">تقطیعِ سریع</h1>
        <p className="aruzr-muted mx-auto mt-2 max-w-sm text-sm sm:text-base">
          یک مصراع، هجا به هجا. کوتاه است یا بلند؟
        </p>

        <ul className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-right">
          {STEPS.map((step, i) => (
            <li
              key={i}
              className="aruzr-muted flex items-start gap-2.5 text-[0.83rem] leading-relaxed sm:text-sm"
            >
              <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[color:var(--aruzr-accent)]" />
              <span>{step}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <button type="button" className="aruzr-cta" onClick={onStart} disabled={loading}>
            {loading ? "…" : "شروع"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
            </svg>
          </button>
        </div>

        <p className="aruzr-subtle mt-5 text-[11px] leading-relaxed">
          روی رایانه: <kbd className="aruzr-kbd">{shortSymbol}</kbd> برای کوتاه،{" "}
          <kbd className="aruzr-kbd">{longSymbol === "_" ? "-" : longSymbol}</kbd> برای بلند.
        </p>
        <p className="aruzr-warn mt-1.5 text-[11px]">
          مصراع‌های این نسخه نمونهٔ نمایشی‌اند و هنوز مرجعِ آموزشیِ سروا نیستند.
        </p>
      </div>
    </div>
  );
}
