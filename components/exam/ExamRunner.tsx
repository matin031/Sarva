"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ClientExam, ClientQuestion } from "@/lib/exam/client-exam";
import ExamQuestionCard from "@/components/exam/ExamQuestionCard";
import ExamQuestionNav from "@/components/exam/ExamQuestionNav";
import ExamResults from "@/components/exam/ExamResults";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  submitExamAttempt,
  submitQuestion,
  type QuestionResult,
} from "@/app/exam/[examKey]/actions";

type Props = {
  examKey: string;
  exam: ClientExam;
};

type FlatQuestion = { sectionTitle: string; question: ClientQuestion };

/** How far a guest may get before the paper asks them to sign in. Their answers
 *  are already in localStorage, so signing in and coming back resumes exactly
 *  where they stopped. */
const GUEST_QUESTION_LIMIT = 3;

type SaveOutcome =
  | { saved: true }
  | { saved: false; reason: "guest" | "too_few" | "unknown_exam" | "early_exit" };

type Progress = {
  currentIndex: number;
  // keyed by "questionNumber:partIndex"
  answers: Record<string, unknown>;
  questionResults: Record<number, QuestionResult>;
  showResults: boolean;
};

const emptyProgress: Progress = {
  currentIndex: 0,
  answers: {},
  questionResults: {},
  showResults: false,
};

function storageKey(examKey: string) {
  return `exam-progress:${examKey}`;
}

/** One question at a time: submit -> see the correct answer inline for
 *  every part -> move to the next question. Same pattern the poetry-meter
 *  quiz (components/UI/Quiz.tsx) already uses, generalized to exam
 *  questions with multiple parts and 18 different answer types instead of
 *  a single multiple-choice pick.
 *
 *  All progress lives in one `Progress` object mirrored to localStorage,
 *  so a refresh or accidental tab close mid-exam doesn't throw away
 *  everything the student already answered — same idea as the poetry
 *  quiz's own "quiz-progress" pattern, restored once on mount. */
