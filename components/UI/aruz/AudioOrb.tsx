"use client";

import { useEffect, useRef } from "react";

/** A glowing, organically pulsing audio orb rendered on canvas — the hero's
 *  emotional centerpiece for "شنیدنِ وزن". Draws a wobbling turquoise blob, a
 *  ring of reactive bars around it, and a soft glow. Respects reduced motion by
 *  drawing a single calm frame. */
export default function AudioOrb({ reduced = false }: { reduced?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const SIZE = 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = SIZE * dpr;
    cv.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const BASE = 96;
    const POINTS = 84;
    const BARS = 64;

    const draw = (phase: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // ---- outer reactive bars ring ----
      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2;
        const amp =
          Math.abs(Math.sin(i * 0.5 + phase * 1.6)) * 0.6 +
          Math.abs(Math.sin(i * 0.17 - phase)) * 0.4;
        const r0 = BASE + 44;
        const r1 = r0 + 6 + amp * 40;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.strokeStyle = `rgba(0,180,175,${0.15 + amp * 0.5})`;
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // ---- organic blob ----
      const pts: [number, number][] = [];
      for (let i = 0; i < POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2 - Math.PI / 2;
        const wave =
          Math.sin(i * 0.6 + phase) * 0.5 +
          Math.sin(i * 0.23 - phase * 0.7) * 0.5;
        const h = BASE + 0.2 * wave * 46;
        pts.push([cx + Math.cos(angle) * h, cy + Math.sin(angle) * h]);
      }
      ctx.beginPath();
      ctx.moveTo(
        (pts[POINTS - 1][0] + pts[0][0]) / 2,
        (pts[POINTS - 1][1] + pts[0][1]) / 2,
      );
      for (let i = 0; i < POINTS; i++) {
        const p = pts[i];
        const n = pts[(i + 1) % POINTS];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
      }
      ctx.closePath();
      const rg = ctx.createRadialGradient(cx, cy, BASE * 0.2, cx, cy, BASE + 40);
      rg.addColorStop(0, "rgba(20,220,190,0.14)");
      rg.addColorStop(0.65, "rgba(0,180,175,0.30)");
      rg.addColorStop(1, "rgba(10,120,120,0.5)");
      ctx.fillStyle = rg;
      ctx.shadowColor = "rgba(0,200,190,0.55)";
      ctx.shadowBlur = 34;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(30,220,200,0.85)";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    if (reduced) {
      draw(0.4);
      return;
    }
    const loop = () => {
      phaseRef.current += 0.02;
      draw(phaseRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  return (
    <div className="relative aspect-square w-full max-w-[420px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        style={{ width: "100%", height: "100%" }}
      />
      {/* center play glyph */}
      <div className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/40 bg-card/70 text-primary shadow-[0_0_30px_-4px_var(--color-primary)] backdrop-blur-sm">
        <svg viewBox="0 0 24 24" fill="currentColor" className="ms-1 size-8">
          <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
      </div>
    </div>
  );
}
