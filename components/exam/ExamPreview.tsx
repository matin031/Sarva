"use client";

import { useState } from "react";
import type { SeedExam } from "@/lib/exam/seed-data/seed-types";
import ExamQuestionCard from "@/components/exam/ExamQuestionCard";

type Props = {
  exam: SeedExam;
};

/** Preview/dev harness: renders every question of a seeded exam so
 *  in-progress part components can be checked against real transcribed
 *  data, question by question, as they're built out. Not the real
 *  exam-taking flow — just a visual + interaction smoke test. */
export default function ExamPreview({ exam }: Props) {
  // key: `${questionNumber}:${partIndex}` -> answer value
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 xs:px-5">
      <div className="text-center">
        <h1 className="text-xl font-bold xs:text-2xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">نمرهٔ کل: {exam.totalScore}</p>
      </div>

      {exam.sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-4">
          <h2 className="rounded-xl bg-secondary px-3 py-2 text-center text-base font-semibold text-secondary-foreground xs:text-lg">
            {section.title} ({section.sectionScore} نمره)
          </h2>
          {section.questions.map((question) => (
            <ExamQuestionCard
              key={question.number}
              question={question}
              answers={
                Object.fromEntries(
                  question.parts.map((_, i) => [i, answers[`${question.number}:${i}`]]),
                ) as Record<number, unknown>
              }
              onAnswerChange={(partIndex, value) =>
                setAnswers((prev) => ({ ...prev, [`${question.number}:${partIndex}`]: value }))
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
