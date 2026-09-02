"use client";

import GameReportButton from "@/components/UI/games/GameReportButton";

/** نوارِ بالای بازی در حالتِ تمام‌صفحه.
 *
 *  فقط سه چیزِ ضروری: خروج، هویتِ سروا، صدا. سه‌ستونیِ 1fr auto 1fr است تا
 *  ستونِ میانی همیشه دقیقاً وسطِ صفحه بماند — چه شمارنده دو رقمی باشد چه سه
 *  رقمی. هیچ margin دستی برای جبران وجود ندارد. */
export default function CompactGameTopBar({
  onExit,
  soundOn,
  onToggleSound,
  children,
}: {
  onExit: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="aruzr-topbar" dir="rtl">
      <div className="aruzr-topbar-side">
        <button
          type="button"
          onClick={onExit}
          className="aruzr-icon-btn"
          aria-label="خروج از بازی"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
          </svg>
        </button>
      </div>

      <div className="aruzr-topbar-center">{children}</div>

      <div className="aruzr-topbar-side aruzr-topbar-side-end">
        {/* در حالِ بازی، نوارِ بالای پوستهٔ سایت رندر نمی‌شود؛ راهِ گزارش
            همین‌جاست. */}
        <GameReportButton
          compact
          variant="bare"
          className="aruzr-icon-btn inline-flex items-center justify-center [&>svg]:size-5"
        />
        <button
          type="button"
          onClick={onToggleSound}
          className="aruzr-icon-btn"
          aria-label={soundOn ? "خاموش‌کردن صدا" : "روشن‌کردن صدا"}
          aria-pressed={soundOn}
        >
          {soundOn ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4zM16 10l4 4m0-4-4 4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
