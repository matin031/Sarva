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

/* ------------------------------------------------------------- hand-drawn */

/** A rule under a word. Straight, and drawn once — the earlier version added
 *  a hand-drawn wobble to every stroke, which read as sloppy rather than
 *  hand-made next to a real handwriting face. The handwriting carries the
 *  "written by a person" feeling; the rules just have to be clean. */
function rule(x1: number, y: number, x2: number): string {
  return `M ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`;
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
function leader(x: number, y1: number, y2: number): string {
  return `M ${x.toFixed(1)} ${y1.toFixed(1)} L ${x.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Arrowhead pointing straight down, at the end of a leader. */
function arrowDown(x: number, y: number, size = 4.5): string {
  return `M ${(x - size).toFixed(1)} ${(y - size).toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + size).toFixed(1)} ${(y - size).toFixed(1)}`;
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
  /** the union box of everything the mark points at, per span */
  boxes: Rect[];
};

/** How deep each kind draws before its handwriting starts. */
const ARC_DEPTH = 16;
function heightOf(m: Mark): number {
  if (m.kind === "link") return ARC_DEPTH + LABEL_H + 8;
  if (m.kind === "gloss") return LABEL_H + 6;
  return LABEL_H + 8;
}

type Item = { id: string; x1: number; x2: number; h: number };

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
  const sorted = [...items].sort((a, b) => b.h - a.h || a.x1 - b.x1);
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
    return h > 0 ? hemiBottom[h - 1] + GAP + p.off : b.y - GAP - LABEL_H;
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
  const [labelW, setLabelW] = useState<Map<string, number>>(new Map());

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
    setBoxes(next);
    // the handwriting's own width decides how much room it needs sideways
    const widths = new Map<string, number>();
    for (const [id, el] of labelRefs.current) widths.set(id, el.getBoundingClientRect().width);
    setLabelW(widths);
  }, []);

  useLayoutEffect(() => {
    measure();
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [measure, beyt.n]);

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
  if (boxes) {
    const cache = new Map<string, Rect[]>();
    const byHemi: Item[][] = [[], []];
    const crossIds = new Set<string>();

    for (const m of drawn) {
      const bs = m.spans.map(boxOf).filter((b): b is Rect => !!b);
      if (bs.length === 0) continue;
      cache.set(m.id, bs);

      const wordX1 = Math.min(...bs.map((b) => b.x));
      const wordX2 = Math.max(...bs.map((b) => b.x + b.w));
      const centre = (wordX1 + wordX2) / 2;
      const lw = labelW.get(m.id) ?? 0;
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
      byHemi[m.kind === "gloss" ? Math.max(0, h - 1) : h].push({
        id: m.id,
        x1,
        x2,
        h: cross ? LABEL_H + 8 : heightOf(m),
      });
    }

    const offOf = new Map<string, number>();
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
        boxes: bs,
      });
    }
  }
  const style = REALM_STYLE[realm];
  const host = hostRef.current;
  const W = host?.clientWidth ?? 0;
  const H = host?.clientHeight ?? 0;

  return (
    <div className="relative" dir="rtl">
      <div ref={hostRef} className="relative">
        {hemis.map((words, h) => (
          <div
            key={h}
            data-hemi={h}
            className="relative z-10 text-center text-lg leading-loose text-foreground xs:text-xl"
            style={{ marginBottom: depthPerHemi[h] + GAP * 2 }}
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
          {placed.map(({ mark, off, cross, boxes: bs }, idx) => {
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
            /* Every rule gets a leader down to the handwriting it belongs to.
               With three or four annotations stacked under one line, a rule on
               its own leaves the reader guessing which label is which; the
               arrow removes the guess. */
            const lead = (b: Rect, top: number) => {
              const x = b.x + b.w / 2;
              const y1 = b.y + b.h + 3;
              const y2 = top - 3;
              if (y2 - y1 < 6) return null;
              /* A leader may not be drawn through somebody else's writing. If
                 another label already occupies the corridor between this word
                 and its own label, the long line is replaced by a short stub
                 just above the text — still an arrow pointing at it, without a
                 stroke ruled across the words in between. */
              const blocked = placed.some((o) => {
                if (o.mark.id === mark.id || o.boxes.length === 0) return false;
                const oTop = labelTopOf(o, hemiBottom);
                if (!(oTop > y1 - 2 && oTop < y2 - 2)) return false;
                // a roles mark writes one short label per word rather than one
                // wide one, so each of its boxes has to be tested separately
                if (o.mark.kind === "roles") {
                  return o.boxes.some((r) => x > r.x - 8 && x < r.x + r.w + 8);
                }
                const ow = labelW.get(o.mark.id) ?? 0;
                const oc =
                  (Math.min(...o.boxes.map((r) => r.x)) +
                    Math.max(...o.boxes.map((r) => r.x + r.w))) /
                  2;
                return Math.abs(oc - x) < ow / 2 + 6;
              });
              const from = blocked ? Math.max(y1, y2 - 12) : y1;
              return (
                <g key={`lead-${b.x}`}>
                  <path d={leader(x, from, y2)} {...common} strokeWidth={1.2} />
                  <path d={arrowDown(x, y2)} {...common} strokeWidth={1.2} />
                </g>
              );
            };

            if (mark.kind === "underline" || mark.kind === "gloss") {
              const b = bs[0];
              if (mark.kind === "gloss") {
                return <path key={mark.id} d={rule(b.x, b.y - GAP * 0.6, b.x + b.w)} {...common} />;
              }
              const top = b.y + b.h + GAP + off + 4;
              return (
                <g key={mark.id}>
                  <path d={rule(b.x, b.y + b.h + 3, b.x + b.w)} {...common} />
                  {lead(b, top)}
                </g>
              );
            }

            if (mark.kind === "roles") {
              return (
                <g key={mark.id}>
                  {bs.map((b, i) => (
                    <path key={i} d={rule(b.x, b.y + b.h + 3, b.x + b.w)} {...common} />
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
                  {lead(bs[bs.length - 1], top)}
                </g>
              );
            }

            // link: one arc per consecutive pair, dipping to this mark's depth
            const drop = GAP + off + ARC_DEPTH;
            return (
              <g key={mark.id}>
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
        {placed.map(({ mark, off, cross, boxes: bs }, idx) => {
          const delay = reduced ? 0 : idx * 0.09 + 0.25;
          const anim = reduced ? undefined : "hb-write";
          if (mark.kind === "roles") {
            return (
              <div key={mark.id}>
                {bs.map((b, i) => (
                  <span
                    key={i}
                    className={`hand pointer-events-none absolute z-20 whitespace-nowrap text-xs ${style.text} ${anim ?? ""}`}
                    style={{
                      right: undefined,
                      left: b.x + b.w / 2,
                      top: b.y + b.h + GAP + off,
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
          const cx = isLink ? (b.x + b.w / 2 + (last.x + last.w / 2)) / 2 : b.x + b.w / 2;
          const bottom = Math.max(...bs.map((r) => r.y + r.h));
          /* An underline hugs its word and writes just below it; a link's
             label hangs under the apex of its arc, which is already ARC_DEPTH
             deeper. Both start from the depth the packer gave this mark, so
             neither can land on another mark's ink. */
          const top = labelTopOf({ mark, off, cross, boxes: bs }, hemiBottom);

          return (
            <span
              key={mark.id}
              ref={(el) => {
                if (el) labelRefs.current.set(mark.id, el);
                else labelRefs.current.delete(mark.id);
              }}
              className={`hand pointer-events-none absolute z-20 max-w-[15rem] text-center text-[0.82rem] leading-tight ${style.text} ${anim ?? ""}`}
              style={{ left: cx, top, transform: "translateX(-50%)", animationDelay: `${delay}s` }}
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
