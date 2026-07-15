"use client";

import type { ClientExam } from "@/lib/exam/client-exam";
import ExamQuestionCard from "@/components/exam/ExamQuestionCard";

type Props = {
  exam: ClientExam;
  getQuestionAnswers: (questionNumber: number, partCount: number) => Record<number, unknown>;
  onAnswerChange: (questionNumber: number, partIndex: number, value: unknown) => void;
  disabled?: boolean;
};

export default function ExamQuestionList({ exam, getQuestionAnswers, onAnswerChange, disabled }: Props) {
  return (
    <>
      {exam.sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-4">
          <h2 className="rounded-xl bg-secondary px-3 py-2 text-center text-base font-semibold text-secondary-foreground xs:text-lg">
            {section.title} ({section.sectionScore} نمره)
          </h2>
          {section.questions.map((question) => (
            <ExamQuestionCard
              key={question.number}
              question={question}
              answers={getQuestionAnswers(question.number, question.parts.length)}
              onAnswerChange={(partIndex, value) => onAnswerChange(question.number, partIndex, value)}
              disabled={disabled}
            />
          ))}
        </div>
      ))}
    </>
  );
}
