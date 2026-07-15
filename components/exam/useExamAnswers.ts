"use client";

import { useCallback, useState } from "react";

/** Answer state keyed by "questionNumber:partIndex", shared between the
 *  dev preview harness and the real exam runner so both stay in sync with
 *  how ExamQuestionCard expects its `answers` prop shaped. */
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
