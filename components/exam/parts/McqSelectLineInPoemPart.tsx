"use client";

type McqSelectLineInPoemContent = {
  type: "mcq-select-line-in-poem";
  lines: string[];
};

type Props = {
  content: McqSelectLineInPoemContent;
  value: number | null;
  onChange: (lineIndex: number) => void;
  disabled?: boolean;
};

/** No الف/ب/ج labels — the poem lines themselves are the tappable options. */
export default function McqSelectLineInPoemPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-2">
      {content.lines.map((line, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          className={`min-h-11 rounded-xl border-2 px-3 py-2.5 text-center text-base transition-colors
            disabled:opacity-60 ${
              value === i
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
        >
          {line}
        </button>
      ))}
    </div>
  );
}
