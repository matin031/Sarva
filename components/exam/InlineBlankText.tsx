"use client";

import HighlightedText from "@/components/exam/HighlightedText";

/** A run of dots/ellipses/underscores the papers use for «جای خالی». */
const BLANK_RUN = /(?:\.{3,}|…{2,}|_{3,})/;

/** How many dotted blanks the text has. */
export function countDottedBlanks(text: string): number {
  return text.split(new RegExp(BLANK_RUN.source, "g")).length - 1;
}

type Slot = { id: string; placeholder?: string };

type Props = {
  text: string;
  slots: Slot[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  disabled?: boolean;
};

/**
 * «موضوع آن، تاریخ .......... است.» — the answer box goes where the dots are,
 * the way the paper asks for it, instead of in a separate row under the
 * sentence. Callers check `countDottedBlanks(text) === slots.length` first and
 * fall back to their own layout otherwise.
 */
export default function InlineBlankText({ text, slots, values, onChange, disabled }: Props) {
  const pieces = text.split(new RegExp(BLANK_RUN.source, "g"));
  return (
    <p className="text-base leading-loose xs:text-lg">
      {pieces.map((piece, i) => {
        const slot = slots[i];
        return (
          <span key={i}>
            <HighlightedText text={piece} />
            {i < pieces.length - 1 && slot && (
              <input
                type="text"
                dir="rtl"
                aria-label={slot.placeholder ?? `جای خالی ${i + 1}`}
                disabled={disabled}
                value={values[slot.id] ?? ""}
                onChange={(e) => onChange(slot.id, e.target.value)}
                placeholder={slot.placeholder ?? "…"}
                className="exam-inline-blank mx-1 inline-block w-28 min-w-0 rounded-md border-b-2 border-primary/60 bg-primary/5
                  px-2 py-0.5 text-center align-baseline text-foreground outline-none placeholder:text-muted-foreground/50
                  focus:border-primary focus:bg-primary/10 disabled:opacity-60 xs:w-36"
              />
            )}
          </span>
        );
      })}
    </p>
  );
}
