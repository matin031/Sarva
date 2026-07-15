"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import type { RichPassage } from "@/lib/exam/content-schemas";

type OpenErrorCorrectionInPassageContent = {
  type: "open-error-correction-in-passage";
  passage: RichPassage;
};

export type OpenErrorCorrectionValue = {
  wrongWord: string;
  correctWord: string;
};

type Props = {
  content: OpenErrorCorrectionInPassageContent;
  value: OpenErrorCorrectionValue;
  onChange: (value: OpenErrorCorrectionValue) => void;
  disabled?: boolean;
};

/** No word is highlighted here — unlike mcq-plus-correction, the student
 *  has to spot the wrong word in a plain, unmarked paragraph themselves. */
export default function OpenErrorCorrectionInPassagePart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      <div className="rounded-lg bg-muted/50 px-3 py-4 text-lg xs:text-xl">
        <RichPassageView passage={content.passage} />
      </div>
      <p className="text-xs text-muted-foreground">کلمهٔ غلط املایی را در متن بیابید و شکل درست آن را بنویسید.</p>
      <div className="flex flex-col gap-3 xs:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">کلمهٔ غلط</label>
          <input
            dir="rtl"
            type="text"
            disabled={disabled}
            value={value.wrongWord}
            onChange={(e) => onChange({ ...value, wrongWord: e.target.value })}
            placeholder="کلمهٔ غلط..."
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
              placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">شکل درست</label>
          <input
            dir="rtl"
            type="text"
            disabled={disabled}
            value={value.correctWord}
            onChange={(e) => onChange({ ...value, correctWord: e.target.value })}
            placeholder="شکل درست..."
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none
              placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
