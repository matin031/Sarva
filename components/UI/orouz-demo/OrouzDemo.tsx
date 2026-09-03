"use client";

import { useEffect, useRef, useState } from "react";
import {
  useReducedMotion,
  useDocumentVisible,
  useScrolling,
} from "@/lib/perf/use-perf";
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
  | {
      kind: "poem-audio";
      prompt: string;
      bayt: [string, string];
      correct: number;
    };

const QUESTIONS: Question[] = [
  {
    kind: "audio-weight",
    prompt: "کدام وزن با ریتمِ پخش‌ شده مطابقت دارد؟",
    options: [
      "مفاعیلن مفاعیلن فعولن",
      "فاعلاتن فاعلاتن فاعلن",
      "مستفعلن مستفعلن مستفعلن",
      "فعولن فعولن فعولن فعل",
    ],
    correct: 1,
  },
  {
    kind: "poem-audio",
    prompt: "وزن عروضی این بیت کدام است؟",
    bayt: [
      "یار بارافتاده را در کاروان بگذاشتند",
      "بی‌وفا یاران که بربستند بارِ خویش را",
    ],
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
  const reduced = useReducedMotion();
  const docVisible = useDocumentVisible();
  const scrolling = useScrolling();
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  // ⚠️ این همان چیزی است که جا افتاده بود: `active` تنها به چرخهٔ setTimeout
  // می‌رسید و به بومِ DemoBlob نه. اندازه‌گیری نشان داد بومِ دمو در بالای
  // صفحه — سه هزار پیکسل پایین‌تر و کاملاً خارج از دید — بین ۱۰۷ تا ۱۹۸ بار
  // در سه ثانیه رسم می‌شد، یعنی بیشتر از خودِ کره. در تبِ پنهان هم ادامه
  // داشت. حالا هر سه دلیلِ توقف به بوم هم می‌رسند.
  const blobRunning = active && docVisible && !scrolling && !reduced;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // چرخه هم مثل بوم به دیده‌شدنِ سند نیاز دارد: تبِ پنهان یعنی هیچ‌کس
    // نگاه نمی‌کند، پس تایمر هم بی‌مصرف است.
    if (!active || !docVisible) return;
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
  }, [active, docVisible, reduced]);

  // ⚠️ در حالتِ حرکتِ کم، حالت را *مشتق* می‌کنیم نه اینکه در effect بنویسیم:
  // نتیجه از همان رندرِ اول درست است و رندرِ آبشاری هم نمی‌سازد.
  const shownQi = reduced ? 0 : qi;
  const shownPhase: Phase = reduced ? "graded" : phase;

  const q = QUESTIONS[shownQi];
  const cells = q.kind === "poem-audio" ? [0, 1, 2, 3] : q.options;

  return (
    <div
      ref={rootRef}
      aria-hidden
      dir="rtl"
      className="mx-auto w-full max-w-3xl select-none"
    >
      {/* progress bar (like the quiz header) */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${((qi + 1) / QUESTIONS.length) * 100}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      {/* question card — same glass box + gradient edges as the quiz */}
      <div
        className="glass relative z-20 mb-6 flex h-62.5
       flex-col items-center justify-center gap-2 overflow-hidden
        rounded-2xl py-3 text-base xs:p-5 xs:text-lg sm:text-xl
         md:px-8 md:py-5 md:text-2xl"
      >
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
              <DemoBlob running={blobRunning} />
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
          const picked = shownPhase !== "idle" && isCorrect;
          const graded = shownPhase === "graded" && isCorrect;
          const audioOption = q.kind === "poem-audio";
          const state = graded
            ? "border-green-500 bg-green-500/10"
            : picked
              ? "border-primary border-3 bg-primary/30"
              : "border-border";
          return (
            <div
              key={i}
              className={`relative z-20 flex h-full w-full cursor-pointer 
                items-center gap-x-3 rounded-xl border-2 bg-card transition-all duration-300 ${
                  audioOption ? " p-2 sm:p-4" : "justify-center px-3 py-6"
                } ${state}`}
            >
              {/* corner badges — identical to the quiz */}
              {picked && !graded && (
                <div className="absolute left-3 top-3 z-20 size-2 rounded-full bg-primary" />
              )}
              {graded && (
                <div className="absolute left-3 top-3 z-20 flex size-5 items-center justify-center rounded-full bg-green-500 text-white sm:size-6">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="size-3 sm:size-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </div>
              )}

              {audioOption ? (
                <OptionWaveform seed={i} />
              ) : (
                <span
                  className={`w-full text-center leading-relaxed ${
                    q.kind === "audio-poem"
                      ? "text-sm sm:text-base"
                      : "text-sm font-semibold sm:text-base"
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
function DemoBlob({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  /** یک بار ساخته می‌شود و در هر فریم دوباره پر می‌شود — نه از نو ساخته. */
  const ptsRef = useRef<Float32Array | null>(null);

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

    if (!ptsRef.current) ptsRef.current = new Float32Array(POINTS * 2);
    const pts = ptsRef.current;

    // ⚠️ گرادیان و سایه از حلقه بیرون آمدند. createRadialGradient در هر فریم
    // یک شیء تازه می‌ساخت، و shadowBlur=16 روی یک stroke یعنی مرورگر در هر
    // فریم کلِ مسیر را تار می‌کند — گران‌ترین کارِ این بوم. هالهٔ ثابت حالا
    // یک بار روی یک بومِ جدا رسم می‌شود و بعد فقط کپی می‌شود.
    const rg = ctx.createRadialGradient(cx, cy, INNER_R * 0.4, cx, cy, INNER_R + 55);
    rg.addColorStop(0, "rgba(31,209,164,0.05)");
    rg.addColorStop(0.7, "rgba(31,209,164,0.25)");
    rg.addColorStop(1, "rgba(20,150,120,0.45)");

    const glow = document.createElement("canvas");
    glow.width = SIZE;
    glow.height = SIZE;
    const gctx = glow.getContext("2d");
    if (gctx) {
      const halo = gctx.createRadialGradient(cx, cy, INNER_R * 0.6, cx, cy, INNER_R + 34);
      halo.addColorStop(0, "rgba(31,209,164,0)");
      halo.addColorStop(0.62, "rgba(31,209,164,0.20)");
      halo.addColorStop(1, "rgba(31,209,164,0)");
      gctx.fillStyle = halo;
      gctx.fillRect(0, 0, SIZE, SIZE);
    }

    const draw = (phase: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(glow, 0, 0);

      for (let i = 0; i < POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2 - Math.PI / 2;
        const wave =
          Math.sin(i * 0.6 + phase) * 0.5 + Math.sin(i * 0.23 - phase * 0.7) * 0.5;
        const h = INNER_R + 0.18 * wave * 48;
        pts[i * 2] = cx + Math.cos(angle) * h;
        pts[i * 2 + 1] = cy + Math.sin(angle) * h;
      }

      ctx.beginPath();
      ctx.moveTo((pts[(POINTS - 1) * 2] + pts[0]) / 2, (pts[(POINTS - 1) * 2 + 1] + pts[1]) / 2);
      for (let i = 0; i < POINTS; i++) {
        const j = ((i + 1) % POINTS) * 2;
        ctx.quadraticCurveTo(
          pts[i * 2],
          pts[i * 2 + 1],
          (pts[i * 2] + pts[j]) / 2,
          (pts[i * 2 + 1] + pts[j + 1]) / 2,
        );
      }
      ctx.closePath();
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.strokeStyle = "rgba(31,209,164,0.9)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    if (!running) {
      // یک فریمِ ثابت، بعد سکوتِ کامل. هیچ rAF ای باقی نمی‌ماند.
      draw(phaseRef.current);
      return;
    }

    // ۳۰fps کافی است؛ این تپشِ آرام به نرخِ نمایشگر نیازی ندارد.
    const FRAME = 1000 / 30;
    let last = 0;
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (now - last < FRAME) return;
      last = now;
      phaseRef.current += 0.03;
      draw(phaseRef.current);
    };
    // ⚠️ در Strict Mode این effect دوبار اجرا می‌شود. بدون این نگهبان دو
    // حلقهٔ موازی ساخته می‌شد و فقط یکی لغو می‌شد.
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [running]);

  return (
    <div className="relative size-32">
      <canvas
        ref={canvasRef}
        width={260}
        height={260}
        className="pointer-events-none absolute left-1/2 top-1/2 size-[210px] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
      <div className="absolute left-1/2 top-1/2 flex size-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-border bg-card text-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="size-6"
        >
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
    const h =
      18 +
      Math.abs(Math.sin(i * 1.7 + seed * 2.3)) * 74 +
      ((i * 7 + seed * 13) % 16);
    return Math.min(100, h);
  });
  return (
    <>
      <div className="flex h-10 w-full items-center gap-0.5 overflow-hidden">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-0.75 mx-0.5 shrink-0 rounded-full bg-[#64748b]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-8">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="size-3"
        >
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
