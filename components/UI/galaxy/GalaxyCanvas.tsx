"use client";

import { useState, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, Preload, View } from "@react-three/drei";

/** ONE WebGL context for the whole galaxy.
 *
 *  Every planet is a drei <View> that renders into this single fixed canvas via
 *  scissor testing, instead of each planet spinning up its own <Canvas>. A page
 *  with five canvases means five renderers, five render loops and five GPU
 *  contexts — the main reason the page crawled. This is the documented R3F
 *  pattern for "many 3D things on one page".
 *
 *  Quality is adaptive: PerformanceMonitor watches the real framerate and drops
 *  the pixel ratio on weak devices, and AdaptiveDpr lowers it further while the
 *  scene is under load, so slow machines stay smooth instead of stuttering. */
export default function GalaxyCanvas({
  eventSource,
  reduced = false,
}: {
  eventSource: RefObject<HTMLElement | null>;
  reduced?: boolean;
}) {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  // start conservative; PerformanceMonitor moves this up or down from here
  const [dpr, setDpr] = useState<number>(coarse ? 0.85 : 1.15);

  return (
    <Canvas
      // eventSource lets the single canvas keep pointer events tied to the page
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      dpr={dpr}
      // antialiasing is one of the priciest flags; resolution buys more here
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      // lets R3F temporarily regress quality during heavy frames
      performance={{ min: 0.5 }}
      frameloop={reduced ? "demand" : "always"}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
      className="z-0"
    >
      <PerformanceMonitor
        // give it a moment per sample so a single janky frame doesn't downgrade
        ms={250}
        iterations={5}
        onDecline={() => setDpr((d) => Math.max(0.6, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(coarse ? 1 : 1.5, d + 0.15))}
        onFallback={() => setDpr(0.6)}
      />
      <AdaptiveDpr pixelated />
      <Preload all />
      <View.Port />
    </Canvas>
  );
}
