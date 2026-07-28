"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import QuizStyleQuestion from "@/components/UI/panel/QuizStyleQuestion";
import { jalali, scoreColor } from "@/lib/panel/format";
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
      <div className=" bg-card shadow rounded-xl p-8 mt-3 text-center">
        <p className=" text-muted-foreground">
          هنوز آزمون عروضی نداده‌ای. اولین آزمونت که تمام شود، همین‌جا با همهٔ
          سؤال‌هایش می‌آید.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-3 flex flex-col gap-y-3">
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
            "...در حال بارگیری"
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
  const color = scoreColor(percent);

  return (
    <div className=" bg-card shadow rounded-xl p-3 ">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className=" w-full cursor-pointer text-right"
      >
        <div className=" flex items-center justify-between">
          <div className=" flex items-center flex-row-reverse gap-x-6">
            <div>
              <span>
                {toFa(attempt.correct)} از {toFa(attempt.total)} پاسخ درست
              </span>
              <div className=" flex gap-x-1 items-center text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M12 11.993a.75.75 0 0 0-.75.75v.006c0 .414.336.75.75.75h.006a.75.75 0 0 0 .75-.75v-.006a.75.75 0 0 0-.75-.75H12ZM12 16.494a.75.75 0 0 0-.75.75v.005c0 .414.335.75.75.75h.005a.75.75 0 0 0 .75-.75v-.005a.75.75 0 0 0-.75-.75H12ZM8.999 17.244a.75.75 0 0 1 .75-.75h.006a.75.75 0 0 1 .75.75v.006a.75.75 0 0 1-.75.75h-.006a.75.75 0 0 1-.75-.75v-.006ZM7.499 16.494a.75.75 0 0 0-.75.75v.005c0 .414.336.75.75.75h.005a.75.75 0 0 0 .75-.75v-.005a.75.75 0 0 0-.75-.75H7.5ZM13.499 14.997a.75.75 0 0 1 .75-.75h.006a.75.75 0 0 1 .75.75v.005a.75.75 0 0 1-.75.75h-.006a.75.75 0 0 1-.75-.75v-.005ZM14.25 16.494a.75.75 0 0 0-.75.75v.006c0 .414.335.75.75.75h.005a.75.75 0 0 0 .75-.75v-.006a.75.75 0 0 0-.75-.75h-.005ZM15.75 14.995a.75.75 0 0 1 .75-.75h.005a.75.75 0 0 1 .75.75v.006a.75.75 0 0 1-.75.75H16.5a.75.75 0 0 1-.75-.75v-.006ZM13.498 12.743a.75.75 0 0 1 .75-.75h2.25a.75.75 0 1 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75ZM6.748 14.993a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
                  <path
                    fillRule="evenodd"
                    d="M18 2.993a.75.75 0 0 0-1.5 0v1.5h-9V2.994a.75.75 0 1 0-1.5 0v1.497h-.752a3 3 0 0 0-3 3v11.252a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V7.492a3 3 0 0 0-3-3H18V2.993ZM3.748 18.743v-7.5a1.5 1.5 0 0 1 1.5-1.5h13.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-13.5a1.5 1.5 0 0 1-1.5-1.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className=" text-xs pt-0.5">
                  {jalali(attempt.createdAt)}
                </span>
              </div>
            </div>
            <div
              style={{ borderColor: color, color }}
              className=" size-16 border-4 rounded-full
            flex items-center justify-center font-bold transition-colors"
            >
              {toFa(percent)}%
            </div>
          </div>
          <div className=" flex items-center gap-x-2">
            <span>{toFa(wrong)} نادرست</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`size-4 transition-transform duration-300 ${
                open ? "rotate-180" : ""
              }`}
            >
              <path
                fillRule="evenodd"
                d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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
          className={`glass transition-all whitespace-nowrap text-sm md:text-lg
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
