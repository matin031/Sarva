"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import type { RichPassage } from "@/lib/exam/content-schemas";

type MultiPartInlineTaggingContent = {
  type: "multi-part-inline-tagging";
  passage: RichPassage;
  tagOptions: string[];
};

type Props = {
  content: MultiPartInlineTaggingContent;
  value: Record<string, string>;
  onChange: (blankId: string, tag: string) => void;
  disabled?: boolean;
};

export default function MultiPartInlineTaggingPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">برای هر بخش هایلایت‌شده، نقش مناسب را انتخاب کنید.</p>
      <div className="rounded-lg bg-muted/50 px-3 py-4 text-lg xs:text-xl">
        <RichPassageView
          passage={content.passage}
          selectValues={value}
          onSelectChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
