"use client";

import { Fragment } from "react";
import { Highlighter, type HighlighterAction } from "@/components/home/Highlighter";
import { speak, useStage } from "./persona";
import s from "./learn.module.css";

const TOKEN = /(==.+?==|__.+?__|\(\(.+?\)\)|\[\[.+?\]\]|\*\*.+?\*\*|<<.+?>>|\{\{.+?\}\})/g;
const MARKS: Record<string, HighlighterAction> = { "==": "highlight", "__": "underline", "((": "circle", "[[": "box" };

/** Lesson text markup (see lib/learn/types.ts). `delay` staggers the marker
 *  strokes after the line appears. Newlines become line breaks, and `%نام%`
 *  becomes the reader's own first name. */
export function Rich({ text, delay = 350 }: { text: string; delay?: number }) {
  const { persona, name } = useStage();
  let mark = 0;
  return <>{speak(text, name).split("\n").map((line, n) => <Fragment key={n}>
    {n > 0 && <br />}
    {line.split(TOKEN).map((part, i) => {
      const open = part.slice(0, 2);
      if (part.length < 5 && !(open === "{{" || open === "<<")) return part;
      const inner = part.slice(2, -2);
      if (open === "<<") return <span key={i} className={s.crowned}><span className={s.crown} aria-hidden="true">{persona.mark}</span>{inner}</span>;
      if (open === "{{") return <span key={i} className={s.prepChip}>{inner}</span>;
      if (open === "**") return <strong key={i}>{inner}</strong>;
      const action = MARKS[open];
      if (!action) return part;
      const highlight = action === "highlight";
      return <Highlighter key={i} action={action}
        color={highlight ? "color-mix(in oklch, var(--gold) 55%, transparent)" : "var(--lx-ink)"}
        strokeWidth={highlight ? 2 : 1.8} padding={action === "circle" ? 6 : highlight ? 2 : 3}
        iterations={action === "circle" ? 1 : 2} duration={highlight ? 600 : 800} delay={delay + mark++ * 260}>{inner}</Highlighter>;
    })}
  </Fragment>)}</>;
}

/** The same text without markup, for aria labels. */
export const plain = (text: string) => text.replace(TOKEN, part => part.slice(2, -2));
