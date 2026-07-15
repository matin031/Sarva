"use client";

import RichPassageView from "@/components/exam/RichPassageView";

type ShortTextAnswerContent = {
  type: "short-text-answer";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  questionText: string;
  inputVariant?: "single-line" | "textarea";
  displayVariant?: "default" | "list-item";
};

type Props = {
  content: ShortTextAnswerContent;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function ShortTextAnswerPart({ content, value, onChange, disabled }: Props) {
  const isTextarea = content.inputVariant === "textarea";

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <p className="text-base leading-relaxed xs:text-lg">{content.questionText}</p>
      {isTextarea ? (
        <textarea
          dir="rtl"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="پاسخ خود را بنویسید..."
          className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
            placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
        />
      ) : (
        <input
          dir="rtl"
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="پاسخ خود را بنویسید..."
          className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
            placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
        />
      )}
    </div>
  );
}
