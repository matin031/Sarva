"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useMotionValue, type MotionValue } from "motion/react";

type Pointer = { x: MotionValue<number>; y: MotionValue<number> };

const PointerContext = createContext<Pointer | null>(null);

/** Publishes the pointer's viewport position as MotionValues.
 *
 *  One listener for the whole scene, and MotionValues rather than state: every
 *  suspect's pupils read from the same two values without a single React
 *  re-render per mouse move. Falls back to the centre on touch devices, where
 *  there is no hover to follow. */
export function PointerProvider({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const value = useMemo<Pointer>(() => ({ x, y }), [x, y]);
  const started = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      started.current = true;
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return (
    <PointerContext.Provider value={value}>{children}</PointerContext.Provider>
  );
}

export function usePointer(): Pointer | null {
  return useContext(PointerContext);
}
