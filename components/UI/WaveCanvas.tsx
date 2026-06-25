"use client";
import { useEffect, useRef } from "react";

function getBaseY(x: number, W: number): number {
  const segW = W / 4;
  const seg = Math.floor(x / segW);
  const t = (x % segW) / segW;
  const sign = seg % 2 === 0 ? -1 : 1;
  const mid = 10;
  return (
    (1 - t) * (1 - t) * mid + 2 * t * (1 - t) * (mid + sign * 6) + t * t * mid
  );
}

export default function WaveCanvas({
  phaseOffset = 0,
}: {
  phaseOffset?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    let t = phaseOffset;
    let rafId: number;

    const dots = [
      { cx: W * 0.25, r: 3, color: "#1ABCAA" },
      { cx: W * 0.5, r: 4, color: "#D4A843" },
      { cx: W * 0.75, r: 3, color: "#1ABCAA" },
    ];

    function frame() {
      ctx!.clearRect(0, 0, W, canvas!.height);

      const wavePos = t % 1;

      ctx!.beginPath();
      for (let x = 0; x <= W; x++) {
        const progress = x / W;
        const dist = Math.min(
          Math.abs(progress - wavePos),
          Math.abs(progress - wavePos + 1),
          Math.abs(progress - wavePos - 1),
        );
        const bump = 5 * Math.exp(-dist * dist * 50);
        const y = getBaseY(x, W) - bump;
        if (x === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }

      const grad = ctx!.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "rgba(26,188,170,0)");
      grad.addColorStop(0.3, "rgba(26,188,170,1)");
      grad.addColorStop(0.5, "rgba(212,168,67,1)");
      grad.addColorStop(0.7, "rgba(26,188,170,1)");
      grad.addColorStop(1, "rgba(26,188,170,0)");
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 2.5;
      ctx!.stroke();

      dots.forEach((d) => {
        const progress = d.cx / W;
        const dist = Math.min(
          Math.abs(progress - wavePos),
          Math.abs(progress - wavePos + 1),
          Math.abs(progress - wavePos - 1),
        );
        const bump = 5 * Math.exp(-dist * dist * 50);
        const cy = getBaseY(d.cx, W) - bump;

        ctx!.beginPath();
        ctx!.arc(d.cx, cy, d.r, 0, Math.PI * 2);
        ctx!.fillStyle = d.color;
        ctx!.fill();
      });

      t += 0.004;
      rafId = requestAnimationFrame(frame);
    }

    frame();
    return () => cancelAnimationFrame(rafId);
  }, [phaseOffset]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={20}
      style={{ width: "100%", height: "20px", display: "block" }}
    />
  );
}
