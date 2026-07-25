import type { QuestionPartContent } from "@/lib/exam/content-schemas";
import type { SeedExam } from "./seed-data/seed-types";
import { optionId } from "./option-ids";

/**
 * The subset of exam data that's safe to send to the browser BEFORE
 * submission: no correctAnswer, no acceptedAnswers, no aiGradingHint, and
 * options carry no isCorrect flag. Grading happens server-side in
 * app/exam/[examKey]/actions.ts against the full SeedExam (which does have
 * the answer key) — the client only ever sees this sanitized shape.
 */

export type ClientOption = { id: string; optionKey?: string; text: string };

export type ClientPart = {
  label?: string;
  pageRef?: number;
  score: number;
  content: QuestionPartContent;
  options?: ClientOption[];
};

export type ClientQuestion = {
  number: number;
  pageRef?: number;
  instruction?: string;
  parts: ClientPart[];
};

export type ClientSection = {
  title: string;
  sectionScore: number;
  questions: ClientQuestion[];
};

export type ClientExam = {
  title: string;
  totalScore: number;
  sections: ClientSection[];
};

export function toClientExam(exam: SeedExam): ClientExam {
  return {
    title: exam.title,
    totalScore: exam.totalScore,
    sections: exam.sections.map((section) => ({
      title: section.title,
      sectionScore: section.sectionScore,
      questions: section.questions.map((q) => ({
        number: q.number,
        pageRef: q.pageRef,
        instruction: q.instruction,
        parts: q.parts.map((part, partIndex) => ({
          label: part.label,
          pageRef: part.pageRef,
          score: part.score,
          content: part.content,
          options: part.options?.map((o, i) => ({
            id: optionId(partIndex, i),
            optionKey: o.optionKey,
            text: o.text,
          })),
        })),
      })),
    })),
  };
}
