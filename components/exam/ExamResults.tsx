"use client";

import { useState } from "react";
import type { ClientExam } from "@/lib/exam/client-exam";
import type { PartResult, QuestionResult } from "@/lib/exam/result-types";

type Props = {
  exam: ClientExam;
  questionResults: Record<number, QuestionResult>;
  onRetry: () => void;
};

const statusStyles: Record<PartResult["status"], { label: string; className: string }> = {
  correct: { label: "درست", className: "bg-green-500/15 text-green-600 dark:text-green-400" },
  incorrect: { label: "نادرست", className: "bg-destructive/15 text-destructive" },
  partial: { label: "ناقص", className: "bg-gold/25 text-foreground" },
  needs_review: { label: "در انتظار بررسی", className: "bg-muted text-muted-foreground" },
};

export default function ExamResults({ exam, questionResults, onRetry }: Props) {
  const [confirmingRetry, setConfirmingRetry] = useState(false);

  const sections = exam.sections.map((section) => {
    let sectionScore = 0;
    let sectionMaxScore = 0;

    const questions = section.questions.map((question) => {
      const parts = questionResults[question.number]?.parts ?? [];
      for (const part of parts) {
        sectionScore += part.score;
        sectionMaxScore += part.maxScore;
      }
      return { number: question.number, parts };
    });

    return { title: section.title, score: sectionScore, maxScore: sectionMaxScore, questions };
  });

  const totalScore = sections.reduce((s, sec) => s + sec.score, 0);
  const maxScore = sections.reduce((s, sec) => s + sec.maxScore, 0);
  const autoGradedMaxScore = sections
    .flatMap((s) => s.questions)
    .flatMap((q) => q.parts)
    .filter((p) => p.status !== "needs_review")
    .reduce((s, p) => s + p.maxScore, 0);
  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const pendingCount = sections
    .flatMap((s) => s.questions)
    .flatMap((q) => q.parts)
    .filter((p) => p.status === "needs_review").length;

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 xs:px-5">
      <div className="text-center">
        <h1 className="text-xl font-bold xs:text-2xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">نتیجهٔ آزمون</p>
      </div>

      <div className="glass flex flex-col items-center gap-2 rounded-2xl p-6 text-center">
        <span className="text-4xl font-bold text-primary">
          {totalScore.toFixed(2)}
          <span className="text-lg font-normal text-muted-foreground"> / {maxScore}</span>
        </span>
        <span className="text-sm text-muted-foreground">{percent}٪ (بر اساس نمرهٔ کل)</span>
        {pendingCount > 0 && (
          <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {pendingCount} بخش نیاز به بررسی معلم یا هوش مصنوعی دارد و هنوز در این نمره لحاظ نشده است. از{" "}
            {autoGradedMaxScore} نمرهٔ قابل‌بررسیِ خودکار، {totalScore.toFixed(2)} گرفته‌اید.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <h2 className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
              <span>{section.title}</span>
              <span>
                {section.score.toFixed(2)} / {section.maxScore}
              </span>
            </h2>
            <div className="glass flex flex-col divide-y divide-border rounded-2xl px-4">
              {section.questions.map((q) => (
                <div key={q.number} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {q.number}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {q.parts.map((part, i) => {
                      const style = statusStyles[part.status];
                      return (
                        <span
                          key={i}
                          className={`min-h-11 rounded-lg px-2.5 py-1 text-xs font-medium leading-relaxed ${style.className}`}
                        >
                          {part.label ? `${part.label}) ` : ""}
                          {style.label} · {part.score.toFixed(2)}/{part.maxScore}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {confirmingRetry ? (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-foreground">
            با شروع دوباره، همهٔ پاسخ‌ها و نتیجهٔ این آزمون پاک می‌شود. مطمئنید؟
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingRetry(false)}
              className="min-h-11 flex-1 rounded-xl border border-border bg-card text-sm font-medium"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 flex-1 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground"
            >
              بله، پاک شود
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingRetry(true)}
          className="min-h-11 rounded-xl border-2 border-primary bg-primary/10 px-5 text-base font-semibold text-primary
            transition-colors hover:bg-primary/15"
        >
          شروع دوباره
        </button>
      )}
    </div>
  );
}
