"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fa, pct } from "@/lib/panel/format";
import { Card, ScoreBar } from "@/components/UI/panel/primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

type Attempt = {
  id: string;
  examTitle: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  results: Record<string, { score?: number; max?: number }>;
};

/** One final-exam report card. The per-question grid scales to any number of
 *  questions — a 12-question paper and a 40-question one both stay readable
 *  because the questions are chips, not rows. */
export default function ExamAttemptCard({
  attempt,
  index,
  when,
}: {
  attempt: Attempt;
  index: number;
  when: string;
}) {
  const [open, setOpen] = useState(false);

  const entries = Object.entries(attempt.results)
    .map(([key, v]) => ({
      key,
      n: Number(key),
      score: Number(v?.score ?? 0),
      max: Number(v?.max ?? 0),
    }))
    .sort((a, b) => (Number.isFinite(a.n) && Number.isFinite(b.n) ? a.n - b.n : 0));

  const full = entries.filter((e) => e.max > 0 && e.score >= e.max).length;
  const zero = entries.filter((e) => e.max > 0 && e.score === 0).length;
  const partial = entries.length - full - zero;

  return (
    <Card index={index} className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-4 text-right"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-foreground">
            {attempt.examTitle}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{when}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <ScoreBar correct={attempt.totalScore} total={attempt.maxScore} />
            </div>
            <span className="shrink-0 text-xs font-bold text-muted-foreground">
              {fa(Math.round(attempt.totalScore * 10) / 10)}/
              {fa(attempt.maxScore)} — {pct(attempt.totalScore, attempt.maxScore)}
            </span>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ریزِ نمرهٔ این آزمون ذخیره نشده است.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-green-700 dark:text-green-400">
                      کامل: {fa(full)}
                    </span>
                    <span className="rounded-full bg-gold/15 px-2.5 py-1 text-gold">
                      نیمه: {fa(partial)}
                    </span>
                    <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">
                      بی‌نمره: {fa(zero)}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 xs:grid-cols-8 sm:grid-cols-10">
                    {entries.map((e) => {
                      const kind =
                        e.max <= 0
                          ? "none"
                          : e.score >= e.max
                            ? "full"
                            : e.score > 0
                              ? "partial"
                              : "zero";
                      return (
                        <span
                          key={e.key}
                          title={`سؤال ${e.n + 1}: ${e.score} از ${e.max}`}
                          className={`flex aspect-square items-center justify-center rounded-lg border text-[11px] font-black ${
                            kind === "full"
                              ? "border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-400"
                              : kind === "partial"
                                ? "border-gold/50 bg-gold/15 text-gold"
                                : kind === "zero"
                                  ? "border-destructive/50 bg-destructive/15 text-destructive"
                                  : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {fa(Number.isFinite(e.n) ? e.n + 1 : e.key)}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    روی هر خانه نگه دار تا نمرهٔ آن سؤال را ببینی.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
