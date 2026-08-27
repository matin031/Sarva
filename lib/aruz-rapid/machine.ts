import type {
  RapidAruzInputMethod,
  RapidAruzQuestion,
  ScansionLength,
  UnitOutcome,
} from "./types";
import { getUnitDuration, type RapidAruzConfig } from "./config";
import { revealProgressAfterUnit } from "./reveal";

/**
 * چرخهٔ عمرِ بازی — تنها جایی که «چه اتفاقی افتاد» تصمیم گرفته می‌شود.
 *
 * سه چیز این reducer را از یک useState معمولی جدا می‌کند:
 *
 * ۱. ساعتِ فعال. زمانِ هر واحد بر حسبِ «میلی‌ثانیهٔ تعاملی» شمرده می‌شود، نه
 *    ساعتِ دیوار. وقتی تب پنهان می‌شود ساعت می‌ایستد، پس مهلت خودبه‌خود
 *    درست جابه‌جا می‌شود و زمانِ پاسخ هم آلوده نمی‌شود. setTimeout فقط بیدارباش
 *    است؛ مرجع همان deadlineActive است.
 *
 * ۲. سه شناسه: questionEpoch / runId / unitAttemptId. هر callback ای که دیر
 *    برسد، با این‌ها بی‌اثر می‌شود.
 *
 * ۳. هر تلاشِ واحد دقیقاً یک نتیجه می‌گیرد. چون تصمیم داخلِ همین reducer
 *    گرفته می‌شود (نه در handler)، دو رویدادِ هم‌زمان هم دو نتیجه نمی‌سازند:
 *    دومی به committed=true می‌خورد و دور انداخته می‌شود.
 */

export type RapidAruzPhase =
  | "intro"
  | "loadingQuestion"
  | "waitingForFont"
  | "preview"
  | "spoilerTransition"
  | "armingUnit"
  | "playing"
  | "resetFeedbackWrong"
  | "resetFeedbackTimeout"
  | "resetting"
  | "completed"
  | "questionResults"
  | "sessionResults"
  | "error";

export type PauseReason = "visibility" | "windowBlur" | "manual" | "layoutTransition";

export type FeedbackKind = "correct" | "wrong" | "timeout" | "complete";

/** رواداریِ یک میلی‌ثانیه برای مقایسهٔ مهلت — گردکردنِ ساعت نباید نتیجه را عوض کند. */
const DEADLINE_EPSILON_MS = 1;

export interface UnitAttempt {
  id: number;
  runId: number;
  questionEpoch: number;
  unitIndex: number;
  /** ساعتِ فعالِ سؤال در لحظهٔ مسلح‌شدن. */
  startedActive: number;
  durationMs: number;
  /** مرجعِ نهایی. هیچ ورودی‌ای بعد از این پذیرفته نمی‌شود. */
  deadlineActive: number;
  committed: boolean;
  outcome: UnitOutcome | null;
}

export interface QuestionStats {
  questionId: string;
  attemptCount: number;
  wrongChoices: number;
  timeouts: number;
  correctInputs: number;
  bestStreak: number;
  responseTimes: number[];
  /** فقط آخرین دورِ موفق: از واحدِ اول تا واحدِ آخر، بدون مکث. */
  successfulRunTimeMs: number | null;
}

export interface SessionStats {
  questionsCompleted: number;
  totalCorrectInputs: number;
  totalWrongChoices: number;
  totalTimeouts: number;
  /** جمعِ زمانِ فعالِ سؤال‌هایی که تمام شده‌اند. سؤالِ جاری جدا حساب می‌شود. */
  overallActiveTimeMs: number;
}

export interface RapidAruzState {
  phase: RapidAruzPhase;
  config: RapidAruzConfig;

  questions: RapidAruzQuestion[];
  questionIndex: number;
  questionEpoch: number;

  runId: number;
  unitAttemptId: number;
  unitIndex: number;
  revealProgress: number;
  currentStreak: number;

  attempt: UnitAttempt | null;

  /** ساعتِ فعالِ سؤالِ جاری. */
  activeAccumMs: number;
  activeSince: number | null;
  runStartedActive: number | null;

  pauseReasons: PauseReason[];
  /** پس از بازگشت، یک روپوشِ کوتاه «آماده؟» — از زمانِ پاسخ کم نمی‌شود. */
  resuming: boolean;
  /** شمارندهٔ بازگشت‌ها: هر روپوش هویتِ خودش را دارد تا دومی هم واقعاً اجرا شود. */
  resumeSeq: number;

