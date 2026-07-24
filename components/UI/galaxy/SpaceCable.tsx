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
 *  The curve is a Catmull-Rom spline converted to cubic Béziers. That matters
 *  for looks, not just maths: a Catmull-Rom passes *through* every waypoint
 *  with continuous tangents, so the wire sweeps past each planet on a smooth
 *  arc instead of arriving head-on and kinking away, which is what the ad-hoc
 *  control points did. */
function buildCable(planetCount: number) {
  const bands = planetCount + 2;
  const band = H / bands;

  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < planetCount; i++) {
    nodes.push({ x: i % 2 === 0 ? 78 : 22, y: (i + 1.5) * band });
  }

  // waypoints: the wire enters from above, sweeps past each planet, and takes a
  // wide swing back across the centre between them so it never runs straight
  const pts: { x: number; y: number }[] = [{ x: 50, y: -10 }];
  nodes.forEach((n, i) => {
    pts.push(n);
    const next = nodes[i + 1];
    if (next) {
      // a mid waypoint nudged past centre gives the crossing its lazy S shape
      pts.push({ x: 50 + (n.x < 50 ? 9 : -9), y: (n.y + next.y) / 2 });
    }
  });
  pts.push({ x: 52, y: H - band * 0.45 });
  pts.push({ x: 48, y: H + 12 });

  // Catmull-Rom → Bézier: each segment's handles come from its neighbours'
  // positions, which is what keeps the tangents continuous across waypoints
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  // a node on the closing section too, so the wire visibly terminates
  const glowNodes = [...nodes, { x: 52, y: H - band * 0.45 }];
  return { d, nodes: glowNodes };
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

  /** The energy pulse.
   *
   *  History of this one line of sparkle: it started as a second full-length
   *  path with an animated stroke-dashoffset, which repainted the whole cable
   *  every frame. Then it became a dot moved with translate3d from a rAF loop —
   *  cheaper to paint, but it wrote to `style` on every frame, and drei's <View>
   *  reads getBoundingClientRect() on every frame right after. Write-then-read
   *  in the same frame is exactly the pattern that makes the browser recompute
   *  layout synchronously: DevTools flagged it as "Forced reflow".
   *
   *  So now the whole trip is handed to the Web Animations API as one keyframe
   *  set. The compositor interpolates the transforms on its own thread: no JS
   *  runs per frame, nothing writes to the DOM per frame, and there is nothing
   *  left for a layout read to be forced by. Geometry is sampled once here and
   *  only re-sampled on resize. */
  useEffect(() => {
    if (reduced) return;
    const path = measureRef.current;
    const comet = cometRef.current;
    const host = ref.current;
    if (!path || !comet || !host) return;

    let animation: Animation | null = null;

    const build = () => {
      animation?.cancel();
      // --- all DOM/geometry reads happen here, once, up front ---
      const total = path.getTotalLength();
      const box = host.getBoundingClientRect();
      const SAMPLES = 160;
      const frames: Keyframe[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const pt = path.getPointAtLength((i / (SAMPLES - 1)) * total);
        const x = (pt.x / W) * box.width;
        const y = (pt.y / H) * box.height;
        frames.push({ transform: `translate3d(${x}px, ${y}px, 0)` });
      }
      // --- and the single write is handing them to the compositor ---
      animation = comet.animate(frames, {
        duration: 9000,
        iterations: Infinity,
        easing: "linear",
      });
    };

    build();

    // geometry is cached; only a resize invalidates it
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      animation?.cancel();
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
