"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import HighlightedText from "@/components/exam/HighlightedText";
import InlineBlankText, { countDottedBlanks } from "@/components/exam/InlineBlankText";

type ShortTextAnswerContent = {
  type: "short-text-answer";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  questionText: string;
  inputVariant?: "single-line" | "textarea" | "word";
  displayVariant?: "default" | "list-item";
};

type Props = {
  content: ShortTextAnswerContent;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function ShortTextAnswerPart({ content, value, onChange, disabled }: Props) {
  const variant = content.inputVariant ?? "single-line";
  const isTextarea = variant === "textarea";
  // A one-word answer gets a one-word box. The width is the whole message
  // here: a full-width input in front of «نام آرایه را بنویسید» invites a
  // sentence, which the answer key would then mark wrong.
  const isWord = variant === "word";
  // «… تاریخ .......... است.» — one dotted blank and a one-line answer: the
  // box belongs in the blank, not under the sentence
  const inline = !isTextarea && countDottedBlanks(content.questionText) === 1;

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      {inline ? (
        <InlineBlankText
          text={content.questionText}
          slots={[{ id: "v" }]}
          values={{ v: value }}
          onChange={(_, v) => onChange(v)}
          disabled={disabled}
        />
      ) : (
        <p className="text-base leading-relaxed xs:text-lg"><HighlightedText text={content.questionText} /></p>
      )}
      {inline ? null : isTextarea ? (
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
          placeholder={isWord ? "یک واژه" : "پاسخ خود را بنویسید..."}
          className={`min-h-11 rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
            placeholder:text-muted-foreground focus:border-primary disabled:opacity-60 ${
              isWord ? "w-44 max-w-full text-center font-semibold" : "w-full"
            }`}
        />
      )}
    </div>
  );
}
