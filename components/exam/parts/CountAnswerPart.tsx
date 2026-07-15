"use client";

type CountAnswerContent = {
  type: "count-answer";
  questionText: string;
  min?: number;
  max?: number;
};

type Props = {
  content: CountAnswerContent;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
};

export default function CountAnswerPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      <p className="text-base leading-relaxed xs:text-lg">{content.questionText}</p>
      <input
        type="number"
        inputMode="numeric"
        disabled={disabled}
        min={content.min}
        max={content.max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder="0"
        className="min-h-11 w-20 rounded-xl border border-border bg-card px-3 py-2.5 text-center text-lg font-medium
          outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
      />
    </div>
  );
}
