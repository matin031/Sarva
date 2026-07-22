"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Self-playing preview of the عروض سماعی quiz for the homepage. It reuses the
 *  exact quiz styling (the glass question card with its gradient edges, the
 *  organic audio blob, and the bg-card option boxes with primary/green states)
 *  and cycles the three question shapes, picking then grading the right option
 *  each round. Decorative only — no audio or real quiz logic. Pauses off-screen
 *  and honors prefers-reduced-motion. */

type Question =
  | { kind: "audio-weight"; prompt: string; options: string[]; correct: number }
  | { kind: "audio-poem"; prompt: string; options: string[]; correct: number }
  | { kind: "poem-audio"; prompt: string; bayt: [string, string]; correct: number };

const QUESTIONS: Question[] = [
  {
    kind: "audio-weight",
    prompt: "کدام وزن با ریتمِ پخش‌ شده مطابقت دارد؟",
    options: ["مفاعیلن مفاعیلن فعولن", "فاعلاتن فاعلاتن فاعلن", "مستفعلن مستفعلن مستفعلن", "فعولن فعولن فعولن فعل"],
    correct: 1,
  },
  {
    kind: "poem-audio",
    prompt: "وزن عروضی این بیت کدام است؟",
    bayt: ["یار بارافتاده را در کاروان بگذاشتند", "بی‌وفا یاران که بربستند بارِ خویش را"],
    correct: 2,
  },
  {
    kind: "audio-poem",
    prompt: "کدام بیت با ریتمِ پخش‌ شده مطابقت دارد؟",
    options: [
      "همای اوجِ سعادت به دامِ ما افتد",
      "دل من رایِ تو دارد سرِ سودای تو دارد",
      "چه دانستم که این سودا مرا زین‌سان کند مجنون",
      "به سعیِ خود نتوان برد پی به گوهرِ مقصود",
    ],
    correct: 0,
  },
];

type Phase = "idle" | "picked" | "graded";

export default function OrouzDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQi(0);
      setPhase("graded");
      return;
    }
    if (!active) return;
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      let i = 0;
      while (!cancelled) {
        setQi(i);
        setPhase("idle");
        await sleep(1500);
        if (cancelled) return;
        setPhase("picked");
        await sleep(600);
        if (cancelled) return;
        setPhase("graded");
        await sleep(1900);
        if (cancelled) return;
        i = (i + 1) % QUESTIONS.length;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, reduced]);

  const q = QUESTIONS[qi];
  const cells = q.kind === "poem-audio" ? [0, 1, 2, 3] : q.options;

  return (
    <div ref={rootRef} aria-hidden dir="rtl" className="mx-auto w-full max-w-3xl select-none">
      {/* progress bar (like the quiz header) */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${((qi + 1) / QUESTIONS.length) * 100}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      {/* question card — same glass box + gradient edges as the quiz */}
      <div className="glass relative z-20 mb-6 flex h-62.5 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl py-3 text-base xs:p-5 xs:text-lg sm:text-xl md:px-8 md:py-5 md:text-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={qi}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-2"
          >
            <p>{q.prompt}</p>
            {q.kind === "poem-audio" ? (
              <div className="text-sm text-muted-foreground xs:text-base sm:text-lg md:text-xl">
                <p>{q.bayt[0]}</p>
                <p>{q.bayt[1]}</p>
              </div>
            ) : (
              <DemoBlob reduced={reduced} />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute bottom-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      {/* options — same grid + card styling as the quiz */}
      <div className="grid grid-cols-1 gap-4 *:h-20 sm:grid-cols-2 md:*:min-h-30">
        {cells.map((opt, i) => {
          const isCorrect = i === q.correct;
          const picked = phase !== "idle" && isCorrect;
          const graded = phase === "graded" && isCorrect;
          const audioOption = q.kind === "poem-audio";
          const state = graded
            ? "border-green-500 bg-green-500/10"
            : picked
              ? "border-primary border-3 bg-primary/30"
              : "border-border";
          return (
            <div
              key={i}
              className={`relative z-20 flex h-full w-full cursor-pointer items-center gap-x-3 rounded-xl border-2 bg-card transition-all duration-300 ${
                audioOption ? "justify-start p-2 sm:p-4" : "justify-center px-3 py-6"
              } ${state}`}
            >
              {/* corner badges — identical to the quiz */}
              {picked && !graded && (
                <div className="absolute left-3 top-3 z-20 size-2 rounded-full bg-primary" />
              )}
              {graded && (
                <div className="absolute left-3 top-3 z-20 flex size-5 items-center justify-center rounded-full bg-green-500 text-white sm:size-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3 sm:size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              )}

              {audioOption ? (
                <OptionWaveform seed={i} />
              ) : (
                <span
                  className={`w-full text-center leading-relaxed ${
                    q.kind === "audio-poem" ? "text-sm sm:text-base" : "text-sm font-semibold sm:text-base"
                  } text-foreground`}
                >
                  {opt as string}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The quiz's organic audio blob, drawn in its calm idle state (no audio). */
function DemoBlob({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const SIZE = 260;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const INNER_R = 70;
    const POINTS = 72;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const draw = (phase: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const base = INNER_R;
      const pts: [number, number][] = [];
      for (let i = 0; i < POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2 - Math.PI / 2;
        const wave = Math.sin(i * 0.6 + phase) * 0.5 + Math.sin(i * 0.23 - phase * 0.7) * 0.5;
        const wobble = 0.18 * wave;
        const h = base + wobble * 48;
        pts.push([cx + Math.cos(angle) * h, cy + Math.sin(angle) * h]);
      }
      ctx.beginPath();
      ctx.moveTo((pts[POINTS - 1][0] + pts[0][0]) / 2, (pts[POINTS - 1][1] + pts[0][1]) / 2);
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
    };

    if (reduced) {
      draw(0);
      return;
    }
    const loop = () => {
      phaseRef.current += 0.015;
      draw(phaseRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  return (
    <div className="relative size-32">
      <canvas
        ref={canvasRef}
        width={260}
        height={260}
        className="pointer-events-none absolute left-1/2 top-1/2 size-[210px] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
      <div className="absolute left-1/2 top-1/2 flex size-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-border bg-card text-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-6">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
          />
        </svg>
      </div>
    </div>
  );
}

/** A faux WaveSurfer waveform (play button + bars) for the poem→audio options. */
function OptionWaveform({ seed }: { seed: number }) {
  const bars = Array.from({ length: 34 }, (_, i) => {
    const h = 18 + Math.abs(Math.sin(i * 1.7 + seed * 2.3)) * 74 + ((i * 7 + seed * 13) % 16);
    return Math.min(100, h);
  });
  return (
    <>
      <div className="flex h-10 w-full items-center gap-[2px] overflow-hidden">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-[#64748b]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-8">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
          />
        </svg>
      </div>
    </>
  );
}
