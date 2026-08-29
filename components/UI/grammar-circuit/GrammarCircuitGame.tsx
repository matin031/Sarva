"use client";

// شیوه‌نامهٔ همین بازی، کنارِ خودش. توضیحِ دلیلش بالای همان فایل است.
import "./grammar-circuit.css";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GradeKey } from "@/lib/doroos/types";
import {
  ApiGrammarCircuitSource,
  GRAMMAR_CIRCUIT_CONFIG,
  GrammarCircuitSourceError,
  buildSessionQuestions,
  fetchGrammarCircuitAvailability,
  prepareQuestion,
  type GrammarCircuitAvailability,
  type GrammarCircuitQuestion,
  type PlacementInputMethod,
} from "@/lib/grammar-circuit";
import {
  grammarCircuitReducer,
  initialGrammarCircuitState,
  isArrangeable,
  usedPieceIds,
} from "@/lib/grammar-circuit/reducer";
import ActiveShell from "./ActiveShell";
import CircuitContent from "./CircuitContent";
import DragGhostLayer from "./DragGhostLayer";
import QuestionRegion from "./QuestionRegion";
import RoleTray from "./RoleTray";
import SessionResults from "./SessionResults";
import SetupScreen from "./SetupScreen";
import ValidationBar from "./ValidationBar";
import type { CurrentPhase } from "./CircuitSvgLayer";
import type { LampState } from "./Lamp";
import { useActiveTime } from "./hooks/useActiveTime";
import { useCircuitAudio } from "./hooks/useCircuitAudio";
import { useCircuitDnD } from "./hooks/useCircuitDnD";
import { useCircuitLayout } from "./hooks/useCircuitLayout";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";
import { useResponsiveConfig } from "./hooks/useResponsiveConfig";

/** ریشهٔ بازی — و تنها جایی که چرخهٔ عمرِ معنایی زندگی می‌کند.
 *
 *  یک بار mount می‌شود و تا خروج از مسیر همان‌جا می‌ماند: تمِ صفحه، چرخشِ
 *  دستگاه و تغییرِ اندازه همه با CSS انجام می‌شوند، نه با جابه‌جا کردنِ درختِ
 *  React. اگر ری‌مانت شود، بازیِ نیمه‌کارهٔ دانش‌آموز از بین می‌رود. */

interface Metrics {
  mounts: number;
  validationPressedAt: number | null;
  steps: Array<{ tokenId: string; checkingAt: number; resultAt: number | null }>;
  validationFinishedAt: number | null;
  fullCurrentStartedAt: number | null;
  lampOnAt: number | null;
  lampFlickerStartedAt: number | null;
  lampPopAt: number | null;
  failureReviewReadyAt: number | null;
}

function metrics(): Metrics {
  const w = window as unknown as { __grammarCircuit?: Metrics };
  w.__grammarCircuit ??= {
    mounts: 0,
    validationPressedAt: null,
    steps: [],
    validationFinishedAt: null,
    fullCurrentStartedAt: null,
    lampOnAt: null,
    lampFlickerStartedAt: null,
    lampPopAt: null,
    failureReviewReadyAt: null,
  };
  return w.__grammarCircuit;
}

const source = new ApiGrammarCircuitSource();

