"use client";

import { useRef, type ComponentProps } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/cn";
import { useDocumentVisible, useReducedMotion } from "@/lib/perf/use-perf";
import styles from "./shiny-button.module.css";

/** Magic UI Shiny Button's moving --x gradient and masked border, adapted
 * to Sarva. Keep the label unmasked for legibility; omit the spring bounce.
 * Source: https://magicui.design/docs/components/shiny-button
 * MIT notice: components/home/MAGIC-UI-LICENSE.md.
 * asChild follows the existing kit/Button API, so navigation stays a link. */
export function ShinyButton({ asChild = false, className, children, disabled, ...props }:
  ComponentProps<"button"> & { asChild?: boolean }) {
  const shineRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(shineRef);
  const visible = useDocumentVisible();
  const reduced = useReducedMotion();
  const Comp = asChild ? Slot : "button";
  const animate = inView && visible && !reduced && !disabled;

  return (
    <Comp
      {...(!asChild ? { type: "button" as const, disabled } : {})}
      className={cn(styles.button, className)}
      {...props}
    >
      <Slottable>{children}</Slottable>
      <motion.span
        ref={shineRef}
        aria-hidden="true"
        className={styles.shine}
        initial={{ "--x": "100%" }}
        animate={{ "--x": animate ? ["100%", "-100%"] : "100%" }}
        transition={{ duration: 2.8, repeat: animate ? Infinity : 0, repeatDelay: 6, ease: "easeInOut" }}
      >
        <span className={styles.sweep} />
        <span className={styles.border} />
      </motion.span>
    </Comp>
  );
}
