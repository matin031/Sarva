"use client";
import { useRef, useState } from "react";
import UserAnswerItem from "./UI/UserAnswerItem";
import { toFa } from "./UI/CircularProgress";

export type AttemptQuestionOption = {
  id: string;
  label: string | null;
  poem: string[] | null;
  audio_url: string | null;
  is_correct: boolean;
  x: number;
};
export type AttemptAnswer = {
  id: string;
  is_correct: boolean;
  selected_option_id: string | null;
  questions: {
    id: string;
    type: string;
    poem: string[] | null;
    audio_url: string | null;
    question_options: AttemptQuestionOption[];
  };
};
export type Attempt = {
  id: string;
  total: number;
  correct: number;
  created_at: string;
  formattedDate: string;
  quiz_attempt_answers: AttemptAnswer[];
};

const PER_PAGE = 6;

function CompletedQuizzesSection({ attempts }: { attempts: Attempt[] }) {
  const [pageState, setPageState] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(attempts.length / PER_PAGE));

  const page = Math.min(pageState, totalPages);
  const start = (page - 1) * PER_PAGE;
  const shown = attempts.slice(start, start + PER_PAGE);

  const goTo = (p: number) => {
    setPageState(Math.min(Math.max(p, 1), totalPages));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section ref={topRef} className="relative z-20 scroll-mt-24">
      {attempts.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center text-muted-foreground">
          هنوز هیچ آزمونی نداده‌اید؛ اولین آزمونتان را همین حالا شروع کنید.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {shown.map((attempt) => (
              <UserAnswerItem key={attempt.id} attempt={attempt} />
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

export default CompletedQuizzesSection;
