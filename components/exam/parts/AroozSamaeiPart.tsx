"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import HighlightedText from "@/components/exam/HighlightedText";
import type { RichPassage } from "@/lib/exam/content-schemas";

type AroozSamaeiContent = {
  type: "aroozi-samaei";
  questionText: string;
  stemKind: "audio" | "verse" | "meter-pattern";
  stemAudioUrl?: string;
  stemVerse?: RichPassage;
  stemMeterPattern?: string;
};

export type AroozSamaeiOption = {
  id: string;
  optionKey?: string;
  text: string; // verse text, or an audio URL — see optionKind below
};

type Props = {
  content: AroozSamaeiContent;
  options: AroozSamaeiOption[];
  value: string | null;
  onChange: (optionId: string) => void;
  disabled?: boolean;
};

/** عروض سماعی: match rhythm by ear. Options are always the modality
 *  opposite the stem — an audio stem gets verse options, a verse or
 *  written-meter stem gets audio options — so optionKind is derived, never
 *  passed in separately. */
export default function AroozSamaeiPart({ content, options, value, onChange, disabled }: Props) {
  const optionKind: "verse" | "audio" = content.stemKind === "audio" ? "verse" : "audio";

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      <div className="rounded-lg bg-muted/50 px-3 py-3">
        {content.stemKind === "audio" && content.stemAudioUrl && (
          <audio controls src={content.stemAudioUrl} className="w-full" />
        )}
        {content.stemKind === "verse" && content.stemVerse && <RichPassageView passage={content.stemVerse} />}
        {content.stemKind === "meter-pattern" && (
          <p className="text-center text-lg font-semibold tracking-wide xs:text-xl">{content.stemMeterPattern}</p>
        )}
      </div>

      <p className="text-base leading-relaxed xs:text-lg">{content.questionText}</p>

      <div className="flex flex-col gap-2">
        {options.map((opt) =>
          optionKind === "verse" ? (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-right text-base
                transition-colors disabled:opacity-60 ${
                  value === opt.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
            >
              {opt.optionKey && <span className="shrink-0 text-sm text-muted-foreground">({opt.optionKey})</span>}
              <span>
                <HighlightedText text={opt.text} />
              </span>
            </button>
          ) : (
            <div
              key={opt.id}
              role="radio"
              aria-checked={value === opt.id}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onChange(opt.id)}
              onKeyDown={(e) => {
                if (!disabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onChange(opt.id);
                }
              }}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                disabled ? "opacity-60" : "cursor-pointer"
              } ${value === opt.id ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/50"}`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  value === opt.id ? "border-primary" : "border-muted-foreground/50"
                }`}
              >
                {value === opt.id && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              {opt.optionKey && <span className="shrink-0 text-sm text-muted-foreground">({opt.optionKey})</span>}
              <audio
                controls
                src={opt.text}
                onClick={(e) => e.stopPropagation()}
                className="h-9 min-w-0 flex-1"
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
