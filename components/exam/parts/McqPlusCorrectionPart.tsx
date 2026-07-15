"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import HighlightedText from "@/components/exam/HighlightedText";

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

/** Dropdown for the option pick, then a text input for the correction —
 *  the two-step "which option, then fix it" flow this type asks for reads
 *  more naturally as one compact form than as a full button list plus a
 *  separate input. */
export default function McqPlusCorrectionPart({ content, options, value, onChange, disabled }: Props) {
  const selected = options.find((o) => o.id === value.optionId);

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      {content.stimulus && (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <p className="text-base leading-relaxed xs:text-lg">{content.questionText}</p>

      <select
        dir="rtl"
        disabled={disabled}
        value={value.optionId ?? ""}
        onChange={(e) => onChange({ ...value, optionId: e.target.value })}
        className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-base text-foreground outline-none
          focus:border-primary disabled:opacity-60"
      >
        <option value="" disabled>
          یک گزینه را انتخاب کنید
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.optionKey ? `${opt.optionKey}) ` : ""}
            {opt.text.replace(/\{\{([^}]+)\}\}/g, "$1")}
          </option>
        ))}
      </select>

      {selected && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-base leading-relaxed">
          <HighlightedText text={selected.text} />
        </p>
      )}

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
