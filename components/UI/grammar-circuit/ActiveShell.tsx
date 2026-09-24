"use client";

import type { ReactNode } from "react";
import GameReportButton from "@/components/UI/games/GameReportButton";
import { GameBackButton, gameIconButton } from "@/components/UI/games/GameNav";
import { useBoardPan } from "./hooks/useBoardPan";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** پوستهٔ بازیِ فعال.
 *
 *  در حالِ بازی، *خودِ صفحه* اسکرول ندارد. پوسته `fixed` و `100dvh` است، هدر و
 *  فوترِ سایت را می‌پوشاند، و اسکرول فقط داخلِ ناحیهٔ مدار اتفاق می‌افتد.
 *
 *  ترتیبِ عمودی عمداً همین است:
 *      نوارِ بالا → صورتِ کاملِ سؤال → مدار → داک (قطعه‌ها + دکمهٔ بررسی)
 *  دکمهٔ بررسی پایینِ داک است تا روی گوشی زیرِ شست باشد.
 *
 *  همهٔ ویژگی‌های حیاتیِ چیدمان درون‌خطی‌اند نه فقط در کلاس: یک بار دیدیم که
 *  وقتی شیوه‌نامهٔ بازی به مرورگر نمی‌رسد، پوسته یک بلوکِ عادی می‌شود و
 *  سایت از زیرش بیرون می‌زند. */
export interface ActiveShellProps {
  questionNumber: number;
  questionCount: number;
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
}

export default function ActiveShell({
  questionNumber,
  questionCount,
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
}: ActiveShellProps) {
  // کشیدنِ تخته با انگشت — راهِ دومی که به اسکرولِ بومیِ مرورگر وابسته نیست.
  // دلیلش در خودِ هوک نوشته شده: روی سافاریِ آیفون اسکرولِ بومی نمی‌گرفت.
  useBoardPan(viewportRef, true);

  const progress = questionCount > 0 ? (questionNumber / questionCount) * 100 : 0;

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
      <header className="gc-topbar" style={{ flex: "0 0 auto" }}>
        <GameBackButton onClick={onExit} compact className="gc-nav" />

        <div className="gc-progress">
          <span className="gc-progress-text">
            {fa(questionNumber)} <span className="gc-progress-of">از {fa(questionCount)}</span>
          </span>
          <span
            className="gc-progress-track"
            role="progressbar"
            aria-label="پیشرفت تمرین"
            aria-valuemin={1}
            aria-valuemax={questionCount}
            aria-valuenow={questionNumber}
          >
            <span className="gc-progress-fill" style={{ width: `${progress}%` }} />
          </span>
        </div>

        <div className="gc-topbar-end">
          <button
            type="button"
            onClick={onClearBoard}
            disabled={clearDisabled}
            className={`${gameIconButton} gc-nav`}
            aria-label="خالی کردن خانه‌ها"
            title="خالی کردن خانه‌ها"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
            </svg>
          </button>
          {/* نوارِ بالای پوستهٔ بازی زیرِ این پوستهٔ `fixed` می‌ماند، پس دکمهٔ
              گزارش همین‌جا کنارِ صدا می‌نشیند. */}
          <GameReportButton className="gc-nav" />
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "بی‌صدا" : "صدادار"}
            className={`${gameIconButton} game-nav-toggle gc-nav`}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
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

      <div className="gc-dock" style={{ flex: "0 0 auto" }}>
        {tray}
        {controls}
      </div>
    </div>
  );
}
