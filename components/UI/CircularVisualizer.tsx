"use client";
import { useEffect, useRef, useState } from "react";

interface CircularVisualizerProps {
  audioSrc: string;
}

export default function CircularVisualizer({
  audioSrc,
}: CircularVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const levelRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  // فایل صوتی پیدا نشد — به‌جای کرش، همین گزینه را ساکت نشان می‌دهیم.
  const [failed, setFailed] = useState(false);

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
      const wobble = (0.18 + level * 0.9) * wave;
      const h = base + wobble * 48;
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

  function drawIdle() {
    levelRef.current += (0 - levelRef.current) * 0.1;
    phaseRef.current += 0.015;
    drawBlob(levelRef.current, phaseRef.current);
  }

  const stopVisualizer = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlaying(false);
    drawIdle();
  };

  const handleToggle = async () => {
    if (!audioRef.current) return;

    if (!audioCtxRef.current) {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      const source = audioCtx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
    }

    if (audioCtxRef.current.state === "suspended")
      await audioCtxRef.current.resume();

    if (playing) {
      audioRef.current.pause();
      stopVisualizer();
    } else {
      // ⚠️ اگر فایل صوتی نباشد، مرورگر برای src یک صفحهٔ ۴۰۴ می‌گیرد و
      // play() با NotSupportedError رد می‌شود. بدون این catch، آن rejection
      // به کرشِ کلِ صفحه تبدیل می‌شد — یک ردیفِ خرابِ دیتابیس تمام آزمون را
      // می‌خواباند. حالا فقط همان گزینه ساکت می‌ماند.
      //
      // برای پیدا کردنِ ردیفِ مقصر: npm run db:check-audio
      try {
        await audioRef.current.play();
      } catch {
        setFailed(true);
        stopVisualizer();
        return;
      }
      setPlaying(true);
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        analyserRef.current!.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;

        levelRef.current += (avg - levelRef.current) * 0.15;
        phaseRef.current += 0.03 + levelRef.current * 0.04;

        drawBlob(levelRef.current, phaseRef.current);
      };
      loop();
    }
  };

  // 👇 جدید: گوش دادن به رویداد ended المنت audio
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleEnded = () => {
      stopVisualizer();
    };

    audioEl.addEventListener("ended", handleEnded);

    return () => {
      audioEl.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    drawIdle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-40 h-40 cursor-pointer" onClick={handleToggle}>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] max-w-none pointer-events-none"
      />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
        w-[100px] h-[100px] rounded-full bg-card flex items-center justify-center
        border-2 transition-colors duration-300 ${playing ? "border-primary" : "border-border"}`}
      >
        {playing ? (
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
        ) : (
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
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
            />
          </svg>
        )}
      </div>
      <audio
        ref={audioRef}
        src={audioSrc}
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
      />
      {failed && (
        <p className="mt-2 text-center text-xs text-rose-400">فایل صوتی این گزینه در دسترس نیست.</p>
      )}
    </div>
  );
}
