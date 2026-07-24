"use client";

import { useEffect, useRef } from "react";

/** A fixed, drifting starfield behind the whole guide page. Plain 2D canvas on
 *  purpose — it costs no WebGL context and runs fine next to the planet scenes.
 *  Throttled to ~30fps and paused when the tab is hidden. */
export default function Starfield({ reduced = false }: { reduced?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0;
    let H = 0;

    type Star = { x: number; y: number; z: number; r: number; tw: number };
    let stars: Star[] = [];

    const build = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // density scales with area, capped so phones stay cheap
      const count = Math.min(220, Math.round((W * H) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: 0.3 + Math.random() * 0.7,
        r: 0.4 + Math.random() * 1.3,
        tw: Math.random() * Math.PI * 2,
      }));
    };
    build();
    window.addEventListener("resize", build);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.002 + s.tw);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190, 235, 235, ${0.25 + twinkle * 0.55 * s.z})`;
        ctx.fill();
      }
    };

    if (reduced) {
      draw(0);
      return () => window.removeEventListener("resize", build);
    }

    let raf = 0;
    let last = 0;
    const FRAME = 1000 / 30;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME) return;
      last = now;
      // slow downward drift, wrapping around
      for (const s of stars) {
        s.y += 0.06 * s.z;
        if (s.y > H) {
          s.y = -2;
          s.x = Math.random() * W;
        }
      }
      draw(now);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", build);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 size-full"
    />
  );
}
