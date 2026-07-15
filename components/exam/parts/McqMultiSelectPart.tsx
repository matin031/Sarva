"use client";

import RichPassageView from "@/components/exam/RichPassageView";

type McqMultiSelectContent = {
  type: "mcq-multi-select";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  questionText: string;
  minSelect: number;
  maxSelect: number;
};

export type McqOption = {
  id: string;
  optionKey?: string;
  text: string;
};

type Props = {
  content: McqMultiSelectContent;
  options: McqOption[];
  value: string[];
  onChange: (optionIds: string[]) => void;
  disabled?: boolean;
};

export default function McqMultiSelectPart({ content, options, value, onChange, disabled }: Props) {
  const atMax = value.length >= content.maxSelect;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else if (!atMax) {
      onChange([...value, id]);
    }
  };

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base leading-relaxed xs:text-lg">{content.questionText}</p>
        <p className="text-xs text-muted-foreground">
          دقیقاً {content.maxSelect} گزینه انتخاب کنید ({value.length} از {content.maxSelect})
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled || (!selected && atMax)}
              onClick={() => toggle(opt.id)}
              className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-right text-base
                transition-colors disabled:opacity-60 ${
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-xs ${
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {selected && "✓"}
              </span>
              {opt.optionKey && <span className="shrink-0 text-sm text-muted-foreground">({opt.optionKey})</span>}
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
