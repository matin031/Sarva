"use server";

import { formatCorrectAnswer } from "@/lib/exam/format-answer";
import { gradePart } from "@/lib/exam/grading";
import { farsi3Dey1401 } from "@/lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "@/lib/exam/seed-data/farsi3-1403-kherdad";
import type { SeedExam } from "@/lib/exam/seed-data/seed-types";

// Server-only: these seed modules carry the answer key, so this map must
// never be imported from a "use client" file. The page component imports
// the seed modules separately and sanitizes them via toClientExam before
// they reach the browser.
const exams: Record<string, SeedExam> = {
  "1403-kherdad": farsi3Kherdad1403,
  "1401-dey": farsi3Dey1401,
};

export type PartResult = {
  label?: string;
  score: number;
  maxScore: number;
  status: "correct" | "incorrect" | "partial" | "needs_review";
  correctAnswerText: string;
};

export type QuestionResult = {
  number: number;
  parts: PartResult[];
};

/** Grades one question and reveals its answer key — called right after
 *  the student submits that single question, so feedback is immediate
 *  instead of batched to the end of the exam. */
export async function submitQuestion(
  examKey: string,
  questionNumber: number,
  answers: Record<number, unknown>,
): Promise<QuestionResult> {
  const exam = exams[examKey];
  if (!exam) throw new Error(`Unknown exam: ${examKey}`);

  const question = exam.sections.flatMap((s) => s.questions).find((q) => q.number === questionNumber);
  if (!question) throw new Error(`Unknown question: ${questionNumber}`);

  return {
    number: question.number,
    parts: question.parts.map((part, partIndex) => {
      const graded = gradePart(part, partIndex, answers[partIndex]);
      return {
        label: part.label,
        score: graded.score,
        maxScore: graded.maxScore,
        status: graded.status,
        correctAnswerText: formatCorrectAnswer(part),
      };
    }),
  };
}
