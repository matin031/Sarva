"use client";

import Link from "next/link";
import MainLogo from "@/components/svgs/mainLogo";
import GameReportButton from "@/components/UI/games/GameReportButton";

/* نوارِ بالای بازی روی موبایل — جایگزینِ سربرگِ کاملِ سایت در حینِ بازی.
 *
 * سربرگِ عادی روی گوشی نزدیکِ ۶۸ پیکسل می‌گرفت و ناوبریِ ثانویه‌اش وسطِ بازی
 * هیچ کاربردی نداشت. اینجا فقط سه چیز می‌ماند: نشانِ سروا (تا معلوم باشد
 * هنوز داخلِ سایتیم)، راهِ خروج، و کلیدِ صدا.
 *
 * ارتفاعِ هدف ~۴۸ پیکسل، با همان توکن‌های فاصله و رنگِ بقیهٔ سایت. */

export function GameTopBar({
  muted,
  onToggleMute,
}: {
  muted: boolean;
  onToggleMute: () => void;
}) {
  const button =
    "rounded-lg border border-border bg-card/70 p-1.5 text-muted-foreground transition-all hover:text-foreground active:scale-95";

  return (
    <div
      dir="rtl"
      className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-1.5"
    >
      <Link href="/game" className="flex items-center gap-1.5" aria-label="سروا — بازگشت به بازی‌ها">
        <span className="size-7 text-primary">
          <MainLogo />
        </span>
        <span className="text-sm font-bold text-primary">سروا</span>
      </Link>

      <div className="flex items-center gap-1.5">
        {/* در حالتِ تمام‌صفحهٔ موبایل، نوارِ بالای پوسته وجود ندارد. */}
        <GameReportButton compact variant="bare" className={`${button} inline-flex items-center [&>svg]:size-4`} />
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "روشن‌کردن صدا" : "خاموش‌کردن صدا"}
          aria-pressed={muted}
          className={button}
        >
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
            </svg>
          )}
        </button>
        <Link href="/game" aria-label="خروج از بازی" className={button}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
