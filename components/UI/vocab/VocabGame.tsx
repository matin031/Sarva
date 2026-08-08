"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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
import { fetchGradePicturedWords, type GradeWord } from "@/lib/vocab-db";
import { vocabImageUrl } from "@/lib/vocab-image";
import {
  hasFailed,
  isPreloaded,
  preloadBatch,
  preloadImage,
  resetFailure,
} from "@/lib/vocab-preload";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import VocabChallenge from "./VocabChallenge";
import MeaningModal from "./MeaningModal";
import BookmarkButton from "@/components/UI/BookmarkButton";
import QuestionIndex from "./QuestionIndex";
import PreloadScreen from "./PreloadScreen";

type Screen =
  | "grade"
  | "lesson"
  | "mode"
  | "loading"
  | "quiz"
  | "result"
  | "challenge";
const BEST_KEY = "vocab-best";

/** Pictures warmed before the first question. Enough that play starts on an
 *  already-decoded image without making the reader wait for a whole run. */
const WARMUP = 6;
/** Questions kept warm ahead of the one on screen. */
const LOOKAHEAD = 3;

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
  /** lesson numbers the student picked — a run may mix several lessons */
  const [selected, setSelected] = useState<number[]>([]);
  const [words, setWords] = useState<VocabWord[]>([]);

  const [gradeWords, setGradeWords] = useState<GradeWord[]>([]); // all pictured words of the grade
  const [pool, setPool] = useState<VocabWord[]>([]); // shared distractor pool (whole grade)
  const [gradeLoading, setGradeLoading] = useState(false);
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;

  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [qi, setQi] = useState(0);
  // answer per question index, so navigating back/forward keeps each question's
  // answered state without re-scoring or re-logging
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [best, setBest] = useState<Record<string, number>>({});
  const [indexOpen, setIndexOpen] = useState(false);
  /** Which question's meaning modal is showing. Keyed by index rather than by
   *  "is this answered", because the modal must appear at the moment of
   *  answering — not every time an already-answered question comes back on
   *  screen. Opening it on any answered question made going back impossible:
   *  the modal covered the question and its only exit moved you forward again. */
  const [modalFor, setModalFor] = useState<number | null>(null);
  /** true while walking the round after it finished, from the result screen */
  const [reviewing, setReviewing] = useState(false);

  // warm-up progress, and a token so a cancelled warm-up cannot start a round
  const [warm, setWarm] = useState({ done: 0, total: 0 });
  const runToken = useRef(0);
  /** Whether a picture is decoded is module state in vocab-preload, read during
   *  render. This is the nudge that re-reads it once a picture lands. */
  const [, refreshImages] = useReducer((n: number) => n + 1, 0);

  const correctAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // one-time read of best scores + sound setup + current user on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(loadBest());
    correctAudio.current = new Audio("/currectsound.mp3");
    correctAudio.current.volume = 0.5;
  }, []);

  /** Every screen here replaces the whole view, but the browser keeps the old
   *  scroll offset — so picking a lesson from far down the eighteen-item list
   *  landed on the short mode screen already scrolled past it. Reset on each
   *  change, the way a real navigation would. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen]);

  /** which lesson each word belongs to — a mixed run logs every answer against
   *  the word's own lesson, not the first one selected */
  const lessonOfWord = useMemo(() => {
    const m = new Map<string, number>();
    for (const gw of gradeWords) m.set(gw.word.id, gw.lesson);
    return m;
  }, [gradeWords]);
  const lessonOf = useCallback(
    (wordId: string) => lessonOfWord.get(wordId),
    [lessonOfWord],
  );

  const selectedLessons = useMemo(
    () =>
      grade
        ? grade.lessons.filter((l) => selected.includes(l.number))
        : ([] as VocabLesson[]),
    [grade, selected],
  );

  /** «درس دهم» for one, «۳ درس: ۱۰، ۱۳، ۱۷» for several */
  const selectionLabel = useMemo(() => {
    if (selectedLessons.length === 0) return "";
    if (selectedLessons.length === 1) return selectedLessons[0].title;
    const nums = selectedLessons
      .map((l) => l.number.toLocaleString("fa-IR"))
      .join("، ");
    return `${selectedLessons.length.toLocaleString("fa-IR")} درس: ${nums}`;
  }, [selectedLessons]);

  /** best scores are keyed by the exact selection, so a mixed run keeps its own
   *  record instead of overwriting a single lesson's */
  const bestKey = useMemo(
    () =>
      grade && selected.length
        ? `${grade.id}:${[...selected].sort((a, b) => a - b).join("+")}`
        : "",
    [grade, selected],
  );

  const selectGrade = (g: VocabGrade) => {
    setGrade(g);
    setScreen("lesson");
    setSelected([]);
    setGradeWords([]);
    setPool([]);
    setGradeLoading(true);
    fetchGradePicturedWords(g.id).then((gw) => {
      setGradeWords(gw);
      setPool(gw.map((x) => x.word));
      setGradeLoading(false);
    });
  };

  const lessonReady = useCallback(
    (l: VocabLesson) =>
      !l.free &&
      gradeWords.some((g) => g.lesson === l.number) &&
      pool.length >= 3,
    [gradeWords, pool.length],
  );

  const toggleLesson = (l: VocabLesson) => {
    if (!lessonReady(l)) return;
    setSelected((prev) =>
      prev.includes(l.number)
        ? prev.filter((n) => n !== l.number)
        : [...prev, l.number],
    );
  };

  const confirmSelection = () => {
    if (!grade || selected.length === 0) return;
    const answers = gradeWords
      .filter((g) => selected.includes(g.lesson))
      .map((g) => g.word);
    if (answers.length < 1 || pool.length < 3) return;
    setWords(answers);
    setScreen("mode");
  };

  /** Build the round, warm the first few pictures, then start. Questions whose
   *  picture never arrives are dropped here rather than mid-game. */
  const startLesson = useCallback(async () => {
    const round = buildVocabRound(words, pool);
    if (round.length === 0) return;

    const token = ++runToken.current;
    setScreen("loading");
    const head = round.slice(0, WARMUP);
    setWarm({ done: 0, total: head.length });

    const { bad } = await preloadBatch(
      head.map((q) => vocabImageUrl(q.answer.image)),
      {
        onProgress: (done, total) => {
          if (runToken.current === token) setWarm({ done, total });
        },
        cancelled: () => runToken.current !== token,
      },
    );
    if (runToken.current !== token) return; // cancelled

    const badSet = new Set(bad);
    const usable = round.filter(
      (q) => !badSet.has(vocabImageUrl(q.answer.image)),
    );
    // if every warmed picture failed there is nothing to show; go back rather
    // than opening an empty round
    if (usable.length === 0) {
      setScreen("mode");
      return;
    }

    setQuestions(usable);
    setQi(0);
    setPicks({});
    setModalFor(null);
    setReviewing(false);
    setScreen("quiz");
  }, [words, pool]);

  const cancelWarmup = () => {
    runToken.current++;
    setScreen("mode");
  };

  const q = questions[qi];
  const picked = picks[qi] ?? null;
  const answered = picked !== null;
  const isCorrect = answered && picked === q?.answer.id;
  const score = questions.reduce(
    (s, qq, idx) => s + (picks[idx] === qq.answer.id ? 1 : 0),
    0,
  );

  const currentUrl = q ? vocabImageUrl(q.answer.image) : "";
  const currentReady = currentUrl ? isPreloaded(currentUrl) : false;
  const currentFailed = currentUrl ? hasFailed(currentUrl) : false;

  /** Rolling prefetch: keep the next few pictures warm while the reader answers
   *  the current one, and re-render when the current picture lands. */
  useEffect(() => {
    if (screen !== "quiz" || questions.length === 0) return;
    let alive = true;
    const bump = () => {
      if (alive) refreshImages();
    };
    // the one on screen first, then the lookahead window
    const urls = [qi, ...Array.from({ length: LOOKAHEAD }, (_, k) => qi + 1 + k)]
      .filter((i) => i >= 0 && i < questions.length)
      .map((i) => vocabImageUrl(questions[i].answer.image));
    preloadImage(urls[0]).then(bump);
    for (const u of urls.slice(1)) preloadImage(u);
    return () => {
      alive = false;
    };
  }, [screen, qi, questions]);

  const retryCurrent = () => {
    if (!currentUrl) return;
    resetFailure(currentUrl);
    refreshImages();
    preloadImage(currentUrl).then(refreshImages);
  };

  const pick = (id: string) => {
    if (answered || !q) return;
    setPicks((p) => ({ ...p, [qi]: id }));
    setModalFor(qi); // the one place the meaning modal opens
    const correct = id === q.answer.id;
    if (correct) {
      correctAudio.current?.play().catch(() => {});
    }
    // حالتِ یادگیری is practice, not an exam: nothing is written to
    // `vocab_answers`, so «آزمون‌های پیشین» in the panel stays a record of real
    // attempts (حالتِ چالش) rather than of browsing. What the student keeps
    // from this mode is what they choose to flag.
  };

  const finish = useCallback(() => {
    const nextBest = {
      ...best,
      [bestKey]: Math.max(best[bestKey] ?? 0, score),
    };
    setBest(nextBest);
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(nextBest));
    } catch {}
    setScreen("result");
  }, [best, bestKey, score]);

  /** The first question still without an answer — where play resumes. */
  const resumeAt = useMemo(() => {
    for (let i = 0; i < questions.length; i++) if (picks[i] == null) return i;
    return -1;
  }, [questions, picks]);

  /** Which questions the reader may open.
   *
   *  Answered ones, always — that is the point of the index. Unanswered ones
   *  never: skipping ahead to an unseen picture would let someone browse the
   *  round instead of playing it, and during review a question left blank has
   *  nothing to show. The single exception is the resume point, so that going
   *  back to an earlier question does not trap you there. */
  const canVisit = useCallback(
    (i: number) =>
      i >= 0 &&
      i < questions.length &&
      (picks[i] != null || (!reviewing && i === resumeAt)),
    [questions.length, picks, reviewing, resumeAt],
  );

  const seekVisitable = useCallback(
    (from: number, step: 1 | -1) => {
      for (let i = from + step; i >= 0 && i < questions.length; i += step) {
        if (canVisit(i)) return i;
      }
      return -1;
    },
    [questions.length, canVisit],
  );

  const hasPrev = seekVisitable(qi, -1) >= 0;
  const hasNext = seekVisitable(qi, 1) >= 0;

  // Any move between questions closes the modal, so a question you navigate to
  // is actually readable. Only `pick` reopens it.
  const next = () => {
    setModalFor(null);
    const target = seekVisitable(qi, 1);
    if (target >= 0) {
      setQi(target);
      return;
    }
    // nothing further to visit
    if (reviewing) setScreen("result");
    else finish();
  };

  const prev = () => {
    const target = seekVisitable(qi, -1);
    if (target < 0) return;
    setModalFor(null);
    setQi(target);
  };

  const jumpTo = (i: number) => {
    if (!canVisit(i)) return;
    setModalFor(null);
    setQi(i);
  };

  /** Walk the finished round from the first question, modal closed. */
  const startReview = () => {
    setReviewing(true);
    setModalFor(null);
    setQi(0);
    setScreen("quiz");
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

  // ---------- lesson select (multi) ----------
  if (screen === "lesson" && grade) {
    const readyLessons = grade.lessons.filter(lessonReady);
    const selectedWordCount = gradeWords.filter((g) =>
      selected.includes(g.lesson),
    ).length;

    return (
      <Shell
        title={`پایهٔ ${grade.title}`}
        subtitle="یک یا چند درس را انتخاب کن — می‌توانی چند درس را با هم آزمون بدهی."
        onBack={() => setScreen("grade")}
      >
        {/* select all / clear */}
        {readyLessons.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setSelected(readyLessons.map((l) => l.number))}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              انتخابِ همه
            </button>
            <button
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground transition-colors enabled:hover:border-primary/50 enabled:hover:text-primary disabled:opacity-40"
            >
              پاک کردن
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 pb-28 sm:grid-cols-2">
          {grade.lessons.map((l) => {
            const count = gradeWords.filter((g) => g.lesson === l.number).length;
            const ready = lessonReady(l);
            const b = best[`${grade.id}:${l.number}`];
            const on = selected.includes(l.number);
            return (
              <button
                key={l.id}
                disabled={l.free || (!ready && !gradeLoading)}
                onClick={() => toggleLesson(l)}
                aria-pressed={on}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-5 text-right transition-all ${
                  on
                    ? "border-primary bg-primary/10"
                    : ready
                      ? "border-border bg-card hover:border-primary/50 active:scale-[0.99]"
                      : "cursor-not-allowed border-border bg-muted/40 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* checkbox */}
                  <span
                    aria-hidden
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {on && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        className="size-3.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5 13 4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
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
                </div>
                {ready && b != null && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                    بهترین: {b.toLocaleString("fa-IR")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* sticky confirm bar */}
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur"
          >
            <div className="container mx-auto flex max-w-2xl items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-bold text-foreground">
                  {selected.length.toLocaleString("fa-IR")} درس انتخاب شد
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedWordCount.toLocaleString("fa-IR")} واژه
                </p>
              </div>
              <button
                onClick={confirmSelection}
                className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
              >
                ادامه
              </button>
            </div>
          </motion.div>
        )}
      </Shell>
    );
  }

  // ---------- mode select ----------
  if (screen === "mode" && grade && selected.length > 0) {
    const count = playableWords(words).length;
    return (
      <Shell
        title={selectionLabel}
        subtitle="چطور می‌خواهی این واژه‌ها را تمرین کنی؟"
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

  // ---------- warm-up ----------
  if (screen === "loading") {
    return (
      <PreloadScreen
        done={warm.done}
        total={warm.total}
        label={selectionLabel}
        onCancel={cancelWarmup}
      />
    );
  }

  // ---------- challenge ----------
  if (screen === "challenge" && grade && selected.length > 0) {
    return (
      <VocabChallenge
        grade={grade}
        lesson={{
          id: [...selected].sort((a, b) => a - b).join("+"),
          number: selected[0],
          title: selectionLabel,
          free: false,
        }}
        label={selectionLabel}
        lessonOf={lessonOf}
        words={words}
        pool={pool}
        userId={userId}
        onExit={() => setScreen("mode")}
      />
    );
  }

  // ---------- result ----------
  if (screen === "result" && selected.length > 0) {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    return (
      <Shell title="پایانِ دور" onBack={() => setScreen("lesson")}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass relative z-20 mx-auto max-w-md rounded-3xl p-8 text-center"
        >
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-primary/15 text-4xl">
            {pct >= 80 ? "🌟" : pct >= 50 ? "👏" : "💪"}
          </div>
          <p className="text-sm text-muted-foreground">{selectionLabel}</p>
          <p className="my-1 text-4xl font-black text-primary">
            {score.toLocaleString("fa-IR")}
            <span className="text-2xl text-muted-foreground">/{total.toLocaleString("fa-IR")}</span>
          </p>
          <p className="text-sm text-muted-foreground">{pct.toLocaleString("fa-IR")}٪ درست</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={startLesson}
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
            >
              دوباره
            </button>
            <button
              onClick={startReview}
              className="rounded-xl border border-border bg-card px-6 py-2.5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              مرورِ سؤال‌ها
            </button>
            <button
              onClick={() => setScreen("lesson")}
              className="rounded-xl border border-border bg-card px-6 py-2.5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              درس‌های دیگر
            </button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ---------- quiz ----------
  if (screen === "quiz" && q) {
    return (
      <div dir="rtl" className="container mx-auto my-6 max-w-xl">
        {/* top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {reviewing ? (
            <button
              onClick={() => setScreen("result")}
              className="text-sm font-bold text-muted-foreground hover:text-primary"
            >
              ← بازگشت به نتیجه
            </button>
          ) : (
            <button onClick={() => setScreen("lesson")} className="text-sm text-muted-foreground hover:text-primary">
              ← درس‌ها
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndexOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition-all hover:brightness-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              فهرست
            </button>
            <button
              onClick={prev}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-all enabled:hover:border-primary/50 enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
              </svg>
              سوال قبل
            </button>
            {/* Forward is only reachable through the modal during play; an
                answered question you came back to needs its own way onward. */}
            {(reviewing || answered) && hasNext && (
              <button
                onClick={next}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
              >
                سوال بعد
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
                </svg>
              </button>
            )}
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {(qi + 1).toLocaleString("fa-IR")} / {questions.length.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>
        {/* progress */}
        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((qi + (answered ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>

        {/* Flagging before answering would give the word away in the panel, so
            the button only appears once the answer is known — but it belongs
            above the picture, where the eye already is. */}
        <div className="mb-3 flex min-h-9 items-center justify-end">
          {answered && (
            <BookmarkButton
              area="vocab"
              refId={q.answer.id}
              title={q.answer.word}
              subtitle={q.answer.meaning}
              payload={{
                image: q.answer.image,
                lesson: lessonOf(q.answer.id) ?? null,
                grade: grade?.id ?? null,
              }}
            />
          )}
        </div>

        {/* image — with a guard so a slow or missing picture costs a spinner,
            not a broken round */}
        <motion.div
          key={q.answer.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 mx-auto aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
        >
          {currentReady ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : currentFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-3xl" aria-hidden>
                🖼️
              </span>
              <p className="text-sm text-muted-foreground">
                این تصویر بارگذاری نشد.
              </p>
              <button
                onClick={retryCurrent}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
              >
                تلاش مجدد
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span
                aria-hidden
                className="size-8 animate-spin rounded-full border-3 border-muted border-t-primary"
              />
              <p className="text-xs text-muted-foreground">
                در حالِ بارگذاریِ تصویر…
              </p>
            </div>
          )}
        </motion.div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <p className="text-sm text-muted-foreground">
            این تصویر، کدام واژه است؟
          </p>
        </div>

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
                disabled={answered || (!currentReady && !currentFailed)}
                onClick={() => pick(o.id)}
                className={`min-h-14 rounded-2xl border-2 px-3 text-lg font-bold transition-all disabled:cursor-not-allowed ${
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

        {/* An answered question being revisited shows its word inline, with the
            full meaning one tap away — the modal no longer forces itself open. */}
        {answered && modalFor !== qi && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              پاسخِ درست:{" "}
              <span className="font-bold text-foreground">{q.answer.word}</span>
              {isCorrect ? (
                <span className="ms-2 text-green-600 dark:text-green-400">
                  ✓ درست زدی
                </span>
              ) : (
                <span className="ms-2 text-destructive">✕ اشتباه زدی</span>
              )}
            </p>
            <button
              onClick={() => setModalFor(qi)}
              className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary transition-all hover:brightness-95"
            >
              دیدنِ معنی
            </button>
          </div>
        )}

        {/* jump to any question */}
        <QuestionIndex
          open={indexOpen}
          onClose={() => setIndexOpen(false)}
          questions={questions}
          picks={picks}
          current={qi}
          onJump={jumpTo}
          canVisit={canVisit}
          resumeAt={reviewing ? -1 : resumeAt}
        />

        {/* learning modal — the heart of the game: see the word & its full meaning */}
        <MeaningModal
          open={modalFor === qi && !indexOpen}
          isCorrect={!!isCorrect}
          answer={q.answer}
          others={q.options.filter((o) => o.id !== q.answer.id)}
          /* the moment the student is actually looking at the word is the
             moment they decide to keep it — so the flag lives here too, not
             only as a small pill behind the modal */
          note={
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">
                می‌خواهی این واژه را برای مرور بعدی نگه داری؟
              </p>
              <BookmarkButton
                area="vocab"
                refId={q.answer.id}
                title={q.answer.word}
                subtitle={q.answer.meaning}
                payload={{
                  image: q.answer.image,
                  lesson: lessonOf(q.answer.id) ?? null,
                  grade: grade?.id ?? null,
                }}
              />
            </div>
          }
          continueLabel={
            reviewing
              ? qi + 1 >= questions.length
                ? "بستن"
                : "سوال بعد"
              : qi + 1 >= questions.length
                ? "دیدن نتیجه"
                : "ادامه"
          }
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
