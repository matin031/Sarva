"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { annotate } from "rough-notation";
import { useInView } from "motion/react";
import { useReducedMotion } from "@/lib/perf/use-perf";

/** Magic UI's Rough Notation highlighter, adapted for Persian text, font
 * loading, responsive reflow and the site's reduced-motion preference.
 * https://magicui.design/docs/components/highlighter */
export function Highlighter({
  children,
  action = "underline",
  color = "var(--primary)",
  className,
}: {
  children: ReactNode;
  action?: "underline" | "highlight";
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 1 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || !inView) return;
    let disposed = false;
    let cleanup = () => {};

    void document.fonts.ready.then(() => {
      if (disposed) return;
      const annotation = annotate(element, {
        type: action, color, strokeWidth: 2, padding: 3,
        multiline: true, rtl: true, iterations: 2,
        animationDuration: 750, animate: !reduced,
      });
      const decoration = action === "highlight" ? element.previousElementSibling : element.nextElementSibling;
      if (decoration?.classList.contains("rough-annotation")) {
        decoration.setAttribute("aria-hidden", "true");
        decoration.setAttribute("focusable", "false");
      }
      annotation.show();
      // Redraw without replaying the entrance when a line wraps or the font changes.
      let width = element.getBoundingClientRect().width;
      const observer = new ResizeObserver(() => {
        const nextWidth = element.getBoundingClientRect().width;
        if (Math.abs(nextWidth - width) < 1) return;
        width = nextWidth;
        annotation.hide();
        annotation.animate = false;
        annotation.show();
      });
      observer.observe(element);
      cleanup = () => { observer.disconnect(); annotation.remove(); };
    });
    return () => { disposed = true; cleanup(); };
  }, [action, color, inView, reduced]);

  return <span ref={ref} className={className} style={{ display: "inline-block", position: "relative", isolation: "isolate", lineHeight: "inherit" }}>{children}</span>;
}
