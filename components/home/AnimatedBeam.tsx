"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { motion, useInView } from "motion/react";
import { useDocumentVisible, useReducedMotion } from "@/lib/perf/use-perf";

/** Adapted from Magic UI Animated Beam (MIT).
 * https://magicui.design/docs/components/animated-beam
 * Only runs while visible; endpoints are measured again when nodes resize. */
export function AnimatedBeam({ containerRef, fromRef, toRef, curvature = 0, reverse = false, delay = 0 }: {
  containerRef: RefObject<HTMLDivElement | null>;
  fromRef: RefObject<HTMLAnchorElement | null>;
  toRef: RefObject<HTMLDivElement | null>;
  curvature?: number;
  reverse?: boolean;
  delay?: number;
}) {
  const id = useId().replace(/:/g, "");
  const [path, setPath] = useState({ d: "", width: 0, height: 0 });
  const visible = useInView(containerRef, { amount: 0.1 });
  const documentVisible = useDocumentVisible();
  const reduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!container || !from || !to) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = container.getBoundingClientRect();
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.left - root.left + a.width / 2;
        const y1 = a.top - root.top + a.height / 2;
        const x2 = b.left - root.left + b.width / 2;
        const y2 = b.top - root.top + b.height / 2;
        setPath({ d: `M ${x1},${y1} Q ${(x1 + x2) / 2},${y1 - curvature} ${x2},${y2}`, width: root.width, height: root.height });
      });
    };
    const observer = new ResizeObserver(update);
    [container, from, to].forEach((element) => observer.observe(element));
    update();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [containerRef, fromRef, toRef, curvature]);

  if (!path.width || !path.height) return null;
  const animate = visible && documentVisible && !reduced;
  return (
    <svg aria-hidden="true" focusable="false" fill="none" width={path.width} height={path.height}
      viewBox={`0 0 ${path.width} ${path.height}`} className="pointer-events-none absolute inset-0">
      <path d={path.d} stroke="var(--primary)" strokeWidth="1.3" strokeOpacity="0.2" />
      {animate && <>
        <path d={path.d} stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" />
        <defs>
          <motion.linearGradient id={id} gradientUnits="userSpaceOnUse"
            initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
            animate={{ x1: reverse ? ["90%", "-10%"] : ["10%", "110%"], x2: reverse ? ["100%", "0%"] : ["0%", "100%"] }}
            transition={{ duration: 5, delay, repeat: Infinity, repeatDelay: 1, ease: [0.16, 1, 0.3, 1] }}>
            <stop stopColor="var(--primary)" stopOpacity="0" />
            <stop stopColor="var(--primary)" />
            <stop offset="32.5%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </motion.linearGradient>
        </defs>
      </>}
    </svg>
  );
}
