"use client";
import { useRef, useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";

export type JasoosAnswer = {
  id: string;
  level_id: number;
  category: string;
  verse_line_1: string;
  verse_line_2: string;
  chosen_role: string;
  correct_role: string;
  is_correct: boolean;
  formattedDate: string;
};

const PER_PAGE = 6;

const CheckIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const XIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

function JasoosAnswerRow({ answer }: { answer: JasoosAnswer }) {
  return (
    <div
      dir="rtl"
      className="glass rounded-xl p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-y-3 sm:gap-x-4"
    >
      <div
        className={`size-10 sm:size-12 shrink-0 rounded-full flex items-center justify-center cursor-default ${
          answer.is_correct
            ? "bg-green-500/20! text-green-500"
            : "bg-red-500/20! text-red-500"
        }`}
      >
        {answer.is_correct ? CheckIcon : XIcon}
      </div>

      <div className="flex-1">
        <span className="inline-block mb-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
          {answer.category}
        </span>
        <p className="text-sm sm:text-base font-medium leading-loose">
          {answer.verse_line_1} {answer.verse_line_2}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
          <span>
            پاسخ شما:{" "}
            <span
              className={answer.is_correct ? "text-green-500" : "text-red-500"}
            >
              {answer.chosen_role}
            </span>
          </span>
          {!answer.is_correct && (
            <span>
              جاسوسِ واقعی: <span className="text-green-500">{answer.correct_role}</span>
            </span>
          )}
          <span className="text-foreground/50">{toFa(answer.formattedDate)}</span>
        </div>
      </div>
    </div>
  );
}

function JasoosHistorySection({ answers }: { answers: JasoosAnswer[] }) {
  const [pageState, setPageState] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(answers.length / PER_PAGE));
  const page = Math.min(pageState, totalPages);
  const start = (page - 1) * PER_PAGE;
  const shown = answers.slice(start, start + PER_PAGE);

  const goTo = (p: number) => {
    setPageState(Math.min(Math.max(p, 1), totalPages));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section ref={topRef} className="relative z-20 scroll-mt-24">
      {answers.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center text-muted-foreground">
          هنوز در بازی جاسوسِ نقش‌ها شرکت نکرده‌اید.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {shown.map((a) => (
              <JasoosAnswerRow key={a.id} answer={a} />
            ))}
          </div>

          {totalPages > 1 && (
            <div
              dir="rtl"
              className="mt-8 flex items-center justify-center gap-x-3 text-sm select-none"
            >
              <button
                type="button"
                onClick={() => goTo(page - 1)}
                disabled={page === 1}
                className="glass rounded-lg px-4 py-2 flex items-center gap-x-1 transition
                  hover:brightness-110 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
                قبلی
              </button>

              <span className="text-muted-foreground cursor-default px-1">
                صفحهٔ {toFa(page)} از {toFa(totalPages)}
              </span>

              <button
                type="button"
                onClick={() => goTo(page + 1)}
                disabled={page === totalPages}
                className="glass rounded-lg px-4 py-2 flex items-center gap-x-1 transition
                  hover:brightness-110 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                بعدی
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default JasoosHistorySection;
