"use client";

type VerseCompletionContent = {
  type: "verse-completion";
  firstMesra: string;
};

type Props = {
  content: VerseCompletionContent;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function VerseCompletionPart({ content, value, onChange, disabled }: Props) {
  return (
    <div dir="rtl" className="flex flex-col items-center gap-3 text-center">
      <p className="rounded-lg bg-muted/50 px-3 py-3 text-lg xs:text-xl">{content.firstMesra}</p>
      <input
        dir="rtl"
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مصراع دوم را از حفظ بنویسید..."
        className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-center text-lg
          outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
      />
    </div>
  );
}