  feedback: { id: number; kind: FeedbackKind } | null;

  questionStats: QuestionStats;
  sessionStats: SessionStats;

  error: string | null;
}

export type RapidAruzAction =
  | { type: "REQUEST_QUESTIONS" }
  | { type: "QUESTIONS_LOADED"; questions: RapidAruzQuestion[] }
  | { type: "LOAD_FAILED"; message: string }
  | { type: "FONT_READY" }
  | { type: "PREVIEW_DONE" }
  | { type: "SPOILER_DONE" }
  | { type: "ARM_UNIT"; occurredAt: number }
  | {
      type: "ANSWER";
      length: ScansionLength;
      inputMethod: RapidAruzInputMethod;
      occurredAt: number;
    }
  | { type: "DEADLINE_REACHED"; unitAttemptId: number; occurredAt: number }
  | { type: "FEEDBACK_DONE"; runId: number; questionEpoch: number }
  | { type: "START_NEW_RUN"; questionEpoch: number }
  | { type: "COMPLETION_DONE"; questionEpoch: number }
  | { type: "NEXT_QUESTION" }
  | { type: "RETRY_QUESTION" }
  | { type: "PAUSE"; reason: PauseReason; occurredAt: number }
  | { type: "RESUME"; reason: PauseReason; occurredAt: number }
  | { type: "RESUME_READY"; occurredAt: number }
  | { type: "BACK_TO_INTRO" };

export function emptyQuestionStats(questionId: string): QuestionStats {
  return {
    questionId,
    attemptCount: 0,
    wrongChoices: 0,
    timeouts: 0,
    correctInputs: 0,
    bestStreak: 0,
    responseTimes: [],
    successfulRunTimeMs: null,
  };
}

export function createInitialState(config: RapidAruzConfig): RapidAruzState {
  return {
    phase: "intro",
    config,
    questions: [],
    questionIndex: 0,
    questionEpoch: 0,
    runId: 0,
    unitAttemptId: 0,
    unitIndex: 0,
    revealProgress: 0,
    currentStreak: 0,
    attempt: null,
    activeAccumMs: 0,
    activeSince: null,
    runStartedActive: null,
    pauseReasons: [],
    resuming: false,
    resumeSeq: 0,
    feedback: null,
    questionStats: emptyQuestionStats(""),
    sessionStats: {
      questionsCompleted: 0,
      totalCorrectInputs: 0,
      totalWrongChoices: 0,
      totalTimeouts: 0,
      overallActiveTimeMs: 0,
    },
    error: null,
  };
}

// ─────────────────────────── انتخابگرها ───────────────────────────

export function isPaused(state: RapidAruzState): boolean {
  return state.pauseReasons.length > 0;
}

/** ساعتِ فعالِ سؤال در لحظهٔ occurredAt (performance.now). */
export function activeNow(state: RapidAruzState, occurredAt: number): number {
  return state.activeSince === null
    ? state.activeAccumMs
    : state.activeAccumMs + (occurredAt - state.activeSince);
}

export function currentQuestion(state: RapidAruzState): RapidAruzQuestion | null {
  return state.questions[state.questionIndex] ?? null;
}

export function currentUnit(state: RapidAruzState) {
  return currentQuestion(state)?.units[state.unitIndex] ?? null;
}

/** ورودی فقط وقتی معنی دارد که واحد مسلح و زنده باشد. */
export function canAcceptInput(state: RapidAruzState): boolean {
  return (
    state.phase === "playing" &&
    state.attempt !== null &&
    !state.attempt.committed &&
    !isPaused(state) &&
    !state.resuming
  );
}

/** فازهایی که «صفحهٔ بازی» هستند و روی موبایل تمام‌صفحه می‌شوند. */
export function isActiveGameplay(phase: RapidAruzPhase): boolean {
  return (
    phase === "preview" ||
    phase === "spoilerTransition" ||
    phase === "armingUnit" ||
    phase === "playing" ||
    phase === "resetFeedbackWrong" ||
    phase === "resetFeedbackTimeout" ||
    phase === "resetting" ||
    phase === "completed"
  );
}

