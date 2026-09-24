"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { Mascot } from "./Mascot";
import s from "./timeline.module.css";

type Stop = { x: number; y: number; color: string };
type Road = { d: string; width: number; height: number; stops: Stop[] };

/** Builds a winding road through every era stop. Between two stops the road
 *  sways in whole half-waves, so it always passes exactly through each stamp. */
function buildRoad(stops: Stop[], width: number, height: number): string {
  if (!stops.length) return "";
  const amp = width < 640 ? 7 : 30;
  const points: [number, number][] = [[stops[0].x, 0]];
  const legs: [Stop, Stop][] = [];
  for (let i = 0; i < stops.length - 1; i++) legs.push([stops[i], stops[i + 1]]);
  legs.push([stops[stops.length - 1], { ...stops[stops.length - 1], y: height }]);
  points.push([stops[0].x, stops[0].y]);
  legs.forEach(([a, b], leg) => {
    const span = b.y - a.y;
    const halfWaves = Math.max(1, Math.round(span / 300));
    const direction = leg % 2 === 0 ? 1 : -1;
    for (let y = 14; y < span; y += 14) {
      const t = y / span;
      const x = a.x + (b.x - a.x) * t + direction * amp * Math.sin(Math.PI * halfWaves * t);
      points.push([x, a.y + y]);
    }
    points.push([b.x, b.y]);
  });
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

export function JourneyRoad({ containerRef, reduced, activeName, activeColor, activeLine }: { containerRef: RefObject<HTMLDivElement | null>; reduced: boolean; activeName: string; activeColor: string; activeLine: string }) {
  const [road, setRoad] = useState<Road | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState(false);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 55%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.0005 });

  useLayoutEffect(() => {
    // ⚠️ Not `containerRef.current`: a child's layout effect runs before the
    // parent's ref is attached, so that is still null here. The road always
    // renders its own wrapper inside the container, so measure through it.
    const container = rootRef.current?.parentElement;
    if (!container) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = container.getBoundingClientRect();
        const stops = [...container.querySelectorAll<HTMLElement>("[data-stop]")].map(stop => {
          const rect = stop.getBoundingClientRect();
          return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top, color: stop.dataset.stop ?? "#dcc08b" };
        });
        setRoad({ d: buildRoad(stops, box.width, box.height), width: box.width, height: box.height, stops });
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  const place = (value: number) => {
    const path = pathRef.current, walker = walkerRef.current;
    if (!path || !walker) return;
    const length = path.getTotalLength();
    const at = Math.min(Math.max(value, 0), 1) * length;
    const point = path.getPointAtLength(at);
    const ahead = path.getPointAtLength(Math.min(at + 24, length));
    const lean = Math.max(-18, Math.min(18, ((ahead.x - point.x) / Math.max(ahead.y - point.y, 1)) * 30));
    walker.style.transform = `translate(${point.x}px, ${point.y}px)`;
    walker.style.setProperty("--lean", `${lean}deg`);
  };
  useMotionValueEvent(progress, "change", place);
  useEffect(() => { place(progress.get()); });

  // Say the chapter's name when the walker reaches it, then go quiet again.
  useEffect(() => {
    if (reduced) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBubble(true);
    const timer = window.setTimeout(() => setBubble(false), 3600);
    return () => window.clearTimeout(timer);
  }, [activeName, reduced]);

  return <div ref={rootRef} className={s.road} aria-hidden="true">
    {road && <svg width={road.width} height={road.height} viewBox={`0 0 ${road.width} ${road.height}`} fill="none">
      <defs>
        <linearGradient id="journey-ink" x1="0" y1="0" x2="0" y2={road.height} gradientUnits="userSpaceOnUse">
          {road.stops.map((stop, i) => <stop key={i} offset={Math.min(1, stop.y / road.height)} style={{ stopColor: `color-mix(in oklch, ${stop.color} 80%, var(--foreground))` }} />)}
        </linearGradient>
      </defs>
      <path d={road.d} className={s.roadBed} />
      <path d={road.d} className={s.roadDashes} />
      <motion.path ref={pathRef} d={road.d} className={s.roadInk} stroke="url(#journey-ink)" style={{ pathLength: reduced ? 1 : progress }} />
    </svg>}
    {road && !reduced && <div ref={walkerRef} className={s.walker}>
      <AnimatePresence>{bubble && <motion.span key={activeName} className={s.walkerBubble} style={{ borderColor: activeColor }} initial={{ opacity: 0, scale: .4, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .6 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}>رسیدیم به <b style={{ color: activeColor }}>{activeName}</b>!<small>{activeLine}</small></motion.span>}</AnimatePresence>
      <Mascot className={s.walkerMascot} />
    </div>}
  </div>;
}
