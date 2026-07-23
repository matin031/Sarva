"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** The hero's visual: a minimal, modern "listening" player card. A live audio
 *  waveform sweeps under a playhead while a detected-meter chip cycles, echoing
 *  the product's promise — hear the rhythm, name the meter. Pure canvas + DOM,
 *  theme-aware, and calm when reduced motion is on. */

const METERS = ["رمل", "هزج", "متقارب", "رجز", "مضارع", "خفیف"];

// a fixed, musical-looking waveform silhouette (0..1 heights)
const BARS = Array.from({ length: 52 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 0.5)) * 0.6;
  const b = Math.abs(Math.sin(i * 0.17 + 1.3)) * 0.4;
  const c = ((i * 37) % 13) / 13 * 0.25;
  return Math.min(1, 0.18 + a + b + c);
});

export default function AruzWaveHero({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const progRef = useRef(reduced ? 0.62 : 0);
  const [meter, setMeter] = useState(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };
    let { w, h } = resize();
    const onResize = () => ({ w, h } = resize());
    window.addEventListener("resize", onResize);

    const N = BARS.length;

    const draw = (p: number, t: number) => {
      ctx.clearRect(0, 0, w, h);
      const gap = w / N;
      const bw = Math.max(2, gap * 0.42);
      const mid = h / 2;
      for (let i = 0; i < N; i++) {
        const live = reduced ? 1 : 0.82 + 0.18 * Math.sin(t * 3 + i * 0.6);
        const bh = BARS[i] * (h * 0.86) * live;
        // RTL: fill from the right as progress grows
        const played = 1 - i / N < p;
        const x = w - (i + 0.5) * gap;
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, mid - bh / 2, bw, bh, bw / 2);
        if (played) {
          const g = ctx.createLinearGradient(0, mid - bh / 2, 0, mid + bh / 2);
          g.addColorStop(0, "rgba(0,200,190,0.95)");
          g.addColorStop(1, "rgba(0,150,155,0.55)");
          ctx.fillStyle = g;
          ctx.shadowColor = "rgba(0,200,190,0.5)";
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = "rgba(130,140,150,0.32)";
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // playhead
      const px = w - p * w;
      ctx.beginPath();
      ctx.moveTo(px, 4);
      ctx.lineTo(px, h - 4);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const fmt = (p: number) => {
      const total = 12; // pretend 0:12
      const s = Math.round(p * total);
      return `۰:${s.toString().padStart(2, "0")}`.replace(/\d/g, (d) =>
        "۰۱۲۳۴۵۶۷۸۹"[+d],
      );
    };

    if (reduced) {
      draw(progRef.current, 0);
      if (barRef.current) barRef.current.style.width = `${progRef.current * 100}%`;
      if (timeRef.current) timeRef.current.textContent = fmt(progRef.current);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      progRef.current += dt / 7; // ~7s per pass
      if (progRef.current >= 1) {
        progRef.current = 0;
        setMeter((m) => (m + 1) % METERS.length);
      }
      draw(progRef.current, now / 1000);
      if (barRef.current) barRef.current.style.width = `${progRef.current * 100}%`;
      if (timeRef.current) timeRef.current.textContent = fmt(progRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <div dir="rtl" className="relative mx-auto w-full max-w-md">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-primary/20 blur-3xl"
      />

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative overflow-hidden rounded-[2rem] border border-border p-6 shadow-2xl backdrop-blur-xl sm:p-7"
      >
        {/* top edge accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/60 to-transparent" />

        {/* header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            در حالِ گوش دادن…
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">وزن:</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={meter}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-sm font-black text-primary"
              >
                {METERS[meter]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* waveform */}
        <div className="relative h-32 w-full sm:h-36">
          <canvas ref={canvasRef} className="size-full" />
        </div>

        {/* controls */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ms-0.5 size-6">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                ref={barRef}
                className="ms-auto h-full rounded-full bg-gradient-to-l from-primary to-gold"
                style={{ width: reduced ? "62%" : "0%" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span ref={timeRef}>۰:۰۰</span>
              <span>۰:۱۲</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