export function accuracy(stats: QuestionStats | SessionStats): number {
  const correct = "correctInputs" in stats ? stats.correctInputs : stats.totalCorrectInputs;
  const wrong = "wrongChoices" in stats ? stats.wrongChoices : stats.totalWrongChoices;
  const timeouts = "timeouts" in stats ? stats.timeouts : stats.totalTimeouts;
  const total = correct + wrong + timeouts;
  return total === 0 ? 0 : correct / total;
}

export function averageResponseTime(stats: QuestionStats): number | null {
  if (stats.responseTimes.length === 0) return null;
  const sum = stats.responseTimes.reduce((a, b) => a + b, 0);
  return sum / stats.responseTimes.length;
}

// ─────────────────────────── کمکی‌های داخلی ───────────────────────────

/** ساعت را نگه می‌دارد و مقدارِ انباشته را به‌روز می‌کند. */
function stopClock(state: RapidAruzState, occurredAt: number): Pick<
  RapidAruzState,
  "activeAccumMs" | "activeSince"
> {
  return { activeAccumMs: activeNow(state, occurredAt), activeSince: null };
}

function withFeedback(state: RapidAruzState, kind: FeedbackKind) {
  return { id: (state.feedback?.id ?? 0) + 1, kind };
}

/** شروعِ یک دورِ تازه — اتمی. هیچ‌جای دیگری حق ندارد این‌ها را تکه‌تکه عوض کند. */
function startNewRun(state: RapidAruzState): RapidAruzState {
  return {
    ...state,
    phase: state.config.replayPreviewOnReset ? "preview" : "armingUnit",
    runId: state.runId + 1,
    unitAttemptId: state.unitAttemptId + 1,
    unitIndex: 0,
    revealProgress: state.config.resetRevealOnMistake ? 0 : state.revealProgress,
    currentStreak: 0,
    attempt: null,
    runStartedActive: null,
    feedback: null,
    questionStats: { ...state.questionStats, attemptCount: state.questionStats.attemptCount + 1 },
  };
}

/** پاک‌کردنِ کاملِ وضعیتِ یک سؤال — با شناسهٔ تازه، تا هیچ callbackِ قدیمی نچسبد. */
function beginQuestion(state: RapidAruzState, questionIndex: number): RapidAruzState {
  const question = state.questions[questionIndex];
  return {
    ...state,
    phase: "waitingForFont",
    questionIndex,
    questionEpoch: state.questionEpoch + 1,
    runId: state.runId + 1,
    unitAttemptId: state.unitAttemptId + 1,
    unitIndex: 0,
    revealProgress: 0,
    currentStreak: 0,
    attempt: null,
    activeAccumMs: 0,
    activeSince: null,
    runStartedActive: null,
    resuming: false,
    feedback: null,
    questionStats: emptyQuestionStats(question?.id ?? ""),
    error: null,
  };
}

// ─────────────────────────── reducer ───────────────────────────

