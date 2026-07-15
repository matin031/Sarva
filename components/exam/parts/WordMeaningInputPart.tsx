"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import type { RichPassage } from "@/lib/exam/content-schemas";

type WordMeaningInputContent = {
  type: "word-meaning-input";
  stimulus?: RichPassage;
  passage: RichPassage;
};

type Props = {
  content: WordMeaningInputContent;
  value: Record<string, string>;
  onChange: (blankId: string, value: string) => void;
  disabled?: boolean;
};

export default function WordMeaningInputPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">معنای واژهٔ مشخّص‌شده را بنویسید.</p>
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
