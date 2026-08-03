"use client";

import { motion } from "motion/react";
import { useLessonMode } from "@/components/UI/doroos/lesson-mode";

/** The lesson's own control: read it, or be asked about it.
 *
 *  Sticky, because in practice the reader is scrolling through seventeen بیت
 *  and the running score is the point — a tally that scrolls away is a tally
 *  nobody watches. */
export default function LessonModeBar() {
  const ctx = useLessonMode();
  if (!ctx) return null;
  const { mode, setMode, score, reset } = ctx;
  const pct = score.total ? Math.round((score.found / score.total) * 100) : 0;

  return (
    <div className="sticky top-20 z-30 -mx-2 mb-2 px-2">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(
            [
              ["study", "مطالعه"],
              ["practice", "تمرین"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMode(v)}
              aria-pressed={mode === v}
              className={`min-h-9 rounded-full px-5 text-sm font-bold transition-colors ${
                mode === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "practice" ? (
          <div className="flex flex-1 items-center justify-end gap-3">
            <span className="text-sm text-muted-foreground">
              {score.found} از {score.total} واژهٔ نکته‌دار
            </span>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted sm:w-40">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              از نو
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            روی واژه‌ها و نکته‌ها بروید تا به هم وصل شوند
          </p>
        )}
      </div>
    </div>
  );
}
