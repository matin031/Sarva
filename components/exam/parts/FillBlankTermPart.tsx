"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import type { RichPassage } from "@/lib/exam/content-schemas";

type FillBlankTermContent = {
  type: "fill-blank-term";
  stimulus?: RichPassage;
  passage: RichPassage;
};

type Props = {
  content: FillBlankTermContent;
  value: Record<string, string>;
  onChange: (blankId: string, value: string) => void;
  disabled?: boolean;
};

/** Visually close to word-meaning-input (both are "one inline blank inside
 *  a sentence"), but kept as its own component per the spec's one-type-one-
 *  component rule: here the blank is a grammar/literary term, not a word's
 *  meaning, and the answer is exact-matched, not semantically graded. */
export default function FillBlankTermPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">اصطلاح مناسب را در جای خالی بنویسید.</p>
      {content.stimulus && (
        <div className="rounded-lg bg-muted/30 px-3 py-3 text-base xs:text-lg">
          <RichPassageView passage={content.stimulus} />
        </div>
      )}
      <div className="rounded-lg bg-muted/50 px-3 py-4 text-lg xs:text-xl">
        <RichPassageView passage={content.passage} blankValues={value} onBlankChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}
