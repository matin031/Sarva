import type { SeedPart } from "./seed-data/seed-types";
import type { RichPassage } from "./content-schemas";
import { optionId } from "./option-ids";
import type { McqPlusCorrectionValue } from "@/components/exam/parts/McqPlusCorrectionPart";
import type { OpenErrorCorrectionValue } from "@/components/exam/parts/OpenErrorCorrectionInPassagePart";
import type { FindNErrorsValue } from "@/components/exam/parts/FindNErrorsInListPart";
import type { PairedListErrorCorrectionValue } from "@/components/exam/parts/PairedListErrorCorrectionPart";

/**
 * Server-only grading. Only parts explicitly authored with
 * `gradingMode: "exact_match"` are auto-scored here — everything else
 * (`ai_semantic`, `ai_partial_credit`, `manual`) honestly comes back as
 * "needs_review" rather than being faked with a heuristic. This file must
 * never be imported by a client component: it takes the full SeedPart
 * (which carries the answer key), not the sanitized ClientPart.
 */

export type PartGradeStatus = "correct" | "incorrect" | "partial" | "needs_review";

export type PartGradeResult = {
  score: number;
  maxScore: number;
  status: PartGradeStatus;
  /** Short Persian feedback from the AI grader, when a part was AI-graded.
   *  Absent for exact_match parts and for AI parts that couldn't be reached. */
  feedback?: string;
};

export function normalizeFa(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[ً-ْـ]/g, "") // Arabic diacritics + tatweel
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[،,.؛;؟?!»«"']/g, "")
    .toLowerCase();
}

export function matchesAny(value: string, accepted: string[]): boolean {
  const n = normalizeFa(value);
  return n.length > 0 && accepted.some((a) => normalizeFa(a) === n);
}

export function statusFromRatio(ratio: number): PartGradeStatus {
  if (ratio >= 1) return "correct";
  if (ratio <= 0) return "incorrect";
  return "partial";
}

function passageBlankIds(passage: RichPassage): string[] {
  const tokens = passage.tokens ?? passage.lines?.flat() ?? [];
  return tokens.filter((t) => t.kind === "blank").map((t) => (t as { blankId: string }).blankId);
}

