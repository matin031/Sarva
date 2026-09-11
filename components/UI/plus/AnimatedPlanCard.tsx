"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./plan-card.module.css";

/** Pause decorative border animation offscreen and in background tabs. */
export default function AnimatedPlanCard({ children, index, className = "" }: { children: ReactNode; index: number; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    const update = () => { el.dataset.animate = String(visible && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { rootMargin: "60px" });
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <article ref={ref} className={`${styles.frame} ${className}`} data-tone={index % 3} data-plan-card>
    <span className={styles.border} aria-hidden />{children}
  </article>;
}
