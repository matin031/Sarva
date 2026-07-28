"use client";

import { motion, useReducedMotion } from "motion/react";

/** The سروا mark, filling up.
 *
 *  The same cypress that greets you on the first visit, drained of colour and
 *  refilled from the roots as the data comes in — plus a light that runs up the
 *  silhouette. Everything is painted through a mask cut from the logo itself
 *  (`/favicon.svg`), so nothing here is a rectangle: the fill and the shine end
 *  exactly where the tree does. */
export default function SarvaLoader({
  label,
  size = 84,
  className = "",
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      role="status"
      aria-label={label ?? "در حال بارگذاری"}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className="sarva-loader relative"
        style={{ width: size, height: (size * 449.82) / 376.8 }}
      >
        {/* a soft halo — a gradient rather than a blur filter, which would cost
            a full-surface multi-pass repaint on every frame */}
        {!reduced && (
          <motion.span
            aria-hidden
            className="sarva-glow"
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
          />
        )}

        {/* the drained tree */}
        <span className="sarva-mask absolute inset-0 bg-foreground/15" />

        {/* the rising fill, clipped to the silhouette */}
        <span className="sarva-mask absolute inset-0 overflow-hidden">
          <motion.span
            className="absolute inset-x-0 bottom-0 block bg-linear-to-t from-primary to-turquoise-light"
            initial={{ height: reduced ? "62%" : "8%" }}
            animate={reduced ? { height: "62%" } : { height: ["8%", "100%", "8%"] }}
            transition={
              reduced
                ? undefined
                : { duration: 2.4, ease: [0.45, 0, 0.35, 1], repeat: Infinity }
            }
          />
          {!reduced && <span className="sarva-shine" />}
        </span>
      </div>

      {label && (
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      )}
    </div>
  );
}
