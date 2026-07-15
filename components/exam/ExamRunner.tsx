"use client";

import { useState, useTransition } from "react";
import type { ClientExam } from "@/lib/exam/client-exam";
import ExamQuestionList from "@/components/exam/ExamQuestionList";
import ExamResults from "@/components/exam/ExamResults";
import { useExamAnswers } from "@/components/exam/useExamAnswers";
import { submitExam, type SubmitExamResult } from "@/app/exam/[examKey]/actions";

type Props = {
  examKey: string;
  exam: ClientExam;
};

export default function ExamRunner({ examKey, exam }: Props) {
  const { answers, getQuestionAnswers, setAnswer } = useExamAnswers();
  const [result, setResult] = useState<SubmitExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalParts = exam.sections.reduce(
    (sum, section) => sum + section.questions.reduce((s, q) => s + q.parts.length, 0),
    0,
  );
  const answeredCount = Object.values(answers).filter(
    (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  ).length;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const graded = await submitExam(examKey, answers);
        setResult(graded);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("مشکلی در ثبت پاسخ‌ها پیش آمد. دوباره تلاش کنید.");
      }
    });
  };

  if (result) {
    return <ExamResults examTitle={exam.title} result={result} onRetry={() => setResult(null)} />;
  }

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 pb-28 xs:px-5">
      <div className="text-center">
        <h1 className="text-xl font-bold xs:text-2xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">نمرهٔ کل: {exam.totalScore}</p>
      </div>

      <ExamQuestionList
        exam={exam}
        getQuestionAnswers={getQuestionAnswers}
        onAnswerChange={setAnswer}
        disabled={isPending}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md xs:px-5">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {answeredCount} از {totalParts} پاسخ داده‌شده
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            className="min-h-11 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground
              transition-opacity disabled:opacity-60"
          >
            {isPending ? "در حال ثبت..." : "پایان آزمون"}
          </button>
        </div>
        {error && <p className="mx-auto mt-2 max-w-xl text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
