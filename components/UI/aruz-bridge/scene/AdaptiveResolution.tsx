"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { nextBridgeDpr } from "@/lib/aruz-bridge/resolution";

/** Only resolution changes; questions, timing, camera and glass hit targets stay intact. */
export function AdaptiveResolution({ onDprChange }: { onDprChange: (dpr: number) => void }) {
  const gl = useThree(state => state.gl);
  const sample = useRef({ warmup: 0, seconds: 0, frames: 0 });
  useFrame((_, delta) => {
    const window = sample.current;
    if (document.hidden || delta > 1) {
      window.seconds = 0;
      window.frames = 0;
      return;
    }
    window.warmup += delta;
    if (window.warmup < 3) return;
    window.seconds += delta;
    window.frames++;
    if (window.seconds < 2) return;
    const current = gl.getPixelRatio();
    const next = nextBridgeDpr(current, window.seconds * 1000 / window.frames);
    if (next !== current) onDprChange(next);
    window.seconds = 0;
    window.frames = 0;
  });
  return null;
}
