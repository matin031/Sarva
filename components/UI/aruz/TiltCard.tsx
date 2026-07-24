"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";

/** A card that tilts in 3D toward the pointer, with a soft glare highlight that
 *  follows the cursor. Purely presentational; falls back to a static card when
 *  the user prefers reduced motion (handled by the parent passing `disabled`). */
export default function TiltCard({
  children,
  className = "",
  max = 12,
  glare = true,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  // The card's box is measured once when the pointer arrives, not on every
  // move. Reading getBoundingClientRect inside a high-frequency handler that
  // also writes styles is the classic layout-thrash pattern; caching it keeps
  // the whole interaction write-only.
  const rect = useRef<DOMRect | null>(null);

  const rx = useSpring(0, { stiffness: 200, damping: 18 });
  const ry = useSpring(0, { stiffness: 200, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const transform = useMotionTemplate`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  const glareBg = useMotionTemplate`radial-gradient(240px circle at ${gx}% ${gy}%, rgba(255,255,255,0.35), transparent 60%)`;

  const measure = () => {
    if (ref.current) rect.current = ref.current.getBoundingClientRect();
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!hovered) setHovered(true);
    const r = rect.current;
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    ry.set((x - 0.5) * 2 * max);
    rx.set(-(y - 0.5) * 2 * max);
    gx.set(x * 100);
    gy.set(y * 100);
  };

  const onLeave = () => {
    setHovered(false);
    rect.current = null;
    rx.set(0);
    ry.set(0);
    // NOTE: don't recenter the glare here — moving it to the middle while it
    // fades out makes a halo flash in the center of the card on mouse-leave.
    // Leaving it where the cursor left lets it fade out in place, unseen.
  };

  return (
    <motion.div
      ref={ref}
      onPointerEnter={() => {
        if (disabled) return;
        measure();
        setHovered(true);
      }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={disabled ? undefined : { transform, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
    >
      {children}
      {glare && !disabled && (
        <motion.div
          aria-hidden
          style={{ background: glareBg }}
          className={`pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light transition-opacity duration-300 ${
            hovered ? "opacity-70" : "opacity-0"
          }`}
        />
      )}
    </motion.div>
  );
}
