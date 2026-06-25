"use client";
import { useEffect, useRef } from "react";

export default function AmbientCircularVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const levelRef = useRef(0);

  const SIZE = 260;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const INNER_R = 70;
  const POINTS = 72;

  function drawBlob(level: number, phase: number) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const base = INNER_R;
    const pts: [number, number][] = [];
    for (let i = 0; i < POINTS; i++) {
      const angle = (i / POINTS) * Math.PI * 2 - Math.PI / 2;
      const wave =
        Math.sin(i * 0.6 + phase) * 0.5 +
        Math.sin(i * 0.23 - phase * 0.7) * 0.5;
      const wobble = (0.1 + level * 0.5) * wave;
      const h = base + wobble * 28;
      pts.push([cx + Math.cos(angle) * h, cy + Math.sin(angle) * h]);
    }

    ctx.beginPath();
    const start: [number, number] = [
      (pts[POINTS - 1][0] + pts[0][0]) / 2,
      (pts[POINTS - 1][1] + pts[0][1]) / 2,
    ];
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < POINTS; i++) {
      const p = pts[i];
      const n = pts[(i + 1) % POINTS];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
    }
    ctx.closePath();

    const rg = ctx.createRadialGradient(cx, cy, base * 0.4, cx, cy, base + 55);
    rg.addColorStop(0, "rgba(31,209,164,0.05)");
    rg.addColorStop(0.7, "rgba(31,209,164,0.25)");
    rg.addColorStop(1, "rgba(20,150,120,0.45)");
    ctx.fillStyle = rg;
    ctx.fill();

    ctx.shadowColor = "rgba(31,209,164,0.6)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "rgba(31,209,164,0.9)";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function fakeLevel(t: number) {
    return (
      0.25 +
      0.12 * Math.sin(t * 0.9) +
      0.06 * Math.sin(t * 2.1) +
      0.02 * Math.sin(t * 4.5)
    );
  }

  useEffect(() => {
    let t = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      t += 0.02;

      const target = Math.max(0, Math.min(1, fakeLevel(t)));
      levelRef.current += (target - levelRef.current) * 0.08;
      phaseRef.current += 0.015 + levelRef.current * 0.02;

      drawBlob(levelRef.current, phaseRef.current);
    };
    loop();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-40 h-40">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-65 max-w-none pointer-events-none"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
       size-25 rounded-full bg-card flex items-center justify-center
        border-2 border-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
          />
        </svg>
      </div>
    </div>
  );
}
