"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import HighlightedText from "@/components/exam/HighlightedText";

type McqInlineContent = {
  type: "mcq-inline";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  questionText: string;
};

export type McqOption = {
  id: string;
  optionKey?: string;
  text: string;
};

type Props = {
  content: McqInlineContent;
  options: McqOption[];
  value: string | null;
  onChange: (optionId: string) => void;
  disabled?: boolean;
};

export default function McqInlinePart({ content, options, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <p className="text-base leading-relaxed xs:text-lg">{content.questionText}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-right text-base
              transition-colors disabled:opacity-60 ${
                value === opt.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
          >
            {opt.optionKey && (
              <span className="shrink-0 text-sm text-muted-foreground">({opt.optionKey})</span>
            )}
            <span>
              <HighlightedText text={opt.text} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
