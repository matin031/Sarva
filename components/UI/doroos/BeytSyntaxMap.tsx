"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WordRole } from "@/lib/doroos/types";

/** نقشِ دستوریِ واژه‌ها — the بیت with a wire from every word to its role.
 *
 *  Two rules decide the whole design:
 *
 *  1. Nothing is inferred. Every wire comes from a `syntax` entry that names
 *     its word indices outright. A diagram that points at the wrong word is
 *     worse than no diagram at all.
 *
 *  2. Nothing is positioned from an assumption about text width. Persian word
 *     widths depend on the font, the size and the viewport, so both ends of
 *     every wire are *measured* from the laid-out DOM and redrawn whenever the
 *     box changes. The elbows are then packed into lanes so that no two
 *     horizontal runs ever share a line.
 *
 *  مصراع اول hangs its labels above and points up; مصراع دوم hangs them below
 *  and points down. */

/* geometry, in px */
const STUB = 34; // بیت → first lane. The reader asked for more air here than
// the reference drawing had, so this is deliberately generous.
const LANE_GAP = 14;
const ARROW = 7; // arrowhead length
const HEAD_PAD = 6; // gap between arrow tip and the label box

/** hues far enough apart to read as different colours at 1.5px wide */
const HUES = [12, 205, 145, 42, 268, 330, 178, 95, 300, 62, 240, 118];
const wireColor = (i: number) => `oklch(0.62 0.17 ${HUES[i % HUES.length]})`;

/* An inline span's box is the font's full ascent/descent, which for a naskh
   face reaches far above and below the letters you can actually see. Anchoring
   the wires to that box leaves them visibly floating off the word, so trim it
   back to roughly where the ink starts. Both are fractions of the font size, so
   they hold at every breakpoint. */
const INK_TOP = 0.3;
const INK_BOTTOM = 0.14;

type Wire = {
  /** where the wire meets the بیت */
  wx: number;
  /** the phrase's extent, for the underline under a multi-word entry */
  from: number;
  to: number;
  /** true when the entry covers more than one word */
  phrase: boolean;
  lx: number;
  lane: number;
};

/** `lines` rather than a بیت: a بیت is two مصراع, but a verse بند inside a
 *  prose lesson is the same two lines under a different name, and taking the
 *  lines directly lets both use this without one pretending to be the other. */
export default function BeytSyntaxMap({
  lines,
  roles,
}: {
  lines: string[];
  roles: WordRole[];
}) {
  if (!roles.length) return null;
  return (
    <div dir="rtl" className="relative z-20 space-y-10">
      {lines.map((line, h) => (
        <Hemistich
          key={h}
          words={line.split(/\s+/).filter(Boolean)}
          roles={roles.filter((r) => r.h === h)}
          above={h === 0}
        />
      ))}
    </div>
  );
}

