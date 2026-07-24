"use client";

import { useEffect, useMemo, useRef } from "react";
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
const H = 660;

/** Build the meander procedurally so the cable adapts to however many planets
 *  the page has, instead of being hand-tuned to one layout.
 *
 *  Bands: one for the intro, one per planet, one for the closing section. Each
 *  planet gets a node alternating left/right, and consecutive nodes are joined
 *  with cubic curves whose control points overshoot sideways — that overshoot
 *  is what makes the wire swing wide and wavy instead of zig-zagging straight
 *  between points. */
function buildCable(planetCount: number) {
  const bands = planetCount + 2;
  const band = H / bands;

  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < planetCount; i++) {
    nodes.push({ x: i % 2 === 0 ? 78 : 22, y: (i + 1.5) * band });
  }

  const start = { x: 50, y: -6 };
  const end = { x: 48, y: H + 10 };
  const all = [start, ...nodes, end];

  let d = `M ${start.x} ${start.y}`;
  for (let i = 1; i < all.length; i++) {
    const a = all[i - 1];
    const b = all[i];
    const dy = b.y - a.y;
    // push the control points past each node so the curve bows outward
    const c1x = a.x + (a.x - 50) * 0.35;
    const c2x = b.x + (b.x - 50) * 0.35;
    d += ` C ${c1x.toFixed(1)} ${(a.y + dy * 0.38).toFixed(1)}, ${c2x.toFixed(1)} ${(b.y - dy * 0.38).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }

  // a node on the closing section too, so the wire visibly terminates
  nodes.push({ x: 50, y: H - band * 0.45 });
  return { d, nodes };
}

export default function SpaceCable({
  planets = 5,
  reduced = false,
}: {
  planets?: number;
  reduced?: boolean;
}) {
  const { d: PATH, nodes: NODES } = useMemo(() => buildCable(planets), [planets]);
  const ref = useRef<HTMLDivElement>(null);
  const measureRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<HTMLSpanElement>(null);
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

  /** The energy pulse used to be a second full-length path with an animated
   *  stroke-dashoffset. That repainted the entire cable every single frame,
   *  which was the main source of scroll jank. Instead we sample the path once
   *  and fly a single dot along it with translate3d — a pure compositor
   *  operation that never triggers layout or paint. */
  useEffect(() => {
    if (reduced) return;
    const path = measureRef.current;
    const comet = cometRef.current;
    const host = ref.current;
    if (!path || !comet || !host) return;

    const total = path.getTotalLength();
    // pre-sample the curve so no geometry maths happens per frame
    const SAMPLES = 420;
    const pts = new Float32Array(SAMPLES * 2);
    for (let i = 0; i < SAMPLES; i++) {
      const pt = path.getPointAtLength((i / (SAMPLES - 1)) * total);
      pts[i * 2] = pt.x / W;
      pts[i * 2 + 1] = pt.y / H;
    }

    let box = host.getBoundingClientRect();
    const onResize = () => {
      box = host.getBoundingClientRect();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    const DURATION = 9000;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 100);
      last = now;
      t = (t + dt / DURATION) % 1;
      const i = Math.min(SAMPLES - 1, Math.floor(t * SAMPLES));
      const x = pts[i * 2] * box.width;
      const y = pts[i * 2 + 1] * box.height;
      // only paint-free transforms — no left/top, no layout
      comet.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

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

        {/* faked glow: one wider translucent stroke instead of a blur filter */}
        <path
          d={PATH}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.1}
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

        {/* the measuring path for the comet — never painted */}
        <path ref={measureRef} d={PATH} fill="none" stroke="none" />
      </svg>

      {/* the energy comet, moved with transform only */}
      {!reduced && (
        <span
          ref={cometRef}
          className="absolute left-0 top-0"
          style={{ willChange: "transform" }}
        >
          <span className="absolute left-0 top-0 block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#eafff9] shadow-[0_0_18px_6px_rgba(160,255,240,0.55)]" />
        </span>
      )}

      {/* junction nodes — plain DOM so they stay perfectly round (the SVG above
          is stretched with preserveAspectRatio="none", which would squash any
          circle drawn inside it into an ellipse) */}
      {NODES.map((n, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${n.x}%`, top: `${(n.y / H) * 100}%` }}
        >
          <span
            className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 35%, transparent), transparent)",
            }}
          />
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
