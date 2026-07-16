"use client";

import type { RichPassage } from "@/lib/exam/content-schemas";

type Props = {
  passage: RichPassage;
  blankValues?: Record<string, string>;
  onBlankChange?: (blankId: string, value: string) => void;
  selectValues?: Record<string, string>;
  onSelectChange?: (blankId: string, value: string) => void;
  disabled?: boolean;
};

/**
 * Renders a RichPassage (poem lines or a prose paragraph) with inline
 * `blank` inputs and `select` dropdowns positioned exactly where the token
 * stream puts them — inline with the text flow, not in a separate form
 * below. Because it's plain inline elements, it wraps naturally on narrow
 * screens instead of needing manual breakpoints.
 *
 * Exception: a `blank` token that comes immediately after a `highlight`
 * token (the highlightThenBlank() authoring pattern — "write the meaning of
 * the underlined word") is NOT rendered inline. Sitting an input between
 * two words of the same sentence breaks the reading flow, so instead the
 * word stays underlined in place and its input is pulled into a labeled
 * "word: answer" row below the whole passage.
 */
export default function RichPassageView({
  passage,
  blankValues = {},
  onBlankChange,
  selectValues = {},
  onSelectChange,
  disabled,
}: Props) {
  const tokenLists = passage.lines ?? (passage.tokens ? [passage.tokens] : []);
  const belowBlanks = tokenLists.flatMap((tokens) =>
    tokens.flatMap((token, i) => {
      const next = tokens[i + 1];
      return token.kind === "highlight" && next?.kind === "blank"
        ? [{ blankId: next.blankId, word: token.value }]
        : [];
    }),
  );
  const belowBlankIds = new Set(belowBlanks.map((b) => b.blankId));

  const renderTokens = (tokens: RichPassage["tokens"] & {}) =>
    tokens.map((token, i) => {
      switch (token.kind) {
        case "text":
          return <span key={i}>{token.value}</span>;
        case "highlight":
          return (
            <span key={i} className="underline decoration-primary decoration-2 underline-offset-4">
              {token.value}
            </span>
          );
        case "blank":
          if (belowBlankIds.has(token.blankId)) return null;
          return (
            <input
              key={i}
              type="text"
              inputMode="text"
              disabled={disabled}
              value={blankValues[token.blankId] ?? ""}
              onChange={(e) => onBlankChange?.(token.blankId, e.target.value)}
              placeholder="پاسخ"
              className="mx-1 inline-block w-24 xs:w-32 min-w-0 rounded-md border-b-2 border-primary/60 bg-primary/5
                px-2 py-1 text-center text-foreground outline-none placeholder:text-muted-foreground/60
                focus:border-primary focus:bg-primary/10 disabled:opacity-60"
            />
          );
        case "select":
          return (
            <span key={i} className="mx-1 inline-flex items-center gap-1.5 align-middle">
              <span className="underline decoration-primary decoration-2 underline-offset-4">{token.value}</span>
              <select
                disabled={disabled}
                value={selectValues[token.blankId] ?? ""}
                onChange={(e) => onSelectChange?.(token.blankId, e.target.value)}
                className="min-h-11 rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none
                  focus:border-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  انتخاب کنید
                </option>
                {token.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </span>
          );
      }
    });

  const belowBlanksRow = belowBlanks.length > 0 && (
    <div dir="rtl" className="mt-3 flex flex-col gap-2 text-right">
      {belowBlanks.map(({ blankId, word }) => (
        <div key={blankId} className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-semibold text-primary">{word}:</span>
          <input
            type="text"
            inputMode="text"
            disabled={disabled}
            value={blankValues[blankId] ?? ""}
            onChange={(e) => onBlankChange?.(blankId, e.target.value)}
            placeholder="پاسخ"
            className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-base outline-none
              placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
          />
        </div>
      ))}
    </div>
  );

  if (passage.lines) {
    return (
      <div>
        <div dir="rtl" className="flex flex-col items-center gap-2 text-center">
          {passage.lines.map((line, i) => (
            <div key={i} className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
              {renderTokens(line)}
            </div>
          ))}
        </div>
        {belowBlanksRow}
      </div>
    );
  }

  return (
    <div>
      <div dir="rtl" className="flex flex-wrap items-center gap-x-1 gap-y-2 leading-loose text-right">
        {renderTokens(passage.tokens ?? [])}
      </div>
      {belowBlanksRow}
    </div>
  );
}
