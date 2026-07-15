"use client";

import RichPassageView from "@/components/exam/RichPassageView";

type TrueFalseContent = {
  type: "true-false";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  statementText: string;
  labels?: [string, string];
};

type Props = {
  content: TrueFalseContent;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export default function TrueFalsePart({ content, value, onChange, disabled }: Props) {
  const [trueLabel, falseLabel] = content.labels ?? ["درست", "نادرست"];

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <p className="text-base leading-relaxed xs:text-lg">{content.statementText}</p>
      <div className="flex gap-3">
        {[
          { label: trueLabel, val: true },
          { label: falseLabel, val: false },
        ].map(({ label, val }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(val)}
            className={`min-h-11 flex-1 rounded-xl border-2 px-3 py-2.5 text-base font-medium transition-colors
              disabled:opacity-60 ${
                value === val
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
