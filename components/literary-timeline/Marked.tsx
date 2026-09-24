"use client";

import { Highlighter, type HighlighterAction } from "@/components/home/Highlighter";

const TOKEN = /(==.+?==|__.+?__|\(\(.+?\)\)|\[\[.+?\]\])/g;
const ACTIONS: Record<string, HighlighterAction> = { "==": "highlight", "__": "underline", "((": "circle", "[[": "box" };

/** Renders the note markup from `ERA_NOTES` with hand-drawn marker strokes.
 *  Highlights use a translucent fill so the text stays readable in both themes;
 *  strokes use the chapter's ink colour. `delay` staggers notes in one card. */
export function Marked({ text, delay = 0 }: { text: string; delay?: number }) {
  let mark = 0;
  return <>{text.split(TOKEN).map((part, i) => {
    const action = ACTIONS[part.slice(0, 2)];
    if (!action || part.length < 5) return part;
    const inner = part.slice(2, -2);
    const highlight = action === "highlight";
    return <Highlighter
      key={i}
      action={action}
      color={highlight ? "color-mix(in oklch, var(--era-color) 42%, transparent)" : "var(--era-ink)"}
      strokeWidth={highlight ? 2 : action === "circle" ? 1.6 : 2}
      padding={action === "circle" ? 6 : highlight ? 2 : 3}
      iterations={action === "circle" ? 1 : 2}
      duration={highlight ? 650 : 800}
      delay={delay + mark++ * 280}
    >{inner}</Highlighter>;
  })}</>;
}

/** The same text without markup, for places that cannot animate (flashcards, search). */
export const plainNote = (text: string) => text.replace(TOKEN, part => part.slice(2, -2));
