"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import QuizStyleQuestion from "@/components/UI/panel/QuizStyleQuestion";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { jalali, relativeDay } from "@/lib/panel/format";
import { ARUZ_TYPE_LABEL } from "@/lib/panel/types";
import type { AruzAnswer, AruzAttempt } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/** آزمون‌های پیشینِ عروض.
 *
 *  Each row expands into that attempt's own questions, rendered by the very
 *  components the quiz page uses, so a بیت prompt, an audio prompt and a وزن
 *  prompt each come back looking exactly as they did during the test. Questions
 *  are shown one at a time, like the quiz: it keeps the layout identical and
 *  keeps one WaveSurfer instance per option instead of one per option per
 *  question. Attempts themselves arrive a page at a time — a student with fifty
 *  tests behind them should not pull fifty tests' worth of audio metadata down
 *  just to look at the newest one. */
export default function AruzAttemptList({
  attempts,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  attempts: AruzAttempt[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!attempts.length) {
    return (
      <div className=" mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
        <p className=" text-muted-foreground">
          هنوز آزمون عروضی نداده‌ای.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-4 flex flex-col gap-y-2.5">
      {attempts.map((attempt) => (
        <AttemptRow
          key={attempt.id}
          attempt={attempt}
          open={openId === attempt.id}
          onToggle={() =>
            setOpenId((id) => (id === attempt.id ? null : attempt.id))
          }
        />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className={`mx-auto mt-2 inline-flex items-center gap-x-2 rounded-xl border border-border
            bg-card px-6 py-3 text-sm font-medium transition-all ${
              loadingMore
                ? "cursor-not-allowed text-muted-foreground"
                : "cursor-pointer hover:border-primary/50 hover:text-primary active:scale-95"
            }`}
        >
          {loadingMore ? (
            "در حال بارگیری…"
          ) : (
            <>
              بارگیری آزمون‌های بیشتر
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function AttemptRow({
  attempt,
  open,
  onToggle,
}: {
  attempt: AruzAttempt;
  open: boolean;
  onToggle: () => void;
}) {
  const percent = attempt.total
    ? Math.round((attempt.correct / attempt.total) * 100)
    : 0;
  const wrong = Math.max(attempt.total - attempt.correct, 0);

  return (
    <div className=" rounded-2xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/35 sm:p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className=" flex w-full cursor-pointer items-center justify-between gap-3 text-right"
      >
        <div className=" flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <AnimatedCircularProgress value={percent} className="size-12 sm:size-14" />
          <div className=" min-w-0">
            <p className=" truncate text-sm font-bold sm:text-base">
              {toFa(attempt.correct)} از {toFa(attempt.total)} پاسخ درست
            </p>
            <p className=" mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{relativeDay(attempt.createdAt)}</span>
              <span className=" opacity-60">{jalali(attempt.createdAt)}</span>
            </p>
          </div>
        </div>
        <div className=" flex shrink-0 items-center gap-x-2 text-xs text-muted-foreground">
          {wrong > 0 && <span className=" text-destructive">{toFa(wrong)} نادرست</span>}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`size-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" overflow-hidden"
          >
            <div className=" bg-secondary p-4 mt-3 rounded-xl">
              <AttemptQuestions answers={attempt.answers} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The quiz, replayed. One question on screen at a time, same card, same option
 *  grid, same right/wrong colours. */
function AttemptQuestions({ answers }: { answers: AruzAnswer[] }) {
  const [index, setIndex] = useState(0);

  if (!answers.length) {
    return (
      <p className=" text-center text-muted-foreground py-6">
        سؤال‌های این آزمون ذخیره نشده‌اند.
      </p>
    );
  }

  const at = Math.min(index, answers.length - 1);
  const answer = answers[at];
  const goTo = (i: number) =>
    setIndex(Math.max(0, Math.min(i, answers.length - 1)));

  return (
    <div dir="rtl" className=" w-full">
      {/* progress + counter, mirroring the quiz header */}
      <div className=" text-xs sm:text-sm flex justify-between items-center w-full">
        <span>
          پرسش {toFa(at + 1)} از {toFa(answers.length)}
        </span>
        {answer.type && (
          <span className=" text-primary">{ARUZ_TYPE_LABEL[answer.type]}</span>
        )}
      </div>
      <div className=" mt-2 rounded-full h-2 bg-muted overflow-hidden w-full">
        <div
          style={{ width: `${Math.round(((at + 1) / answers.length) * 100)}%` }}
          className="h-full bg-linear-to-l from-primary transition-all to-turquoise-light"
        />
      </div>

      {/* jump to any question — green right, red wrong, grey unanswered */}
      <div className=" mt-4 flex flex-wrap gap-2">
        {answers.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => goTo(i)}
            aria-current={i === at}
            className={`size-8 cursor-pointer rounded-lg border-2 text-xs font-bold transition-all
              ${
                a.selectedOptionId === null
                  ? "border-border bg-card text-muted-foreground"
                  : a.isCorrect
                    ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
              }
              ${i === at ? "scale-110 ring-2 ring-primary" : "hover:scale-105"}`}
          >
            {toFa(i + 1)}
          </button>
        ))}
      </div>

      <QuizStyleQuestion
        key={answer.id}
        question={{
          id: answer.questionId ?? answer.id,
          type: answer.type,
          poem: answer.poem,
          audioUrl: answer.audioUrl,
          options: answer.options,
        }}
        selectedOptionId={answer.selectedOptionId}
      />

      {answer.selectedOptionId === null && answer.type && (
        <p className=" mt-4 text-sm text-muted-foreground">
          به این پرسش پاسخ ندادی؛ گزینهٔ درست با رنگ سبز مشخص شده است.
        </p>
      )}

      {/* prev on the left, next on the right — the direction the reader moves */}
      <div className="w-full mt-6 flex items-center justify-between gap-x-3">
        <button
          type="button"
          onClick={() => goTo(at - 1)}
          disabled={at === 0}
          className={`bg-surface border border-border/70 transition-all whitespace-nowrap text-sm md:text-lg
               h-9 rounded-lg md:rounded-xl px-5 md:px-6 py-3 md:py-6
              inline-flex items-center justify-between gap-x-2 font-medium ${
                at === 0
                  ? "text-black/20 dark:text-white/20 cursor-not-allowed"
                  : "text-black/70 dark:text-white/70 hover:brightness-110 active:scale-95 cursor-pointer"
              }`}
        >
          سؤال قبلی
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => goTo(at + 1)}
          disabled={at + 1 >= answers.length}
          className={`transition-all whitespace-nowrap text-sm md:text-lg
              text-primary-foreground h-9 rounded-lg md:rounded-xl px-5 md:px-8 py-3 md:py-6
              inline-flex items-center justify-center font-medium ${
                at + 1 >= answers.length
                  ? "bg-primary/50 cursor-not-allowed"
                  : "bg-primary hover:brightness-90 cursor-pointer"
              }`}
        >
          سؤال بعدی
        </button>
      </div>
    </div>
  );
}
