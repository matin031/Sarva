"use client";

import { useMemo, useState, useTransition } from "react";
import type { ClientExam, ClientQuestion } from "@/lib/exam/client-exam";
import ExamQuestionCard from "@/components/exam/ExamQuestionCard";
import ExamResults from "@/components/exam/ExamResults";
import { useExamAnswers } from "@/components/exam/useExamAnswers";
import { submitQuestion, type QuestionResult } from "@/app/exam/[examKey]/actions";

type Props = {
  examKey: string;
  exam: ClientExam;
};

type FlatQuestion = { sectionTitle: string; question: ClientQuestion };

/** One question at a time: submit -> see the correct answer inline for
 *  every part -> move to the next question. Same pattern the poetry-meter
 *  quiz (components/UI/Quiz.tsx) already uses, generalized to exam
 *  questions with multiple parts and 18 different answer types instead of
 *  a single multiple-choice pick. */
export default function ExamRunner({ examKey, exam }: Props) {
  const flatQuestions = useMemo<FlatQuestion[]>(
    () =>
      exam.sections.flatMap((section) =>
        section.questions.map((question) => ({ sectionTitle: section.title, question })),
      ),
    [exam],
  );

  const { getQuestionAnswers, setAnswer } = useExamAnswers();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionResults, setQuestionResults] = useState<Record<number, QuestionResult>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { sectionTitle, question } = flatQuestions[currentIndex];
  const isLast = currentIndex === flatQuestions.length - 1;
  const isRevealed = question.number in questionResults;
  const currentAnswers = getQuestionAnswers(question.number, question.parts.length);
  const hasAnyAnswer = Object.values(currentAnswers).some(
    (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );

  const handleSubmitQuestion = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitQuestion(examKey, question.number, currentAnswers);
        setQuestionResults((prev) => ({ ...prev, [question.number]: result }));
      } catch {
        setError("مشکلی در ثبت پاسخ پیش آمد. دوباره تلاش کنید.");
      }
    });
  };

  const goNext = () => {
    if (isLast) {
      setShowResults(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setCurrentIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrevious = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((i) => i - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (showResults) {
    return (
      <ExamResults
        exam={exam}
        questionResults={questionResults}
        onRetry={() => {
          setShowResults(false);
          setCurrentIndex(0);
        }}
      />
    );
  }

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 pb-28 xs:px-5">
      <div className="text-center">
        <h1 className="text-lg font-bold xs:text-xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sectionTitle} · سؤال {currentIndex + 1} از {flatQuestions.length}
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / flatQuestions.length) * 100}%` }}
        />
      </div>

      <ExamQuestionCard
        key={question.number}
        question={question}
        answers={currentAnswers}
        onAnswerChange={(partIndex, value) => setAnswer(question.number, partIndex, value)}
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
