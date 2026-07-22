"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  buildChallenge,
  type ChallengeStep as Step,
  type VocabGrade,
  type VocabLesson,
  type VocabWord,
} from "@/lib/vocab-data";
import { logVocabAnswer } from "@/lib/vocab-db";
import { vocabImageUrl } from "@/lib/vocab-image";
import MeaningModal from "./MeaningModal";

const ROUND_MS = 7000; // time per image
const BEST_KEY = "vocab-challenge-best";

type Phase = "ready" | "playing" | "won";
type Flash = null | "correct" | "wrong";
type ReviewStatus = "correct" | "wrong" | "timeout";

// ---- tiny sound engine (no asset files needed for the ticks) ----
type SoundKit = {
  unlock: () => void;
  tick: (urgent: boolean) => void;
  success: () => void;
  fail: () => void;
};

function makeSoundKit(): SoundKit {
  let ctx: AudioContext | null = null;
  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const success = new Audio("/currectsound.mp3");
  success.volume = 0.55;

  const beep = (freq: number, peak: number, dur: number, type: OscillatorType = "sine") => {
    const c = ensure();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, c.currentTime + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  };

  return {
    unlock: () => ensure(),
    tick: (urgent) => beep(urgent ? 900 : 540, urgent ? 0.16 : 0.09, urgent ? 0.11 : 0.08),
    success: () => {
      try {
        success.currentTime = 0;
        void success.play();
      } catch {}
    },
    fail: () => {
      const c = ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(320, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.42);
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.47);
    },
  };
}

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function VocabChallenge({
  grade,
  lesson,
  words,
  pool,
  userId,
  onExit,
}: {
  grade: VocabGrade;
  lesson: VocabLesson;
  words: VocabWord[];
  pool: VocabWord[];
  userId: string | null;
  onExit: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>(() => buildChallenge(words, pool));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [remaining, setRemaining] = useState(ROUND_MS);
  const [flash, setFlash] = useState<Flash>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewStatus | null>(null); // open modal after each answer
  const [reached, setReached] = useState(0); // words cleared in the run so far
  const [best, setBest] = useState(0);

  const total = steps.length;
  const bestKey = `${grade.id}:${lesson.id}`;

  const soundRef = useRef<SoundKit | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const lastTickSec = useRef(0);
  const idxRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const busyRef = useRef(false); // true while a review modal is open / resolving

  useEffect(() => {
    soundRef.current = makeSoundKit();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(loadBest()[bestKey] ?? 0);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bestKey]);

  const saveBest = useCallback(
    (value: number) => {
      setBest((prev) => {
        const nb = Math.max(prev, value);
        try {
          const all = loadBest();
          all[bestKey] = Math.max(all[bestKey] ?? 0, value);
          localStorage.setItem(BEST_KEY, JSON.stringify(all));
        } catch {}
        return nb;
      });
    },
    [bestKey],
  );

  // keep the latest steps reachable from the rAF loop without stale closures
  const stepsRef = useRef<Step[]>(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const logAnswer = useCallback(
    (step: Step | undefined, isCorrect: boolean) => {
      if (!userId || !step) return;
      logVocabAnswer(userId, {
        grade: grade.id,
        lesson: lesson.number,
        word: step.answer.word,
        meaning: step.answer.meaning,
        image: step.answer.image,
        isCorrect,
      });
    },
    [userId, grade.id, lesson.number],
  );

  const stopTimer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startRound = useCallback(() => {
    stopTimer();
    startRef.current = performance.now();
    lastTickSec.current = Math.ceil(ROUND_MS / 1000);
    setRemaining(ROUND_MS);
    const loop = (now: number) => {
      const rem = Math.max(0, ROUND_MS - (now - startRef.current));
      setRemaining(rem);
      const sec = Math.ceil(rem / 1000);
      if (sec < lastTickSec.current && sec > 0) {
        lastTickSec.current = sec;
        soundRef.current?.tick(sec <= 3);
      }
      if (rem <= 0) {
        // ran out of time — teach the word, then it's back to the start
        soundRef.current?.fail();
        busyRef.current = true;
        setFlash("wrong");
        saveBest(idxRef.current);
        setReached(idxRef.current);
        logAnswer(stepsRef.current[idxRef.current], false);
        setReview("timeout");
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [saveBest, logAnswer]);

  const beginRun = useCallback(() => {
    soundRef.current?.unlock();
    const fresh = buildChallenge(words, pool);
    setSteps(fresh);
    stepsRef.current = fresh;
    idxRef.current = 0;
    setIdx(0);
    setFlash(null);
    setWrongId(null);
    setReview(null);
    busyRef.current = false;
    phaseRef.current = "playing";
    setPhase("playing");
    startRound();
  }, [words, pool, startRound]);

  const pick = (id: string) => {
    if (phaseRef.current !== "playing" || busyRef.current) return;
    stopTimer();
    busyRef.current = true;
    const curStep = steps[idxRef.current];
    if (id === curStep.answer.id) {
      soundRef.current?.success();
      logAnswer(curStep, true);
      setFlash("correct");
      setTimeout(() => setReview("correct"), 450);
    } else {
      soundRef.current?.fail();
      logAnswer(curStep, false);
      setFlash("wrong");
      setWrongId(id);
      saveBest(idxRef.current);
      setReached(idxRef.current);
      setTimeout(() => setReview("wrong"), 650);
    }
  };

  // modal "ادامه" after a correct answer → next word, or win on the last one
  const continueAfterCorrect = () => {
    setReview(null);
    setFlash(null);
    setWrongId(null);
    busyRef.current = false;
    const nextIdx = idxRef.current + 1;
    if (nextIdx >= steps.length) {
      saveBest(steps.length);
      setReached(steps.length);
      phaseRef.current = "won";
      setPhase("won");
      return;
    }
    idxRef.current = nextIdx;
    setIdx(nextIdx);
    startRound();
  };

  const cur = steps[idx];
  const secondsLeft = Math.ceil(remaining / 1000);
  const frac = remaining / ROUND_MS;

  // ---------- ready ----------
  if (phase === "ready") {
    return (
      <Shell title="حالتِ چالش" subtitle={`${lesson.title} — پایهٔ ${grade.title}`} onBack={onExit}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass relative z-20 mx-auto max-w-md rounded-3xl p-7 text-center"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/15 text-3xl">
            ⏱️
          </div>
          <h3 className="text-lg font-bold">قانون‌ها</h3>
          <ul className="mx-auto mt-3 max-w-xs space-y-2 text-right text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span> برای هر تصویر فقط <b className="text-foreground">۷ ثانیه</b> وقت داری.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span> دو واژه پیشِ روی توست؛ درست را بزن و معنی‌اش را ببین.
            </li>
            <li className="flex gap-2">
              <span className="text-destructive">•</span> یک اشتباه یا تمام‌شدن وقت = <b className="text-foreground">از اول</b>!
            </li>
            <li className="flex gap-2">
              <span className="text-gold">•</span> باید هر {total.toLocaleString("fa-IR")} واژه را پشت‌سرِهم و بی‌غلط بزنی.
            </li>
          </ul>
          {best > 0 && (
            <p className="mt-4 rounded-full bg-gold/15 px-3 py-1.5 text-sm font-bold text-gold">
              رکورد تو: {best.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}
            </p>
          )}
          <button
            onClick={beginRun}
            className="mt-5 min-h-12 w-full rounded-2xl bg-primary text-lg font-black text-primary-foreground transition-all hover:brightness-90 active:scale-95"
          >
            شروعِ چالش
          </button>
        </motion.div>
      </Shell>
    );
  }

  // ---------- won ----------
  if (phase === "won") {
    return (
      <Shell title="بی‌نقص!" onBack={onExit}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass relative z-20 mx-auto max-w-md rounded-3xl p-8 text-center"
        >
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gold/15 text-4xl">🏆</div>
          <p className="text-sm text-muted-foreground">همهٔ واژه‌ها را بی‌غلط زدی</p>
          <p className="my-1 text-4xl font-black text-gold">
            {total.toLocaleString("fa-IR")}/{total.toLocaleString("fa-IR")}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={beginRun}
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
            >
              دوباره
            </button>
            <button
              onClick={onExit}
              className="rounded-xl border border-border bg-card px-6 py-2.5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              بازگشت
            </button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ---------- playing ----------
  const ringColor = frac > 0.5 ? "text-primary" : frac > 0.28 ? "text-gold" : "text-destructive";
  const R = 34;
  const C = 2 * Math.PI * R;

  const reviewCorrect = review === "correct";
  const isLastWord = idx + 1 >= steps.length;
  const others = cur ? cur.options.filter((o) => o.id !== cur.answer.id) : [];

  return (
    <div dir="rtl" className="container mx-auto my-6 max-w-xl">
      {/* top bar: exit + progress dots */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={onExit} className="text-sm text-muted-foreground hover:text-primary">
          ← خروج
        </button>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < idx ? "w-5 bg-primary" : i === idx ? "w-5 bg-gold" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* timer ring */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <div className={`relative size-20 ${ringColor}`}>
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="7" />
            <motion.circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              animate={{ strokeDashoffset: C * (1 - frac) }}
              transition={{ duration: 0, ease: "linear" }}
            />
          </svg>
          <motion.span
            key={secondsLeft}
            initial={{ scale: 1.35, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${ringColor}`}
          >
            {secondsLeft.toLocaleString("fa-IR")}
          </motion.span>
        </div>
      </div>

      {/* image */}
      <motion.div
        key={cur.answer.id}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={
          flash === "wrong"
            ? { opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -7, 7, 0] }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={flash === "wrong" ? { duration: 0.4 } : { duration: 0.25 }}
        className={`relative z-20 mx-auto aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 shadow-lg transition-colors ${
          flash === "correct"
            ? "border-green-500"
            : flash === "wrong"
              ? "border-destructive"
              : "border-border"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={vocabImageUrl(cur.answer.image)} alt="" className="absolute inset-0 size-full object-cover" />
        <AnimatePresence>
          {flash === "correct" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-green-500/25 text-6xl"
            >
              ✓
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <p className="mt-4 text-center text-sm text-muted-foreground">کدام واژه به این تصویر می‌خورد؟</p>

      {/* two options: right + left */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {cur.options.map((o) => {
          const isAnswer = o.id === cur.answer.id;
          const showState = flash !== null;
          const cls = !showState
            ? "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
            : isAnswer
              ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
              : o.id === wrongId
                ? "border-destructive bg-destructive/15 text-destructive"
                : "border-border bg-card opacity-50";
          return (
            <button
              key={o.id}
              disabled={showState}
              onClick={() => pick(o.id)}
              className={`min-h-16 rounded-2xl border-2 px-3 text-xl font-black transition-all ${cls}`}
            >
              {o.word}
            </button>
          );
        })}
      </div>

      {/* learning modal — appears after every answer, right or wrong */}
      {cur && (
        <MeaningModal
          open={review !== null}
          isCorrect={reviewCorrect}
          answer={cur.answer}
          others={others}
          dismissable={reviewCorrect}
          headline={review === "timeout" ? "وقت تمام شد!" : review === "wrong" ? "اشتباه بود!" : undefined}
          note={
            reviewCorrect ? undefined : (
              <div className="rounded-2xl border border-border bg-background/60 p-3 text-center text-sm text-muted-foreground">
                تا واژهٔ <b className="text-foreground">{reached.toLocaleString("fa-IR")}</b> رسیدی · رکورد تو:{" "}
                <b className="text-gold">{best.toLocaleString("fa-IR")}</b> از {total.toLocaleString("fa-IR")}
              </div>
            )
          }
          continueLabel={reviewCorrect ? (isLastWord ? "دیدن نتیجه" : "ادامه") : "از اول"}
          onContinue={reviewCorrect ? continueAfterCorrect : beginRun}
          secondaryLabel={reviewCorrect ? undefined : "بازگشت"}
          onSecondary={reviewCorrect ? undefined : onExit}
        />
      )}
    </div>
  );
}

function Shell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="container mx-auto my-8 max-w-2xl sm:my-12">
      <div className="mb-6 text-center">
        {onBack && (
          <button onClick={onBack} className="float-right text-sm text-muted-foreground hover:text-primary">
            ← بازگشت
          </button>
        )}
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
