"use client";

import type { QuestionPartContent } from "@/lib/exam/content-schemas";
import ShortTextAnswerPart from "@/components/exam/parts/ShortTextAnswerPart";
import TrueFalsePart from "@/components/exam/parts/TrueFalsePart";
import CountAnswerPart from "@/components/exam/parts/CountAnswerPart";
import McqInlinePart, { type McqOption } from "@/components/exam/parts/McqInlinePart";
import WordMeaningInputPart from "@/components/exam/parts/WordMeaningInputPart";
import McqMultiSelectPart from "@/components/exam/parts/McqMultiSelectPart";
import McqPlusCorrectionPart, {
  type McqPlusCorrectionValue,
} from "@/components/exam/parts/McqPlusCorrectionPart";
import FillBlankTermPart from "@/components/exam/parts/FillBlankTermPart";
import TwoAnswerTextPart from "@/components/exam/parts/TwoAnswerTextPart";
import VerseCompletionPart from "@/components/exam/parts/VerseCompletionPart";
import McqSelectLineInPoemPart from "@/components/exam/parts/McqSelectLineInPoemPart";
import MultiPartInlineTaggingPart from "@/components/exam/parts/MultiPartInlineTaggingPart";
import OpenErrorCorrectionInPassagePart, {
  type OpenErrorCorrectionValue,
} from "@/components/exam/parts/OpenErrorCorrectionInPassagePart";
import FindNErrorsInListPart, { type FindNErrorsValue } from "@/components/exam/parts/FindNErrorsInListPart";
import PairedListErrorCorrectionPart, {
  type PairedListErrorCorrectionValue,
} from "@/components/exam/parts/PairedListErrorCorrectionPart";
import MatchingPairsWithDistractorPart from "@/components/exam/parts/MatchingPairsWithDistractorPart";
import WordReorderDndPart from "@/components/exam/parts/WordReorderDndPart";
import DiagramBuilderPart from "@/components/exam/parts/DiagramBuilderPart";

type Props = {
  content: QuestionPartContent;
  options?: McqOption[];
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

/** Renders one question_part by its content.type. Unimplemented types show
 *  a labeled placeholder instead of crashing, so a whole exam can be
 *  previewed while components are built out one at a time. */
export default function QuestionPartRenderer({ content, options, value, onChange, disabled }: Props) {
  switch (content.type) {
    case "short-text-answer":
      return (
        <ShortTextAnswerPart
          content={content}
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "true-false":
      return (
        <TrueFalsePart
          content={content}
          value={(value as boolean | null) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "count-answer":
      return (
        <CountAnswerPart
          content={content}
          value={(value as number | null) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "mcq-inline":
      return (
        <McqInlinePart
          content={content}
          options={options ?? []}
          value={(value as string | null) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "word-meaning-input":
      return (
        <WordMeaningInputPart
          content={content}
          value={(value as Record<string, string>) ?? {}}
          onChange={(blankId, v) => onChange({ ...(value as Record<string, string>), [blankId]: v })}
          disabled={disabled}
        />
      );
    case "mcq-multi-select":
      return (
        <McqMultiSelectPart
          content={content}
          options={options ?? []}
          value={(value as string[]) ?? []}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "mcq-plus-correction":
      return (
        <McqPlusCorrectionPart
          content={content}
          options={options ?? []}
          value={(value as McqPlusCorrectionValue) ?? { optionId: null, correctionText: "" }}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "fill-blank-term":
      return (
        <FillBlankTermPart
          content={content}
          value={(value as Record<string, string>) ?? {}}
          onChange={(blankId, v) => onChange({ ...(value as Record<string, string>), [blankId]: v })}
          disabled={disabled}
        />
      );
    case "two-answer-text":
      return (
        <TwoAnswerTextPart
          content={content}
          value={(value as Record<string, string>) ?? {}}
          onChange={(fieldId, v) => onChange({ ...(value as Record<string, string>), [fieldId]: v })}
          disabled={disabled}
        />
      );
    case "verse-completion":
      return (
        <VerseCompletionPart
          content={content}
          value={(value as string) ?? ""}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "mcq-select-line-in-poem":
      return (
        <McqSelectLineInPoemPart
          content={content}
          value={(value as number | null) ?? null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "multi-part-inline-tagging":
      return (
        <MultiPartInlineTaggingPart
          content={content}
          value={(value as Record<string, string>) ?? {}}
          onChange={(blankId, tag) => onChange({ ...(value as Record<string, string>), [blankId]: tag })}
          disabled={disabled}
        />
      );
    case "open-error-correction-in-passage":
      return (
        <OpenErrorCorrectionInPassagePart
          content={content}
          value={(value as OpenErrorCorrectionValue) ?? { wrongWord: "", correctWord: "" }}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "find-n-errors-in-list":
      return (
        <FindNErrorsInListPart
          content={content}
          value={(value as FindNErrorsValue) ?? { errorItemIds: [], corrections: {} }}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "paired-list-error-correction":
      return (
        <PairedListErrorCorrectionPart
          content={content}
          value={(value as PairedListErrorCorrectionValue) ?? {}}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "matching-pairs-with-distractor":
      return (
        <MatchingPairsWithDistractorPart
          content={content}
          value={(value as Record<string, string>) ?? {}}
          onChange={(aId, bId) => onChange({ ...(value as Record<string, string>), [aId]: bId })}
          disabled={disabled}
        />
      );
    case "word-reorder-dnd":
      return (
        <WordReorderDndPart
          content={content}
          value={(value as number[]) ?? []}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "diagram-builder":
      return (
        <DiagramBuilderPart
          content={content}
          value={(value as Record<string, string>) ?? {}}
          onChange={(childId, parentId) => onChange({ ...(value as Record<string, string>), [childId]: parentId })}
          disabled={disabled}
        />
      );
    default: {
      // All 18 catalogue types are handled above; this only fires for
      // malformed data that bypassed validation at write time.
      const unknownType = (content as { type: string }).type;
      return (
        <div dir="rtl" className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          نوع سؤال «{unknownType}» ناشناخته است.
        </div>
      );
    }
  }
}
