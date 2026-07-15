"use client";

import type { SeedQuestion } from "@/lib/exam/seed-data/seed-types";
import QuestionPartRenderer from "@/components/exam/QuestionPartRenderer";

type Props = {
  question: SeedQuestion;
  answers: Record<number, unknown>;
  onAnswerChange: (partIndex: number, value: unknown) => void;
  disabled?: boolean;
};

/** One numbered exam question (Q1..Q41). Always just iterates
 *  question.parts in order and renders each with QuestionPartRenderer —
 *  layoutPattern is metadata only and never drives rendering, so composite
 *  and multi-subquestion questions fall out of this same loop for free. */
export default function ExamQuestionCard({ question, answers, onAnswerChange, disabled }: Props) {
  const totalScore = question.parts.reduce((sum, p) => sum + p.score, 0);

  return (
    <div dir="rtl" className="glass rounded-2xl p-4 xs:p-5 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {question.number}
          </span>
          {question.pageRef && (
            <span className="text-xs text-muted-foreground">ص {question.pageRef}</span>
          )}
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          {totalScore} نمره
        </span>
      </div>

      {question.instruction && (
        <p className="mb-3 text-base leading-relaxed text-foreground xs:text-lg">{question.instruction}</p>
      )}

      <div className="flex flex-col gap-4">
        {question.parts.map((part, partIndex) => (
          <div key={partIndex} className="flex flex-col gap-2">
            {(part.label || question.parts.length > 1) && (
              <div className="flex items-center gap-2">
                {part.label && <span className="text-sm font-semibold text-primary">{part.label})</span>}
                <span className="text-xs text-muted-foreground">{part.score} نمره</span>
                {part.pageRef && <span className="text-xs text-muted-foreground">· ص {part.pageRef}</span>}
              </div>
            )}
            <QuestionPartRenderer
              content={part.content}
              options={part.options?.map((o, i) => ({
                id: `${partIndex}-${i}`,
                optionKey: o.optionKey,
                text: o.text,
              }))}
              value={answers[partIndex]}
              onChange={(v) => onAnswerChange(partIndex, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