export function gradePart(part: SeedPart, partIndex: number, submitted: unknown): PartGradeResult {
  const maxScore = part.score;

  if (part.gradingMode !== "exact_match") {
    return { score: 0, maxScore, status: "needs_review" };
  }

  const content = part.content;
  const correct = part.correctAnswer as Record<string, unknown>;

  const scored = (ratio: number): PartGradeResult => ({
    score: Math.max(0, Math.min(1, ratio)) * maxScore,
    maxScore,
    status: statusFromRatio(ratio),
  });

  switch (content.type) {
    case "mcq-inline": {
      const correctIndex = (part.options ?? []).findIndex((o) => o.isCorrect);
      const correctId = correctIndex >= 0 ? optionId(partIndex, correctIndex) : null;
      return scored(submitted === correctId ? 1 : 0);
    }

    case "mcq-multi-select": {
      const correctIds = (part.options ?? [])
        .map((o, i) => (o.isCorrect ? optionId(partIndex, i) : null))
        .filter((id): id is string => id !== null);
      const submittedIds = Array.isArray(submitted) ? (submitted as string[]) : [];
      const same =
        correctIds.length === submittedIds.length &&
        correctIds.every((id) => submittedIds.includes(id));
      return scored(same ? 1 : 0);
    }

    case "mcq-plus-correction": {
      const correctIndex = (part.options ?? []).findIndex((o) => o.isCorrect);
      const correctId = correctIndex >= 0 ? optionId(partIndex, correctIndex) : null;
      const v = (submitted as McqPlusCorrectionValue) ?? { optionId: null, correctionText: "" };
      const optionOk = v.optionId === correctId;
      const correctionOk = matchesAny(v.correctionText ?? "", (correct.correctionAnswers as string[]) ?? []);
      return scored((optionOk ? 0.5 : 0) + (correctionOk ? 0.5 : 0));
    }

    case "true-false": {
      return scored(submitted === correct.value ? 1 : 0);
    }

    case "count-answer": {
      return scored(submitted === correct.value ? 1 : 0);
    }

    case "word-reorder-dnd": {
      const indices = Array.isArray(submitted) ? (submitted as number[]) : [];
      const words = indices.map((i) => content.scrambledTokens[i]);
      const expected = correct.orderedTokens as string[];
      const same = words.length === expected.length && words.every((w, i) => normalizeFa(w) === normalizeFa(expected[i]));
      return scored(same ? 1 : 0);
    }

    case "matching-pairs-with-distractor": {
      const submittedMap = (submitted as Record<string, string>) ?? {};
      const entries = Object.entries(correct) as [string, string][];
      if (entries.length === 0) return scored(0);
      const matches = entries.filter(([a, b]) => submittedMap[a] === b).length;
      return scored(matches / entries.length);
    }

    case "multi-part-inline-tagging": {
      const submittedTags = (submitted as Record<string, string>) ?? {};
      const tags = correct.tags as Record<string, string>;
      const weights = (correct.weights as Record<string, number>) ?? {};
      const gradedIds = Object.keys(tags);
      if (gradedIds.length === 0) return scored(0);
      const totalWeight = gradedIds.reduce((s, id) => s + (weights[id] ?? maxScore / gradedIds.length), 0);
      const earned = gradedIds.reduce(
        (s, id) => s + (submittedTags[id] === tags[id] ? (weights[id] ?? maxScore / gradedIds.length) : 0),
        0,
      );
      return scored(totalWeight > 0 ? earned / totalWeight : 0);
    }

    case "diagram-builder": {
      const submittedMap = (submitted as Record<string, string>) ?? {};
      const edges = correct.edges as { childId: string; parentId: string }[];
      if (edges.length === 0) return scored(0);
      const matches = edges.filter((e) => submittedMap[e.childId] === e.parentId).length;
      return scored(matches / edges.length);
    }

    case "fill-blank-term": {
      const [blankId] = passageBlankIds(content.passage);
      const v = (submitted as Record<string, string>)?.[blankId] ?? "";
      return scored(matchesAny(v, (correct.accepted as string[]) ?? []) ? 1 : 0);
    }

    case "word-meaning-input": {
      const blankIds = passageBlankIds(content.passage);
      if (blankIds.length === 0) return scored(0);
      const submittedMap = (submitted as Record<string, string>) ?? {};
      const okCount = blankIds.filter((id) => matchesAny(submittedMap[id] ?? "", (correct[id] as string[]) ?? [])).length;
      return scored(okCount / blankIds.length);
    }

    case "two-answer-text": {
      const fieldIds = content.fields.map((f) => f.id);
      if (fieldIds.length === 0) return scored(0);
      const submittedMap = (submitted as Record<string, string>) ?? {};
      const okCount = fieldIds.filter((id) => matchesAny(submittedMap[id] ?? "", (correct[id] as string[]) ?? [])).length;
      return scored(okCount / fieldIds.length);
    }

    case "verse-completion":
    case "short-text-answer": {
      const v = (submitted as string) ?? "";
      return scored(matchesAny(v, (correct.accepted as string[]) ?? []) ? 1 : 0);
    }

    case "open-error-correction-in-passage": {
      const v = (submitted as OpenErrorCorrectionValue) ?? { wrongWord: "", correctWord: "" };
      const wrongOk = matchesAny(v.wrongWord, [correct.wrongWord as string]);
      const correctOk = matchesAny(v.correctWord, [correct.correctWord as string]);
      return scored(wrongOk && correctOk ? 1 : 0);
    }

    case "find-n-errors-in-list": {
      const v = (submitted as FindNErrorsValue) ?? { errorItemIds: [], corrections: {} };
      const expectedIds = correct.errorItemIds as string[];
      const expectedCorrections = correct.corrections as Record<string, string>;
      if (expectedIds.length === 0) return scored(0);
      const okCount = expectedIds.filter(
        (id) => v.errorItemIds.includes(id) && matchesAny(v.corrections[id] ?? "", [expectedCorrections[id]]),
      ).length;
      return scored(okCount / expectedIds.length);
    }

    case "paired-list-error-correction": {
      const v = (submitted as PairedListErrorCorrectionValue) ?? {};
      const expected = correct as Record<string, { isCorrect: boolean; correctedText?: string }>;
      const ids = Object.keys(expected);
      if (ids.length === 0) return scored(0);
      const okCount = ids.filter((id) => {
        const exp = expected[id];
        const got = v[id];
        if (!got) return false;
        if (exp.isCorrect) return got.isCorrect === true;
        return got.isCorrect === false && matchesAny(got.correctedText ?? "", [exp.correctedText ?? ""]);
      }).length;
      return scored(okCount / ids.length);
    }

    case "mcq-select-line-in-poem": {
      return scored(submitted === correct.correctLineIndex ? 1 : 0);
    }

    default:
      return { score: 0, maxScore, status: "needs_review" };
  }
}
