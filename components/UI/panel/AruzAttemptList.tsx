"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ARUZ_TYPE_LABEL,
  type AruzAttempt,
  type AruzQuestionType,
} from "@/lib/panel/types";
import { clock, fa, jalaliLong, pct, relativeDay } from "@/lib/panel/format";
import { Card, ScoreBar } from "@/components/UI/panel/primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Past عروض attempts. Each row expands to the individual answers, grouped by
 *  question type so a long attempt stays readable however many questions it
 *  had. */
export default function AruzAttemptList({
  attempts,
}: {
  attempts: AruzAttempt[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="space-y-3">
      {attempts.map((a, i) => {
        const open = openId === a.id;
        const groups = new Map<string, typeof a.answers>();
        for (const ans of a.answers) {
          const key = ans.type ?? "unknown";
          groups.set(key, [...(groups.get(key) ?? []), ans]);
        }

        return (
          <li key={a.id}>
            <Card index={i} className="overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : a.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 p-4 text-right"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-black text-foreground">
                      {relativeDay(a.createdAt)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {jalaliLong(a.createdAt)} — ساعت {clock(a.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <ScoreBar correct={a.correct} total={a.total} />
                    </div>
                    <span className="shrink-0 text-xs font-bold text-muted-foreground">
                      {fa(a.correct)}/{fa(a.total)} — {pct(a.correct, a.total)}
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
                    <div className="space-y-4 border-t border-border p-4">
                      {[...groups.entries()].map(([type, answers]) => (
                        <div key={type}>
                          <div className="mb-2 flex items-baseline justify-between gap-2">
                            <h3 className="text-xs font-black text-primary">
                              {ARUZ_TYPE_LABEL[type as AruzQuestionType] ??
                                "نوعِ نامشخص"}
                            </h3>
                            <span className="text-[11px] text-muted-foreground">
                              {fa(answers.filter((x) => x.isCorrect).length)} از{" "}
                              {fa(answers.length)} درست
                            </span>
                          </div>
                          <ul className="space-y-1.5">
                            {answers.map((ans, n) => (
                              <li
                                key={ans.id}
                                className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${
                                  ans.isCorrect
                                    ? "border-green-500/40 bg-green-500/5"
                                    : "border-destructive/40 bg-destructive/5"
                                }`}
                              >
                                <span
                                  aria-hidden
                                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                                    ans.isCorrect
                                      ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                      : "bg-destructive/20 text-destructive"
                                  }`}
                                >
                                  {ans.isCorrect ? "✓" : "✕"}
                                </span>
                                <span className="min-w-0 text-xs leading-relaxed text-foreground">
                                  {ans.poem?.length
                                    ? ans.poem.join(" / ")
                                    : `سؤال ${fa(n + 1)}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
