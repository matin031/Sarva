"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** An interactive "rhythm sequencer" that visualizes the long/short syllable
 *  pattern of a Persian meter like a music step-sequencer. A playhead sweeps
 *  across the cells (RTL) in time; long syllables (ساکن) are tall bars, short
 *  ones (متحرک) are dots. Pick a بحر to switch patterns. This replaces the plain
 *  marquee with something on-theme and alive. Pauses off-screen and honors
 *  reduced motion. */

type Rkn = { name: string; sylls: boolean[] }; // true = long (–), false = short (•)
type Bahr = { key: string; name: string; verse: string; poet: string; arkan: Rkn[] };

const L = true;
const S = false;

const BOHUR: Bahr[] = [
  {
    key: "ramal",
    name: "رمل",
    verse: "بشنو این نی چون شکایت می‌کند",
    poet: "مولوی",
    arkan: [
      { name: "فاعلاتن", sylls: [L, S, L, L] },
      { name: "فاعلاتن", sylls: [L, S, L, L] },
      { name: "فاعلن", sylls: [L, S, L] },
    ],
  },
  {
    key: "hazaj",
    name: "هزج",
    verse: "الا ای آهوی وحشی کجایی",
    poet: "حافظ",
    arkan: [
      { name: "مفاعیلن", sylls: [S, L, L, L] },
      { name: "مفاعیلن", sylls: [S, L, L, L] },
      { name: "فعولن", sylls: [S, L, L] },
    ],
  },
  {
    key: "moteghareb",
    name: "متقارب",
    verse: "توانا بود هر که دانا بود",
    poet: "فردوسی",
    arkan: [
      { name: "فعولن", sylls: [S, L, L] },
      { name: "فعولن", sylls: [S, L, L] },
      { name: "فعولن", sylls: [S, L, L] },
      { name: "فَعَل", sylls: [S, L] },
    ],
  },
];

export default function RhythmSequencer({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [bi, setBi] = useState(0);
  const [step, setStep] = useState(0);

  const bahr = BOHUR[bi];
  // flatten to a global step index over all syllables
  const flat = bahr.arkan.flatMap((r, ri) =>
    r.sylls.map((long, si) => ({ ri, si, long })),
  );
  const total = flat.length;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !active) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => (s + 1) % total), 340);
    return () => clearInterval(id);
  }, [reduced, active, total, bi]);

  return (
    <section dir="rtl" className="container relative py-16">
      <div ref={rootRef} className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            ریتمِ وزن
          </span>
          <h2 className="text-2xl font-black text-foreground sm:text-3xl md:text-4xl">
            هر وزن، یک ضرب‌آهنگ است
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            هجاهای بلند و کوتاه، نبضِ شعر را می‌سازند. یک بحر را انتخاب کن و
            ضرب‌آهنگش را ببین.
          </p>
        </div>

        {/* بحر selector */}
        <div className="mb-7 flex flex-wrap items-center justify-center gap-2.5">
          {BOHUR.map((b, i) => (
            <button
              key={b.key}
              onClick={() => setBi(i)}
              className={`rounded-xl border px-5 py-2 text-sm font-bold transition-all ${
                i === bi
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              بحرِ {b.name}
            </button>
          ))}
        </div>

        {/* the sequencer board */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/50 p-5 shadow-2xl backdrop-blur-md sm:p-8">
          <div
            aria-hidden
            className="absolute -right-20 -top-20 size-56 rounded-full bg-primary/15 blur-3xl"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={bahr.key}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="relative"
            >
              {/* example verse */}
              <div className="mb-6 text-center">
                <p className="text-lg font-bold text-foreground sm:text-xl md:text-2xl">
                  {bahr.verse}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">— {bahr.poet}</p>
              </div>

              {/* arkan groups */}
              <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-5">
                {bahr.arkan.map((r, ri) => (
                  <div key={ri} className="flex flex-col items-center gap-3">
                    {/* syllable cells */}
                    <div className="flex items-end gap-1.5 sm:gap-2">
                      {r.sylls.map((long, si) => {
                        const idx = flat.findIndex(
                          (f) => f.ri === ri && f.si === si,
                        );
                        const on = !reduced && idx === step;
                        return (
                          <div
                            key={si}
                            className="relative flex flex-col items-center justify-end"
                            style={{ height: 60 }}
                          >
                            <motion.div
                              animate={
                                reduced
                                  ? undefined
                                  : { scale: on ? 1.12 : 1, y: on ? -4 : 0 }
                              }
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                              className={`rounded-full transition-colors duration-150 ${
                                long ? "h-11 w-8 sm:w-9" : "size-5"
                              } ${
                                on
                                  ? "bg-gradient-to-b from-primary to-primary/70 shadow-[0_0_22px_-2px_var(--color-primary)]"
                                  : long
                                    ? "bg-foreground/20"
                                    : "bg-muted-foreground/40"
                              }`}
                            />
                            {/* long/short glyph */}
                            <span
                              className={`mt-1.5 font-mono text-xs ${
                                on ? "text-primary" : "text-muted-foreground/60"
                              }`}
                            >
                              {long ? "–" : "•"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* rkn name */}
                    <div className="rounded-lg bg-background/60 px-3 py-1 text-sm font-bold text-foreground">
                      {r.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* playhead progress track */}
              <div className="mx-auto mt-7 h-1 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
                  animate={{ width: reduced ? "100%" : `${((step + 1) / total) * 100}%` }}
                  transition={{ duration: 0.2, ease: "linear" }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <span className="font-mono text-foreground">–</span> هجای بلند ·{" "}
          <span className="font-mono text-foreground">•</span> هجای کوتاه
        </p>
      </div>
    </section>
  );
}
