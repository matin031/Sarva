"use client";

type WordReorderDndContent = {
  type: "word-reorder-dnd";
  scrambledTokens: string[];
};

type Props = {
  content: WordReorderDndContent;
  /** Ordered list of indices into content.scrambledTokens — tracking by
   *  index (not the word string) handles repeated words correctly. */
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
};

/** Tap-to-place instead of drag-and-drop: tapping a word in the bank
 *  appends it to the answer; tapping a word already placed removes it.
 *  The spec explicitly calls for this as the mobile-first alternative to
 *  drag, since touch-drag has a high mis-tap rate on small screens. */
export default function WordReorderDndPart({ content, value, onChange, disabled }: Props) {
  const bankIndices = content.scrambledTokens.map((_, i) => i).filter((i) => !value.includes(i));

  const place = (i: number) => onChange([...value, i]);
  const remove = (posInAnswer: number) => onChange(value.filter((_, i) => i !== posInAnswer));

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 p-2.5">
        {value.length === 0 && (
          <span className="px-1 text-sm text-muted-foreground">کلمات را از پایین به ترتیب لمس کنید</span>
        )}
        {value.map((tokenIndex, pos) => (
          <button
            key={pos}
            type="button"
            disabled={disabled}
            onClick={() => remove(pos)}
            className="min-h-11 rounded-lg border-2 border-primary bg-primary/15 px-3 text-base font-medium
              text-primary transition-colors disabled:opacity-60"
          >
            {content.scrambledTokens[tokenIndex]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {bankIndices.map((i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => place(i)}
            className="min-h-11 rounded-lg border-2 border-border bg-card px-3 text-base transition-colors
              hover:border-primary/50 disabled:opacity-60"
          >
            {content.scrambledTokens[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
