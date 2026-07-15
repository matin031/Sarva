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

/** Poetry: one entry per mesra/line, rendered stacked. */
export const poemLines = (...ls: string[]): RichPassage => ({
  lines: ls.map((l) => [{ kind: "text" as const, value: l }]),
});
