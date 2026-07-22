"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Self-playing preview of the عروض سماعی quiz for the homepage. Cycles through
 *  its three question shapes — hear a rhythm → pick the meter, hear a rhythm →
 *  pick the verse, and read a verse → pick its rhythm (audio) — revealing the
 *  correct option each time, then looping. One fixed-height card so the page
 *  never reflows. Decorative only; no audio or real quiz logic. Pauses
 *  off-screen and honors prefers-reduced-motion. */

type Question =
  | { kind: "audio-weight"; prompt: string; options: string[]; correct: number }
  | { kind: "audio-poem"; prompt: string; options: string[]; correct: number }
  | { kind: "poem-audio"; prompt: string; bayt: [string, string]; correct: number };

const QUESTIONS: Question[] = [
  {
    kind: "audio-weight",
    prompt: "کدام وزن با ریتمِ پخش‌شده مطابقت دارد؟",
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
    prompt: "وزنِ عروضیِ این بیت کدام است؟",
    bayt: ["یار بارافتاده را در کاروان بگذاشتند", "بی‌وفا یاران که بربستند بارِ خویش را"],
    correct: 2,
  },
  {
    kind: "audio-poem",
    prompt: "کدام بیت با ریتمِ پخش‌شده مطابقت دارد؟",
    options: [
      "همای اوجِ سعادت به دامِ ما افتد",
      "دل من رایِ تو دارد سرِ سودای تو دارد",
      "چه دانستم که این سودا مرا زین‌سان کند مجنون",
      "به سعیِ خود نتوان برد پی به گوهرِ مقصود",
    ],
    correct: 0,
  },
];

export default function OrouzDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);

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
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQi(0);
      setRevealed(true);
      return;
    }
    if (!active) return;
    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      let i = 0;
      while (!cancelled) {
        setQi(i);
        setRevealed(false);
        await sleep(1600);
        if (cancelled) return;
        setRevealed(true);
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

  return (
    <div ref={rootRef} aria-hidden dir="rtl" className="mx-auto w-full max-w-xl">
      <div className="glass relative z-20 rounded-3xl bg-card! p-4 sm:p-6">
        {/* progress dots */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === qi ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* question card (prompt + audio blob OR bayt) — fixed height */}
        <div className="relative flex h-40 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-secondary/60 px-4 text-center">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-l from-transparent via-gold/50 to-transparent" />
          <AnimatePresence mode="wait">
            <motion.div
              key={qi}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3"
            >
              <p className="text-sm font-medium text-foreground sm:text-base">{q.prompt}</p>
              {q.kind === "poem-audio" ? (
                <div className="text-xs text-muted-foreground sm:text-sm">
                  <p>{q.bayt[0]}</p>
                  <p className="mt-1">{q.bayt[1]}</p>
                </div>
              ) : (
                <PlayBlob reduced={reduced} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* options — fixed 2×2 grid, each cell fixed height */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(q.kind === "poem-audio" ? [0, 1, 2, 3] : q.options).map((opt, i) => {
            const correct = revealed && i === q.correct;
            const base = "flex h-20 items-center rounded-xl border-2 px-3 text-center transition-all duration-300";
            const state = correct
              ? "border-green-500 bg-green-500/10"
              : "border-border bg-card";
            return (
              <div key={i} className={`${base} ${state}`}>
                {q.kind === "poem-audio" ? (
                  <Waveform seed={i} active={correct} reduced={reduced} />
                ) : q.kind === "audio-poem" ? (
                  <span className="line-clamp-2 w-full text-xs leading-relaxed text-foreground sm:text-sm">
                    {opt as string}
                  </span>
                ) : (
                  <span className="w-full text-xs font-semibold text-foreground sm:text-sm">{opt as string}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A calm pulsing "play" disc that stands in for the audio visualiser. */
function PlayBlob({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative flex size-16 items-center justify-center">
      {!reduced &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-primary/40"
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: i * 0.9 }}
          />
        ))}
      <motion.span
        className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary shadow-[0_0_18px_-4px_var(--color-primary)]"
        animate={reduced ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="ms-0.5 size-6">
          <path d="M8 5v14l11-7z" />
        </svg>
      </motion.span>
    </div>
  );
}

/** A faux audio waveform (a play caret + bars) for the poem→audio options. */
function Waveform({ seed, active, reduced }: { seed: number; active: boolean; reduced: boolean }) {
  const bars = Array.from({ length: 22 }, (_, i) => {
    const h = 20 + Math.abs(Math.sin(i * 1.7 + seed * 2.3)) * 70 + ((i * 7 + seed * 13) % 20);
    return Math.min(100, h);
  });
  return (
    <div className="flex w-full items-center gap-2">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
          active ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-primary/15 text-primary"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="ms-0.5 size-3.5">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <div className="flex h-9 flex-1 items-center gap-[2px] overflow-hidden">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] shrink-0 rounded-full ${active ? "bg-green-500/70" : "bg-muted-foreground/40"}`}
            style={{ height: `${reduced ? 45 : h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
