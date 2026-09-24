"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import HighlightedText from "@/components/exam/HighlightedText";
import InlineBlankText, { countDottedBlanks } from "@/components/exam/InlineBlankText";

type TwoAnswerTextContent = {
  type: "two-answer-text";
  stimulus?: import("@/lib/exam/content-schemas").RichPassage;
  questionText: string;
  fields: { id: string; label: string }[];
};

type Props = {
  content: TwoAnswerTextContent;
  value: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
};

export default function TwoAnswerTextPart({ content, value, onChange, disabled }: Props) {
  // one dotted blank per field: the boxes go into the sentence, in order
  if (countDottedBlanks(content.questionText) === content.fields.length) {
    return (
      <div dir="rtl" className="flex flex-col gap-3 text-right">
        {content.stimulus && (
          <div className="rounded-lg bg-muted/50 px-3 py-3">
            <RichPassageView passage={content.stimulus} />
          </div>
        )}
        <InlineBlankText
          text={content.questionText}
          slots={content.fields.map((f) => ({ id: f.id, placeholder: f.label }))}
          values={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <p className="text-base leading-relaxed xs:text-lg"><HighlightedText text={content.questionText} /></p>
      <div className="flex flex-col gap-3 xs:flex-row">
        {content.fields.map((field) => (
          <div key={field.id} className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">{field.label}</label>
            <input
              dir="rtl"
              type="text"
              disabled={disabled}
              value={value[field.id] ?? ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder="پاسخ..."
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
                placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
