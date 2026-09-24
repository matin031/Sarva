"use client";

import { motion, useReducedMotion } from "motion/react";
import type { PartResult } from "@/lib/exam/result-types";

const faNum = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

/** Score options for a self-graded part: 0 up to maxScore in 0.25 steps
 *  (e.g. maxScore 1 → 0, ۰٫۲۵, ۰٫۵, ۰٫۷۵, ۱). */
function scoreOptions(maxScore: number): number[] {
  const steps = Math.round(maxScore / 0.25);
  return Array.from({ length: steps + 1 }, (_, i) => i * 0.25);
}

const statusStyles: Record<PartResult["status"], { label: string; box: string; badge: string }> = {
  correct: {
    label: "درست",
    box: "border-green-500/40 bg-green-500/10 text-green-800 dark:text-green-300",
    badge: "bg-green-500 text-white",
  },
  incorrect: {
    label: "نادرست",
    box: "border-destructive/40 bg-destructive/10 text-destructive",
    badge: "bg-destructive text-white",
  },
  partial: {
    label: "ناقص",
    box: "border-gold/50 bg-gold/15 text-foreground",
    badge: "bg-gold text-black",
  },
  needs_review: {
    label: "خودارزیابی",
    box: "border-border bg-muted text-muted-foreground",
    badge: "bg-muted-foreground/25 text-foreground",
  },
};

/** The round badge at the start of the box. The tick draws itself in —
 *  a small thing, but it's the moment the student is waiting for. */
function StatusBadge({ status, animate }: { status: PartResult["status"]; animate: boolean }) {
  const path =
    status === "correct"
      ? "M5 12.5l4.2 4.2L19 7"
      : status === "incorrect"
        ? "M7 7l10 10M17 7L7 17"
        : status === "partial"
          ? "M6 12h12"
          : "M12 7v5l3 2";
  return (
    <motion.span
      initial={animate ? { scale: 0.4, rotate: -20 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 18, delay: 0.05 }}
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${statusStyles[status].badge}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d={path}
          initial={animate ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.18, ease: "easeOut" }}
        />
      </svg>
    </motion.span>
  );
}

type Props = {
  result: PartResult;
  /** true only right after «ثبت پاسخ» — revisiting a question doesn't replay it */
  fresh: boolean;
  index: number;
  onSelfGrade?: (score: number) => void;
};

export default function AnswerFeedback({ result, fresh, index, onSelfGrade }: Props) {
  const reduce = useReducedMotion();
  const animate = fresh && !reduce;

  // A self-graded part starts as needs_review (ungraded); once the student
  // picks a score its status flips to correct/partial/incorrect.
  const isSelfGrade = result.selfGrade;
  const graded = result.status !== "needs_review";
  const status: PartResult["status"] = isSelfGrade && !graded ? "needs_review" : result.status;
  const style = statusStyles[status];
  const showScore = !isSelfGrade ? result.status !== "needs_review" : graded;
  // the key adds nothing when an auto-graded answer was right
  const showKey = !(result.status === "correct" && !isSelfGrade && !result.feedback);

  return (
    <motion.div
      dir="rtl"
      data-answer-feedback
      initial={animate ? { opacity: 0, y: -6, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 26, delay: animate ? index * 0.07 : 0 }}
      className={`flex scroll-mb-28 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-sm ${style.box}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <StatusBadge status={status} animate={animate} />
          {style.label}
        </span>
        {showScore && (
          <span className="text-xs font-medium tabular-nums">
            {faNum(result.score)} از {faNum(result.maxScore)}
          </span>
        )}
      </div>

      {showKey && (
        <p className="leading-relaxed">
          <span className="text-muted-foreground">پاسخ صحیح: </span>
          <span className="font-medium text-foreground">{result.correctAnswerText}</span>
        </p>
      )}

      {isSelfGrade && (
        <div className="mt-1 border-t border-current/15 pt-2">
          <p className="mb-2 text-xs text-muted-foreground">پاسخت را با پاسخ صحیح مقایسه کن و نمره بده:</p>
          <div className="flex flex-wrap gap-1.5">
            {scoreOptions(result.maxScore).map((v) => {
              const selected = graded && Math.abs(result.score - v) < 0.001;
              return (
                <motion.button
                  key={v}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelfGrade?.(v)}
                  aria-pressed={selected}
                  className={`min-h-9 min-w-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {faNum(v)}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {result.feedback && (
        <p className="mt-1 flex gap-1.5 border-t border-current/15 pt-1.5 leading-relaxed whitespace-pre-line">
          <span className="shrink-0" aria-hidden>
            ✦
          </span>
          <span>{result.feedback}</span>
        </p>
      )}
    </motion.div>
  );
}
