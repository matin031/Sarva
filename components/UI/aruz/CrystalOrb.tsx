"use client";

import { useEffect, useRef } from "react";

/** A glassy crystal sphere sitting on a glowing pedestal, with a living audio
 *  waveform + frequency spectrum drawn inside it and a play glyph at the center.
 *  The look is built entirely from layered gradients, shadows and a canvas — no
 *  images — so it stays crisp and theme-aware. Honors reduced motion with a
 *  single static frame. */
export default function CrystalOrb({ reduced = false }: { reduced?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const W = 360;
    const H = 360;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.scale(dpr, dpr);

    const midY = H / 2;

    const wave = (t: number, amp: number, freq: number, phase: number, color: string, lw: number) => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const env = Math.sin((x / W) * Math.PI); // fade at edges of the ball
        const y =
          midY +
          Math.sin(x * freq + t + phase) * amp * env +
          Math.sin(x * freq * 0.5 - t * 0.7) * amp * 0.4 * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // flowing waves
      wave(t, 30, 0.03, 0, "rgba(30,220,200,0.85)", 2.4);
      wave(t * 1.1, 22, 0.038, 1.6, "rgba(150,110,240,0.6)", 2);
      wave(t * 0.8, 14, 0.05, 3.2, "rgba(120,230,220,0.5)", 1.4);

      // particle dots riding the main wave
      for (let x = 20; x <= W - 20; x += 12) {
        const env = Math.sin((x / W) * Math.PI);
        const y = midY + Math.sin(x * 0.03 + t) * 30 * env;
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,255,245,0.7)";
        ctx.fill();
      }

      // central frequency spectrum bars
      const BARS = 18;
      const bw = 3;
      const gap = 5;
      const totalW = BARS * (bw + gap);
      const startX = (W - totalW) / 2;
      for (let i = 0; i < BARS; i++) {
        const d = Math.abs(i - BARS / 2) / (BARS / 2);
        const env = 1 - d * 0.7;
        const h =
          (8 + Math.abs(Math.sin(i * 0.7 + t * 2.2)) * 46 * env) *
          (0.6 + 0.4 * Math.sin(t * 1.3 + i));
        const x = startX + i * (bw + gap);
        const grad = ctx.createLinearGradient(0, midY - h, 0, midY + h);
        grad.addColorStop(0, "rgba(30,220,200,0.9)");
        grad.addColorStop(1, "rgba(30,220,200,0.15)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, midY - h, bw, h * 2, bw);
        ctx.fill();
      }
    };

    if (reduced) {
      draw(0.6);
      return;
    }
    const loop = () => {
      tRef.current += 0.03;
      draw(tRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  return (
    <div className="relative aspect-square w-full max-w-[420px]">
      {/* under-glow */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-1/4 bottom-0 rounded-full bg-primary/30 blur-[90px]"
      />

      {/* ground / orbit rings around the base */}
      <div aria-hidden className="absolute inset-x-0 bottom-2 flex justify-center">
        <div className="relative h-24 w-[92%]">
          <div className="absolute inset-0 rounded-[50%] border border-primary/20" />
          <div className="absolute inset-x-6 inset-y-4 rounded-[50%] border border-primary/12" />
          <div className="absolute inset-x-14 inset-y-8 rounded-[50%] border border-gold/12" />
        </div>
      </div>

      {/* the glass sphere */}
      <div
        className="absolute left-1/2 top-0 aspect-square w-[86%] -translate-x-1/2 overflow-hidden rounded-full"
        style={{
          background:
            "radial-gradient(120% 120% at 32% 24%, rgba(255,255,255,0.22), rgba(255,255,255,0.02) 26%, transparent 52%)," +
            "radial-gradient(90% 90% at 50% 118%, rgba(0,210,195,0.4), transparent 60%)," +
            "radial-gradient(circle at 50% 46%, rgba(9,26,36,0.35), rgba(4,10,18,0.72) 78%)",
          boxShadow:
            "inset 0 0 70px rgba(0,190,180,0.3), inset 10px 14px 55px rgba(255,255,255,0.09), inset -14px -22px 65px rgba(0,0,0,0.55), 0 30px 80px -20px rgba(0,200,190,0.6), 0 0 60px -6px rgba(0,200,190,0.4)",
          border: "1px solid rgba(150,235,230,0.4)",
        }}
      >
        {/* waveform canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        {/* specular highlights */}
        <div
          aria-hidden
          className="absolute left-[14%] top-[10%] size-28 rounded-full bg-white/35 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute left-[20%] top-[16%] size-8 rounded-full bg-white/70 blur-md"
        />
        <div
          aria-hidden
          className="absolute right-[20%] bottom-[18%] size-12 rounded-full bg-primary/40 blur-xl"
        />
        {/* rim light */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: "inset 0 2px 10px rgba(255,255,255,0.25)",
            maskImage:
              "linear-gradient(to bottom, black, transparent 40%)",
          }}
        />

        {/* play glyph */}
        <div className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white shadow-[0_0_40px_-6px_var(--color-primary)] backdrop-blur-md">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ms-1 size-8">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </div>
      </div>

      {/* pedestal */}
      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center">
        {/* bright contact glow where the sphere meets the base */}
        <div className="h-2 w-1/2 rounded-[50%] bg-primary/70 blur-md" />
        <div
          className="-mt-1 h-10 w-3/5 rounded-[50%]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,40,50,0.95), rgba(6,14,22,0.98))",
            boxShadow:
              "0 -6px 20px -6px rgba(0,200,190,0.6), 0 14px 30px -8px rgba(0,0,0,0.7)",
            border: "1px solid rgba(120,220,220,0.2)",
          }}
        />
      </div>
    </div>
  );
}
