"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { vocabImageUrl } from "@/lib/vocab-image";

/** Self-playing preview of the واژه‌یاب game's CHALLENGE mode for the homepage:
 *  a picture with a ticking countdown ring and two words — the timer runs, the
 *  correct word lights up green, then the next picture comes in, and it loops.
 *  Everything sits in one fixed-height card so the page never reflows. Purely
 *  decorative; no real game logic. Pauses off-screen, honors reduced-motion. */

type Round = { src: string; options: string[]; correctIndex: number };

const ROUNDS: Round[] = [
  {
    src: "https://raw.githubusercontent.com/ramtin1111/testPics/main/تیمار.webp",
    options: ["اورنگ", "تیمار"],
    correctIndex: 1,
  },
  {
    src: "https://raw.githubusercontent.com/ramtin1111/testPics/main/داد.webp",
    options: ["ننگ", "داد"],
    correctIndex: 1,
  },
  {
    src: "https://raw.githubusercontent.com/ramtin1111/testPics/main/غبطه.webp",
    options: ["آرزو", "غبطه"],
    correctIndex: 1,
  },
];

const R = 34;
const C = 2 * Math.PI * R;
const faNum = (n: number) => n.toLocaleString("fa-IR");

export default function VocabChallengeDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);

  const [round, setRound] = useState(0);
  const [num, setNum] = useState(5);
  const [answered, setAnswered] = useState(false);
  /** تصویرهایی که بارگذاری نشدند — به‌ازای اندیسِ راند. */
  const [brokenImages, setBrokenImages] = useState<Record<number, true>>({});

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
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRound(0);
      setNum(3);
      setAnswered(true);
      return;
    }
    if (!active) return;

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    (async () => {
      let i = 0;
      while (!cancelled) {
        setRound(i);
        setAnswered(false);
        setNum(5);
        await sleep(650);
        if (cancelled) return;
        setNum(4);
        await sleep(650);
        if (cancelled) return;
        setNum(3);
        await sleep(550);
        if (cancelled) return;
        setAnswered(true); // correct word lights up
        await sleep(1500);
        if (cancelled) return;
        i = (i + 1) % ROUNDS.length;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, reduced]);

  const r = ROUNDS[round];

  return (
    <div
      ref={rootRef}
      aria-hidden
      dir="rtl"
      className="mx-auto w-full max-w-sm"
    >
      <div className="glass relative z-20 rounded-3xl bg-card! p-5 sm:p-6">
        {/* progress dots */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {ROUNDS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < round
                  ? "w-5 bg-primary"
                  : i === round
                    ? "w-5 bg-gold"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* countdown ring */}
        <div className="mb-4 flex items-center justify-center">
          <div className="relative size-16 text-primary">
            <svg viewBox="0 0 80 80" className="size-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.15}
                strokeWidth="7"
              />
              <motion.circle
                key={round}
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={
                  reduced
                    ? { strokeDashoffset: C * 0.62 }
                    : { strokeDashoffset: 0 }
                }
                animate={{ strokeDashoffset: C * 0.62 }}
                transition={{ duration: reduced ? 0 : 1.85, ease: "linear" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-primary">
              {faNum(num)}
            </span>
          </div>
        </div>

        {/* picture */}
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={reduced ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`relative mx-auto flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-3xl border-2 bg-gradient-to-br from-primary/10 to-gold/10 transition-colors ${
              answered ? "border-green-500" : "border-border"
            }`}
          >
            {/* ⚠️ دو تغییر، هر دو به یک دلیل: این کارت روی صفحهٔ اصلی است و
                اولین چیزی است که یک بازدیدکنندهٔ تازه می‌بیند.

                ۱) آدرس از `vocabImageUrl` می‌گذرد. تنها جای سایت بود که
                   مستقیم به raw.githubusercontent.com وصل می‌شد — یعنی
                   صفحهٔ اصلی به یک مخزنِ شخصیِ شخصِ دیگری بند بود، تصویر
                   بی‌واترمارک می‌آمد، و IP هر بازدیدکننده به گیت‌هاب می‌رفت.
                   بقیهٔ سایت (بازی، پنل، نشان‌شده‌ها) همه از همین helper
                   استفاده می‌کنند.

                ۲) اگر باز هم نیامد، به‌جای آیکونِ عکسِ شکسته یک جای‌گزینِ
                   آرام نشان داده می‌شود. کارت ارتفاع ثابت دارد، پس چیدمان
                   تکان نمی‌خورد. */}
            {brokenImages[round] ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="size-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"
                  />
                </svg>
                <span className="text-xs">تصویر در دسترس نیست</span>
              </div>
            ) : (
              <img
                src={vocabImageUrl(r.src)}
                alt="تصویر واژه"
                loading="lazy"
                decoding="async"
                onError={() => setBrokenImages((b) => ({ ...b, [round]: true }))}
                className="size-full object-cover"
              />
            )}
            <AnimatePresence>
              {answered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-green-500/20 text-5xl"
                >
                  ✓
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <p className="mt-4 text-center text-xs text-muted-foreground sm:text-sm">
          کدام واژه به این تصویر می‌خورد؟
        </p>

        {/* two options */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {r.options.map((opt, i) => {
            const isCorrect = i === r.correctIndex;
            const cls =
              answered && isCorrect
                ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                : "border-border bg-secondary text-foreground";
            return (
              <div
                key={i}
                className={`flex min-h-14 items-center justify-center rounded-2xl border-2 px-3 text-lg font-black transition-all duration-300 ${cls}`}
              >
                {opt}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
