"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Beyt } from "@/lib/doroos/types";
import { marksForBeyt, tokenize, type Mark, type Realm, type Span } from "@/lib/doroos/annotations";

/** A بیت with its notes drawn onto it the way a student annotates a text: the
 *  word underlined, the term written beneath in handwriting, an arc joining the
 *  two halves of a جناس with its name at the apex.
 *
 *  The marks are *measured*, never authored in pixels. Each word is its own
 *  span; after layout their boxes are read once and every stroke is derived
 *  from them, so the drawing survives a resize, a font swap, and a line that
 *  wraps differently on a phone than on a desktop.
 *
 *  Only one قلمرو is drawn at a time. Both at once is what the reference
 *  notebooks look like after a whole term — unreadable — and the point here is
 *  to be able to see one kind of thing clearly. */

type Rect = { x: number; y: number; w: number; h: number };

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

function sameRects(a: Map<string, Rect> | null, b: Map<string, Rect>): boolean {
  if (!a || a.size !== b.size) return false;
  for (const [k, v] of b) {
    const o = a.get(k);
    if (!o || !near(o.x, v.x) || !near(o.y, v.y) || !near(o.w, v.w) || !near(o.h, v.h))
      return false;
  }
  return true;
}

function sameSizes(
  a: Map<string, { w: number; h: number }>,
  b: Map<string, { w: number; h: number }>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of b) {
    const o = a.get(k);
    if (!o || !near(o.w, v.w) || !near(o.h, v.h)) return false;
  }
  return true;
}

/* ------------------------------------------------------------- hand-drawn */

/** A rule under a word. Straight, and drawn once — the earlier version added
 *  a hand-drawn wobble to every stroke, which read as sloppy rather than
 *  hand-made next to a real handwriting face. The handwriting carries the
 *  "written by a person" feeling; the rules just have to be clean. */
/** Pulled in at both ends. Two annotated words sitting next to each other —
 *  «چون» and «زندگانی» — drew two rules that met exactly, and the pair read as
 *  one long underline covering both, so the reader could not tell which label
 *  belonged to which word. The inset guarantees a visible gap. `frac` shortens
 *  the rule further, used for sentence-pattern marks where every single word of
 *  the مصراع is underlined at once. */
function rule(x1: number, y: number, x2: number, frac = 1): string {
  const mid = (x1 + x2) / 2;
  const half = ((x2 - x1) / 2) * frac - 2.5;
  if (half <= 1) return `M ${mid.toFixed(1)} ${y.toFixed(1)} L ${(mid + 1).toFixed(1)} ${y.toFixed(1)}`;
  return `M ${(mid - half).toFixed(1)} ${y.toFixed(1)} L ${(mid + half).toFixed(1)} ${y.toFixed(1)}`;
}

/** The arc that joins two words of the same مصراع, dipping below both so its
 *  apex is free for the term. A symmetric quadratic, so it reads as drawn with
 *  one confident stroke. */
