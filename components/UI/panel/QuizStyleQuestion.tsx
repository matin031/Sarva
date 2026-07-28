"use client";

import { useState } from "react";
import type { Question } from "@/app/quiz/page";
import QuestionCard from "@/components/UI/QuestionCard";
import QuestionOption from "@/components/UI/QuestionOption";

/** A question as the panel stores it: either read back from a past attempt or
 *  taken out of a bookmark's payload. Deliberately not `Question` — the panel's
 *  sources use nullable columns, and pretending otherwise hides real holes. */
export type ReviewQuestion = {
  id: string;
  type: Question["type"] | null;
  poem?: string[] | null;
  audioUrl?: string | null;
  options: {
    id: string;
    label?: string | null;
    poem?: string[] | null;
    audioUrl?: string | null;
    isCorrect: boolean;
  }[];
};

/** One question, drawn by the quiz's own components.
 *
 *  `QuestionCard` decides the prompt's shape from `type` (a بیت, an audio blob,
 *  a وزن, a syllable pattern) and `QuestionOption` draws the choices — so a
 *  reviewed question is not a lookalike of the quiz, it is the quiz. Always in
 *  its answered state: the right option green, the student's wrong pick red. */
export default function QuizStyleQuestion({
  question,
  selectedOptionId,
}: {
  question: ReviewQuestion;
  selectedOptionId?: string | null;
}) {
  const [playingId, setPlayingId] = useState<number | null>(null);

  if (!question.type) {
    return (
      <p className=" text-center text-muted-foreground py-10">
        این پرسش دیگر در بانک سؤال موجود نیست.
      </p>
    );
  }

  const picked = question.options.findIndex((o) => o.id === selectedOptionId);
  const selected = picked === -1 ? null : picked;

  // exactly the shape these two components get on the quiz page
  const asQuizQuestion: Question = {
    id: question.id,
    type: question.type,
    poem: question.poem ?? undefined,
    audioSrc: question.audioUrl ?? undefined,
    options: question.options.map((o) => ({
      id: o.id,
      poem: o.poem ?? undefined,
      label: o.label ?? undefined,
      audioSrc: o.audioUrl ?? undefined,
      isCorrect: o.isCorrect,
      x: 0,
    })),
  };

  return (
    <>
      <QuestionCard questions={[asQuizQuestion]} currentIndex={0} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 *:h-20 md:*:min-h-30 text-muted-foreground">
        {asQuizQuestion.options.map((o, i) => (
          <QuestionOption
            key={`${question.id}-${o.id}`}
            setSelected={() => {}}
            selected={selected}
            id={i}
            audioUrl={o.audioSrc || ""}
            answered
            isCorrect={o.isCorrect}
            title={o.label}
            quizType={asQuizQuestion.type}
            poem={o.poem}
            whileInView={0}
            playingId={playingId}
            setPlayingId={setPlayingId}
          />
        ))}
      </div>
    </>
  );
}
