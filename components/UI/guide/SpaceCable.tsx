"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

/** The "space cable": one long, meandering wire that drops in from the top of
 *  the page and snakes past every planet — never straight, always curving off to
 *  one side and back — all the way down to the final section. It draws itself as
 *  you scroll, with an energy pulse running along it and glowing nodes where it
 *  touches each planet.
 *
 *  Performance notes:
 *  - No SVG <filter> anywhere. A feGaussianBlur on a path this tall forces the
 *    browser to rasterise a page-sized filtered surface on every repaint, which
 *    was one of the worst offenders here. The glow is faked with a couple of
 *    wider, translucent strokes instead — those composite for free.
 *  - The stroke keeps a constant on-screen width via vector-effect, so the SVG
 *    can be stretched over the page with preserveAspectRatio="none".
 */

const W = 100;
// 6 bands: 1 launch pad + 5 planets, plus a tail into the closing section
const H = 660;

/** Hand-tuned meander: starts above the fold, then swings side to side past each
 *  planet and finally curves back to the centre for the closing panel. */
const PATH = `
  M 50 -6
  C 50 8, 78 12, 76 26
  C 74 42, 20 40, 22 60
  C 24 80, 82 76, 80 98
  C 78 118, 18 118, 20 140
  C 22 162, 84 160, 82 182
  C 80 204, 16 202, 18 226
  C 20 248, 70 250, 62 274
  C 56 292, 44 300, 50 318
  C 56 336, 78 340, 76 360
  C 74 382, 22 380, 24 404
  C 26 428, 80 428, 78 452
  C 76 476, 20 476, 22 500
  C 24 524, 68 526, 60 548
  C 54 566, 38 574, 44 592
  C 49 608, 58 616, 50 632
  C 46 640, 46 644, 48 652
`;

/** Where the wire passes each planet — glowing junction nodes. */
const NODES: { x: number; y: number }[] = [
  { x: 76, y: 26 },
  { x: 22, y: 60 },
  { x: 80, y: 98 },
  { x: 20, y: 140 },
  { x: 82, y: 182 },
  { x: 44, y: 592 },
];

export default function SpaceCable({ reduced = false }: { reduced?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });
  // the wire always runs a little ahead of the reader
  const drawn = useTransform(progress, (p) => Math.min(1, 0.1 + p * 1.2));

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="size-full"
      >
        <defs>
          <linearGradient id="cableGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="45%" stopColor="var(--color-gold)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>

        {/* faked glow: two wider translucent strokes instead of a blur filter */}
        <path
          d={PATH}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={10}
          strokeLinecap="round"
          opacity={0.07}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={PATH}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.12}
          vectorEffect="non-scaling-stroke"
        />

        {/* the wire, drawn on scroll */}
        <motion.path
          d={PATH}
          fill="none"
          stroke="url(#cableGrad)"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength: reduced ? 1 : drawn }}
        />

        {/* travelling energy pulse */}
        {!reduced && (
          <path
            d={PATH}
            fill="none"
            stroke="#eafff9"
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.85}
            style={{
              strokeDasharray: "16 780",
              animation: "cablePulse 9s linear infinite",
            }}
          />
        )}
      </svg>

      {/* junction nodes — plain DOM so they stay perfectly round (the SVG above
          is stretched with preserveAspectRatio="none", which would squash any
          circle drawn inside it into an ellipse) */}
      {NODES.map((n, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${n.x}%`, top: `${(n.y / H) * 100}%` }}
        >
          <span className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-md" />
          <span
            className="relative block size-2.5 rounded-full bg-gold shadow-[0_0_14px_var(--color-gold)]"
            style={
              reduced
                ? undefined
                : {
                    animation: `cableNode 2.6s ease-in-out ${i * 0.35}s infinite`,
                    willChange: "transform",
                  }
            }
          />
        </span>
      ))}
    </div>
  );
}
