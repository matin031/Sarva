"use client";

import type { ReactNode } from "react";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** پوستهٔ بازیِ فعال.
 *
 *  «واکنش‌گرا» به‌تنهایی کافی نیست: در حالِ بازی، *خودِ صفحه* نباید اسکرول
 *  داشته باشد. برای همین این پوسته `fixed` و `100dvh` است، هدر و فوترِ سایت را
 *  می‌پوشاند، و اسکرول فقط داخلِ ناحیهٔ تحلیل و سینی اتفاق می‌افتد.
 *
 *  زنجیرهٔ `min-height:0` از خودِ پوسته تا ناحیهٔ تحلیل ادامه دارد؛ بدونِ آن،
 *  فرزندِ flex کوچک نمی‌شود و `overflow:hidden`ِ ریشه هیچ کاری نمی‌کند.
 *
 *  نوارِ بالا شبکهٔ `1fr auto 1fr` است تا ستونِ میانی دقیقاً وسط بماند و
 *  دکمه‌های دو طرف مرکزِ دیداری را جابه‌جا نکنند. */
export interface ActiveShellProps {
  questionNumber: number;
  questionCount: number;
  connected: number;
  required: number;
  wrongAttempts: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  onRestartQuestion: () => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
  tray: ReactNode;
  banner: ReactNode;
}

export default function ActiveShell({
  questionNumber,
  questionCount,
  connected,
  required,
  wrongAttempts,
  soundOn,
  onToggleSound,
  onExit,
  onRestartQuestion,
  viewportRef,
  children,
  tray,
  banner,
}: ActiveShellProps) {
  return (
    <div dir="rtl" className="gc-shell gc-root">
      <header className="gc-topbar">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--gc-text-muted)] transition-colors hover:text-[var(--gc-accent)]"
          >
            خروج
          </button>
          <button
            type="button"
            onClick={onRestartQuestion}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--gc-text-muted)] transition-colors hover:text-[var(--gc-accent)]"
          >
            از نو
          </button>
        </div>

        <div className="flex flex-col items-center leading-tight">
          <span className="text-xs font-bold">
            مدارِ {fa(questionNumber)} از {fa(questionCount)}
          </span>
          {/* جداکننده یک عنصرِ جداست: نقطهٔ وسطِ متنی بینِ ارقامِ فارسی به‌راحتی
              با «۰» اشتباه گرفته می‌شود. */}
          <span className="flex items-center gap-1.5 text-[0.68rem] text-[var(--gc-text-muted)]">
            <span>
              {fa(connected)}/{fa(required)} نقش وصل شده
            </span>
            {wrongAttempts > 0 && (
              <>
                <span aria-hidden className="inline-block size-1 rounded-full bg-current opacity-50" />
                <span>{fa(wrongAttempts)} تلاشِ نادرست</span>
              </>
            )}
          </span>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "خاموش کردنِ صدا" : "روشن کردنِ صدا"}
            className="rounded-lg p-1.5 text-[var(--gc-text-muted)] transition-colors hover:text-[var(--gc-accent)]"
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m16 9 5 6M21 9l-5 6" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="gc-board">
        <div ref={viewportRef} className="gc-viewport">
          {children}
        </div>
        {tray}
      </div>

      {banner}
    </div>
  );
}
