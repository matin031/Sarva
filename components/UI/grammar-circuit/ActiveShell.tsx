"use client";

import type { ReactNode } from "react";
import CircuitPersianBackground from "./CircuitPersianBackground";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** پوستهٔ بازیِ فعال.
 *
 *  در حالِ بازی، *خودِ صفحه* اسکرول ندارد. پوسته `fixed` و `100dvh` است، هدر و
 *  فوترِ سایت را می‌پوشاند، و اسکرول فقط داخلِ ناحیهٔ مدار اتفاق می‌افتد.
 *
 *  ترتیبِ عمودی عمداً همین است:
 *      نوارِ فشرده → صورتِ کاملِ سؤال → مدار → دکمهٔ بررسی → سینیِ نقش‌ها
 *  صورتِ سؤال *بیرونِ* ناحیهٔ اسکرولِ افقی است، چون دانش‌آموز هیچ‌وقت نباید
 *  برای خواندنِ سؤال صفحه را کنار بکشد.
 *
 *  همهٔ ویژگی‌های حیاتیِ چیدمان درون‌خطی‌اند نه فقط در کلاس: یک بار دیدیم که
 *  وقتی شیوه‌نامهٔ بازی به مرورگر نمی‌رسد، پوسته یک بلوکِ عادی می‌شود و
 *  سایت از زیرش بیرون می‌زند. */
export interface ActiveShellProps {
  questionNumber: number;
  questionCount: number;
  filled: number;
  required: number;
  attempts: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  onClearBoard: () => void;
  clearDisabled: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  question: ReactNode;
  children: ReactNode;
  controls: ReactNode;
  tray: ReactNode;
  banner: ReactNode;
}

export default function ActiveShell({
  questionNumber,
  questionCount,
  filled,
  required,
  attempts,
  soundOn,
  onToggleSound,
  onExit,
  onClearBoard,
  clearDisabled,
  viewportRef,
  question,
  children,
  controls,
  tray,
  banner,
}: ActiveShellProps) {
  return (
    <div
      dir="rtl"
      className="gc-shell gc-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        width: "100%",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        background: "var(--gc-bg, #f7f3ea)",
      }}
    >
      {/* هندسهٔ ایرانیِ سروا، برق‌دار. زیرِ همه‌چیز و بی‌اثر روی ورودی. */}
      <CircuitPersianBackground />

      <header className="gc-topbar" style={{ flex: "0 0 auto" }}>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onExit} className="gc-topbar-btn">
            خروج
          </button>
          <button
            type="button"
            onClick={onClearBoard}
            disabled={clearDisabled}
            className="gc-topbar-btn"
          >
            بازچینی
          </button>
        </div>

        <div className="flex flex-col items-center leading-tight">
          <span className="text-xs font-bold">
            مدارِ {fa(questionNumber)} از {fa(questionCount)}
          </span>
          <span className="flex items-center gap-1.5 text-[0.68rem] text-[var(--gc-text-muted)]">
            <span>
              {fa(filled)}/{fa(required)} خانه پر شده
            </span>
            {attempts > 0 && (
              <>
                <span aria-hidden className="inline-block size-1 rounded-full bg-current opacity-50" />
                <span>بررسیِ {fa(attempts)}</span>
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
            className="gc-topbar-btn gc-topbar-icon"
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

      {/* صورتِ سؤال — همیشه کامل و بدونِ اسکرولِ افقی. */}
      {question}

      <div
        className="gc-board"
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <div
          ref={viewportRef}
          className="gc-viewport"
          style={{
            position: "relative",
            flex: "0 1 auto",
            marginBlock: "auto",
            marginInline: "auto",
            /* `min-height` عمداً درون‌خطی نیست: کفِ ارتفاعِ تخته یک تصمیمِ
               *واکنش‌گراست* و در شیوه‌نامه با media query تنظیم می‌شود. زنجیرهٔ
               کوچک‌شدن روی *نیاکان* (پوسته و برد) تأمین شده، نه اینجا. */
            maxHeight: "100%",
            width: "fit-content",
            minWidth: "min(100%, 300px)",
            maxWidth: "100%",
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          {children}
        </div>
      </div>

      {controls}
      {tray}
      {banner}
    </div>
  );
}
