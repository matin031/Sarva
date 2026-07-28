"use client";
import { Question } from "@/app/quiz/page";
import QuizHeader from "@/components/UI/QuizHeader";
import { useEffect, useState, useRef, useMemo } from "react";
import QuestionCard from "./QuestionCard";
import QuestionOption from "@/components/UI/QuestionOption";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import QuizSettingsModal from "./QuizSettingsModal";
import GuestLimitModal from "./GuestLimitModal";
import BookLoader from "../svgs/LoadingIcon";
import BookmarkButton from "@/components/UI/BookmarkButton";
import { ARUZ_TYPE_LABEL } from "@/lib/panel/types";

const GUEST_QUESTION_LIMIT = 3;

/** A one-line name for a bookmarked question: whatever the student actually
 *  reads on the card, falling back to the right answer when the prompt is a
 *  sound rather than text. */
function bookmarkTitle(q: Question): string {
  const right = q.options.find((o) => o.isCorrect);
  return (
    q.poem?.[0] || right?.label || right?.poem?.[0] || "سؤال عروض سماعی"
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Quiz({ data }: { data: Question[] }) {
  // all questions fetched from the server (quiz page)
  const allQuestions = data;

  // the actual set of questions the user is playing this round
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");
  // per-question record of what was selected + whether it was answered,
  // so going back/forward restores the right state instead of resetting it
  const [answersLog, setAnswersLog] = useState<
    { selected: number | null; answered: boolean }[]
  >([]);

  // undefined = still checking auth, null = guest, object = logged in
  const [user, setUser] = useState<any>(undefined);
  // ids of questions this user has already answered, null while loading
  const [answeredIds, setAnsweredIds] = useState<string[] | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  const router = useRouter();

  const dingRef = useRef<HTMLAudioElement | null>(null);
  // who the restored (localStorage) session belongs to: "guest" | user id | null
  const restoredOwnerRef = useRef<string | null>(null);

  // try to resume a saved session first, before we even know the user
  useEffect(() => {
    const saved = localStorage.getItem("quiz-progress");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed.quizStarted &&
          typeof parsed.ownerId === "string" &&
          Array.isArray(parsed.sessionQuestions) &&
          parsed.sessionQuestions.length
        ) {
          restoredOwnerRef.current = parsed.ownerId;
          setQuestions(parsed.sessionQuestions);
          setCurrentIndex(parsed.currentIndex ?? 0);
          setSelected(parsed.selected ?? null);
          setAnswered(parsed.answered ?? false);
          setScore(parsed.score ?? 0);
          setAnswersLog(
            Array.isArray(parsed.answersLog)
              ? parsed.answersLog
              : parsed.sessionQuestions.map(() => ({
                  selected: null,
                  answered: false,
                })),
          );
          setQuizStarted(true);
        } else {
          // old/legacy saved session without an owner tag — can't verify
          // who it belongs to, so don't trust it
          localStorage.removeItem("quiz-progress");
        }
      } catch {
        localStorage.removeItem("quiz-progress");
      }
    }
    setRestoredFromStorage(true);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    if (!restoredFromStorage || !quizStarted || user === undefined) return;
    if (restoredOwnerRef.current === null) return;

    const currentOwner = user ? user.id : "guest";
    if (currentOwner !== restoredOwnerRef.current) {
      restoredOwnerRef.current = null;
      localStorage.removeItem("quiz-progress");
      setQuizStarted(false);
      setQuestions([]);
      setCurrentIndex(0);
      setSelected(null);
      setAnswered(false);
      setScore(0);
      setAnswersLog([]);
    }
  }, [user, restoredFromStorage, quizStarted]);

  // once we know who the user is, fetch which of these questions they've already answered
  useEffect(() => {
    if (!user || !allQuestions.length) {
      if (user === null) setAnsweredIds([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("user_answers")
        .select("question_id")
        .eq("user_id", user.id)
        .in(
          "question_id",
          allQuestions.map((q) => q.id),
        );

      if (!cancelled) {
        setAnsweredIds((rows ?? []).map((r: any) => r.question_id));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, allQuestions]);

  const unansweredQuestions = useMemo(() => {
    if (!answeredIds) return allQuestions;
    return allQuestions.filter((q) => !answeredIds.includes(q.id));
  }, [allQuestions, answeredIds]);

  const startSession = (opts: {
    questionCount: number;
    excludeRepeated: boolean;
  }) => {
    const pool = opts.excludeRepeated ? unansweredQuestions : allQuestions;
    const finalPool = pool.length ? pool : allQuestions;
    const picked = shuffle(finalPool)
      .slice(0, opts.questionCount)
      .map((q) => ({ ...q, options: shuffle(q.options) }));

    restoredOwnerRef.current = user ? user.id : "guest";
    setQuestions(picked);
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setAnswersLog(picked.map(() => ({ selected: null, answered: false })));
    setQuizStarted(true);
  };

  const startGuestSession = () => {
    const picked = shuffle(allQuestions)
      .slice(0, GUEST_QUESTION_LIMIT)
      .map((q) => ({ ...q, options: shuffle(q.options) }));

    restoredOwnerRef.current = "guest";
    setQuestions(picked);
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setAnswersLog(picked.map(() => ({ selected: null, answered: false })));
    setQuizStarted(true);
  };

  const playDing = () => {
    if (dingRef.current) {
      dingRef.current.currentTime = 0;
      dingRef.current
        .play()
        .catch((err) => console.log("Ding sound play failed", err));
    }
  };

  const handleSubmit = async () => {
    if (selected === null) return;

    const selectedOption = questions[currentIndex].options[selected];
    const isCorrect = selectedOption.isCorrect;

    if (isCorrect) {
      setScore((s) => s + 1);
      playDing();
    }

    setAnswered(true);
    setAnswersLog((log) => {
      const copy = [...log];
      copy[currentIndex] = { selected, answered: true };
      return copy;
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: existing } = await supabase
        .from("user_answers")
        .select("id")
        .eq("user_id", user.id)
        .eq("question_id", questions[currentIndex].id)
        .single();

      if (existing) {
        // repeated question: overwrite with this attempt's result so the
        // panel reflects the latest answer instead of ignoring the retry
        const { error: updateError } = await supabase
          .from("user_answers")
          .update({
            selected_option_id: selectedOption.id,
            is_correct: isCorrect,
            answered_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updateError)
          console.error("user_answers update failed:", updateError);
      } else {
        // answered_at is set explicitly (not relying on a column default) so
        // the panel's 7-day progress chart — which filters on answered_at —
        // always sees this row.
        const { error: insertError } = await supabase
          .from("user_answers")
          .insert({
            user_id: user.id,
            question_id: questions[currentIndex].id,
            selected_option_id: selectedOption.id,
            is_correct: isCorrect,
            answered_at: new Date().toISOString(),
          });
        if (insertError)
          console.error("user_answers insert failed:", insertError);
      }
    }
  };

  const saveQuizAttempt = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const answeredEntries = answersLog
      .map((entry, i) => ({ entry, question: questions[i] }))
      .filter(({ entry }) => entry.answered && entry.selected !== null);

    if (!answeredEntries.length) return;

    const correctCount = answeredEntries.filter(
      ({ entry, question }) => question.options[entry.selected!]?.isCorrect,
    ).length;

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        total: questions.length,
        correct: correctCount,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      console.log("Failed to save quiz attempt", attemptError);
      return;
    }

    const rows = questions.map((question, i) => {
      const entry = answersLog[i];
      const wasAnswered = !!entry && entry.answered && entry.selected !== null;
      const selectedOption = wasAnswered
        ? question.options[entry.selected!]
        : null;
      return {
        attempt_id: attempt.id,
        question_id: question.id,
        selected_option_id: selectedOption ? selectedOption.id : null,
        is_correct: !!selectedOption?.isCorrect,
      };
    });

    const { error: answersError } = await supabase
      .from("quiz_attempt_answers")
      .insert(rows);
    if (answersError)
      console.error("quiz_attempt_answers insert failed:", answersError);
  };

  const handleNext = async () => {
    if (currentIndex + 1 >= questions.length) {
      await saveQuizAttempt();
      localStorage.removeItem("quiz-progress");
      router.push(`/result?score=${score}&total=${questions.length}`);
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextEntry = answersLog[nextIndex] ?? {
      selected: null,
      answered: false,
    };
    setCurrentIndex(nextIndex);
    setSelected(nextEntry.selected);
    setAnswered(nextEntry.answered);
  };

  const handlePrevious = () => {
    if (currentIndex === 0) return;

    const prevIndex = currentIndex - 1;
    const prevEntry = answersLog[prevIndex] ?? {
      selected: null,
      answered: false,
    };
    setCurrentIndex(prevIndex);
    setSelected(prevEntry.selected);
    setAnswered(prevEntry.answered);
  };

  const handleExitQuiz = async () => {
    await saveQuizAttempt();
    localStorage.removeItem("quiz-progress");
    router.push(`/result?score=${score}&total=${questions.length}`);
  };

  useEffect(() => {
    if (!quizStarted || !restoredOwnerRef.current) return;
    localStorage.setItem(
      "quiz-progress",
      JSON.stringify({
        quizStarted,
        ownerId: restoredOwnerRef.current,
        sessionQuestions: questions,
        currentIndex,
        selected,
        answered,
        score,
        answersLog,
      }),
    );
  }, [
    quizStarted,
    questions,
    currentIndex,
    selected,
    answered,
    score,
    answersLog,
  ]);

  const [playingId, setPlayingId] = useState<number | null>(null);

  if (!restoredFromStorage) {
    return (
      <div className=" container my-15 flex flex-col items-center">
        <BookLoader />
        <div className=" text-center">...در حال بارگذاری</div>
      </div>
    );
  }

  if (!quizStarted) {
    if (user === undefined || (user && answeredIds === null)) {
      return (
        <div className=" container my-15 flex flex-col items-center">
          <BookLoader />
          <div className=" text-center">...در حال بارگذاری</div>
        </div>
      );
    }

    if (user === null) {
      return (
        <GuestLimitModal
          questionLimit={GUEST_QUESTION_LIMIT}
          onContinue={startGuestSession}
        />
      );
    }

    return (
      <QuizSettingsModal
        totalAll={allQuestions.length}
        totalUnanswered={unansweredQuestions.length}
        onStart={startSession}
      />
    );
  }

  if (!questions.length || !questions[currentIndex]) {
    return (
      <div className="container my-15 text-center">...در حال بارگذاری</div>
    );
  }

  return (
    <div className="container my-15 max-w-4xl mx-auto">
      <QuizHeader
        score={score}
        currentIndex={currentIndex}
        questionsLength={questions.length}
        answered={answered}
        onExit={handleExitQuiz}
      />

      <div className="w-full">
        {/* flag this question for later — it shows up in پنل ← عروض ← نشان‌شده‌ها.
            The payload carries the whole question so the panel can replay it
            even if the question bank changes afterwards. */}
        <div className="mt-4 flex justify-end">
          <BookmarkButton
            area="aruz"
            refId={questions[currentIndex].id}
            title={bookmarkTitle(questions[currentIndex])}
            subtitle={ARUZ_TYPE_LABEL[questions[currentIndex].type]}
            payload={{
              type: questions[currentIndex].type,
              poem: questions[currentIndex].poem ?? null,
              audioUrl: questions[currentIndex].audioSrc ?? null,
              options: questions[currentIndex].options.map((o) => ({
                id: o.id,
                label: o.label ?? null,
                poem: o.poem ?? null,
                audioUrl: o.audioSrc ?? null,
                isCorrect: o.isCorrect,
              })),
            }}
          />
        </div>

        <QuestionCard questions={questions} currentIndex={currentIndex} />

        {/* QuestionOptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 *:h-20 md:*:min-h-30 text-muted-foreground">
          {questions[currentIndex].options.map((o, index) => (
            <QuestionOption
              key={`${currentIndex}-${o.id}`}
              setSelected={setSelected}
              selected={selected}
              id={index}
              audioUrl={o.audioSrc || ""}
              answered={answered}
              isCorrect={o.isCorrect}
              title={o.label}
              quizType={questions[currentIndex].type}
              poem={o.poem}
              whileInView={o.x}
              playingId={playingId}
              setPlayingId={setPlayingId}
            />
          ))}
        </div>

        {/* submit answer */}
        <div className="w-full mt-6  flex items-center justify-between gap-x-3">
          <button
            onClick={answered ? handleNext : handleSubmit}
            className={`transition-all whitespace-nowrap text-sm md:text-lg 
              text-primary-foreground h-9 rounded-lg md:rounded-xl px-5 md:px-8 py-3 md:py-6 
              inline-flex items-center justify-center font-medium ${
                answered || selected !== null
                  ? "bg-primary hover:brightness-90"
                  : "bg-primary/50 cursor-not-allowed"
              }`}
          >
            {currentIndex + 1 === questions.length &&
              (answered ? "مشاهده نتیجه" : "ثبت پاسخ")}
            {currentIndex + 1 !== questions.length &&
              (!answered ? "ثبت پاسخ" : "سوال بعدی")}
          </button>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`glass transition-all whitespace-nowrap text-sm md:text-lg 
               h-9 rounded-lg md:rounded-xl px-5 md:px-6 py-3 md:py-6 
              inline-flex items-center justify-between gap-x-2 font-medium ${
                currentIndex === 0
                  ? "text-black/20 dark:text-white/20 cursor-not-allowed"
                  : "text-black/70 dark:text-white/70 hover:brightness-110 active:scale-95"
              }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            سوال قبلی
          </button>
        </div>
      </div>

      <audio ref={dingRef} src="/currectsound.mp3" preload="auto" />
    </div>
  );
}

export default Quiz;
