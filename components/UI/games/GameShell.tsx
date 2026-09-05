"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import OverlayPortal from "@/components/UI/OverlayPortal";
import GameReportButton from "@/components/UI/games/GameReportButton";
import { ReportTargetProvider } from "@/lib/reports/target";
import { RoundGuardProvider } from "@/lib/games/round-guard";
import { useChromeMode } from "@/lib/immersive-mode";

/** Wraps a single game page.
 *
 *  Each game now lives at its own URL, so a refresh simply reloads that game
 *  instead of dumping the player back on the hub. Two guards make that
 *  predictable:
 *
 *  - `beforeunload` asks the browser to confirm a refresh or tab close while a
 *    round is under way — and *only* then. Each game reports that itself
 *    through `useRoundGuard`; the shell cannot tell from the outside, and when
 *    it guessed "always" the warning fired on setup and result screens too,
 *    where there was nothing to lose. See `lib/games/round-guard.tsx`.
 *  - Leaving via the in-page back link goes through our own confirm dialog and
 *    clears the saved round, so no half-finished state leaks into the next
 *    visit. */
export default function GameShell({
  title,
  ownHeading = false,
  progressKeys = [],
  dense = false,
  children,
}: {
  title: string;
  /** خودِ بازی H1 دارد؟ اگر بله، پوسته دومی نمی‌سازد. */
  ownHeading?: boolean;
  /** localStorage keys holding this game's in-progress round */
  progressKeys?: string[];
  /**
   * روی صفحه‌های کوتاه (گوشیِ افقی) نوارِ بالا را جمع می‌کند.
   *
   * گوشیِ افقی حدودِ ۳۹۰ پیکسل ارتفاع دارد و همین نوار با فاصله‌اش نزدیکِ
   * ۵۰ پیکسل از آن را می‌گیرد — که برای بازیِ سه‌بعدی تفاوتِ محسوسی است.
   * در حالتِ فشرده فقط *متنِ* پیوند پنهان می‌شود؛ خودِ دکمه و پیکانش سرِ
   * جایشان می‌مانند، پس راهِ خروج از دست نمی‌رود.
   *
   * پیش‌فرض خاموش است تا رفتارِ بقیهٔ بازی‌ها تغییر نکند.
   */
  dense?: boolean;
  children: ReactNode;
}) {
  const [confirmExit, setConfirmExit] = useState(false);
  /* وقتی بازی‌ای حالتِ غرق‌شده را روشن کرده، این نوار حذف می‌شود: راهِ خروج
     همان لحظه داخلِ HUDـِ خودِ بازی هست و دو تا دکمهٔ بازگشت فقط ارتفاع
     می‌خورند. بازی‌هایی که این حالت را روشن نمی‌کنند تغییری نمی‌بینند. */
  const immersive = useChromeMode() !== "off";

  /* هر بازی با `useRoundGuard` این را روشن/خاموش می‌کند. تا وقتی هیچ بازی‌ای
     چیزی نگفته، نگهبان نصب نمی‌شود. */
  const [roundActive, setRoundActive] = useState(false);
  /* بازیکن خودش زده «بله، خارج شو» — دیگر نباید دوباره از او پرسیده شود. */
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!roundActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return;
      e.preventDefault();
      // required by some browsers to trigger the native dialog
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [roundActive]);

  const leave = () => {
    for (const k of progressKeys) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
    /* ⚠️ اینجا قبلاً `window.onbeforeunload = null` بود و هیچ کاری نمی‌کرد:
       نگهبان با `addEventListener` نصب شده و آن خانهٔ دیگری است — پاک کردنِ
       خصیصه شنونده را برنمی‌دارد. روی این پیوند به چشم نمی‌آمد، چون `Link`
       ناوبریِ سمتِ کلاینت است و اصلاً `beforeunload` نمی‌زند؛ ولی کدی که
       ظاهراً محافظت را برمی‌دارد و در واقع نمی‌دارد، دفعهٔ بعد کسی را گمراه
       می‌کند. حالا خودِ نگهبان این پرچم را می‌خواند. */
    leavingRef.current = true;
    setRoundActive(false);
  };

  return (
    <ReportTargetProvider>
    <div dir="rtl" className="relative z-20">
      {/* ⚠️ تیترِ صفحه، فقط وقتی خودِ بازی تیتری ندارد.
          
          داستانش: `title` قبلاً فقط داخلِ گفت‌وگوی «خروج» استفاده می‌شد و
          نینجا و جاسوس هیچ H1 ای نداشتند. یک `sr-only` اینجا گذاشتم — و
          ممیزیِ بعدی نشان داد چهار بازیِ دیگر (مدار دستور، پلِ وزن،
          واژه‌یاب، جفت‌های ادبی) تیترِ خودشان را دارند و حالا *دو* H1
          گرفته‌اند.

          پس شرطی شد. `ownHeading` را همان صفحه‌ای می‌دهد که می‌داند بازی‌اش
          تیتر دارد؛ حدس زدن از داخلِ پوسته ممکن نیست.

          `sr-only` است و نه پنهانِ واقعی: همان متنی که کاربر می‌بیند و
          می‌شنود، فقط جای دیداری اشغال نمی‌کند. cloaking نیست — متن برای
          کاربر و خزنده یکی است. */}
      {!ownHeading && <h1 className="sr-only">{title}</h1>}
      {!immersive && (
      <div
        className={`container mx-auto flex max-w-4xl items-center justify-between gap-3 pt-6 ${
          dense ? "[@media(max-height:560px)]:pt-2" : ""
        }`}
      >
        <button
          onClick={() => setConfirmExit(true)}
          className="inline-flex items-center gap-x-1 text-sm text-muted-foreground transition-all hover:text-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              /* فلشِ بازگشت رو به راست — در RTL «عقب» سمتِ راست است. */
              d="M15 6l6 6-6 6M21 12H3"
            />
          </svg>
          <span className={dense ? "[@media(max-height:560px)]:hidden" : undefined}>
            بازگشت به کهکشانِ بازی‌ها
          </span>
        </button>

        {/* دکمهٔ گزارش. فقط وقتی ظاهر می‌شود که بازی گفته باشد الان چه چیزی
            روی صفحه است — پس در صفحهٔ انتخابِ درس یا نتیجه دیده نمی‌شود،
            جایی که چیزی برای گزارش کردن نیست.

            بازی‌هایی که این نوار را می‌پوشانند یا غرق‌شده می‌شوند، همین
            دکمه را داخلِ نوارِ خودشان دارند. */}
        <GameReportButton
          compact={dense}
          className={dense ? "[@media(max-height:560px)]:hidden" : ""}
        />
      </div>
      )}

      <RoundGuardProvider value={setRoundActive}>{children}</RoundGuardProvider>

      <AnimatePresence>
        {confirmExit && (
          <OverlayPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmExit(false)}
              className="flex size-full items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-20 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl sm:p-8"
            >
              <h3 className="mb-2 text-lg font-bold sm:text-xl">
                از «{title}» خارج می‌شوی؟
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                اگر الان بیرون بروی، پیشرفتِ این دور از دست می‌رود.
              </p>
              <div className="flex items-center gap-x-3">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition-all hover:brightness-110 active:scale-95 sm:text-base"
                >
                  نه، ادامه بده
                </button>
                <Link
                  href="/game"
                  onClick={leave}
                  className="w-full rounded-xl bg-destructive py-2.5 text-center text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 sm:text-base"
                >
                  بله، خارج شو
                </Link>
                </div>
              </motion.div>
            </motion.div>
          </OverlayPortal>
        )}
      </AnimatePresence>
    </div>
    </ReportTargetProvider>
  );
}
