"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useImmersiveMode } from "@/lib/immersive-mode";

/** Wraps a single game page.
 *
 *  Each game now lives at its own URL, so a refresh simply reloads that game
 *  instead of dumping the player back on the hub. Two guards make that
 *  predictable:
 *
 *  - `beforeunload` asks the browser to confirm a refresh or tab close while a
 *    round is under way. Browsers only surface this once the player has
 *    actually interacted with the page, so opening a game and immediately
 *    leaving stays friction-free.
 *  - Leaving via the in-page back link goes through our own confirm dialog and
 *    clears the saved round, so no half-finished state leaks into the next
 *    visit. */
export default function GameShell({
  title,
  progressKeys = [],
  dense = false,
  children,
}: {
  title: string;
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
  const immersive = useImmersiveMode();

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // required by some browsers to trigger the native dialog
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const leave = () => {
    for (const k of progressKeys) {
      try {
        localStorage.removeItem(k);
      } catch {}
    }
    // the shell is unmounting anyway; drop the guard so the navigation is clean
    window.onbeforeunload = null;
  };

  return (
    <div dir="rtl" className="relative z-20">
      {!immersive && (
      <div
        className={`container mx-auto max-w-4xl pt-6 ${
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
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          <span className={dense ? "[@media(max-height:560px)]:hidden" : undefined}>
            بازگشت به کهکشانِ بازی‌ها
          </span>
        </button>
      </div>
      )}

      {children}

      <AnimatePresence>
        {confirmExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmExit(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
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
        )}
      </AnimatePresence>
    </div>
  );
}