export default function GrammarCircuitGame() {
  const config = useResponsiveConfig(GRAMMAR_CIRCUIT_CONFIG);
  const [state, dispatch] = useReducer(grammarCircuitReducer, initialGrammarCircuitState);
  const reducedMotion = usePrefersReducedMotion();

  const prepared = state.questions[state.questionIndex] ?? null;
  const arrangeable = state.screen === "playing" && isArrangeable(state.phase);

  const epochRef = useRef(state.epoch);
  const runIdRef = useRef(state.validationRunId);
  useEffect(() => {
    epochRef.current = state.epoch;
    runIdRef.current = state.validationRunId;
  }, [state.epoch, state.validationRunId]);

  useEffect(() => {
    metrics().mounts += 1;
  }, []);

  /* ── موجودیِ محتوا برای صفحهٔ انتخاب ─────────────────────────────────── */
  /* موجودیِ محتوا در *یک* حالت نگه داشته می‌شود، نه سه حالتِ موازی که
     می‌توانند با هم ناسازگار شوند («در حالِ خواندن» و «خطا» هم‌زمان). */
  const [availabilityState, setAvailabilityState] = useState<{
    nonce: number;
    status: "loading" | "ready" | "error";
    data: GrammarCircuitAvailability | null;
    error: string | null;
  }>({ nonce: 0, status: "loading", data: null, error: null });

  const availability = availabilityState.data;
  const availabilityLoading = availabilityState.status === "loading";
  const availabilityError =
    availabilityState.status === "error" ? availabilityState.error : null;

  const reloadAvailability = useCallback(() => {
    setAvailabilityState((prev) => ({
      nonce: prev.nonce + 1,
      status: "loading",
      data: null,
      error: null,
    }));
  }, []);

  const availabilityNonce = availabilityState.nonce;
  useEffect(() => {
    let alive = true;
    void fetchGrammarCircuitAvailability()
      .then((data) => {
        if (alive) {
          setAvailabilityState({ nonce: availabilityNonce, status: "ready", data, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setAvailabilityState({
          nonce: availabilityNonce,
          status: "error",
          data: null,
          error:
            err instanceof GrammarCircuitSourceError
              ? err.message
              : "ارتباط با سرور برقرار نشد.",
        });
      });
    return () => {
      alive = false;
    };
  }, [availabilityNonce]);

  /* ── زمانِ فعال ───────────────────────────────────────────────────────── */
  const { reset: resetTime, setRunning: setTimeRunning, read: readTime } = useActiveTime();
  const timedEpochRef = useRef(-1);
  useEffect(() => {
    const running = state.screen === "playing" && isArrangeable(state.phase);
    if (timedEpochRef.current !== state.epoch) {
      timedEpochRef.current = state.epoch;
      resetTime(running);
    } else {
      setTimeRunning(running);
    }
  }, [resetTime, setTimeRunning, state.epoch, state.phase, state.screen]);

  /* ── صدا ──────────────────────────────────────────────────────────────── */
  const { play, unlock, toggle: toggleSound, enabled: soundOn } = useCircuitAudio(
    config.audioSourceMode,
    config.soundVolume,
  );

  /* ── هندسه ────────────────────────────────────────────────────────────── */
  const contentRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const powerRef = useRef<HTMLDivElement | null>(null);
  const lampRef = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLElement | null>(null);

  const slotTokenIds = useMemo(
    () => prepared?.layoutSlots.map((s) => s.tokenId) ?? [],
    [prepared],
  );

  const { geometry, measured, registerSocket, registerWord } = useCircuitLayout({
    contentRef,
    stripRef,
    trayRef,
    viewportRef,
    powerRef,
    lampRef,
    slotTokenIds,
    epoch: state.epoch,
  });

  /* ── خطِ لولهٔ واحدِ چیدن ───────────────────────────────────────────────
     کشیدن، لمس و صفحه‌کلید هر سه از همین یک در وارد می‌شوند. هیچ‌کدام
     درستی را نمی‌سنجند — آن کار فقط با «بررسی اتصال» انجام می‌شود. */
  const placePiece = useCallback(
    (pieceId: string, tokenId: string, inputMethod: PlacementInputMethod) => {
      dispatch({ type: "PLACE", pieceId, tokenId, inputMethod });
    },
    [],
  );

  const onPickup = useCallback(() => play("chipPick"), [play]);
  const onDrop = useCallback(
    (pieceId: string, tokenId: string) => placePiece(pieceId, tokenId, "pointer"),
    [placePiece],
  );
  const onDragCancel = useCallback(() => {
    // رها کردن در شکاف، بیرونِ برد، لغوِ لمس یا چرخشِ دستگاه: هیچ‌کدام خطا
    // نیستند و در آمار ثبت نمی‌شوند.
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const {
    drag,
    activeTargetTokenId,
    beginPointerDrag,
    registerHitTarget,
    ghostRef,
    shouldSuppressClick,
  } = useCircuitDnD({
    enabled: arrangeable,
    activationDistance: config.dragActivationDistance,
    touchLiftPx: config.touchDragLiftPx,
    onPickup,
    onDrop,
    onCancel: onDragCancel,
  });

  const onModuleActivate = useCallback(
    (pieceId: string, viaKeyboard: boolean) => {
      if (shouldSuppressClick()) return;
      unlock();
      if (!viaKeyboard && !config.allowTapToPlace) return;
      dispatch({ type: "TOGGLE_PIECE", pieceId });
    },
    [config.allowTapToPlace, shouldSuppressClick, unlock],
  );

  /** لمسِ خانه: اگر قطعه‌ای انتخاب شده بگذارش، وگرنه قطعهٔ داخلش را بردار. */
  const onSocketActivate = useCallback(
    (tokenId: string, viaKeyboard: boolean) => {
      if (shouldSuppressClick()) return;
      if (!viaKeyboard && !config.allowTapToPlace) return;
      const method: PlacementInputMethod = viaKeyboard ? "keyboard" : "tap";
      if (state.selectedPieceId) {
        placePiece(state.selectedPieceId, tokenId, method);
        return;
      }
      if (state.placementsByTokenId[tokenId]) {
        dispatch({ type: "LIFT", tokenId, inputMethod: method });
      }
    },
    [
      config.allowTapToPlace,
      placePiece,
      shouldSuppressClick,
      state.placementsByTokenId,
      state.selectedPieceId,
    ],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "CLEAR_SELECTION" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── صدای چیدن ────────────────────────────────────────────────────────
     صدای نشستنِ قطعه *همیشه یکسان* است، چه پاسخ درست باشد چه غلط. اگر
     غلط‌ها صدای دیگری بدهند، بازی همان چیزی را لو می‌دهد که قرار بود تا
     «بررسی اتصال» پنهان بماند. */
  const handledNonceRef = useRef(0);
  useEffect(() => {
    const outcome = state.outcome;
    if (outcome.kind === "none" || outcome.nonce === handledNonceRef.current) return;
    handledNonceRef.current = outcome.nonce;
    if (outcome.kind === "seated") play("chipPlaceNeutral");
    else if (outcome.kind === "lifted") play("chipPick");
  }, [play, state.outcome]);

  /* ── دنبالهٔ تشخیص و نتیجه ─────────────────────────────────────────────
     همهٔ تایمرها با epoch و شناسهٔ اجرا محافظت می‌شوند: یک اجرای کهنه هرگز
     نتیجهٔ اصلاحِ تازه را دست نمی‌زند. */
  const timersRef = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers, state.epoch, state.validationRunId]);

  const [sequence, setSequence] = useState<{
    epoch: number;
    runId: number;
    current: CurrentPhase;
    lamp: LampState;
  }>({ epoch: -1, runId: -1, current: "idle", lamp: "off" });

  const seqLive = sequence.epoch === state.epoch && sequence.runId === state.validationRunId;
  const currentPhase: CurrentPhase = seqLive ? sequence.current : "idle";
  const lampState: LampState = seqLive ? sequence.lamp : "off";

  /* پالسِ تشخیصی: خانه‌به‌خانه، از راست به چپ. */
  useEffect(() => {
    if (state.phase !== "validating" || !prepared) return;
    const epoch = state.epoch;
    const runId = state.validationRunId;
    const m = metrics();
    m.validationPressedAt = performance.now();
    m.steps = [];
    m.validationFinishedAt = null;

    const order = prepared.validationOrder;
    let t = reducedMotion ? 60 : config.diagnosticLeadInMs;
    const checkMs = reducedMotion ? 90 : config.diagnosticCheckMs;
    const gapMs = reducedMotion ? 60 : config.diagnosticStepGapMs;
    let allCorrect = true;

    order.forEach((tokenId) => {
      const pieceId = state.placementsByTokenId[tokenId];
      const slot = prepared.slotByTokenId.get(tokenId);
      const piece = pieceId ? prepared.pieceById.get(pieceId) : undefined;
      // تنها جایی در کلِ بازی که درستی سنجیده می‌شود.
      const correct = Boolean(
        slot && piece && slot.acceptedRoleKeys.includes(piece.roleKey),
      );
      if (!correct) allCorrect = false;

      timersRef.current.push(
        window.setTimeout(() => {
          if (epochRef.current !== epoch || runIdRef.current !== runId) return;
          metrics().steps.push({ tokenId, checkingAt: performance.now(), resultAt: null });
          dispatch({ type: "SET_CHECKING", tokenId, runId });
          play("diagnosticStep");
        }, t),
      );
      t += checkMs;

      timersRef.current.push(
        window.setTimeout(() => {
          if (epochRef.current !== epoch || runIdRef.current !== runId) return;
          const step = metrics().steps.find((s) => s.tokenId === tokenId);
          if (step) step.resultAt = performance.now();
          dispatch({
            type: "SET_RESULT",
            tokenId,
            result: correct ? "correct" : "wrong",
            runId,
          });
          play(correct ? "slotCorrect" : "slotWrong");
        }, t),
      );
      t += gapMs;
    });

    t += reducedMotion ? 80 : config.diagnosticTailMs;
    timersRef.current.push(
      window.setTimeout(() => {
        if (epochRef.current !== epoch || runIdRef.current !== runId) return;
        metrics().validationFinishedAt = performance.now();
        dispatch({ type: "VALIDATION_FINISHED", runId, allCorrect });
      }, t),
    );

    play("validationStart");
    return clearTimers;
  }, [
    clearTimers,
    config.diagnosticCheckMs,
    config.diagnosticLeadInMs,
    config.diagnosticStepGapMs,
    config.diagnosticTailMs,
    play,
    prepared,
    reducedMotion,
    state.epoch,
    state.phase,
    state.placementsByTokenId,
    state.validationRunId,
  ]);

  /* موفقیت: جریانِ کامل از باتری تا لامپ — فقط وقتی همه درست بوده‌اند. */
  useEffect(() => {
    if (state.phase !== "successCurrent") return;
    const epoch = state.epoch;
    const runId = state.validationRunId;
    scrollLampIntoView(viewportRef.current, lampRef.current, reducedMotion);
    const timer = window.setTimeout(() => {
      if (epochRef.current !== epoch || runIdRef.current !== runId) return;
      metrics().fullCurrentStartedAt = performance.now();
      setSequence({ epoch, runId, current: "traveling", lamp: "receiving" });
      play("fullCurrent");
    }, config.finalCompletionLeadInMs);
    timersRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [config.finalCompletionLeadInMs, play, reducedMotion, state.epoch, state.phase, state.validationRunId]);

  const onCurrentFinished = useCallback(
    (epoch: number, runId: number) => {
      if (epochRef.current !== epoch || runIdRef.current !== runId) return;
      metrics().lampOnAt = performance.now();
      setSequence({ epoch, runId, current: "live", lamp: "turningOn" });
      play("lampOn");
      timersRef.current.push(
        window.setTimeout(() => {
          if (epochRef.current !== epoch || runIdRef.current !== runId) return;
          setSequence({ epoch, runId, current: "live", lamp: "on" });
          timersRef.current.push(
            window.setTimeout(() => {
              if (epochRef.current !== epoch || runIdRef.current !== runId) return;
              dispatch({ type: "CURRENT_FINISHED", runId });
              dispatch({ type: "REWARD_DONE", runId });
            }, config.rewardDisplayDurationMs),
          );
        }, config.lampTurnOnDurationMs),
      );
    },
    [config.lampTurnOnDurationMs, config.rewardDisplayDurationMs, play],
  );

  /* شکست: تلاشِ ناموفقِ روشن‌شدن — چشمک، تق، خاموشی. */
  useEffect(() => {
    if (state.phase !== "failureSequence") return;
    const epoch = state.epoch;
    const runId = state.validationRunId;
    /* شروعِ چشمک در یک تایمرِ صفر می‌نشیند، نه در بدنهٔ افکت: به‌روزرسانیِ
       همگامِ state داخلِ افکت یک رندرِ آبشاری می‌سازد. */
    timersRef.current.push(
      window.setTimeout(() => {
        if (epochRef.current !== epoch || runIdRef.current !== runId) return;
        metrics().lampFlickerStartedAt = performance.now();
        setSequence({ epoch, runId, current: "idle", lamp: "flicker" });
        play("lampFlicker");
      }, 0),
    );

    timersRef.current.push(
      window.setTimeout(() => {
        if (epochRef.current !== epoch || runIdRef.current !== runId) return;
        metrics().lampPopAt = performance.now();
        setSequence({ epoch, runId, current: "idle", lamp: "failed" });
        play("lampPop");
        timersRef.current.push(
          window.setTimeout(() => {
            if (epochRef.current !== epoch || runIdRef.current !== runId) return;
            metrics().failureReviewReadyAt = performance.now();
            dispatch({ type: "FAILURE_SEQUENCE_DONE", runId });
          }, reducedMotion ? 120 : config.failureTailMs),
        );
      }, reducedMotion ? 120 : config.lampPopDelayMs),
    );
    return clearTimers;
  }, [
    clearTimers,
    config.failureTailMs,
    config.lampPopDelayMs,
    play,
    reducedMotion,
    state.epoch,
    state.phase,
    state.validationRunId,
  ]);

  /* ── قفلِ اسکرولِ صفحه در حالِ بازی ─────────────────────────────────────── */
  useEffect(() => {
    if (state.screen !== "playing") return;
    const root = document.documentElement;
    root.classList.add("gc-locked");
    document.body.classList.add("gc-locked");
    return () => {
      root.classList.remove("gc-locked");
      document.body.classList.remove("gc-locked");
    };
  }, [state.screen]);

  /* ── جای شروعِ اسکرولِ افقی ───────────────────────────────────────────────
     بازهٔ `scrollLeft` در RTL بینِ مرورگرها یکسان نیست، ولی یک چیز در همه‌شان
     یکی است: بزرگ‌ترین مقدارِ قابلِ رسیدن یعنی «پنجره تا انتهای سمتِ راستِ
     محتوا رفته» — همان‌جا که خواندنِ فارسی شروع می‌شود. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !measured) return;
    if (el.scrollWidth - el.clientWidth <= 0) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollLeft = rtl ? el.scrollWidth : -el.scrollWidth;

    /* جمله‌های بلند یک استثنا دارند: ممکن است اولین خانهٔ خالی آن‌قدر چپ
       باشد که در قابِ اول اصلاً دیده نشود. آن‌وقت بازی با یک تختهٔ ظاهراً
       خالی باز می‌شود و کاربر نمی‌داند باید اسکرول کند. پس اگر *هیچ* خانه‌ای
       در دید نبود — و فقط آن‌وقت — به‌اندازهٔ لازم می‌لغزیم تا نزدیک‌ترین
       خانه پیدا شود. برای جمله‌های کوتاه این شرط هیچ‌وقت برقرار نمی‌شود و
       رفتار همان «از ابتدای خواندن» می‌ماند. */
    const targets = Array.from(el.querySelectorAll<HTMLElement>(".gc-col[data-target]"));
    if (targets.length === 0) return;

    const frame = el.getBoundingClientRect();
    const visible = (node: HTMLElement) => {
      const r = node.getBoundingClientRect();
      return r.right > frame.left + 8 && r.left < frame.right - 8;
    };
    if (targets.some(visible)) return;

    const first = targets[0];
    const r = first.getBoundingClientRect();
    el.scrollLeft += r.left + r.width / 2 - (frame.left + frame.width / 2);
  }, [measured, state.epoch, state.phase]);

  /* ── شروعِ جلسه ───────────────────────────────────────────────────────── */
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const startSession = useCallback(
    async (grade: GradeKey, lessons: number[]) => {
      setStarting(true);
      setStartError(null);
      unlock();
      try {
        const pool: GrammarCircuitQuestion[] = await source.getQuestions({
          grade,
          lessons,
        });
        if (pool.length === 0) {
          setStartError("برای درس‌های انتخابی پرسشِ آماده‌ای پیدا نشد.");
          return;
        }
        const seed = Date.now();
        const session = buildSessionQuestions(pool, config.questionsPerSession, seed, lessons);
        const preparedList = session.map((question, index) =>
          prepareQuestion(question, seed + index * 7919),
        );
        dispatch({ type: "START", session: { grade, lessons }, questions: preparedList });
      } catch (err: unknown) {
        setStartError(
          err instanceof GrammarCircuitSourceError
            ? err.message
            : "دریافتِ پرسش‌ها ممکن نشد. دوباره تلاش کن.",
        );
      } finally {
        setStarting(false);
      }
    },
    [config.questionsPerSession, unlock],
  );

  const goNext = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION", activeTimeMs: readTime() });
  }, [readTime]);

  /* ── رندر ─────────────────────────────────────────────────────────────── */
  if (state.screen === "results") {
    return (
      <SessionResults
        results={state.results}
        session={state.session}
        onRestart={() =>
          state.session && void startSession(state.session.grade, state.session.lessons)
        }
        onChangeLessons={() => dispatch({ type: "EXIT_TO_SETUP" })}
      />
    );
  }

  if (state.screen !== "playing" || !prepared) {
    return (
      <SetupScreen
        availability={availability}
        loading={availabilityLoading}
        error={availabilityError}
        onRetry={reloadAvailability}
        onStart={(grade, lessons) => void startSession(grade, lessons)}
        starting={starting}
        startError={startError}
      />
    );
  }

  const used = usedPieceIds(state.placementsByTokenId);
  const filled = Object.keys(state.placementsByTokenId).length;
  const draggedPiece = drag ? prepared.pieceById.get(drag.pieceId) : undefined;
  const labelOf = (roleKey: string) => prepared.roleByKey.get(roleKey)?.label ?? roleKey;

  // دو ناحیهٔ زندهٔ متناوب، تا پیامِ یکسانِ پشتِ سرِ هم هم واقعاً خوانده شود.
  const liveMessage = announcement(state.phase, state.outcome.kind);
  const evenTurn = state.outcome.nonce % 2 === 0;

  const shell = (
    <>
      <ActiveShell
        questionNumber={state.questionIndex + 1}
        questionCount={state.questions.length}
        filled={filled}
        required={prepared.requiredSlotCount}
        attempts={state.attempts}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => dispatch({ type: "EXIT_TO_SETUP" })}
        onClearBoard={() => dispatch({ type: "CLEAR_BOARD" })}
        clearDisabled={!arrangeable || filled === 0}
        viewportRef={viewportRef}
        question={
          <QuestionRegion
            tokens={prepared.question.tokens}
            attribution={prepared.question.attribution}
          />
        }
        controls={
          <ValidationBar
            phase={state.phase}
            filled={filled}
            required={prepared.requiredSlotCount}
            onValidate={() => dispatch({ type: "BEGIN_VALIDATION" })}
            onCorrect={() => dispatch({ type: "ENTER_CORRECTION" })}
            onNext={goNext}
            isLastQuestion={state.questionIndex + 1 >= state.questions.length}
          />
        }
        tray={
          <RoleTray
            hostRef={trayRef}
            pieces={prepared.trayPieces}
            labelOf={labelOf}
            usedPieceIds={used}
            selectedPieceId={state.selectedPieceId}
            draggingPieceId={drag?.pieceId ?? null}
            disabled={!arrangeable}
            onPointerDown={beginPointerDrag}
            onActivate={onModuleActivate}
          />
        }
        banner={null}
      >
        <CircuitContent
          prepared={prepared}
          config={config}
          geometry={geometry}
          measured={measured}
          placements={state.placementsByTokenId}
          validation={state.validationByTokenId}
          lockedTokenIds={state.lockedTokenIds}
          activeTargetTokenId={activeTargetTokenId}
          armed={Boolean(state.selectedPieceId)}
          interactive={arrangeable}
          freshTokenId={state.outcome.kind === "seated" ? state.outcome.tokenId : null}
          currentPhase={currentPhase}
          lampState={lampState}
          reducedMotion={reducedMotion}
          epoch={state.epoch}
          runId={state.validationRunId}
          contentRef={contentRef}
          stripRef={stripRef}
          powerRef={powerRef}
          lampRef={lampRef}
          registerSocket={registerSocket}
          registerWord={registerWord}
          registerHitTarget={registerHitTarget}
          onSocketActivate={onSocketActivate}
          onCurrentFinished={onCurrentFinished}
        />
      </ActiveShell>

      <DragGhostLayer
        drag={drag}
        label={draggedPiece ? labelOf(draggedPiece.roleKey) : ""}
        ghostRef={ghostRef}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {evenTurn ? liveMessage : ""}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {evenTurn ? "" : liveMessage}
      </div>
    </>
  );

  /* پوسته در پورتالی کنارِ `<body>` رندر می‌شود: مسیرِ بازی داخلِ `GameShell`
     است که خودش یک stacking context می‌سازد، و داخلِ آن هیچ z-indexی از
     فوترِ سایت بالاتر نمی‌رود. درختِ React ثابت می‌ماند، پس ری‌مانتی نیست. */
  return typeof document === "undefined" ? shell : createPortal(shell, document.body);
}

/** پیامِ صفحه‌خوان — هیچ‌وقت جوابِ درست را نمی‌گوید. */
function announcement(phase: string, outcome: string): string {
  if (phase === "validating") return "بررسیِ مدار آغاز شد.";
  if (phase === "failureReview") return "مدار بسته نشد؛ خانه‌های نادرست مشخص شدند.";
  if (phase === "successReward" || phase === "questionComplete") return "مدار کامل شد.";
  if (outcome === "seated") return "قطعه در خانه نشست.";
  if (outcome === "lifted") return "قطعه از خانه برداشته شد.";
  if (outcome === "blocked") return "این خانه پر است.";
  return "";
}

function scrollLampIntoView(
  viewport: HTMLDivElement | null,
  lamp: HTMLDivElement | null,
  reducedMotion: boolean,
) {
  if (!viewport || !lamp) return;
  const vr = viewport.getBoundingClientRect();
  const lr = lamp.getBoundingClientRect();
  if (lr.left >= vr.left && lr.right <= vr.right) return;
  const delta = lr.left < vr.left ? lr.left - vr.left - 24 : lr.right - vr.right + 24;
  viewport.scrollBy({ left: delta, behavior: reducedMotion ? "auto" : "smooth" });
}
