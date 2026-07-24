"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

/** The "space cable": one long, meandering wire that drops in from the top of
 *  the page and snakes past every planet — never straight, always curving off to
 *  one side and back. It draws itself as you scroll, with an energy pulse
 *  running along it and glowing nodes where it touches each planet.
 *
 *  The SVG is stretched over the whole page (preserveAspectRatio="none"), and
 *  every stroke uses vector-effect="non-scaling-stroke" so the wire keeps a
 *  constant on-screen thickness no matter how tall the page gets. */

// viewBox is 100 wide; each of the 5 stops gets 100 units of height
const W = 100;
const STOPS = 5;
const H = STOPS * 100;

/** Hand-tuned meander: starts top-centre, then swings side to side past each
 *  planet. Y values land near the middle of each stop's band. */
const PATH = `
  M 50 -6
  C 50 6, 78 10, 76 22
  C 74 36, 20 34, 22 52
  C 24 70, 82 66, 80 86
  C 78 104, 18 104, 20 124
  C 22 144, 84 142, 82 162
  C 80 182, 16 180, 18 202
  C 20 222, 62 226, 56 244
  C 52 258, 50 262, 50 272
`;

/** Where the wire passes each planet — glowing junction nodes. */
const NODES: { x: number; y: number }[] = [
  { x: 76, y: 22 },
  { x: 22, y: 52 },
  { x: 80, y: 86 },
  { x: 20, y: 124 },
  { x: 82, y: 162 },
];

export default function SpaceCable({ reduced = false }: { reduced?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // smooth the raw scroll so the draw doesn't jitter
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });
  // the wire is always slightly ahead of the reader
  const drawn = useTransform(progress, (p) => Math.min(1, 0.12 + p * 1.15));

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
          <filter id="cableGlow" x="-60%" y="-10%" width="220%" height="120%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* soft halo underneath */}
        <path
          d={PATH}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={9}
          strokeLinecap="round"
          opacity={0.1}
          vectorEffect="non-scaling-stroke"
          filter="url(#cableGlow)"
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
            opacity={0.9}
            filter="url(#cableGlow)"
            style={{
              strokeDasharray: "18 620",
              animation: "cablePulse 7s linear infinite",
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
                : { animation: `cableNode 2.6s ease-in-out ${i * 0.35}s infinite` }
            }
          />
        </span>
      ))}
    </div>
  );
}
