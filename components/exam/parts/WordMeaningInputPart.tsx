"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import type { RichPassage } from "@/lib/exam/content-schemas";

type WordMeaningInputContent = {
  type: "word-meaning-input";
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
    <div className="rounded-lg bg-muted/50 px-3 py-4 text-lg xs:text-xl">
      <RichPassageView passage={content.passage} blankValues={value} onBlankChange={onChange} disabled={disabled} />
    </div>
  );
}