function Hemistich({
  words,
  roles,
  above,
}: {
  words: string[];
  roles: WordRole[];
  /** labels sit above the مصراع and the arrows point up */
  above: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const poemRef = useRef<HTMLParagraphElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [wires, setWires] = useState<Wire[]>([]);
  const [labelsH, setLabelsH] = useState(0);
  const [lanes, setLanes] = useState(1);
  /** where the ink starts — the wires anchor here */
  const [poemTop, setPoemTop] = useState(0);
  const [poemBottom, setPoemBottom] = useState(0);
  /** the مصراع's raw box bottom — the label row is placed off this */
  const [boxBottom, setBoxBottom] = useState(0);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const poem = poemRef.current;
    const labels = labelsRef.current;
    if (!wrap || !poem || !labels) return;
    const W = wrap.getBoundingClientRect();
    const P = poem.getBoundingClientRect();

    const ends = roles.map((r, i) => {
      const cells = r.words
        .map((w) => wordRefs.current[w])
        .filter((c): c is HTMLSpanElement => !!c);
      const lab = labelRefs.current[i];
      if (!cells.length || !lab) return null;
      const boxes = cells.map((c) => c.getBoundingClientRect());
      const lb = lab.getBoundingClientRect();
      const from = Math.min(...boxes.map((b) => b.left)) - W.left;
      const to = Math.max(...boxes.map((b) => b.right)) - W.left;
      return {
        wx: (from + to) / 2,
        from,
        to,
        phrase: r.words.length > 1,
        lx: (lb.left + lb.right) / 2 - W.left,
      };
    });

    /* Lane packing: two wires may share a lane only when their horizontal runs
       do not overlap. Shortest first, so the short wires stay close to the بیت
       and the long ones arch over them. */
    const byLength = ends
      .map((e, i) => ({ i, e }))
      .filter((x): x is { i: number; e: NonNullable<(typeof ends)[number]> } => !!x.e)
      .sort((a, b) => Math.abs(a.e.wx - a.e.lx) - Math.abs(b.e.wx - b.e.lx));

    const used: [number, number][][] = [];
    const out: Wire[] = ends.map(() => ({
      wx: 0,
      from: 0,
      to: 0,
      phrase: false,
      lx: 0,
      lane: -1,
    }));
    for (const { i, e } of byLength) {
      const lo = Math.min(e.wx, e.lx) - 5;
      const hi = Math.max(e.wx, e.lx) + 5;
      let lane = used.findIndex((runs) => runs.every(([a, b]) => hi < a || lo > b));
      if (lane === -1) {
        used.push([]);
        lane = used.length - 1;
      }
      used[lane].push([lo, hi]);
      out[i] = { ...e, lane };
    }

    setWires(out);
    setLanes(Math.max(1, used.length));
    setLabelsH(labels.getBoundingClientRect().height);

    const fs = parseFloat(getComputedStyle(poem).fontSize) || 20;
    setPoemTop(P.top - W.top + fs * INK_TOP);
    setPoemBottom(P.bottom - W.top - fs * INK_BOTTOM);
    setBoxBottom(P.bottom - W.top);
  }, [roles]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // web fonts land after first paint and move every word
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  /* A مصراع with nothing to say — قلمرو ادبی often has figures in one line and
     none in the other — gets the plain line, not an empty band holding space
     for a label row that will never arrive. */
  if (!roles.length) {
    return (
      <p className="flex flex-wrap justify-center gap-x-2 text-center font-serif text-lg leading-none font-bold text-foreground sm:text-xl md:text-2xl">
        {words.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </p>
    );
  }

  /* The wiring band: stub, every lane, and room for the arrowhead. The extra
     LANE_GAP matters — without it the outermost lane sits exactly on the arrow
     base, so those wires lose their final rise and read as a flat T instead of
     an arrow into the box. */
  const band = STUB + lanes * LANE_GAP + ARROW + HEAD_PAD;
  const reserve = labelsH + band;

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={above ? { paddingTop: reserve } : { paddingBottom: reserve }}
    >
      {/* ---------- the role labels ---------- */}
      <div
        ref={labelsRef}
        className="absolute inset-x-0 flex flex-wrap justify-center gap-x-2 gap-y-1.5"
        style={above ? { top: 0 } : { bottom: 0 }}
      >
        {roles.map((r, i) => (
          <span
            key={i}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="rounded-lg border-[1.5px] bg-card px-2 py-1 text-[0.68rem] leading-none font-bold whitespace-nowrap sm:text-xs"
            style={{ borderColor: wireColor(i), color: wireColor(i) }}
          >
            {r.label}
          </span>
        ))}
      </div>

      {/* ---------- the wires ---------- */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        {wires.map((g, i) => {
          if (g.lane < 0) return null;
          const c = wireColor(i);
          const yWord = above ? poemTop : poemBottom;
          const yLane = above
            ? poemTop - STUB - g.lane * LANE_GAP
            : poemBottom + STUB + g.lane * LANE_GAP;
          const yTip = above ? labelsH + HEAD_PAD : boxBottom + band - HEAD_PAD;
          const yBase = above ? yTip + ARROW : yTip - ARROW;

          return (
            <g key={i}>
              <g stroke={c} strokeWidth={1.5} fill="none" strokeLinecap="round">
                <line x1={g.wx} y1={yWord} x2={g.wx} y2={yLane} />
                <line x1={g.wx} y1={yLane} x2={g.lx} y2={yLane} />
                <line x1={g.lx} y1={yLane} x2={g.lx} y2={yBase} />
              </g>
              <polygon
                points={`${g.lx},${yTip} ${g.lx - 4.5},${yBase} ${g.lx + 4.5},${yBase}`}
                fill={c}
              />
              {/* A single word gets a dot; a phrase gets an underline with end
                  ticks, so «کنایه» over five words reads as one thing rather
                  than as a wire dangling off the middle of the line. */}
              {g.phrase && g.to - g.from > 2 ? (
                <g stroke={c} strokeWidth={1.5} strokeLinecap="round">
                  <line x1={g.from} y1={yWord} x2={g.to} y2={yWord} />
                  <line
                    x1={g.from}
                    y1={yWord}
                    x2={g.from}
                    y2={yWord + (above ? 4 : -4)}
                  />
                  <line x1={g.to} y1={yWord} x2={g.to} y2={yWord + (above ? 4 : -4)} />
                </g>
              ) : (
                <circle cx={g.wx} cy={yWord} r={2.2} fill={c} />
              )}
            </g>
          );
        })}
      </svg>

      {/* ---------- the مصراع ---------- */}
      <p
        ref={poemRef}
        className="flex flex-wrap justify-center gap-x-2 text-center font-serif text-lg leading-none font-bold text-foreground sm:text-xl md:text-2xl"
      >
        {words.map((w, i) => (
          <span
            key={i}
            ref={(el) => {
              wordRefs.current[i] = el;
            }}
          >
            {w}
          </span>
        ))}
      </p>
    </div>
  );
}
