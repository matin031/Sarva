"use client";

import { AnimatePresence, motion } from "motion/react";
import type { VocabQuestion } from "@/lib/vocab-data";

const EASE = [0.16, 1, 0.3, 1] as const;

/** فهرستِ سؤال‌ها — the index.
 *
 *  A single «سوال قبل» button only ever walks back one step, so getting to an
 *  earlier question meant pressing it repeatedly. This lists every question at
 *  once with its state, so any of them is one tap away. */
export default function QuestionIndex({
  open,
  onClose,
  questions,
  picks,
  current,
  onJump,
  canVisit,
  resumeAt,
}: {
  open: boolean;
  onClose: () => void;
  questions: VocabQuestion[];
  picks: Record<number, string>;
  current: number;
  onJump: (index: number) => void;
  /** answered questions, plus the resume point — never an unseen one */
  canVisit: (index: number) => boolean;
  /** the question play resumes at, or -1 while reviewing */
  resumeAt: number;
}) {
  const answered = Object.keys(picks).length;
  const correct = questions.reduce(
    (n, q, i) => n + (picks[i] === q.answer.id ? 1 : 0),
    0,
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/50"
          />
          <motion.div
            key="sheet"
            dir="rtl"
            role="dialog"
            aria-label="فهرست سؤال‌ها"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="fixed inset-x-3 top-1/2 z-[95] mx-auto max-h-[78vh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">
                  فهرستِ سؤال‌ها
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {answered.toLocaleString("fa-IR")} از{" "}
                  {questions.length.toLocaleString("fa-IR")} پاسخ داده‌شده —{" "}
                  {correct.toLocaleString("fa-IR")} درست
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="بستن"
                className="rounded-full border border-border bg-background px-3 py-1 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                بستن
              </button>
            </div>

            {/* legend */}
            <ul className="mb-3 flex flex-wrap gap-3 text-[11px] font-bold">
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-green-500" />
                <span className="text-muted-foreground">درست</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-destructive" />
                <span className="text-muted-foreground">غلط</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">هنوز نرسیده‌ای</span>
              </li>
            </ul>
            <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
              فقط سؤال‌هایی که پاسخ داده‌ای باز می‌شوند؛ نمی‌توانی از سؤالی
              بی‌پاسخ بپری.
            </p>

            <div className="grid grid-cols-5 gap-2 xs:grid-cols-6 sm:grid-cols-8">
              {questions.map((q, i) => {
                const pick = picks[i];
                const state =
                  pick == null
                    ? "todo"
                    : pick === q.answer.id
                      ? "correct"
                      : "wrong";
                const isCurrent = i === current;
                const open = canVisit(i);
                const isResume = i === resumeAt;
                return (
                  <button
                    key={i}
                    disabled={!open}
                    onClick={() => {
                      onJump(i);
                      onClose();
                    }}
                    aria-current={isCurrent ? "true" : undefined}
                    title={
                      pick != null
                        ? q.answer.word
                        : isResume
                          ? "ادامه از اینجا"
                          : "هنوز به این سؤال نرسیده‌ای"
                    }
                    className={`relative z-20 flex aspect-square items-center justify-center rounded-xl border-2 text-sm font-black transition-all ${
                      open ? "active:scale-95" : "cursor-not-allowed opacity-45"
                    } ${
                      state === "correct"
                        ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                        : state === "wrong"
                          ? "border-destructive bg-destructive/15 text-destructive"
                          : isResume
                            ? "border-primary/60 border-dashed bg-primary/5 text-primary"
                            : "border-border bg-background text-muted-foreground"
                    } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                  >
                    {(i + 1).toLocaleString("fa-IR")}
                  </button>
                );
              })}
            </div>

            {/* answered questions carry their word, so the list doubles as a
                review of what has been learned so far */}
            {answered > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="mb-2 text-xs font-black text-muted-foreground">
                  واژه‌هایی که تا اینجا دیدی
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q, i) =>
                    picks[i] != null ? (
                      <button
                        key={i}
                        onClick={() => {
                          onJump(i);
                          onClose();
                        }}
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                          picks[i] === q.answer.id
                            ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {q.answer.word}
                      </button>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
