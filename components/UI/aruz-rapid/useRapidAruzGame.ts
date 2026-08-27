"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import {
  activeNow,
  canAcceptInput,
  createInitialState,
  isPaused,
  rapidAruzReducer,
  type PauseReason,
  type RapidAruzState,
} from "@/lib/aruz-rapid/machine";
import type { RapidAruzConfig } from "@/lib/aruz-rapid/config";
import type { RapidAruzInputMethod, ScansionLength } from "@/lib/aruz-rapid/types";
import type { RapidAruzQuestionSource } from "@/lib/aruz-rapid/source";
import { useSuspendableTimeout } from "./useSuspendableTimeout";

/** نشانه‌های زمانیِ گذارِ «درست → واحدِ بعد»، برای اندازه‌گیریِ واقعیِ QA. */
export interface TransitionMark {
  unitAttemptId: number;
  unitIndex: number;
  correctCommittedAt?: number;
  nextUnitRenderedAt?: number;
  /** لحظهٔ مسلح‌شدن: هم شروعِ مهلت، هم باز شدنِ ورودی. یک گذارِ واحد. */
  armedAt?: number;
  inputEnabledRenderedAt?: number;
}

const MAX_MARKS = 240;

interface DebugBridge {
  marks: TransitionMark[];
  mountCount: number;
  getState: () => RapidAruzState;
}

declare global {
  interface Window {
    __aruzRapid?: DebugBridge;
    __aruzRapidDebugEnabled?: boolean;
  }
}

let mountCount = 0;

/** چند بار این بازی سوار شده — برای اثباتِ اینکه تغییرِ چیدمان remount نمی‌سازد. */
export function rapidAruzMountCount(): number {
  return mountCount;
}

export interface RapidAruzGameApi {
  state: RapidAruzState;
  paused: boolean;
  acceptsInput: boolean;
  /** تنها درِ ورودیِ بازی: موس، لمس و صفحه‌کلید همه از همین‌جا می‌گذرند. */
  requestAnswer: (length: ScansionLength, inputMethod: RapidAruzInputMethod) => void;
  startSession: () => void;
  nextQuestion: () => void;
  retryQuestion: () => void;
  backToIntro: () => void;
  pause: (reason: PauseReason) => void;
  resume: (reason: PauseReason) => void;
}