export function rapidAruzReducer(
  state: RapidAruzState,
  action: RapidAruzAction,
): RapidAruzState {
  switch (action.type) {
    case "REQUEST_QUESTIONS":
      return { ...state, phase: "loadingQuestion", error: null };

    case "QUESTIONS_LOADED": {
      // فقط وقتی واقعاً منتظرِ بارگذاری بودیم. دو بار سوارشدنِ افکت در
      // StrictMode نباید نشست را از نو بچیند.
      if (state.phase !== "loadingQuestion") return state;
      if (action.questions.length === 0) {
        return { ...state, phase: "error", error: "سؤالِ معتبری برای شروع پیدا نشد." };
      }
      const withQuestions: RapidAruzState = {
        ...state,
        questions: action.questions,
        sessionStats: {
          questionsCompleted: 0,
          totalCorrectInputs: 0,
          totalWrongChoices: 0,
          totalTimeouts: 0,
          overallActiveTimeMs: 0,
        },
      };
      return beginQuestion(withQuestions, 0);
    }

    case "LOAD_FAILED":
      return { ...state, phase: "error", error: action.message };

    case "FONT_READY":
      return state.phase === "waitingForFont" ? { ...state, phase: "preview" } : state;

    case "PREVIEW_DONE":
      return state.phase === "preview" ? { ...state, phase: "spoilerTransition" } : state;

    case "SPOILER_DONE": {
      if (state.phase !== "spoilerTransition") return state;
      return {
        ...state,
        phase: "armingUnit",
        runId: state.runId + 1,
        unitAttemptId: state.unitAttemptId + 1,
        unitIndex: 0,
        revealProgress: 0,
        currentStreak: 0,
        attempt: null,
        runStartedActive: null,
        questionStats: {
          ...state.questionStats,
          attemptCount: state.questionStats.attemptCount + 1,
        },
      };
    }

    case "ARM_UNIT": {
      // مسلح‌شدن و باز شدنِ ورودی یک گذارِ واحدند: تایمر و دکمه‌ها با هم
      // زنده می‌شوند، نه یکی جلوتر از دیگری.
      if (state.phase !== "armingUnit" || isPaused(state) || state.resuming) return state;
      const question = currentQuestion(state);
      const unit = question?.units[state.unitIndex];
      if (!question || !unit) return state;

      const startedActive = state.activeAccumMs;
      const durationMs = getUnitDuration(state.config, question.difficulty, state.unitIndex);

      return {
        ...state,
        phase: "playing",
        activeSince: action.occurredAt,
        runStartedActive: state.unitIndex === 0 ? startedActive : state.runStartedActive,
        attempt: {
          id: state.unitAttemptId,
          runId: state.runId,
          questionEpoch: state.questionEpoch,
          unitIndex: state.unitIndex,
          startedActive,
          durationMs,
          deadlineActive: startedActive + durationMs,
          committed: false,
          outcome: null,
        },
      };
    }

    case "ANSWER": {
      if (!canAcceptInput(state)) return state;
      const attempt = state.attempt!;
      const unit = currentUnit(state);
      if (!unit) return state;

      const now = activeNow(state, action.occurredAt);
      // مهلت بر ورودیِ دیررس مقدم است — حتی اگر callbackِ timeout هنوز
      // پشتِ event loop مانده باشد.
      if (now >= attempt.deadlineActive - DEADLINE_EPSILON_MS) {
        return commitOutcome(state, "timeout", action.occurredAt);
      }
      const correct = action.length === unit.length;
      return commitOutcome(state, correct ? "correct" : "wrong", action.occurredAt);
    }

    case "DEADLINE_REACHED": {
      const attempt = state.attempt;
      if (
        !attempt ||
        attempt.id !== action.unitAttemptId ||
        attempt.committed ||
        state.phase !== "playing" ||
        isPaused(state) ||
        state.resuming
      ) {
        return state;
      }
      if (activeNow(state, action.occurredAt) < attempt.deadlineActive - DEADLINE_EPSILON_MS) {
        return state; // زودتر بیدار شده؛ زمان‌سنج دوباره برنامه‌ریزی می‌کند
      }
      return commitOutcome(state, "timeout", action.occurredAt);
    }

    case "FEEDBACK_DONE": {
      if (state.phase !== "resetFeedbackWrong" && state.phase !== "resetFeedbackTimeout") {
        return state;
      }
      if (action.runId !== state.runId || action.questionEpoch !== state.questionEpoch) {
        return state;
      }
      return { ...state, phase: "resetting" };
    }

    case "START_NEW_RUN": {
      if (state.phase !== "resetting" || action.questionEpoch !== state.questionEpoch) return state;
      return startNewRun(state);
    }

    case "COMPLETION_DONE": {
      if (state.phase !== "completed" || action.questionEpoch !== state.questionEpoch) return state;
      const isLast = state.questionIndex >= state.questions.length - 1;
      return { ...state, phase: isLast ? "sessionResults" : "questionResults" };
    }

    case "NEXT_QUESTION": {
      if (state.phase !== "questionResults") return state;
      return beginQuestion(state, state.questionIndex + 1);
    }

    case "RETRY_QUESTION": {
      if (state.phase !== "questionResults" && state.phase !== "sessionResults") return state;
      // سؤالِ تکراری از نو پیش‌نمایش می‌گیرد: هر questionEpoch تازه از
      // waitingForFont شروع می‌شود، پس سیاستِ پیش‌نمایشِ «تلاشِ دوباره» همین است.
      return beginQuestion(state, state.questionIndex);
    }

    case "PAUSE": {
      if (state.pauseReasons.includes(action.reason)) return state;
      return {
        ...state,
        pauseReasons: [...state.pauseReasons, action.reason],
        resuming: false,
        ...stopClock(state, action.occurredAt),
      };
    }

    case "RESUME": {
      if (!state.pauseReasons.includes(action.reason)) return state;
      const remaining = state.pauseReasons.filter((r) => r !== action.reason);
      const stillPaused = remaining.length > 0;
      return {
        ...state,
        pauseReasons: remaining,
        // تا وقتی همهٔ دلیل‌ها برنداشته نشده‌اند، بازی برنمی‌گردد.
        resuming: !stillPaused,
        resumeSeq: stillPaused ? state.resumeSeq : state.resumeSeq + 1,
      };
    }

    case "RESUME_READY": {
      if (isPaused(state) || !state.resuming) return state;
      const shouldRunClock = state.phase === "playing" && state.attempt !== null;
      return {
        ...state,
        resuming: false,
        activeSince: shouldRunClock ? action.occurredAt : state.activeSince,
      };
    }

    case "BACK_TO_INTRO":
      return { ...createInitialState(state.config), questions: state.questions };

    default:
      return state;
  }
}

