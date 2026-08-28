"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GameIntro from "@/components/UI/games/GameIntro";
import {
  GRAMMAR_CIRCUIT_CONFIG,
  buildSessionQuestions,
  defaultGrammarCircuitSource,
  prepareQuestion,
  type GrammarCircuitQuestion,
  type PlacementInputMethod,
} from "@/lib/grammar-circuit";
import {
  grammarCircuitReducer,
  initialGrammarCircuitState,
  usedPieceIds,
} from "@/lib/grammar-circuit/reducer";
import ActiveShell from "./ActiveShell";
import CircuitContent from "./CircuitContent";
import DragGhostLayer from "./DragGhostLayer";
import GrammarCircuitPreview from "./GrammarCircuitPreview";
import RoleTray from "./RoleTray";
import SessionResults from "./SessionResults";
import type { CurrentPhase } from "./CircuitSvgLayer";
import type { LampState } from "./Lamp";
import { useActiveTime } from "./hooks/useActiveTime";
import { useCircuitAudio } from "./hooks/useCircuitAudio";
import { useCircuitDnD } from "./hooks/useCircuitDnD";
import { useCircuitLayout } from "./hooks/useCircuitLayout";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";

/** ریشهٔ بازی — و تنها جایی که چرخهٔ عمرِ معنایی زندگی می‌کند.
 *
 *  این کامپوننت عمداً *یک بار* mount می‌شود و تا خروج از مسیر همان‌جا می‌ماند:
 *  عوض‌شدنِ تم، چرخشِ دستگاه، تغییرِ اندازهٔ پنجره و جابه‌جاییِ چیدمانِ موبایل/
 *  دسکتاپ همه با CSS و کلاس انجام می‌شوند، نه با جابه‌جا کردنِ درختِ React.
 *  اگر این کامپوننت ری‌مانت شود، reducer صفر می‌شود و بازیِ نیمه‌کارهٔ
 *  دانش‌آموز از بین می‌رود. */

interface Metrics {
  mounts: number;
  lastCommitAt: number | null;
  lastCurrentStartAt: number | null;
  lastFinalCommitAt: number | null;
  finalCommitToCurrentMs: number | null;
  commitToInteractionReadyMs: number | null;
}

function metrics(): Metrics {
  const w = window as unknown as { __grammarCircuit?: Metrics };
  w.__grammarCircuit ??= {
    mounts: 0,
    lastCommitAt: null,
    lastCurrentStartAt: null,
    lastFinalCommitAt: null,
    finalCommitToCurrentMs: null,
    commitToInteractionReadyMs: null,
  };
  return w.__grammarCircuit;
}

