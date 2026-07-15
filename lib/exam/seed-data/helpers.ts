import type { RichPassage } from "../content-schemas";

/** Plain read-only text, no inline slots. */
export const text = (s: string): RichPassage => ({
  tokens: [{ kind: "text", value: s }],
});

/** One inline blank between `before` and `after`. */
export const blank1 = (before: string, blankId: string, after: string): RichPassage => ({
  tokens: [
    { kind: "text", value: before },
    { kind: "blank", blankId },
    { kind: "text", value: after },
  ],
});

/** One decoratively-underlined word/phrase between `before` and `after` —
 *  for context text where the underline just points at which word an MCQ
 *  or true/false question is about, with no separate input of its own
 *  (the options themselves are the answer). */
export const highlight1 = (before: string, highlighted: string, after: string): RichPassage => ({
  tokens: [
    { kind: "text", value: before },
    { kind: "highlight", value: highlighted },
    { kind: "text", value: after },
  ],
});

/** Poetry: one entry per mesra/line, rendered stacked. */
export const poemLines = (...ls: string[]): RichPassage => ({
  lines: ls.map((l) => [{ kind: "text" as const, value: l }]),
});
