"use client";

import { useEffect, useRef } from "react";
import { planetSlots } from "./planetSlots";
import type { PlanetKind } from "./planetKind";

/** An empty box that reserves space in the layout and tells the galaxy scene
 *  "draw a planet here". It renders no WebGL itself — that all happens in the
 *  one shared scene — so this file stays free of three.js entirely. */
export default function PlanetSlot({ kind }: { kind: PlanetKind }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = planetSlots.add(el, kind);
    return () => planetSlots.remove(id);
    // the kind object is defined statically per planet, so identity is stable
  }, [kind]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none relative z-10 aspect-square w-full max-w-[340px]"
    />
  );
}
