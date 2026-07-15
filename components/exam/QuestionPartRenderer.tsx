"use client";

import type { QuestionPartContent } from "@/lib/exam/content-schemas";
import ShortTextAnswerPart from "@/components/exam/parts/ShortTextAnswerPart";
import TrueFalsePart from "@/components/exam/parts/TrueFalsePart";
import CountAnswerPart from "@/components/exam/parts/CountAnswerPart";
import McqInlinePart, { type McqOption } from "@/components/exam/parts/McqInlinePart";
import WordMeaningInputPart from "@/components/exam/parts/WordMeaningInputPart";

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
    default:
      return (
        <div dir="rtl" className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          کامپوننت «{content.type}» هنوز پیاده‌سازی نشده است.
        </div>
      );
  }
}