export default function GrammarCircuitGame() {
  const config = GRAMMAR_CIRCUIT_CONFIG;
  const [state, dispatch] = useReducer(
    grammarCircuitReducer,
    initialGrammarCircuitState,
  );
  const [pool, setPool] = useState<GrammarCircuitQuestion[]>([]);
  const [loadError, setLoadError] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const prepared = state.questions[state.questionIndex] ?? null;
  const interactive = state.screen === "playing" && state.status === "playing";

  // برای کالبک‌های ناهمگام. بعد از هر commit تازه می‌شود، پس هر تایمر یا
  // انیمیشنی که بعداً آتش بگیرد epoch درست را می‌بیند.
  const epochRef = useRef(state.epoch);
  useEffect(() => {
    epochRef.current = state.epoch;
  }, [state.epoch]);

  /* ── سنجه‌ها. ارزان‌اند و همان‌ها هستند که در QA اندازه گرفته می‌شوند. ── */
  useEffect(() => {
    metrics().mounts += 1;
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (config.allowCorrectModuleRemoval) {
      console.warn(
        "[grammar-circuit] allowCorrectModuleRemoval هنوز پیاده‌سازی نشده؛ " +
          "سوکتِ بسته همچنان هدفِ هیچ تعاملی نیست.",
      );
    }
  }, [config.allowCorrectModuleRemoval]);

  /* ── منبعِ سؤال ───────────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    void defaultGrammarCircuitSource
      .getQuestions()
      .then((questions) => {
        if (alive) setPool(questions);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ── زمانِ فعال ───────────────────────────────────────────────────────── */
  const { reset: resetTime, setRunning: setTimeRunning, read: readTime } = useActiveTime();
  const timedEpochRef = useRef(-1);
  useEffect(() => {
    const running = state.screen === "playing" && state.status === "playing";
    if (timedEpochRef.current !== state.epoch) {
      timedEpochRef.current = state.epoch;
      resetTime(running);
    } else {
      setTimeRunning(running);
    }
  }, [resetTime, setTimeRunning, state.epoch, state.screen, state.status]);

  /* ── صدا ──────────────────────────────────────────────────────────────── */
  const { play, unlock, toggle: toggleSound, enabled: soundOn } = useCircuitAudio(
    config.audioSourceMode,
    config.soundVolume,
  );

  /* ── هندسه ────────────────────────────────────────────────────────────── */
  const contentRef = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const powerRef = useRef<HTMLDivElement | null>(null);
  const lampRef = useRef<HTMLDivElement | null>(null);

  const slotTokenIds = useMemo(
    () => prepared?.layoutSlots.map((s) => s.tokenId) ?? [],
    [prepared],
  );

  const { geometry, measured, registerWord } = useCircuitLayout({
    contentRef,
    laneRef,
    viewportRef,
    powerRef,
    lampRef,
    slotTokenIds,
    epoch: state.epoch,
    config,
  });

  /* ── خطِ لولهٔ واحدِ گذاشتن ─────────────────────────────────────────────
     کشیدن، لمس و صفحه‌کلید هر سه از همین یک در وارد می‌شوند؛ اعتبارسنجیِ
     دستوری فقط و فقط داخلِ reducer است. */
  const attemptPlacement = useCallback(
    (pieceId: string, tokenId: string, inputMethod: PlacementInputMethod) => {
      dispatch({ type: "ATTEMPT", pieceId, tokenId, inputMethod });
    },
    [],
  );

  const onPickup = useCallback(() => play("pickup"), [play]);
  const onDrop = useCallback(
    (pieceId: string, tokenId: string) =>
      attemptPlacement(pieceId, tokenId, "pointer"),
    [attemptPlacement],
  );
  const onDragCancel = useCallback(() => {
    // رها کردن در شکاف، بیرونِ برد، لغوِ لمس، چرخشِ دستگاه یا از دست رفتنِ
    // فوکوس هیچ‌کدام «پاسخِ غلط» نیستند و در آمار ثبت نمی‌شوند.
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
    enabled: interactive,
    activationDistance: config.dragActivationDistance,
    touchLiftPx: config.touchDragLiftPx,
    onPickup,
    onDrop,
    onCancel: onDragCancel,
  });

  /* مسیرِ صفحه‌کلید هیچ‌وقت به `allowTapToPlace` وابسته نیست: تعاملِ بدونِ
     کشیدن یک الزامِ دسترس‌پذیری است، نه یک قابلیتِ اختیاری. آن پرچم فقط
     «لمس برای گذاشتن» با اشاره‌گر را روشن و خاموش می‌کند. */
  const onModuleActivate = useCallback(
    (pieceId: string, viaKeyboard: boolean) => {
      // کلیکی که دنبالهٔ یک کشیدنِ تمام‌شده است نباید دوباره انتخاب کند.
      if (shouldSuppressClick()) return;
      unlock();
      if (!viaKeyboard && !config.allowTapToPlace) return;
      dispatch({ type: "TOGGLE_PIECE", pieceId });
    },
    [config.allowTapToPlace, shouldSuppressClick, unlock],
  );

  const onTapToken = useCallback(
    (tokenId: string, viaKeyboard: boolean) => {
      if (shouldSuppressClick()) return;
      if (!viaKeyboard && !config.allowTapToPlace) return;
      if (!state.selectedPieceId) return;
      attemptPlacement(
        state.selectedPieceId,
        tokenId,
        viaKeyboard ? "keyboard" : "tap",
      );
    },
    [attemptPlacement, config.allowTapToPlace, shouldSuppressClick, state.selectedPieceId],
  );

  // Escape بیرون از حالتِ کشیدن هم باید انتخاب را رها کند.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "CLEAR_SELECTION" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── بازخوردِ کوتاهِ نادرست ─────────────────────────────────────────────
     نتیجه *مشتق* می‌شود، پس هیچ setStateی داخلِ افکت لازم نیست؛ فقط
     پاک‌کردنش با تایمر انجام می‌شود. */
  const [clearedRejectNonce, setClearedRejectNonce] = useState(0);
  const rejectedTokenId =
    state.outcome.kind === "wrong" && state.outcome.nonce > clearedRejectNonce
      ? state.outcome.tokenId
      : null;
  const freshTokenId =
    state.outcome.kind === "correct" ? state.outcome.tokenId : null;

  useEffect(() => {
    if (!rejectedTokenId) return;
    const nonce = state.outcome.nonce;
    const timer = window.setTimeout(
      () => setClearedRejectNonce(nonce),
      config.wrongReturnDurationMs,
    );
    return () => clearTimeout(timer);
  }, [config.wrongReturnDurationMs, rejectedTokenId, state.outcome.nonce]);

  /* ── صدا و سنجهٔ هر نتیجه ─────────────────────────────────────────────── */
  const handledNonceRef = useRef(0);
  useEffect(() => {
    const outcome = state.outcome;
    if (outcome.kind === "none" || outcome.nonce === handledNonceRef.current) return;
    handledNonceRef.current = outcome.nonce;

    const now = performance.now();
    const m = metrics();
    if (outcome.kind === "correct") {
      m.lastCommitAt = now;
      // هیچ انتظاری برای پایانِ انیمیشن وجود ندارد: همان لحظه‌ای که اتصال ثبت
      // می‌شود، تعاملِ بعدی در دسترس است (مگر خودِ سؤال تمام شده باشد).
      m.commitToInteractionReadyMs = 0;
      if (outcome.final) m.lastFinalCommitAt = now;
      play("connect");
    } else {
      play("wrong");
    }
  }, [play, state.outcome]);

  /* ── دنبالهٔ کامل‌شدن ──────────────────────────────────────────────────── */
  const [sequence, setSequence] = useState<{
    epoch: number;
    phase: CurrentPhase;
    lamp: LampState;
  }>({ epoch: -1, phase: "idle", lamp: "off" });

  const phase: CurrentPhase = sequence.epoch === state.epoch ? sequence.phase : "idle";
  const lampState: LampState = sequence.epoch === state.epoch ? sequence.lamp : "off";

  const timersRef = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers, state.epoch]);

  useEffect(() => {
    if (state.status !== "completing") return;
    const epoch = state.epoch;

    // اگر لامپ بیرون از ناحیهٔ دیدِ فعلی است، قبل از روشن‌شدن به شکلِ کنترل‌شده
    // به آن می‌رسیم؛ پاداشی که دیده نشود پاداش نیست.
    const viewport = viewportRef.current;
    const lamp = lampRef.current;
    if (viewport && lamp) {
      const vr = viewport.getBoundingClientRect();
      const lr = lamp.getBoundingClientRect();
      if (lr.left < vr.left || lr.right > vr.right) {
        const delta =
          lr.left < vr.left ? lr.left - vr.left - 24 : lr.right - vr.right + 24;
        viewport.scrollBy({
          left: delta,
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }
    }

    const timer = window.setTimeout(() => {
      if (epochRef.current !== epoch) return;
      metrics().lastCurrentStartAt = performance.now();
      const m = metrics();
      if (m.lastFinalCommitAt != null && m.lastCurrentStartAt != null) {
        m.finalCommitToCurrentMs = Math.round(
          m.lastCurrentStartAt - m.lastFinalCommitAt,
        );
      }
      setSequence({ epoch, phase: "traveling", lamp: "receivingCurrent" });
      play("current");
    }, config.finalCompletionLeadInMs);
    timersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [config.finalCompletionLeadInMs, play, reducedMotion, state.epoch, state.status]);

  const onCurrentFinished = useCallback(
    (epoch: number) => {
      // کالبکِ کهنه حقِ دست‌زدن به حالتِ جدید را ندارد.
      if (epochRef.current !== epoch) return;
      setSequence({ epoch, phase: "done", lamp: "turningOn" });
      play("lampOn");
      timersRef.current.push(
        window.setTimeout(() => {
          if (epochRef.current !== epoch) return;
          setSequence({ epoch, phase: "done", lamp: "on" });
          timersRef.current.push(
            window.setTimeout(() => {
              if (epochRef.current !== epoch) return;
              dispatch({ type: "COMPLETE_QUESTION" });
            }, config.rewardDisplayDurationMs),
          );
        }, config.lampTurnOnDurationMs),
      );
    },
    [config.lampTurnOnDurationMs, config.rewardDisplayDurationMs, play],
  );

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

  /* ── جای شروعِ اسکرولِ افقی ─────────────────────────────────────────────
     بازهٔ `scrollLeft` در راست‌به‌چپ بینِ مرورگرها یکسان نیست: کروم/فایرفاکسِ
     امروز [‎-max, 0] می‌دهند و وبکیتِ قدیمی [0, max]. حدس زدنِ قرارداد لازم
     نیست، چون یک چیز در *همهٔ* آن‌ها یکی است: بزرگ‌ترین مقدارِ قابلِ رسیدن
     یعنی «پنجره تا انتهای سمتِ راستِ محتوا رفته». در فارسی خواندن از همان‌جا
     شروع می‌شود.

     پس یک عددِ بزرگ می‌نویسیم و می‌گذاریم مرورگر خودش به سقفِ خودش برش بزند؛
     در چپ‌به‌راست هم قرینه‌اش (کفِ بازه) همان ابتدای خواندن است. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !measured) return;
    if (el.scrollWidth - el.clientWidth <= 0) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollLeft = rtl ? el.scrollWidth : -el.scrollWidth;
  }, [measured, state.epoch]);

  /* ── شروع / ادامه ─────────────────────────────────────────────────────── */
  const startSession = useCallback(() => {
    if (pool.length === 0) return;
    unlock();
    const seed = Date.now();
    // ترتیبِ سؤال‌ها و بُرِ سینی هر دو همین‌جا و فقط یک بار ساخته می‌شوند.
    const session = buildSessionQuestions(pool, config.questionsPerSession, seed);
    const preparedList = session.map((question, index) =>
      prepareQuestion(question, seed + index * 7919),
    );
    dispatch({ type: "START", questions: preparedList });
  }, [config.questionsPerSession, pool, unlock]);

  const goNext = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION", activeTimeMs: readTime() });
  }, [readTime]);

  /* ── رندر ─────────────────────────────────────────────────────────────── */
  if (state.screen === "results") {
    return <SessionResults results={state.results} onRestart={startSession} />;
  }

  if (state.screen !== "playing" || !prepared) {
    return (
      <div dir="rtl" className="container mx-auto py-8">
        <GameIntro
          title="مدار دستور"
          tagline="نقش هر کلمه را در جای درست قرار بده و مدار را روشن کن."
          steps={[
            "یک قطعهٔ نقش را از سینی بردار — با کشیدن یا فقط با یک لمس.",
            "آن را به سوکتِ زیرِ واژهٔ درست وصل کن.",
            "با بسته‌شدنِ آخرین شکاف، جریان راه می‌افتد و لامپ روشن می‌شود.",
          ]}
          accent="text-primary"
          chipBg="bg-primary/15 text-primary"
          Preview={GrammarCircuitPreview}
          onStart={startSession}
          cta={pool.length === 0 ? (loadError ? "سؤالی در دسترس نیست" : "در حالِ آماده‌سازی…") : "شروع"}
        />
      </div>
    );
  }

  const used = usedPieceIds(state.placementsByTokenId);
  const connectedCount = Object.keys(state.placementsByTokenId).length;
  const draggedPiece = drag ? prepared.pieceById.get(drag.pieceId) : undefined;
  const labelOf = (roleKey: string) =>
    prepared.roleByKey.get(roleKey)?.label ?? roleKey;

  // دو ناحیهٔ زندهٔ متناوب: پیامِ یکسانِ پشتِ سرِ هم هم واقعاً دوباره خوانده
  // می‌شود. جوابِ درست هیچ‌وقت فاش نمی‌شود.
  const liveMessage =
    state.outcome.kind === "correct"
      ? "اتصال درست بود."
      : state.outcome.kind === "wrong"
        ? "این اتصال درست نیست."
        : "";
  const evenTurn = state.outcome.nonce % 2 === 0;

  /* پوسته در پورتالی کنارِ `<body>` رندر می‌شود.
     دلیلش صرفاً «بالاتر بودن» نیست: مسیرِ بازی داخلِ `GameShell` است که خودش
     `position:relative; z-index:20` دارد و یک stacking context می‌سازد؛ داخلِ
     آن، هیچ z-indexی نمی‌تواند از فوترِ سایت (که هم‌رتبه و بعد از main است)
     بالاتر برود. پورتال، پوسته را از آن context بیرون می‌آورد.
     درختِ React ثابت می‌ماند، پس این کار هیچ ری‌مانتی نمی‌سازد. */
  const shell = (
    <>
      <ActiveShell
        questionNumber={state.questionIndex + 1}
        questionCount={state.questions.length}
        connected={connectedCount}
        required={prepared.requiredSlotCount}
        wrongAttempts={state.wrongAttempts}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => dispatch({ type: "EXIT_TO_INTRO" })}
        onRestartQuestion={() => dispatch({ type: "RESTART_QUESTION" })}
        viewportRef={viewportRef}
        tray={
          <RoleTray
            pieces={prepared.trayPieces}
            labelOf={labelOf}
            usedPieceIds={used}
            selectedPieceId={state.selectedPieceId}
            draggingPieceId={drag?.pieceId ?? null}
            disabled={!interactive}
            onPointerDown={beginPointerDrag}
            onActivate={onModuleActivate}
          />
        }
        banner={
          state.status === "complete" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
              <div className="pointer-events-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-[var(--gc-border)] bg-[var(--gc-board-elevated)] p-4 text-center shadow-lg">
                <p className="text-base font-extrabold text-[var(--gc-accent)]">
                  مدار کامل شد!
                </p>
                {prepared.question.explanation && (
                  <p className="text-xs leading-relaxed text-[var(--gc-text-muted)]">
                    {prepared.question.explanation}
                  </p>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="mt-1 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
                >
                  {state.questionIndex + 1 >= state.questions.length
                    ? "دیدنِ نتیجه"
                    : "مدارِ بعدی"}
                </button>
              </div>
            </div>
          ) : null
        }
      >
        <CircuitContent
          prepared={prepared}
          config={config}
          geometry={geometry}
          measured={measured}
          placements={state.placementsByTokenId}
          selectedPieceId={state.selectedPieceId}
          activeTargetTokenId={activeTargetTokenId}
          rejectedTokenId={rejectedTokenId}
          freshTokenId={freshTokenId}
          interactive={interactive}
          phase={phase}
          lampState={lampState}
          reducedMotion={reducedMotion}
          epoch={state.epoch}
          contentRef={contentRef}
          laneRef={laneRef}
          powerRef={powerRef}
          lampRef={lampRef}
          registerWord={registerWord}
          registerHitTarget={registerHitTarget}
          onTapToken={onTapToken}
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

  return typeof document === "undefined"
    ? shell
    : createPortal(shell, document.body);
}
