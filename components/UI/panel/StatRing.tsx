"use client";

import { motion, useReducedMotion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";

const R = 44;
const C = 2 * Math.PI * R;

/** The headline percentages at the top of each panel page.
 *
 *  The ring fills to the value instead of sitting there as a full circle, and
 *  it is always the site's primary colour — the red→amber→green scale belongs
 *  to a single attempt's score, where "good or bad" is the point. Up here the
 *  number is an identity, not a verdict, and a summary that changes colour on
 *  you reads as an alarm. */
export default function StatRing({
  percent,
  ready = true,
  className = "size-18 sm:size-22",
}: {
  percent: number;
  ready?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const p = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - p / 100);

  return (
    <div className={`relative shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" className=" size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="8"
          className=" stroke-border"
        />
        {ready && (
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            className=" stroke-primary"
            initial={{ strokeDashoffset: reduced ? offset : C }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduced ? 0 : 1, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
      </svg>
      <span className=" absolute inset-0 flex items-center justify-center text-xl font-bold sm:text-2xl">
        {ready ? `${toFa(p)}%` : "—"}
      </span>
    </div>
  );
}
