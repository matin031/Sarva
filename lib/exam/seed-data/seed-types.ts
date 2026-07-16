import {
  correctAnswerSchemaByType,
  questionPartContentSchema,
  type LayoutPattern,
  type QuestionPartContent,
  type QuestionPartType,
} from "../content-schemas";

export type SeedOption = {
  optionKey?: string;
  text: string;
  isCorrect: boolean;
};

export type SeedPart = {
  label?: string;
  /** Overrides the parent question's pageRef when a multi-subquestion's
   *  parts each cite a different textbook page. */
  pageRef?: number;
  type: QuestionPartType;
  score: number;
  content: QuestionPartContent;
  correctAnswer: unknown; // validated per-type against correctAnswerSchemaByType
  acceptedAnswers?: string[];
  gradingMode: "exact_match" | "ai_semantic" | "ai_partial_credit" | "manual";
  aiGradingHint?: string;
  options?: SeedOption[];
  /** false = transcribed from a low-confidence OCR read; needs a human check
   *  against the source PDF before this is used to grade real students. */
  verified: boolean;
  sourceNote?: string;
};

export type SeedQuestion = {
  number: number;
  pageRef?: number;
  layoutPattern?: LayoutPattern;
  instruction?: string;
  parts: SeedPart[];
};

export type SeedSection = {
  title: string;
  orderIndex: number;
  sectionScore: number;
  questions: SeedQuestion[];
};

export type SeedExam = {
  subject: string;
  grade: number;
  title: string;
  examSession: string;
  totalScore: number;
  sourcePdf: string;
  sections: SeedSection[];
};

export function validateSeedExam(exam: SeedExam): string[] {
  const errors: string[] = [];

  for (const section of exam.sections) {
    let sectionSum = 0;
    for (const q of section.questions) {
      for (const part of q.parts) {
        sectionSum += part.score;
        const label = `Q${q.number}${part.label ? `(${part.label})` : ""}`;

        const contentResult = questionPartContentSchema.safeParse(part.content);
        if (!contentResult.success) {
          errors.push(`${label}: invalid content — ${contentResult.error.message}`);
        } else if (contentResult.data.type !== part.type) {
          errors.push(`${label}: content.type "${contentResult.data.type}" != part.type "${part.type}"`);
        }

        const answerSchema = correctAnswerSchemaByType[part.type];
        const answerResult = answerSchema.safeParse(part.correctAnswer);
        if (!answerResult.success) {
          errors.push(`${label}: invalid correctAnswer — ${answerResult.error.message}`);
        }

        // mcq-select-line-in-poem is excluded: its content.lines ARE the
        // options (no الف/ب/ج labels), so it never has question_options rows.
        const needsOptions = ["mcq-inline", "mcq-multi-select", "mcq-plus-correction", "aroozi-samaei"].includes(
          part.type,
        );
        if (needsOptions && (!part.options || part.options.length < 2)) {
          errors.push(`${label}: type "${part.type}" needs >= 2 question_options rows`);
        }
        if (needsOptions && part.options && !part.options.some((o) => o.isCorrect)) {
          errors.push(`${label}: no option marked isCorrect`);
        }
      }
    }
    if (Math.abs(sectionSum - section.sectionScore) > 1e-9) {
      errors.push(
        `section "${section.title}": parts sum to ${sectionSum}, declared sectionScore is ${section.sectionScore}`,
      );
    }
  }

  const examSum = exam.sections.reduce((a, s) => a + s.sectionScore, 0);
  if (Math.abs(examSum - exam.totalScore) > 1e-9) {
    errors.push(`exam "${exam.title}": sections sum to ${examSum}, declared totalScore is ${exam.totalScore}`);
  }

  return errors;
}

export function unverifiedParts(exam: SeedExam): string[] {
  const out: string[] = [];
  for (const section of exam.sections) {
    for (const q of section.questions) {
      for (const part of q.parts) {
        if (!part.verified) {
          out.push(`Q${q.number}${part.label ? `(${part.label})` : ""}: ${part.sourceNote ?? "unverified"}`);
        }
      }
    }
  }
  return out;
}