/**
 * تنها راهِ ثبتِ نتیجهٔ یک واحد.
 *
 * ساعت اینجا می‌ایستد، آمار اینجا به‌روز می‌شود و فازِ بعدی اینجا انتخاب
 * می‌شود — یک‌جا و اتمی. برای پاسخِ درست، واحدِ بعد بلافاصله در همین گذار
 * آماده می‌شود؛ هیچ تأخیرِ تزئینی بینِ دو واحد نیست.
 */
function commitOutcome(
  state: RapidAruzState,
  outcome: UnitOutcome,
  occurredAt: number,
): RapidAruzState {
  const attempt = state.attempt;
  const question = currentQuestion(state);
  if (!attempt || attempt.committed || !question) return state;

  const clock = stopClock(state, occurredAt);
  const committedAttempt: UnitAttempt = { ...attempt, committed: true, outcome };
  const base: RapidAruzState = { ...state, ...clock, attempt: committedAttempt };

  if (outcome === "correct") {
    const responseTime = clock.activeAccumMs - attempt.startedActive;
    const streak = state.currentStreak + 1;
    const stats: QuestionStats = {
      ...state.questionStats,
      correctInputs: state.questionStats.correctInputs + 1,
      bestStreak: Math.max(state.questionStats.bestStreak, streak),
      responseTimes: [...state.questionStats.responseTimes, responseTime],
    };
    const sessionStats: SessionStats = {
      ...state.sessionStats,
      totalCorrectInputs: state.sessionStats.totalCorrectInputs + 1,
    };

    const isLastUnit = state.unitIndex >= question.units.length - 1;

    if (isLastUnit) {
      return {
        ...base,
        phase: "completed",
        currentStreak: streak,
        revealProgress: 1,
        feedback: withFeedback(state, "complete"),
        questionStats: {
          ...stats,
          successfulRunTimeMs:
            state.runStartedActive === null
              ? null
              : clock.activeAccumMs - state.runStartedActive,
        },
        sessionStats: {
          ...sessionStats,
          questionsCompleted: sessionStats.questionsCompleted + 1,
          overallActiveTimeMs: sessionStats.overallActiveTimeMs + clock.activeAccumMs,
        },
      };
    }

    return {
      ...base,
      phase: "armingUnit",
      unitIndex: state.unitIndex + 1,
      unitAttemptId: state.unitAttemptId + 1,
      attempt: null,
      currentStreak: streak,
      revealProgress: revealProgressAfterUnit(question.units, state.unitIndex),
      feedback: withFeedback(state, "correct"),
      questionStats: stats,
      sessionStats,
    };
  }

  // نادرست و پایانِ زمان هر دو یعنی برگشت به واحدِ اول. بدون checkpoint،
  // حتی اگر روی واحدِ آخر باشد.
  const isWrong = outcome === "wrong";
  return {
    ...base,
    phase: isWrong ? "resetFeedbackWrong" : "resetFeedbackTimeout",
    currentStreak: 0,
    feedback: withFeedback(state, isWrong ? "wrong" : "timeout"),
    questionStats: {
      ...state.questionStats,
      wrongChoices: state.questionStats.wrongChoices + (isWrong ? 1 : 0),
      timeouts: state.questionStats.timeouts + (isWrong ? 0 : 1),
    },
    sessionStats: {
      ...state.sessionStats,
      totalWrongChoices: state.sessionStats.totalWrongChoices + (isWrong ? 1 : 0),
      totalTimeouts: state.sessionStats.totalTimeouts + (isWrong ? 0 : 1),
    },
  };
}
