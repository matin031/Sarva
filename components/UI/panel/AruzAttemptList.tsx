"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Question } from "@/app/quiz/page";
import QuestionCard from "@/components/UI/QuestionCard";
import QuestionOption from "@/components/UI/QuestionOption";
import { toFa } from "@/components/UI/CircularProgress";
import { jalali } from "@/lib/panel/format";
import { ARUZ_TYPE_LABEL } from "@/lib/panel/types";
import type { AruzAnswer, AruzAttempt } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/** آزمون‌های پیشینِ عروض.
 *
 *  Each row expands into that attempt's own questions, rendered by the very
 *  components the quiz page uses — `QuestionCard` for the prompt and
 *  `QuestionOption` for the choices — so a بیت prompt, an audio prompt and a
 *  وزن prompt each come back looking exactly as they did during the test, with
 *  the student's pick in red and the right answer in green. Questions are shown
 *  one at a time, like the quiz: it keeps the layout identical and keeps one
 *  WaveSurfer instance per option instead of one per option per question. */
export default function AruzAttemptList({
  attempts,
}: {
  attempts: AruzAttempt[];
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
              className=" size-16 border-4 rounded-full
            border-border flex items-center justify-center"
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
  const [playingId, setPlayingId] = useState<number | null>(null);

  if (!answers.length) {
    return (
      <p className=" text-center text-muted-foreground py-6">
        سؤال‌های این آزمون ذخیره نشده‌اند.
      </p>
    );
  }

  const at = Math.min(index, answers.length - 1);
  const answer = answers[at];
  const goTo = (i: number) => {
    setPlayingId(null);
    setIndex(Math.max(0, Math.min(i, answers.length - 1)));
  };

  const picked = answer.options.findIndex(
    (o) => o.id === answer.selectedOptionId,
  );
  const selectedIndex = picked === -1 ? null : picked;

  // exactly the shape `QuestionCard`/`QuestionOption` get on the quiz page
  const question: Question = {
    id: answer.questionId ?? answer.id,
    type: (answer.type ?? "poem-to-audio") as Question["type"],
    poem: answer.poem ?? undefined,
    audioSrc: answer.audioUrl ?? undefined,
    options: answer.options.map((o) => ({
      id: o.id,
      poem: o.poem ?? undefined,
      label: o.label ?? undefined,
      audioSrc: o.audioUrl ?? undefined,
      isCorrect: o.isCorrect,
      x: 0,
    })),
  };

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

      {answer.type ? (
        <>
          <QuestionCard questions={[question]} currentIndex={0} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 *:h-20 md:*:min-h-30 text-muted-foreground">
            {question.options.map((o, i) => (
              <QuestionOption
                key={`${answer.id}-${o.id}`}
                setSelected={() => {}}
                selected={selectedIndex}
                id={i}
                audioUrl={o.audioSrc || ""}
                answered
                isCorrect={o.isCorrect}
                title={o.label}
                quizType={question.type}
                poem={o.poem}
                whileInView={0}
                playingId={playingId}
                setPlayingId={setPlayingId}
              />
            ))}
          </div>
        </>
      ) : (
        <p className=" text-center text-muted-foreground py-10">
          این پرسش دیگر در بانک سؤال موجود نیست.
        </p>
      )}

      {selectedIndex === null && answer.type && (
        <p className=" mt-4 text-sm text-muted-foreground">
          به این پرسش پاسخ ندادی؛ گزینهٔ درست با رنگ سبز مشخص شده است.
        </p>
      )}

      {/* prev / next, styled like the quiz's own buttons */}
      <div className="w-full mt-6 flex items-center justify-between gap-x-3">
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
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          سؤال قبلی
        </button>
      </div>
    </div>
  );
}
