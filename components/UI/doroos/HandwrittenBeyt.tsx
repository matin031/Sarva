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

/** Deterministic jitter. A random wobble regenerated on every render would make
 *  the ink crawl on each state change; seeding from the mark's identity keeps
 *  each stroke the same shape for its whole life. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A straight run drawn as if by hand: a few segments, each nudged off the
 *  ideal line, with the ends pulled in slightly the way a pen overshoots. */
function inkLine(x1: number, y: number, x2: number, seed: number, amp = 1.4): string {
  const r = rng(seed);
  const n = Math.max(3, Math.round(Math.abs(x2 - x1) / 26));
  let d = `M ${x1.toFixed(1)} ${(y + (r() - 0.5) * amp).toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = x1 + (x2 - x1) * t;
    const yy = y + (r() - 0.5) * amp * 2 + Math.sin(t * Math.PI) * amp * 0.5;
    d += ` L ${x.toFixed(1)} ${yy.toFixed(1)}`;
  }
  return d;
}

/** The arc that joins two words. It dips below both, so the apex is a natural
 *  place to hang the term without colliding with either end. */
function inkArc(x1: number, y1: number, x2: number, y2: number, drop: number, seed: number): string {
  const r = rng(seed);
  const mx = (x1 + x2) / 2 + (r() - 0.5) * 6;
  const my = Math.max(y1, y2) + drop;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** A small arrowhead at the end of a leader line. */
function arrowHead(x: number, y: number, angle: number, size = 7): string {
  const a1 = angle + 2.5;
  const a2 = angle - 2.5;
  return `M ${x} ${y} L ${(x + Math.cos(a1) * size).toFixed(1)} ${(y + Math.sin(a1) * size).toFixed(1)} M ${x} ${y} L ${(x + Math.cos(a2) * size).toFixed(1)} ${(y + Math.sin(a2) * size).toFixed(1)}`;
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
            const seed = idx * 977 + mark.id.length * 31;
            const delay = reduced ? 0 : idx * 0.09;
            const common = {
              stroke: style.stroke,
              strokeWidth: 1.7,
              fill: "none",
              strokeLinecap: "round" as const,
              className: reduced ? undefined : "hb-ink",
              style: reduced ? undefined : { animationDelay: `${delay}s` },
            };

            if (mark.kind === "underline" || mark.kind === "gloss") {
              const b = bs[0];
              const y = mark.kind === "gloss" ? b.y - GAP * 0.6 : b.y + b.h + 2;
              return <path key={mark.id} d={inkLine(b.x, y, b.x + b.w, seed)} {...common} />;
            }

            if (mark.kind === "roles") {
              return (
                <g key={mark.id}>
                  {bs.map((b, i) => (
                    <path key={i} d={inkLine(b.x, b.y + b.h + 2, b.x + b.w, seed + i * 13)} {...common} />
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
              return (
                <g key={mark.id}>
                  {bs.map((b, i) => (
                    <path
                      key={i}
                      d={inkLine(b.x, b.y + b.h + 2, b.x + b.w, seed + i * 19)}
                      {...common}
                    />
                  ))}
                </g>
              );
            }

            // link: join consecutive targets with an arc that dips into this
            // mark's own depth, so the label can hang just under the apex
            const drop = GAP + off + ARC_DEPTH;
            return (
              <g key={mark.id}>
                {bs.slice(0, -1).map((b, i) => {
                  const c = bs[i + 1];
                  const ax = b.x + b.w / 2;
                  const cx = c.x + c.w / 2;
                  const ay = b.y + b.h;
                  const cy = c.y + c.h;
                  return (
                    <g key={i}>
                      <path d={inkArc(ax, ay, cx, cy, drop, seed + i * 7)} {...common} />
                      <path d={arrowHead(cx, cy + 2, cx > ax ? -1.0 : -2.1)} {...common} strokeWidth={1.4} />
                    </g>
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
          const top =
            mark.kind === "gloss"
              ? mark.spans[0].h > 0
                ? hemiBottom[mark.spans[0].h - 1] + GAP + off
                : b.y - GAP - LABEL_H
              : isLink
                ? bottom + (cross ? GAP + off + 4 : GAP + off + ARC_DEPTH + 2)
                : bottom + GAP + off + 4;

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