function arc(x1: number, y1: number, x2: number, y2: number, drop: number): string {
  const mx = (x1 + x2) / 2;
  const my = Math.max(y1, y2) + drop * 1.6;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** A leader from the middle of a word's rule down to its label: a short drop,
 *  then the arrowhead. This is what makes it unambiguous which handwriting
 *  belongs to which word once several are stacked under one line. */
function leader(x0: number, y0: number, x1: number, y1: number, detour?: number): string {
  const f = (n: number) => n.toFixed(1);
  if (detour === undefined && Math.abs(x1 - x0) < 0.5) {
    return `M ${f(x0)} ${f(y0)} L ${f(x1)} ${f(y1)}`;
  }
  /* A leader that stops short of its label is worse than no leader: with two
     notes stacked under one word, a stub above the lower label reads as if it
     came out of the upper one. So the line always runs from the word to its own
     handwriting, and bends around anything in the way instead of being cut. */
  const mid = detour ?? (x0 + x1) / 2;
  const a = y0 + (y1 - y0) * 0.32;
  const b = y0 + (y1 - y0) * 0.68;
  return `M ${f(x0)} ${f(y0)} C ${f(x0)} ${f(a)}, ${f(mid)} ${f(a)}, ${f(mid)} ${f((a + b) / 2)} C ${f(mid)} ${f(b)}, ${f(x1)} ${f(b)}, ${f(x1)} ${f(y1)}`;
}

/** Arrowhead pointing straight down, at the end of a leader. */
function arrowDown(x: number, y: number, size = 4.5, up = false): string {
  const d = up ? -size : size;
  return `M ${(x - size).toFixed(1)} ${(y - d).toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + size).toFixed(1)} ${(y - d).toFixed(1)}`;
}

/* ------------------------------------------------------------- geometry */

/** one line of the hand font, near enough */
const LABEL_H = 19;
/** between the bottom of a word and the first thing drawn under it */
const GAP = 6;

type Placed = {
  mark: Mark;
  /** depth below the line's word-bottom that this mark owns */
  off: number;
  /** its two halves sit on different مصراع, so it is drawn as two underlines */
  cross: boolean;
  /** roles only: one depth per word, because each label is packed on its own */
  roleOffs?: number[];
  /** measured height of this mark's handwriting, once it is known */
  labelH?: number;
  /** the union box of everything the mark points at, per span */
  boxes: Rect[];
};

/** How deep each kind draws before its handwriting starts. `labelH` is the
 *  label's *measured* height: on a narrow screen a term like «کنایه از حیرت و
 *  تعجب» wraps to three lines, and reserving one line's worth pushed it
 *  straight through the notes underneath. */
const ARC_DEPTH = 16;
function heightOf(m: Mark, labelH = LABEL_H): number {
  const h = Math.max(LABEL_H, labelH);
  if (m.kind === "link") return ARC_DEPTH + h + 8;
  if (m.kind === "gloss") return h + 6;
  return h + 8;
}

type Item = { id: string; x1: number; x2: number; h: number; pri: number };

/** Stacks annotations under a line the way a typesetter stacks footnotes:
 *  each one drops to the shallowest depth where its *own* horizontal extent
 *  clears everything already placed that overlaps it.
 *
 *  Fixed-height lanes were not enough. An underline's handwriting is wider than
 *  the word it belongs to, and an arc is taller than a label, so packing by the
 *  word box alone let a جناس arc pass straight through the کنایه written above
 *  it. Extents come from the rendered label, and heights from what each kind
 *  actually draws. */
function stack(items: Item[]): Map<string, number> {
  const placedBoxes: { x1: number; x2: number; y1: number; y2: number }[] = [];
  const out = new Map<string, number>();
  /* Order decides depth, so it decides what looks attached to what. A
     sentence-pattern label has to sit against its own مصراع — pushed two rows
     down by an unrelated note it floated between the lines and looked like it
     belonged to neither. Priority first, then position. */
  const sorted = [...items].sort((a, b) => a.pri - b.pri || a.x1 - b.x1);
  for (const it of sorted) {
    let y = 0;
    for (;;) {
      const clash = placedBoxes.find(
        (o) => it.x1 < o.x2 + 10 && o.x1 < it.x2 + 10 && y < o.y2 && o.y1 < y + it.h,
      );
      if (!clash) break;
      y = clash.y2 + 2;
    }
    placedBoxes.push({ x1: it.x1, x2: it.x2, y1: y, y2: y + it.h });
    out.set(it.id, y);
  }
  return out;
}

/** Where a mark's handwriting sits, measured from the top of the host. Shared
 *  so the leader logic and the labels themselves can never disagree. */
function labelTopOf(p: Placed, hemiBottom: number[] = []): number {
  const b = p.boxes[0];
  const bottom = Math.max(...p.boxes.map((r) => r.y + r.h));
  if (p.mark.kind === "gloss") {
    const h = p.mark.spans[0].h;
    // above its own word on the first line, in the gap under the line before
    // it otherwise; either way `off` is a depth away from the poem, not toward it
    return h > 0
      ? hemiBottom[h - 1] + GAP + p.off
      : b.y - GAP - p.off - (p.labelH ?? LABEL_H);
  }
  if (p.mark.kind === "link" && !p.cross) return bottom + GAP + p.off + ARC_DEPTH + 2;
  return bottom + GAP + p.off + 4;
}

/* ------------------------------------------------------------ component */

const REALM_STYLE: Record<Realm, { stroke: string; text: string; chip: string }> = {
  linguistic: {
    stroke: "var(--color-primary)",
    text: "text-primary",
    chip: "bg-primary/15 text-primary border-primary/30",
  },
  literary: {
    stroke: "var(--color-gold)",
    text: "text-gold",
    chip: "bg-gold/15 text-gold border-gold/30",
  },
};

export default function HandwrittenBeyt({
  beyt,
  realm,
  reduced = false,
}: {
  beyt: Beyt;
  realm: Realm;
  reduced?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const labelRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [boxes, setBoxes] = useState<Map<string, Rect> | null>(null);
  const [labelBox, setLabelBox] = useState<Map<string, { w: number; h: number }>>(new Map());

  const hemis = beyt.hemistichs.map(tokenize);
  const marks = marksForBeyt(beyt).filter((m) => m.realm === realm);
  const drawn = marks.filter((m) => m.kind !== "line");
  const notes = marks.filter((m) => m.kind === "line");

  /** One measurement pass. Everything downstream is arithmetic on these boxes,
   *  so nothing else in the component ever touches layout. */
  const measure = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const base = host.getBoundingClientRect();
    const next = new Map<string, Rect>();
    for (const [key, el] of wordRefs.current) {
      const r = el.getBoundingClientRect();
      next.set(key, { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
    }
    // the handwriting's own box decides how much room it needs, both sideways
    // and — once it wraps — downwards
    const sizes = new Map<string, { w: number; h: number }>();
    for (const [id, el] of labelRefs.current) {
      const r = el.getBoundingClientRect();
      sizes.set(id, { w: r.width, h: r.height });
    }
    /* Only publish a change. Placement moves the labels, moving them can
       re-wrap them, re-wrapping resizes them, and a resize brings us back here
       — so without this guard the observer below feeds itself forever. */
    setBoxes((prev) => (sameRects(prev, next) ? prev : next));
    setLabelBox((prev) => (sameSizes(prev, sizes) ? prev : sizes));
  }, []);

  useLayoutEffect(() => {
    measure();
    const host = hostRef.current;
    if (!host) return;
    // the labels are observed too, not just the host: clamping one against the
    // edge of the card can make it wrap onto another line, and the space it
    // needs has to be recomputed from the size it actually ended up
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    for (const el of labelRefs.current.values()) ro.observe(el);
    return () => ro.disconnect();
  });

  // a webfont landing after first paint moves every word, so re-measure then
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
    };
  }, [measure]);

  const boxOf = (s: Span): Rect | null => {
    if (s.from < 0) return null;
    let acc: Rect | null = null;
    for (let i = s.from; i <= s.to; i++) {
      const b = boxes?.get(`${s.h}:${i}`);
      if (!b) continue;
      acc = acc
        ? {
            x: Math.min(acc.x, b.x),
            y: Math.min(acc.y, b.y),
            w: Math.max(acc.x + acc.w, b.x + b.w) - Math.min(acc.x, b.x),
            h: Math.max(acc.h, b.h),
          }
        : { ...b };
    }
    return acc;
  };

  /* Lanes are packed per مصراع. Packing them across the whole بیت made the
     first line reserve room for the second line's annotations and left a gulf
     between the two halves. A mark that joins the two lines is not stacked at
     all — it gets its own curve down the margin. */
  /** bottom edge of each مصراع's words — a gloss for line two is written in
   *  the gap under line one, so it needs that line's baseline, not its own. */
  const hemiBottom = [0, 0];
  if (boxes) {
    for (const [key, b] of boxes) {
      const h = Number(key.split(":")[0]);
      hemiBottom[h] = Math.max(hemiBottom[h], b.y + b.h);
    }
  }

  const placed: Placed[] = [];
  const depthPerHemi = [0, 0];
  /** room a gloss on the *first* مصراع needs above it. It is written over its
   *  word, but there is no line before it to borrow the gap from, so the space
   *  has to be reserved at the top of the whole block — otherwise a two-line
   *  meaning is drawn straight through the poem. */
  let topDepth = 0;
  if (boxes) {
    const cache = new Map<string, Rect[]>();
    const byHemi: Item[][] = [[], []];
    const aboveItems: Item[] = [];
    const crossIds = new Set<string>();

    for (const m of drawn) {
      const bs = m.spans.map(boxOf).filter((b): b is Rect => !!b);
      if (bs.length === 0) continue;
      cache.set(m.id, bs);

      const wordX1 = Math.min(...bs.map((b) => b.x));
      const wordX2 = Math.max(...bs.map((b) => b.x + b.w));
      const centre = (wordX1 + wordX2) / 2;
      const lb = labelBox.get(m.id);
      const lw = lb?.w ?? 0;
      // whichever is wider — the words, or the handwriting under them
      const x1 = Math.min(wordX1, centre - lw / 2);
      const x2 = Math.max(wordX2, centre + lw / 2);

      const hs = new Set(m.spans.filter((s) => s.from >= 0).map((s) => s.h));
      const cross = hs.size > 1;
      if (cross) crossIds.add(m.id);
      // a cross-line mark still needs a depth, or every one of them writes at
      // the same place under the second line and they pile up
      const h = cross ? Math.max(...hs) : ([...hs][0] ?? 0);
      /* A gloss is written *above* its word, which means it occupies the gap
         under the line before it — so that is the stack it has to compete in,
         not its own. Otherwise the meaning of a word on line two lands on top
         of an annotation hanging off line one. */
      const borrowed = m.kind === "gloss" && h > 0;
      const above = m.kind === "gloss" && h === 0;

      /* A sentence pattern is not one annotation but one per word, and its
         labels are wider than the words they sit under — «نهاد مفعول فعل» over
         three short adjacent words ran straight into each other. Packing each
         label separately lets a crowded one drop to the next row. */
      if (m.kind === "roles") {
        bs.forEach((b, i) => {
          const w = labelBox.get(`${m.id}#${i}`)?.w ?? b.w;
          const c = b.x + b.w / 2;
          byHemi[h].push({
            id: `${m.id}#${i}`,
            x1: Math.min(b.x, c - w / 2),
            x2: Math.max(b.x + b.w, c + w / 2),
            h: LABEL_H + 8,
            pri: 0,
          });
        });
        continue;
      }

      const item: Item = {
        id: m.id,
        x1,
        x2,
        h: cross ? Math.max(LABEL_H, lb?.h ?? 0) + 8 : heightOf(m, lb?.h),
        // a gloss borrowed from the next مصراع takes whatever room is left at
        // the bottom of the gap
        pri: borrowed ? 3 : m.kind === "link" ? 2 : 1,
      };
      if (above) aboveItems.push(item);
      else byHemi[borrowed ? h - 1 : h].push(item);
    }

    const offOf = new Map<string, number>();
    if (aboveItems.length) {
      const sAbove = stack(aboveItems);
      sAbove.forEach((v, k) => offOf.set(k, v));
      topDepth = aboveItems.reduce((a, it) => Math.max(a, (sAbove.get(it.id) ?? 0) + it.h), 0);
    }
    byHemi.forEach((items, h) => {
      const s = stack(items);
      s.forEach((v, k) => offOf.set(k, v));
      depthPerHemi[h] = items.reduce((a, it) => Math.max(a, (s.get(it.id) ?? 0) + it.h), 0);
    });

    for (const m of drawn) {
      const bs = cache.get(m.id);
      if (!bs) continue;
      placed.push({
        mark: m,
        off: offOf.get(m.id) ?? 0,
        cross: crossIds.has(m.id),
        roleOffs:
          m.kind === "roles" ? bs.map((_, i) => offOf.get(`${m.id}#${i}`) ?? 0) : undefined,
        labelH: labelBox.get(m.id)?.h,
        boxes: bs,
      });
    }
  }
  const style = REALM_STYLE[realm];
  const host = hostRef.current;
  const W = host?.clientWidth ?? 0;

  /* One source of truth for where a label ends up, used by the labels
     themselves and by the leaders that have to reach and avoid them. When these
     two disagreed, arrows pointed at empty space. */
  const clampX = (c: number, w: number) =>
    W > 0 && w > 0 ? Math.min(Math.max(c, w / 2 + 2), W - w / 2 - 2) : c;

  const labelCentre = (m: Mark, bs: Rect[], _top?: number) => {
    const first = bs[0];
    const last = bs[bs.length - 1];
    const raw =
      m.kind === "link"
        ? (first.x + first.w / 2 + (last.x + last.w / 2)) / 2
        : first.x + first.w / 2;
    return clampX(raw, labelBox.get(m.id)?.w ?? 0);
  };

  const roleCentre = (m: Mark, b: Rect, i: number) =>
    clampX(b.x + b.w / 2, labelBox.get(`${m.id}#${i}`)?.w ?? 0);

  /** every piece of handwriting on the page, as a box a leader must not cross */
  const labelBoxes = placed.flatMap((o) => {
    if (o.mark.kind === "roles") {
      return o.boxes.map((r, i) => {
        const sz = labelBox.get(`${o.mark.id}#${i}`);
        const top = r.y + r.h + GAP + (o.roleOffs?.[i] ?? 0);
        const w = sz?.w ?? r.w;
        const c = roleCentre(o.mark, r, i);
        return { id: `${o.mark.id}#${i}`, x1: c - w / 2, x2: c + w / 2, y1: top, y2: top + (sz?.h ?? LABEL_H) };
      });
    }
    const sz = labelBox.get(o.mark.id);
    const top = labelTopOf({ ...o, labelH: sz?.h }, hemiBottom);
    const w = sz?.w ?? 0;
    const c = labelCentre(o.mark, o.boxes);
    return [{ id: o.mark.id, x1: c - w / 2, x2: c + w / 2, y1: top, y2: top + (sz?.h ?? LABEL_H) }];
  });

  const H = host?.clientHeight ?? 0;

  return (
    <div className="relative" dir="rtl">
      {/* flow-root, not plain block: the room each مصراع reserves for its
          annotations is its bottom margin, and the last one's margin collapses
          out of a plain block — which left the deepest labels of every بیت
          hanging 30–70px below the box everything else is measured against. */}
      <div ref={hostRef} className="relative flow-root">
        {hemis.map((words, h) => (
          <div
            key={h}
            data-hemi={h}
            className="relative z-10 text-center text-lg leading-loose text-foreground xs:text-xl"
            style={{
              marginBottom: depthPerHemi[h] + GAP * 2,
              marginTop: h === 0 && topDepth ? topDepth + GAP : undefined,
            }}
          >
            {words.map((w, i) => (
              <span
                key={i}
                ref={(el) => {
                  const key = `${h}:${i}`;
                  if (el) wordRefs.current.set(key, el);
                  else wordRefs.current.delete(key);
                }}
                className="inline-block px-[0.12em]"
              >
                {w}
              </span>
            ))}
          </div>
        ))}

        {/* the ink */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-visible"
          width={W}
          height={H}
        >
          {placed.map(({ mark, off, cross, roleOffs, boxes: bs }, idx) => {
            const delay = reduced ? 0 : idx * 0.09;
            const common = {
              stroke: style.stroke,
              strokeWidth: 1.6,
              fill: "none",
              strokeLinecap: "round" as const,
              strokeLinejoin: "round" as const,
              className: reduced ? undefined : "hb-ink",
              style: reduced ? undefined : { animationDelay: `${delay}s` },
            };
            /* Every mark's handwriting is joined to its own word by a line
               that starts at the word and ends at the label. Where something
               else is in the way the line bends around it — cutting it short
               instead, as the first version did, made a note look as though it
               came out of whichever label happened to sit above it. */
            const myIds = new Set(
              mark.kind === "roles" ? bs.map((_, i) => `${mark.id}#${i}`) : [mark.id],
            );
            const lead = (b: Rect, toX: number, fromY: number, toY: number, key: string) => {
              if (Math.abs(toY - fromY) < 3) return null;
              const x = b.x + b.w / 2;
              const lo = Math.min(fromY, toY);
              const hi = Math.max(fromY, toY);
              const inWay = labelBoxes.filter(
                (o) =>
                  !myIds.has(o.id) &&
                  o.y2 > lo + 1 &&
                  o.y1 < hi - 1 &&
                  o.x2 > Math.min(x, toX) - 6 &&
                  o.x1 < Math.max(x, toX) + 6,
              );
              let detour: number | undefined;
              if (inWay.length) {
                const left = Math.min(...inWay.map((o) => o.x1)) - 11;
                const right = Math.max(...inWay.map((o) => o.x2)) + 11;
                const fits = (v: number) => v > 6 && v < W - 6;
                const cand = [left, right].filter(fits);
                detour = cand.length
                  ? cand.reduce((a, v) => (Math.abs(v - x) < Math.abs(a - x) ? v : a))
                  : undefined;
              }
              const up = toY < fromY;
              return (
                <g key={key} data-lead={key === "g" || key.startsWith("r") ? `${mark.id}:${key}` : mark.id}>
                  <path d={leader(x, fromY, toX, toY, detour)} {...common} strokeWidth={1.2} />
                  <path d={arrowDown(toX, toY, 4.5, up)} {...common} strokeWidth={1.2} />
                </g>
              );
            };
            /** down from the word to a label sitting under it */
            const leadDown = (b: Rect, top: number, key = `d${b.x}`) =>
              lead(b, labelCentre(mark, bs, top), b.y + b.h + 3, top - 3, key);

            if (mark.kind === "underline" || mark.kind === "gloss") {
              const b = bs[0];
              if (mark.kind === "gloss") {
                /* the meaning is written above the word, so its line runs the
                   other way — from under the handwriting down onto the word it
                   explains. Without it a meaning for a word on the second
                   مصراع just floated in the gap, belonging to neither line. */
                const top = labelTopOf(
                  { mark, off, cross, boxes: bs, labelH: labelBox.get(mark.id)?.h },
                  hemiBottom,
                );
                const lh = labelBox.get(mark.id)?.h ?? LABEL_H;
                return (
                  <g key={mark.id}>
                    <path d={rule(b.x, b.y - GAP * 0.6, b.x + b.w)} {...common} />
                    {lead(b, labelCentre(mark, bs, top), top + lh + 2, b.y - GAP * 0.6 - 4, "g")}
                  </g>
                );
              }
              const top = b.y + b.h + GAP + off + 4;
              return (
                <g key={mark.id}>
                  <path d={rule(b.x, b.y + b.h + 3, b.x + b.w)} {...common} />
                  {leadDown(b, top)}
                </g>
              );
            }

            if (mark.kind === "roles") {
              return (
                <g key={mark.id}>
                  {bs.map((b, i) => (
                    <g key={i}>
                      <path d={rule(b.x, b.y + b.h + 3, b.x + b.w, 0.62)} {...common} />
                      {(roleOffs?.[i] ?? 0) > 0
                        ? lead(
                            b,
                            roleCentre(mark, b, i),
                            b.y + b.h + 3,
                            b.y + b.h + GAP + (roleOffs?.[i] ?? 0) - 3,
                            `r${i}`,
                          )
                        : null}
                    </g>
                  ))}
                </g>
              );
            }

            /* A link whose two halves sit on different مصراع cannot be an
               arc: any curve between them crosses the line of poetry in
               between, which on a narrow screen means a stroke straight
               through the text. Those are marked the way they are on paper —
               each end underlined, the term written once — and only same-line
               pairs get the joining arc. */
            if (cross) {
              const bottom = Math.max(...bs.map((r) => r.y + r.h));
              const top = bottom + GAP + off + 4;
              return (
                <g key={mark.id}>
                  {bs.map((b, i) => (
                    <path key={i} d={rule(b.x, b.y + b.h + 3, b.x + b.w)} {...common} />
                  ))}
                  {leadDown(bs[bs.length - 1], top, "x")}
                </g>
              );
            }

            // link: one arc per consecutive pair, dipping to this mark's depth
            const drop = GAP + off + ARC_DEPTH;
            return (
              <g key={mark.id} data-lead={mark.id}>
                {bs.slice(0, -1).map((b, i) => {
                  const c = bs[i + 1];
                  return (
                    <path
                      key={i}
                      d={arc(b.x + b.w / 2, b.y + b.h, c.x + c.w / 2, c.y + c.h, drop)}
                      {...common}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* the handwriting — real HTML so Persian shapes correctly */}
        {placed.map(({ mark, off, cross, roleOffs, boxes: bs }, idx) => {
          const delay = reduced ? 0 : idx * 0.09 + 0.25;
          const anim = reduced ? undefined : "hb-write";
          if (mark.kind === "roles") {
            return (
              <div key={mark.id}>
                {bs.map((b, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      const k = `${mark.id}#${i}`;
                      if (el) labelRefs.current.set(k, el);
                      else labelRefs.current.delete(k);
                    }}
                    className={`hand pointer-events-none absolute z-20 whitespace-nowrap text-xs ${style.text} ${anim ?? ""}`}
                    style={{
                      left: roleCentre(mark, b, i),
                      top: b.y + b.h + GAP + (roleOffs?.[i] ?? 0),
                      transform: "translateX(-50%)",
                      animationDelay: `${delay + i * 0.05}s`,
                    }}
                  >
                    {mark.roleLabels?.[i]}
                  </span>
                ))}
              </div>
            );
          }

          const b = bs[0];
          const last = bs[bs.length - 1];
          const isLink = mark.kind === "link";
          /* Centred on its word, but never past the edge of the box. On a phone a
             word near the margin put half its handwriting outside the card. The
             leader still drops on the word itself, so nudging the text sideways
             costs nothing in clarity. */
          const cx = labelCentre(mark, bs);
          const bottom = Math.max(...bs.map((r) => r.y + r.h));
          /* An underline hugs its word and writes just below it; a link's
             label hangs under the apex of its arc, which is already ARC_DEPTH
             deeper. Both start from the depth the packer gave this mark, so
             neither can land on another mark's ink. */
          const top = labelTopOf(
            { mark, off, cross, boxes: bs, labelH: labelBox.get(mark.id)?.h },
            hemiBottom,
          );

          return (
            <span
              key={mark.id}
              ref={(el) => {
                if (el) labelRefs.current.set(mark.id, el);
                else labelRefs.current.delete(mark.id);
              }}
              className={`hand pointer-events-none absolute z-20 text-center text-[0.82rem] leading-tight ${style.text} ${anim ?? ""}`}
              /* the cap is the box, not a fixed 15rem: on a 320px card a
                 240px label cannot be centred anywhere without hanging out */
              style={{
                left: cx,
                top,
                maxWidth: W > 0 ? Math.min(240, W - 10) : 240,
                transform: "translateX(-50%)",
                animationDelay: `${delay}s`,
              }}
            >
              {mark.label}
            </span>
          );
        })}
      </div>

      {/* notes with no single word to point at */}
      {notes.length > 0 && (
        <ul className="mt-6 space-y-2 border-t border-dashed border-border pt-4">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-2 text-sm text-muted-foreground">
              <span className={`hand shrink-0 ${style.text}`}>◂</span>
              <span className="hand leading-relaxed">{n.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
