"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  VOCAB_GRADES,
  buildVocabRound,
  playableWords,
  type VocabGrade,
  type VocabLesson,
  type VocabQuestion,
  type VocabWord,
} from "@/lib/vocab-data";
import { fetchGradePicturedWords, logVocabAnswer, type GradeWord } from "@/lib/vocab-db";
import { vocabImageUrl } from "@/lib/vocab-image";
import { supabase } from "@/lib/supabase";
import VocabChallenge from "./VocabChallenge";
import MeaningModal from "./MeaningModal";

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
  const [words, setWords] = useState<VocabWord[]>([]);

  const [gradeWords, setGradeWords] = useState<GradeWord[]>([]); // all pictured words of the grade
  const [pool, setPool] = useState<VocabWord[]>([]); // shared distractor pool (whole grade)
  const [gradeLoading, setGradeLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  const correctAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // one-time read of best scores + sound setup + current user on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(loadBest());
    correctAudio.current = new Audio("/currectsound.mp3");
    correctAudio.current.volume = 0.5;
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  const selectGrade = (g: VocabGrade) => {
    setGrade(g);
    setScreen("lesson");
    setGradeWords([]);
    setPool([]);
    setGradeLoading(true);
    fetchGradePicturedWords(g.id).then((gw) => {
      setGradeWords(gw);
      setPool(gw.map((x) => x.word));
      setGradeLoading(false);
    });
  };

  const selectLesson = (l: VocabLesson) => {
    if (l.free || !grade) return;
    const answers = gradeWords.filter((g) => g.lesson === l.number).map((g) => g.word);
    // a lesson is playable with even 1 pictured word, as long as the whole
    // grade has at least 3 (so we can always build 3 options)
    if (answers.length < 1 || pool.length < 3) return;
    setLesson(l);
    setWords(answers);
    setScreen("mode");
  };

  const startLesson = () => {
    const round = buildVocabRound(words, pool);
    if (round.length === 0) return;
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
    if (answered || !q) return;
    setPicked(id);
    const correct = id === q.answer.id;
    if (correct) {
      setScore((s) => s + 1);
      correctAudio.current?.play().catch(() => {});
    }
    if (userId && grade && lesson) {
      logVocabAnswer(userId, {
        grade: grade.id,
        lesson: lesson.number,
        word: q.answer.word,
        meaning: q.answer.meaning,
        image: q.answer.image,
        isCorrect: correct,
      });
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
          {VOCAB_GRADES.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => selectGrade(g)}
              className="group glass relative z-20 overflow-hidden rounded-2xl p-6 text-center transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-black text-primary">
                {(i + 1).toLocaleString("fa-IR")}
              </div>
              <h3 className="text-xl font-bold">پایهٔ {g.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">فارسی — ۱۸ درس</p>
            </motion.button>
          ))}
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
            const count = gradeWords.filter((g) => g.lesson === l.number).length;
            const ready = !l.free && count >= 1 && pool.length >= 3;
            const b = best[`${grade.id}:${l.id}`];
            return (
              <button
                key={l.id}
                disabled={l.free || (!ready && !gradeLoading)}
                onClick={() => selectLesson(l)}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-5 text-right transition-all ${
                  ready
                    ? "border-border bg-card hover:border-primary/50 active:scale-[0.99]"
                    : "cursor-not-allowed border-border bg-muted/40 opacity-60"
                }`}
              >
                <div>
                  <h3 className="font-bold">{l.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {l.free
                      ? "درسِ آزاد"
                      : gradeLoading
                        ? "…"
                        : ready
                          ? `${count.toLocaleString("fa-IR")} واژه`
                          : "به‌زودی"}
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
    const count = playableWords(words).length;
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
            onClick={startLesson}
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
    return (
      <VocabChallenge
        grade={grade}
        lesson={lesson}
        words={words}
        pool={pool}
        userId={userId}
        onExit={() => setScreen("mode")}
      />
    );
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
              onClick={startLesson}
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
          <img src={vocabImageUrl(q.answer.image)} alt="" className="absolute inset-0 size-full object-cover" />
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
          continueLabel={qi + 1 >= questions.length ? "دیدن نتیجه" : "ادامه"}
          onContinue={next}
        />
      </div>
    );
  }

  return null;
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
