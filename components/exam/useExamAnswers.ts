"use client";

import { useCallback, useState } from "react";

/** Answer state keyed by "questionNumber:partIndex", shaped exactly how
 *  ExamQuestionCard expects its `answers` prop. Used by the dev preview
 *  harness (ExamPreview), which doesn't persist progress — the real exam
 *  runner (ExamRunner) manages its own progress object instead, since it
 *  also needs to save/restore that state to localStorage. */
export function useExamAnswers() {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const getQuestionAnswers = useCallback(
    (questionNumber: number, partCount: number): Record<number, unknown> =>
      Object.fromEntries(
        Array.from({ length: partCount }, (_, i) => [i, answers[`${questionNumber}:${i}`]]),
      ) as Record<number, unknown>,
    [answers],
  );

  const setAnswer = useCallback((questionNumber: number, partIndex: number, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [`${questionNumber}:${partIndex}`]: value }));
  }, []);

  return { answers, getQuestionAnswers, setAnswer };
}
