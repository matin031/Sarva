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

    // Sizing comes from ResizeObserver's contentRect rather than clientWidth /
    // clientHeight. The observer hands us dimensions the browser has already
    // computed, so there is no layout read at all — the old version read the
    // canvas box and then wrote canvas.width in the same breath, which is a
    // forced reflow, and mobile fires resize while scrolling (URL bar) so it
    // happened mid-scroll.
    const build = (w: number, h: number) => {
      if (w === W && h === H) return; // nothing actually changed
      W = w;
      H = h;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // density scales with area, capped so phones stay cheap
      // fewer, larger stars: fill-rate matters far more than star count
      const count = Math.min(120, Math.round((W * H) / 16000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: 0.3 + Math.random() * 0.7,
        r: 0.4 + Math.random() * 1.3,
        tw: Math.random() * Math.PI * 2,
      }));
    };
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) build(Math.round(r.width), Math.round(r.height));
    });
    ro.observe(cv);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      // one path per opacity bucket instead of a beginPath/fill per star —
      // far fewer canvas state changes for the same picture
      const BUCKETS = 4;
      for (let bi = 0; bi < BUCKETS; bi++) {
        ctx.beginPath();
        for (const s of stars) {
          const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.002 + s.tw);
          const a = 0.25 + twinkle * 0.55 * s.z;
          if (Math.min(BUCKETS - 1, Math.floor(a * BUCKETS)) !== bi) continue;
          const r = s.r * s.z;
          ctx.moveTo(s.x + r, s.y);
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        }
        ctx.fillStyle = `rgba(190, 235, 235, ${(bi + 0.5) / BUCKETS})`;
        ctx.fill();
      }
    };

    if (reduced) {
      // one static frame once the observer has reported a size
      const id = requestAnimationFrame(() => draw(0));
      return () => {
        cancelAnimationFrame(id);
        ro.disconnect();
      };
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
      ro.disconnect();
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