export default function ExamRunner({ examKey, exam }: Props) {
  const flatQuestions = useMemo<FlatQuestion[]>(
    () =>
      exam.sections.flatMap((section) =>
        section.questions.map((question) => ({
          sectionTitle: section.title,
          question,
        })),
      ),
    [exam],
  );

  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "finish" | "reset">(null);
  const [isPending, startTransition] = useTransition();

  /** undefined = still checking, null = guest, string = signed in.
   *
   *  Declared up here with the rest of the state on purpose: below this point
   *  the component returns early while the saved progress is still being read,
   *  and a hook after that return is only called on some renders — which is
   *  exactly the "rendered more hooks than during the previous render" crash. */
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [saveResult, setSaveResult] = useState<SaveOutcome | null>(null);

  /** Who is playing. Also above the early return, for the same reason. */
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (alive) setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (alive) setUserId(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Restoring persisted progress on mount is a one-time sync with an
  // external system (localStorage), not a derived-state update — the
  // sanctioned exception to "don't setState in effects".
  useEffect(() => {
    let restoredProgress = emptyProgress;
    try {
      const saved = localStorage.getItem(storageKey(examKey));
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Progress>;
        restoredProgress = {
          currentIndex:
            typeof parsed.currentIndex === "number"
              ? Math.min(
                  Math.max(parsed.currentIndex, 0),
                  flatQuestions.length - 1,
                )
              : 0,
          answers: parsed.answers ?? {},
          questionResults: parsed.questionResults ?? {},
          showResults: parsed.showResults ?? false,
        };
      }
    } catch {
      restoredProgress = emptyProgress;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage on mount, not derived state
    setProgress(restoredProgress);
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examKey]);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(storageKey(examKey), JSON.stringify(progress));
  }, [restored, examKey, progress]);

  if (!restored) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-muted-foreground"
      >
        ...در حال بارگذاری
      </div>
    );
  }

  const { currentIndex, answers, questionResults, showResults } = progress;


  const { sectionTitle, question } = flatQuestions[currentIndex];
  const isLast = currentIndex === flatQuestions.length - 1;
  const isRevealed = question.number in questionResults;
  const currentAnswers: Record<number, unknown> = Object.fromEntries(
    question.parts.map((_, i) => [i, answers[`${question.number}:${i}`]]),
  );
  const hasAnyAnswer = Object.values(currentAnswers).some(
    (v) =>
      v !== undefined &&
      v !== null &&
      v !== "" &&
      !(Array.isArray(v) && v.length === 0),
  );

  const setAnswer = (partIndex: number, value: unknown) => {
    setProgress((prev) => ({
      ...prev,
      answers: { ...prev.answers, [`${question.number}:${partIndex}`]: value },
    }));
  };

  const handleSubmitQuestion = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitQuestion(
          examKey,
          question.number,
          currentAnswers,
        );
        setProgress((prev) => ({
          ...prev,
          questionResults: {
            ...prev.questionResults,
            [question.number]: result,
          },
        }));
      } catch {
        setError("مشکلی در ثبت پاسخ پیش آمد. دوباره تلاش کنید.");
      }
    });
  };

  const handleSelfGrade = (partIndex: number, score: number) => {
    setProgress((prev) => {
      const qr = prev.questionResults[question.number];
      if (!qr) return prev;
      const parts = qr.parts.map((p, i) => {
        if (i !== partIndex) return p;
        const status =
          score >= p.maxScore ? "correct" : score <= 0 ? "incorrect" : "partial";
        return { ...p, score, status: status as typeof p.status };
      });
      return {
        ...prev,
        questionResults: { ...prev.questionResults, [question.number]: { ...qr, parts } },
      };
    });
  };

  const goNext = () => {
    if (isLast) {
      setProgress((prev) => ({ ...prev, showResults: true }));
      // The only place a کارنامه is recorded: the student reached the end and
      // pressed «پایان آزمون». The server still checks that enough of the paper
      // was attempted, and reports back so the results screen can say what
      // happened instead of leaving them guessing.
      void submitExamAttempt(examKey, questionResults, answers).then(
        (res) => setSaveResult(res),
        (err) => {
          console.error("submitExamAttempt:", err);
          setSaveResult(null);
        },
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setProgress((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrevious = () => {
    if (currentIndex === 0) return;
    setProgress((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToIndex = (index: number) => {
    setProgress((prev) => ({ ...prev, currentIndex: index }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetry = () => {
    // no need to also localStorage.removeItem here: the save effect below
    // re-persists `progress` on every change, so it'll write emptyProgress
    // right back — functionally identical to no saved state on next load.
    setProgress(emptyProgress);
  };

  const handleReset = () => {
    setMenuOpen(false);
    setConfirmKind("reset");
  };

  const finishEarly = () => {
    setMenuOpen(false);
    setConfirmKind("finish");
  };

  // run after the student confirms in the modal
  const doReset = () => {
    setConfirmKind(null);
    handleRetry();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const doFinish = () => {
    setConfirmKind(null);
    setProgress((prev) => ({ ...prev, showResults: true }));
    // Deliberately NOT recorded. Ending early shows the student their score,
    // but a کارنامه is for a paper that was actually sat to the end — an abandoned
    // run in the panel is worse than no row at all.
    setSaveResult({ saved: false, reason: "early_exit" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const answeredCount = Object.keys(questionResults).length;
  const totalQuestions = flatQuestions.length;
  const needed = Math.ceil(totalQuestions * (2 / 3));

  /* A guest may sit the first few questions, then has to sign in. The gate is
     shown instead of the question, never over the results, and their answers
     are already saved locally so coming back finishes the sentence. */
  if (!showResults && userId === null && answeredCount >= GUEST_QUESTION_LIMIT) {
    return (
      <div dir="rtl" className=" container mx-auto my-16 max-w-xl">
        <div className=" glass rounded-3xl p-6 text-center sm:p-10">
          <span className=" mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
            🔐
          </span>
          <h2 className=" mt-4 text-xl font-bold sm:text-2xl">
            برای ادامهٔ آزمون وارد شو
          </h2>
          <p className=" mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
            {answeredCount.toLocaleString("fa-IR")} سؤال را جواب دادی. برای ادامه و برای
            اینکه کارنامه‌ات در پنل بماند، باید وارد حساب شوی.
            <br />
            پاسخ‌هایت ذخیره شده‌اند — بعد از ورود از همین سؤال ادامه می‌دهی.
          </p>
          <div className=" mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth"
              className=" rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
            >
              ورود / ثبت‌نام
            </Link>
            <Link
              href="/exam"
              className=" rounded-2xl border border-border bg-card px-6 py-3 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              بازگشت به آزمون‌ها
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <>
        {saveResult && !saveResult.saved && (
          <div dir="rtl" className=" mx-auto mt-8 max-w-xl px-4 xs:px-5">
            <p className=" rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm leading-relaxed text-foreground">
              {saveResult.reason === "early_exit" ? (
                <>
                  این آزمون را زودتر تمام کردی، پس در کارنامه‌های پنل ثبت نشد.
                  کارنامه فقط برای آزمونی صادر می‌شود که تا آخرین سؤال بروی و
                  دست‌کم {needed.toLocaleString("fa-IR")} سؤال از{" "}
                  {totalQuestions.toLocaleString("fa-IR")} را پاسخ داده باشی.
                </>
              ) : saveResult.reason === "too_few" ? (
                <>
                  کارنامه ثبت نشد: از {totalQuestions.toLocaleString("fa-IR")}{" "}
                  سؤال، {answeredCount.toLocaleString("fa-IR")} سؤال را پاسخ
                  دادی و برای صدور کارنامه دست‌کم{" "}
                  {needed.toLocaleString("fa-IR")} سؤال لازم است.
                </>
              ) : saveResult.reason === "guest" ? (
                <>
                  نتیجه‌ات را می‌بینی، ولی چون وارد حساب نشده‌ای کارنامه‌ای در پنل
                  ذخیره نشد.
                </>
              ) : (
                <>کارنامه ذخیره نشد. دوباره تلاش کن.</>
              )}
            </p>
          </div>
        )}
        <ExamResults
          exam={exam}
          questionResults={questionResults}
          onRetry={handleRetry}
        />
      </>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto mt-8 flex max-w-xl flex-col gap-4 px-4 py-6 pb-28 xs:px-5"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="glass flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-foreground/80"
        >
          <span className="text-base">☰</span>
          فهرست
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold xs:text-xl">{exam.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sectionTitle} · سؤال {currentIndex + 1} از {flatQuestions.length}
          </p>
        </div>
        <div className="relative w-[4.5rem] flex justify-end">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="گزینه‌های بیشتر"
            className="glass flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg font-bold text-foreground/80"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full z-40 mt-2 flex min-w-44 flex-col gap-0.5 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={finishEarly}
                  className="rounded-lg px-3 py-2 text-right text-sm hover:bg-accent/70 transition-all"
                >
                  پایان زودهنگام
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg px-3 py-2 text-right text-sm text-destructive hover:bg-destructive/10 transition-all"
                >
                  شروع از اول
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / flatQuestions.length) * 100}%`,
          }}
        />
      </div>

      {navOpen && (
        <ExamQuestionNav
          flatQuestions={flatQuestions}
          currentIndex={currentIndex}
          questionResults={questionResults}
          onJump={goToIndex}
          onClose={() => setNavOpen(false)}
        />
      )}

      <ExamQuestionCard
        key={question.number}
        question={question}
        answers={currentAnswers}
        onAnswerChange={setAnswer}
        disabled={isRevealed || isPending}
        partResults={questionResults[question.number]?.parts}
        onSelfGrade={handleSelfGrade}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md xs:px-5">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={currentIndex === 0}
            className="glass min-h-11 rounded-xl px-4 text-sm font-medium text-foreground/70 transition-opacity
              disabled:opacity-30"
          >
            سؤال قبلی
          </button>
          <button
            type="button"
            disabled={isPending || (!isRevealed && !hasAnyAnswer)}
            onClick={isRevealed ? goNext : handleSubmitQuestion}
            className="min-h-11 flex-1 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground
              transition-opacity disabled:opacity-40"
          >
            {isPending
              ? "در حال بررسی..."
              : isRevealed
                ? isLast
                  ? "پایان و مشاهده نتیجه"
                  : "سؤال بعدی"
                : "ثبت پاسخ"}
          </button>
        </div>
        {error && (
          <p className="mx-auto mt-2 max-w-xl text-center text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmKind !== null}
        kind={confirmKind}
        answeredCount={answeredCount}
        onCancel={() => setConfirmKind(null)}
        onConfirm={confirmKind === "finish" ? doFinish : doReset}
      />
    </div>
  );
}

function ConfirmDialog({
  open,
  kind,
  answeredCount,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  kind: null | "finish" | "reset";
  answeredCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isReset = kind === "reset";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
          onClick={onCancel}
        >
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-2xl"
          >
            <div
              className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl text-3xl ${
                isReset ? "bg-destructive/15" : "bg-primary/15"
              }`}
            >
              {isReset ? "🔄" : "🏁"}
            </div>
            <h3 className="text-lg font-black">
              {isReset ? "آزمون از اول شروع شود؟" : "همین حالا امتحان تمام شود؟"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isReset ? (
                "همهٔ پاسخ‌ها و نتیجه‌های فعلی پاک می‌شود و از سؤال اول شروع می‌کنی."
              ) : (
                <>
                  فقط <b className="text-foreground">{answeredCount.toLocaleString("fa-IR")}</b> سؤالی که
                  نمره داده‌اید نمره می‌شود و بقیه بی‌پاسخ می‌ماند.
                </>
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-12 flex-1 rounded-2xl border border-border bg-card font-medium text-muted-foreground transition-all hover:border-primary/50 active:scale-95"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`min-h-12 flex-[1.4] rounded-2xl font-black transition-all hover:brightness-90 active:scale-95 ${
                  isReset
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isReset ? "پاک کن و از اول" : "بله، تمام کن"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
