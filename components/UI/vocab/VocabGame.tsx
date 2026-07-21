"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  VOCAB_GRADES,
  buildVocabRound,
  playableWords,
  type VocabGrade,
  type VocabLesson,
  type VocabQuestion,
  type VocabWord,
} from "@/lib/vocab-data";
import VocabChallenge from "./VocabChallenge";

type Screen = "grade" | "lesson" | "mode" | "quiz" | "result" | "challenge";
const BEST_KEY = "vocab-best";

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function VocabGame() {
  const [screen, setScreen] = useState<Screen>("grade");
  const [grade, setGrade] = useState<VocabGrade | null>(null);
  const [lesson, setLesson] = useState<VocabLesson | null>(null);

  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  const correctAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // one-time read of best scores + sound setup from the browser on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(loadBest());
    correctAudio.current = new Audio("/currectsound.mp3");
    correctAudio.current.volume = 0.5;
  }, []);

  const startLesson = (l: VocabLesson) => {
    const round = buildVocabRound(l);
    if (round.length === 0) return;
    setLesson(l);
    setQuestions(round);
    setQi(0);
    setPicked(null);
    setScore(0);
    setScreen("quiz");
  };

  const q = questions[qi];
  const answered = picked !== null;
  const isCorrect = answered && picked === q?.answer.id;
  const bestKey = grade && lesson ? `${grade.id}:${lesson.id}` : "";

  const pick = (id: string) => {
    if (answered) return;
    setPicked(id);
    if (id === q.answer.id) {
      setScore((s) => s + 1);
      correctAudio.current?.play().catch(() => {});
    }
  };

  const next = () => {
    if (qi + 1 >= questions.length) {
      // persist best score for this lesson
      const finalScore = score;
      const nextBest = { ...best, [bestKey]: Math.max(best[bestKey] ?? 0, finalScore) };
      setBest(nextBest);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
      } catch {}
      setScreen("result");
      return;
    }
    setQi((i) => i + 1);
    setPicked(null);
  };

  // ---------- grade select ----------
  if (screen === "grade") {
    return (
      <Shell title="واژه‌یاب" subtitle="پایه‌ات را انتخاب کن تا واژگانِ درس‌ها را با تصویر یاد بگیری.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VOCAB_GRADES.map((g, i) => {
            const total = g.lessons.reduce((s, l) => s + (playableWords(l).length >= 3 ? 1 : 0), 0);
            return (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => {
                  setGrade(g);
                  setScreen("lesson");
                }}
                className="group glass relative z-20 overflow-hidden rounded-2xl p-6 text-center transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-black text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </div>
                <h3 className="text-xl font-bold">پایهٔ {g.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {total > 0 ? `${total.toLocaleString("fa-IR")} درس آماده` : "به‌زودی"}
                </p>
              </motion.button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ---------- lesson select ----------
  if (screen === "lesson" && grade) {
    return (
      <Shell
        title={`پایهٔ ${grade.title}`}
        subtitle="درسی را انتخاب کن."
        onBack={() => setScreen("grade")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {grade.lessons.map((l) => {
            const count = playableWords(l).length;
            const ready = count >= 3;
            const b = best[`${grade.id}:${l.id}`];
            return (
              <button
                key={l.id}
                disabled={!ready}
                onClick={() => {
                  setLesson(l);
                  setScreen("mode");
                }}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-5 text-right transition-all ${
                  ready
                    ? "border-border bg-card hover:border-primary/50 active:scale-[0.99]"
                    : "cursor-not-allowed border-border bg-muted/40 opacity-60"
                }`}
              >
                <div>
                  <h3 className="font-bold">{l.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ready ? `${count.toLocaleString("fa-IR")} واژه` : "به‌زودی"}
                  </p>
                </div>
                {ready && b != null && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                    بهترین: {b.toLocaleString("fa-IR")}/{count.toLocaleString("fa-IR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ---------- mode select ----------
  if (screen === "mode" && grade && lesson) {
    const count = playableWords(lesson).length;
    return (
      <Shell
        title={lesson.title}
        subtitle="چطور می‌خواهی این درس را تمرین کنی؟"
        onBack={() => setScreen("lesson")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => startLesson(lesson)}
            className="glass group relative z-20 overflow-hidden rounded-3xl p-6 text-right transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-3xl">📖</div>
            <h3 className="text-lg font-black text-primary">حالتِ یادگیری</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              بدون عجله. یک تصویر و سه واژه؛ بعد از هر پاسخ، معنی کاملِ واژه‌ها را می‌بینی و یاد می‌گیری.
            </p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            onClick={() => setScreen("challenge")}
            className="glass group relative z-20 overflow-hidden rounded-3xl p-6 text-right transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-3xl">⏱️</div>
            <h3 className="text-lg font-black text-destructive">حالتِ چالش</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              هر تصویر ۷ ثانیه! دو واژه، صدای تیک‌تیک و مسابقه با زمان. یک اشتباه = از اول. باید هر{" "}
              {count.toLocaleString("fa-IR")} واژه را بی‌غلط بزنی.
            </p>
          </motion.button>
        </div>
      </Shell>
    );
  }

  // ---------- challenge ----------
  if (screen === "challenge" && grade && lesson) {
    return <VocabChallenge grade={grade} lesson={lesson} onExit={() => setScreen("mode")} />;
  }

  // ---------- result ----------
  if (screen === "result" && lesson) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    return (
      <Shell title="پایانِ درس" onBack={() => setScreen("lesson")}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass relative z-20 mx-auto max-w-md rounded-3xl p-8 text-center"
        >
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-primary/15 text-4xl">
            {pct >= 80 ? "🌟" : pct >= 50 ? "👏" : "💪"}
          </div>
          <p className="text-sm text-muted-foreground">امتیاز این دور</p>
          <p className="my-1 text-4xl font-black text-primary">
            {score.toLocaleString("fa-IR")}
            <span className="text-2xl text-muted-foreground">/{total.toLocaleString("fa-IR")}</span>
          </p>
          <p className="text-sm text-muted-foreground">{pct.toLocaleString("fa-IR")}٪ درست</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => startLesson(lesson)}
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
            >
              دوباره
            </button>
            <button
              onClick={() => setScreen("lesson")}
              className="rounded-xl border border-border bg-card px-6 py-2.5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              درسِ دیگر
            </button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ---------- quiz ----------
  if (screen === "quiz" && q && lesson) {
    return (
      <div dir="rtl" className="container mx-auto my-6 max-w-xl">
        {/* top bar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => setScreen("lesson")} className="text-sm text-muted-foreground hover:text-primary">
            ← درس‌ها
          </button>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {(qi + 1).toLocaleString("fa-IR")} / {questions.length.toLocaleString("fa-IR")}
          </span>
        </div>
        {/* progress */}
        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((qi + (answered ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>

        {/* image */}
        <motion.div
          key={q.answer.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 mx-auto aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={q.answer.image} alt="" className="absolute inset-0 size-full object-cover" />
        </motion.div>

        <p className="mt-5 text-center text-sm text-muted-foreground">این تصویر، کدام واژه است؟</p>

        {/* options */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {q.options.map((o) => {
            const state = !answered
              ? "idle"
              : o.id === q.answer.id
                ? "correct"
                : o.id === picked
                  ? "wrong"
                  : "dim";
            return (
              <button
                key={o.id}
                disabled={answered}
                onClick={() => pick(o.id)}
                className={`min-h-14 rounded-2xl border-2 px-3 text-lg font-bold transition-all ${
                  state === "idle"
                    ? "border-border bg-card hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                    : state === "correct"
                      ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                      : state === "wrong"
                        ? "border-destructive bg-destructive/15 text-destructive"
                        : "border-border bg-card opacity-50"
                }`}
              >
                {o.word}
              </button>
            );
          })}
        </div>

        {/* learning modal — the heart of the game: see the word & its full meaning */}
        <MeaningModal
          open={answered}
          isCorrect={!!isCorrect}
          answer={q.answer}
          others={q.options.filter((o) => o.id !== q.answer.id)}
          isLast={qi + 1 >= questions.length}
          onContinue={next}
        />
      </div>
    );
  }

  return null;
}

function MeaningModal({
  open,
  isCorrect,
  answer,
  others,
  isLast,
  onContinue,
}: {
  open: boolean;
  isCorrect: boolean;
  answer: VocabWord;
  others: VocabWord[];
  isLast: boolean;
  onContinue: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
          onClick={onContinue}
        >
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            {/* status ribbon */}
            <div
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold ${
                isCorrect
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-current/20 text-base">
                {isCorrect ? "✓" : "✗"}
              </span>
              {isCorrect ? "آفرین! درست بود" : "اشکالی ندارد، یاد بگیر"}
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* the word */}
              <div className="flex items-start gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={answer.image} alt="" className="absolute inset-0 size-full object-cover" />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-xs text-muted-foreground">واژه</p>
                  <h3 className="text-3xl font-black text-primary">{answer.word}</h3>
                </div>
              </div>

              {/* the meaning — the focus */}
              <div className="mt-4 rounded-2xl bg-primary/5 p-4">
                <p className="mb-1 text-xs font-semibold text-primary">معنی</p>
                <p className="text-lg leading-relaxed text-foreground">{answer.meaning}</p>
              </div>

              {/* the other options, so nothing is left unlearned */}
              {others.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">واژه‌های دیگرِ این پرسش</p>
                  <div className="space-y-2">
                    {others.map((o) => (
                      <div key={o.id} className="rounded-xl border border-border bg-background/60 p-3">
                        <span className="font-bold text-foreground">{o.word}:</span>{" "}
                        <span className="text-sm text-muted-foreground">{o.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              <button
                onClick={onContinue}
                className="min-h-12 w-full rounded-2xl bg-primary text-lg font-black text-primary-foreground transition-all hover:brightness-90 active:scale-95"
              >
                {isLast ? "دیدن نتیجه" : "ادامه"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
