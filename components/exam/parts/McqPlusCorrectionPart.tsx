"use client";

import RichPassageView from "@/components/exam/RichPassageView";

type McqPlusCorrectionContent = {
  type: "mcq-plus-correction";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  questionText: string;
  correctionPrompt: string;
};

export type McqOption = {
  id: string;
  optionKey?: string;
  text: string;
};

export type McqPlusCorrectionValue = {
  optionId: string | null;
  correctionText: string;
};

type Props = {
  content: McqPlusCorrectionContent;
  options: McqOption[];
  value: McqPlusCorrectionValue;
  onChange: (value: McqPlusCorrectionValue) => void;
  disabled?: boolean;
};

export default function McqPlusCorrectionPart({ content, options, value, onChange, disabled }: Props) {
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
            onClick={() => onChange({ ...value, optionId: opt.id })}
            className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-right text-base
              transition-colors disabled:opacity-60 ${
                value.optionId === opt.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
          >
            {opt.optionKey && <span className="shrink-0 text-sm text-muted-foreground">({opt.optionKey})</span>}
            <span>{opt.text}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted-foreground">{content.correctionPrompt}</label>
        <input
          dir="rtl"
          type="text"
          disabled={disabled}
          value={value.correctionText}
          onChange={(e) => onChange({ ...value, correctionText: e.target.value })}
          placeholder="شکل درست را بنویسید..."
          className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
            placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
        />
      </div>
    </div>
  );
}
