"use server";

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
};

export type QuestionResult = {
  number: number;
  parts: PartResult[];
};

export type SectionResult = {
  title: string;
  score: number;
  maxScore: number;
  questions: QuestionResult[];
};

export type SubmitExamResult = {
  totalScore: number;
  maxScore: number;
  autoGradedMaxScore: number;
  sections: SectionResult[];
};

export async function submitExam(
  examKey: string,
  answers: Record<string, unknown>,
): Promise<SubmitExamResult> {
  const exam = exams[examKey];
  if (!exam) {
    throw new Error(`Unknown exam: ${examKey}`);
  }

  let totalScore = 0;
  let maxScore = 0;
  let autoGradedMaxScore = 0;

  const sections: SectionResult[] = exam.sections.map((section) => {
    let sectionScore = 0;
    let sectionMaxScore = 0;

    const questions: QuestionResult[] = section.questions.map((question) => ({
      number: question.number,
      parts: question.parts.map((part, partIndex) => {
        const submitted = answers[`${question.number}:${partIndex}`];
        const graded = gradePart(part, partIndex, submitted);

        sectionScore += graded.score;
        sectionMaxScore += graded.maxScore;
        if (graded.status !== "needs_review") autoGradedMaxScore += graded.maxScore;

        return { label: part.label, score: graded.score, maxScore: graded.maxScore, status: graded.status };
      }),
    }));

    totalScore += sectionScore;
    maxScore += sectionMaxScore;

    return { title: section.title, score: sectionScore, maxScore: sectionMaxScore, questions };
  });

  return { totalScore, maxScore, autoGradedMaxScore, sections };
}