export function useRapidAruzGame({
  config,
  source,
}: {
  config: RapidAruzConfig;
  source: RapidAruzQuestionSource;
}): RapidAruzGameApi {
  const [state, dispatch] = useReducer(rapidAruzReducer, config, createInitialState);

  const stateRef = useRef(state);
  const marksRef = useRef<TransitionMark[]>([]);
  const lastAnswerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  });

  const paused = isPaused(state);
  const acceptsInput = canAcceptInput(state);

  // ── شمارندهٔ mount: اثباتِ اینکه تغییرِ چیدمان بازی را از نو سوار نمی‌کند ──
  useEffect(() => {
    mountCount += 1;
    if (process.env.NODE_ENV !== "production") {
      console.info(`[aruz-rapid] mount #${mountCount}`);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production" && !window.__aruzRapidDebugEnabled) return;
    window.__aruzRapid = {
      marks: marksRef.current,
      mountCount,
      getState: () => stateRef.current,
    };
  }, [state]);

  // ─────────────────── ورودی ───────────────────

  const requestAnswer = useCallback(
    (length: ScansionLength, inputMethod: RapidAruzInputMethod) => {
      const occurredAt = performance.now();
      lastAnswerRef.current = occurredAt;
      // تصمیمِ درست/نادرست/پایانِ زمان داخلِ reducer گرفته می‌شود؛ اینجا
      // فقط رویداد گزارش می‌شود. دو ضربهٔ هم‌زمان هم دو نتیجه نمی‌سازند.
      dispatch({ type: "ANSWER", length, inputMethod, occurredAt });
    },
    [],
  );

  const startSession = useCallback(() => {
    dispatch({ type: "REQUEST_QUESTIONS" });
  }, []);

  const nextQuestion = useCallback(() => dispatch({ type: "NEXT_QUESTION" }), []);
  const retryQuestion = useCallback(() => dispatch({ type: "RETRY_QUESTION" }), []);
  const backToIntro = useCallback(() => dispatch({ type: "BACK_TO_INTRO" }), []);

  const pause = useCallback(
    (reason: PauseReason) => dispatch({ type: "PAUSE", reason, occurredAt: performance.now() }),
    [],
  );
  const resume = useCallback(
    (reason: PauseReason) => dispatch({ type: "RESUME", reason, occurredAt: performance.now() }),
    [],
  );

  // ─────────────────── بارگذاریِ سؤال‌ها ───────────────────

  useEffect(() => {
    if (state.phase !== "loadingQuestion") return;
    let cancelled = false;
    source
      .getQuestions({ limit: config.questionsPerSession, shuffle: true })
      .then((questions) => {
        if (!cancelled) dispatch({ type: "QUESTIONS_LOADED", questions });
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: "LOAD_FAILED", message: "بارگذاریِ سؤال‌ها ممکن نشد." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.phase, source, config.questionsPerSession]);

  // ─────────────────── آمادگیِ فونت ───────────────────
  //
  // ساعتِ پیش‌نمایش وقتی شروع می‌شود که کاربر واقعاً متنِ نهایی را ببیند:
  // اول فونت، بعد یک paint، بعد شمارش. زمانِ دانلودِ فونت از سهمِ مطالعهٔ
  // دانش‌آموز کم نمی‌شود.
  useEffect(() => {
    if (state.phase !== "waitingForFont") return;
    let cancelled = false;

    const proceed = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) dispatch({ type: "FONT_READY" });
        });
      });
    };

    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (fonts?.ready) {
      fonts.ready.then(proceed).catch(proceed);
    } else {
      proceed();
    }

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.questionEpoch]);

  // ─────────────────── مسلح‌کردنِ واحد ───────────────────
  //
  // دو rAF یعنی «بعد از اینکه واحدِ تازه واقعاً رنگ شد». پیش از آن، شروعِ
  // مهلت ناعادلانه است. این یک تأخیرِ تزئینی نیست؛ همان یک فریمی است که
  // مرورگر برای نشان‌دادنِ واحد لازم دارد.
  useEffect(() => {
    if (state.phase !== "armingUnit" || paused || state.resuming) return;
    let cancelled = false;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (!cancelled) dispatch({ type: "ARM_UNIT", occurredAt: performance.now() });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [state.phase, state.unitAttemptId, paused, state.resuming]);

  // ─────────────────── مهلتِ پاسخ ───────────────────
  //
  // مرجع، deadlineActive است. setTimeout فقط بیدارباش است و اگر زود بیدار
  // شد، دوباره می‌خوابد. با مکث، افکت پاک می‌شود و در بازگشت با باقی‌ماندهٔ
  // درست از نو بسته می‌شود.
  const attemptId = state.attempt?.id ?? null;
  useEffect(() => {
    if (state.phase !== "playing" || attemptId === null) return;
    if (paused || state.resuming || state.activeSince === null) return;

    let timer = 0;
    const tick = () => {
      const current = stateRef.current;
      const attempt = current.attempt;
      if (!attempt || attempt.id !== attemptId || attempt.committed) return;
      const remaining = attempt.deadlineActive - activeNow(current, performance.now());
      if (remaining > 0.5) {
        timer = window.setTimeout(tick, remaining);
        return;
      }
      dispatch({
        type: "DEADLINE_REACHED",
        unitAttemptId: attemptId,
        occurredAt: performance.now(),
      });
    };

    const remaining = state.attempt!.deadlineActive - activeNow(state, performance.now());
    timer = window.setTimeout(tick, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [state, attemptId, paused, state.phase, state.activeSince, state.resuming]);

  // ─────────────────── انتظارهای نمایشی ───────────────────

  const epochKey = `${state.questionEpoch}:${state.runId}`;

  useSuspendableTimeout({
    timeoutKey: state.phase === "preview" ? `preview:${epochKey}` : null,
    durationMs: config.previewDurationMs,
    paused,
    onDone: useCallback(() => dispatch({ type: "PREVIEW_DONE" }), []),
  });

  useSuspendableTimeout({
    timeoutKey: state.phase === "spoilerTransition" ? `spoiler:${epochKey}` : null,
    durationMs: config.spoilerTransitionMs,
    paused,
    onDone: useCallback(() => dispatch({ type: "SPOILER_DONE" }), []),
  });

  const feedbackPhase =
    state.phase === "resetFeedbackWrong" || state.phase === "resetFeedbackTimeout";
  const runId = state.runId;
  const questionEpoch = state.questionEpoch;

  useSuspendableTimeout({
    timeoutKey: feedbackPhase ? `feedback:${epochKey}` : null,
    durationMs:
      state.phase === "resetFeedbackTimeout" ? config.timeoutFeedbackMs : config.wrongFeedbackMs,
    paused,
    onDone: useCallback(
      () => dispatch({ type: "FEEDBACK_DONE", runId, questionEpoch }),
      [runId, questionEpoch],
    ),
  });

  useSuspendableTimeout({
    timeoutKey: state.phase === "resetting" ? `reset:${epochKey}` : null,
    durationMs: config.resetDelayMs,
    paused,
    onDone: useCallback(() => dispatch({ type: "START_NEW_RUN", questionEpoch }), [questionEpoch]),
  });

  useSuspendableTimeout({
    timeoutKey: state.phase === "completed" ? `complete:${epochKey}` : null,
    durationMs: config.completionRevealMs,
    paused,
    onDone: useCallback(() => dispatch({ type: "COMPLETION_DONE", questionEpoch }), [questionEpoch]),
  });

  useSuspendableTimeout({
    timeoutKey: state.resuming ? `resume:${epochKey}:${state.resumeSeq}` : null,
    durationMs: config.resumeOverlayMs,
    paused,
    onDone: useCallback(() => dispatch({ type: "RESUME_READY", occurredAt: performance.now() }), []),
  });

  // ─────────────────── اندازه‌گیریِ گذار ───────────────────

  useLayoutEffect(() => {
    const marks = marksRef.current;
    if (state.phase === "armingUnit") {
      marks.push({
        unitAttemptId: state.unitAttemptId,
        unitIndex: state.unitIndex,
        correctCommittedAt: lastAnswerRef.current ?? undefined,
        nextUnitRenderedAt: performance.now(),
      });
      if (marks.length > MAX_MARKS) marks.splice(0, marks.length - MAX_MARKS);
    } else if (state.phase === "playing" && state.attempt) {
      const mark = marks.findLast?.((m) => m.unitAttemptId === state.unitAttemptId);
      if (mark) {
        mark.armedAt = state.activeSince ?? undefined;
        mark.inputEnabledRenderedAt = performance.now();
      }
    }
  }, [state.phase, state.unitAttemptId, state.unitIndex, state.attempt, state.activeSince]);

  return useMemo(
    () => ({
      state,
      paused,
      acceptsInput,
      requestAnswer,
      startSession,
      nextQuestion,
      retryQuestion,
      backToIntro,
      pause,
      resume,
    }),
    [
      state,
      paused,
      acceptsInput,
      requestAnswer,
      startSession,
      nextQuestion,
      retryQuestion,
      backToIntro,
      pause,
      resume,
    ],
  );
}
