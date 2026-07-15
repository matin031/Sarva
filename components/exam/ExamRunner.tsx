"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ClientExam, ClientQuestion } from "@/lib/exam/client-exam";
import ExamQuestionCard from "@/components/exam/ExamQuestionCard";
import ExamQuestionNav from "@/components/exam/ExamQuestionNav";
import ExamResults from "@/components/exam/ExamResults";
import { submitQuestion, type QuestionResult } from "@/app/exam/[examKey]/actions";

type Props = {
  examKey: string;
  exam: ClientExam;
};

type FlatQuestion = { sectionTitle: string; question: ClientQuestion };

type Progress = {
  currentIndex: number;
  // keyed by "questionNumber:partIndex"
  answers: Record<string, unknown>;
  questionResults: Record<number, QuestionResult>;
  showResults: boolean;
};

const emptyProgress: Progress = { currentIndex: 0, answers: {}, questionResults: {}, showResults: false };

function storageKey(examKey: string) {
  return `exam-progress:${examKey}`;
}

/** One question at a time: submit -> see the correct answer inline for
 *  every part -> move to the next question. Same pattern the poetry-meter
 *  quiz (components/UI/Quiz.tsx) already uses, generalized to exam
 *  questions with multiple parts and 18 different answer types instead of
 *  a single multiple-choice pick.
 *
 *  All progress lives in one `Progress` object mirrored to localStorage,
 *  so a refresh or accidental tab close mid-exam doesn't throw away
 *  everything the student already answered — same idea as the poetry
 *  quiz's own "quiz-progress" pattern, restored once on mount. */
export default function ExamRunner({ examKey, exam }: Props) {
  const flatQuestions = useMemo<FlatQuestion[]>(
    () =>
      exam.sections.flatMap((section) =>
        section.questions.map((question) => ({ sectionTitle: section.title, question })),
      ),
    [exam],
  );

  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Restoring persisted progress on mount is a one-time sync with an
  // external system (localStorage), not a derived-state update — the
  // sanctioned exception to "don't setState in effects".
  useEffect(() => {
    let restoredProgress = emptyProgress;
    try {
      const saved = localStorage.getItem(storageKey(examKey));
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Progress>;
        restoredProgress = {
          currentIndex:
            typeof parsed.currentIndex === "number"
              ? Math.min(Math.max(parsed.currentIndex, 0), flatQuestions.length - 1)
              : 0,
          answers: parsed.answers ?? {},
          questionResults: parsed.questionResults ?? {},
          showResults: parsed.showResults ?? false,
        };
      }
    } catch {
      restoredProgress = emptyProgress;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage on mount, not derived state
    setProgress(restoredProgress);
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examKey]);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(storageKey(examKey), JSON.stringify(progress));
  }, [restored, examKey, progress]);

  if (!restored) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-muted-foreground">
        ...در حال بارگذاری
      </div>
    );
  }

  const { currentIndex, answers, questionResults, showResults } = progress;
  const { sectionTitle, question } = flatQuestions[currentIndex];
  const isLast = currentIndex === flatQuestions.length - 1;
  const isRevealed = question.number in questionResults;
  const currentAnswers: Record<number, unknown> = Object.fromEntries(
    question.parts.map((_, i) => [i, answers[`${question.number}:${i}`]]),
  );
  const hasAnyAnswer = Object.values(currentAnswers).some(
    (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );

  const setAnswer = (partIndex: number, value: unknown) => {
    setProgress((prev) => ({
      ...prev,
      answers: { ...prev.answers, [`${question.number}:${partIndex}`]: value },
    }));
  };

  const handleSubmitQuestion = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitQuestion(examKey, question.number, currentAnswers);
        setProgress((prev) => ({
          ...prev,
          questionResults: { ...prev.questionResults, [question.number]: result },
        }));
      } catch {
        setError("مشکلی در ثبت پاسخ پیش آمد. دوباره تلاش کنید.");
      }
    });
  };

  const goNext = () => {
    if (isLast) {
      setProgress((prev) => ({ ...prev, showResults: true }));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setProgress((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrevious = () => {
    if (currentIndex === 0) return;
    setProgress((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToIndex = (index: number) => {
    setProgress((prev) => ({ ...prev, currentIndex: index }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetry = () => {
    // no need to also localStorage.removeItem here: the save effect below
    // re-persists `progress` on every change, so it'll write emptyProgress
    // right back — functionally identical to no saved state on next load.
    setProgress(emptyProgress);
  };

  if (showResults) {
    return <ExamResults exam={exam} questionResults={questionResults} onRetry={handleRetry} />;
  }

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 pb-28 xs:px-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="glass flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-foreground/80"
        >
          <span className="text-base">☰</span>
          فهرست
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold xs:text-xl">{exam.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sectionTitle} · سؤال {currentIndex + 1} از {flatQuestions.length}
          </p>
        </div>
        <span className="min-h-11 w-[4.5rem]" aria-hidden />
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / flatQuestions.length) * 100}%` }}
        />
      </div>

      {navOpen && (
        <ExamQuestionNav
          flatQuestions={flatQuestions}
          currentIndex={currentIndex}
          questionResults={questionResults}
          onJump={goToIndex}
          onClose={() => setNavOpen(false)}
        />
      )}

      <ExamQuestionCard
        key={question.number}
        question={question}
        answers={currentAnswers}
        onAnswerChange={setAnswer}
        disabled={isRevealed || isPending}
        partResults={questionResults[question.number]?.parts}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md xs:px-5">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={currentIndex === 0}
            className="glass min-h-11 rounded-xl px-4 text-sm font-medium text-foreground/70 transition-opacity
              disabled:opacity-30"
          >
            سؤال قبلی
          </button>
          <button
            type="button"
            disabled={isPending || (!isRevealed && !hasAnyAnswer)}
            onClick={isRevealed ? goNext : handleSubmitQuestion}
            className="min-h-11 flex-1 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground
              transition-opacity disabled:opacity-40"
          >
            {isPending
              ? "در حال بررسی..."
              : isRevealed
                ? isLast
                  ? "پایان و مشاهده نتیجه"
                  : "سؤال بعدی"
                : "ثبت پاسخ"}
          </button>
        </div>
        {error && <p className="mx-auto mt-2 max-w-xl text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
