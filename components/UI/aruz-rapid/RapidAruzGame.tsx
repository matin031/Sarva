"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  currentQuestion,
  currentUnit,
  isActiveGameplay,
  type FeedbackKind,
} from "@/lib/aruz-rapid/machine";
import { DEFAULT_RAPID_ARUZ_CONFIG, type RapidAruzConfig } from "@/lib/aruz-rapid/config";
import { defaultRapidAruzSource, type RapidAruzQuestionSource } from "@/lib/aruz-rapid/source";
import type { ScansionLength } from "@/lib/aruz-rapid/types";
import { rapidAruzMountCount, useRapidAruzGame } from "./useRapidAruzGame";
import { useRapidAruzLayout } from "./useRapidAruzLayout";
import { useRapidAruzAudio } from "./useRapidAruzAudio";
import { useRapidAruzKeyboard } from "./useRapidAruzKeyboard";
import { useRapidAruzOrientationPause, useRapidAruzPause } from "./useRapidAruzPause";
import SpoileredPreview from "./SpoileredPreview";
import { AnswerControls, CurrentUnit, Progress, StepTimer, UnitDots } from "./GameController";
import CompactGameTopBar from "./CompactGameTopBar";
import IntroScreen from "./IntroScreen";
import ResultsScreen from "./ResultsScreen";

/** کلاسِ سراسری‌ای که سربرگ و پابرگِ سایت را در بازیِ تمام‌صفحه کنار می‌گذارد. */
const IMMERSIVE_CLASS = "aruzr-immersive";

export default function RapidAruzGame({
  config = DEFAULT_RAPID_ARUZ_CONFIG,
  source = defaultRapidAruzSource,
}: {
  config?: RapidAruzConfig;
  source?: RapidAruzQuestionSource;
}) {
  const game = useRapidAruzGame({ config, source });
  const { state, paused, acceptsInput } = game;
  const layout = useRapidAruzLayout();

  const rootRef = useRef<HTMLDivElement>(null);
  const [soundOn, setSoundOn] = useState(true);
  const audio = useRapidAruzAudio(config, soundOn);
  const lastSoundRef = useRef<number>(0);
  const [lastPressed, setLastPressed] = useState<{
    length: ScansionLength;
    kind: "correct" | "wrong" | "timeout";
  } | null>(null);
  const lastLengthRef = useRef<ScansionLength | null>(null);

  const question = currentQuestion(state);
  const unit = currentUnit(state);
  const phase = state.phase;

  const gameplay = isActiveGameplay(phase) || phase === "waitingForFont";
  const immersive = layout.compact && gameplay;
  const boardVisible = gameplay;
  const resultsVisible = phase === "questionResults" || phase === "sessionResults";
  const previewUncovered = phase === "waitingForFont" || phase === "preview" || phase === "completed";
  const spoilered = !previewUncovered || paused || state.resuming;

  // ── ورودی: یک مسیر برای موس، لمس و صفحه‌کلید ──
  const requestAnswer = useCallback(
    (length: ScansionLength, method: "pointer" | "keyboard") => {
      lastLengthRef.current = length;
      game.requestAnswer(length, method);
    },
    [game],
  );

  const onKeyboardAnswer = useCallback(
    (length: ScansionLength) => requestAnswer(length, "keyboard"),
    [requestAnswer],
  );

  useRapidAruzKeyboard({ enabled: gameplay, onAnswer: onKeyboardAnswer });

  useRapidAruzPause({
    active: gameplay,
    pauseOnVisibilityLoss: config.pauseOnVisibilityLoss,
    onPause: game.pause,
    onResume: game.resume,
  });

  useRapidAruzOrientationPause({
    active: gameplay && phase !== "completed",
    onPause: game.pause,
    onResume: game.resume,
  });

  // شمارهٔ سوارشدن روی خودِ DOM می‌نشیند تا QA بتواند ببیند عوض‌شدنِ چیدمان
  // بازی را از نو نساخته است. عمداً از راهِ render نمی‌آید.
  useEffect(() => {
    if (rootRef.current) rootRef.current.dataset.mount = String(rapidAruzMountCount());
  }, []);

  // ── حالتِ تمام‌صفحه: فقط یک کلاس روی <html> ──
  //
  // عمداً هیچ شاخهٔ تازه‌ای در درختِ React باز نمی‌شود. اگر سربرگ/پابرگ با
  // شرطِ JSX برداشته می‌شدند، جای این کامپوننت در درخت عوض می‌شد و React
  // کلِ بازی را از نو سوار می‌کرد — یعنی وسطِ بازی، همه‌چیز صفر.
  useEffect(() => {
    if (!immersive) return;
    const root = document.documentElement;
    root.classList.add(IMMERSIVE_CLASS);
    return () => root.classList.remove(IMMERSIVE_CLASS);
  }, [immersive]);

  // ── صدا و لرزش، همیشه در حاشیه؛ هیچ گذاری منتظرشان نیست ──
  useEffect(() => {
    const feedback = state.feedback;
    if (!feedback || feedback.id === lastSoundRef.current) return;
    lastSoundRef.current = feedback.id;

    const kind: FeedbackKind = feedback.kind;
    audio.play(kind === "complete" ? "complete" : kind);
    if (kind === "wrong" || kind === "timeout") audio.vibrate(18);

    if (kind === "correct" || kind === "wrong" || kind === "timeout") {
      setLastPressed(
        lastLengthRef.current ? { length: lastLengthRef.current, kind } : null,
      );
    } else {
      setLastPressed(null);
    }
  }, [state.feedback, audio]);

  // بازخوردِ رنگیِ دکمه خودش محو می‌شود و هیچ‌وقت جلوی واحدِ بعد را نمی‌گیرد.
  useEffect(() => {
    if (!lastPressed) return;
    const id = window.setTimeout(() => setLastPressed(null), 260);
    return () => window.clearTimeout(id);
  }, [lastPressed]);

  const startSession = useCallback(() => {
    // باز کردنِ AudioContext باید داخلِ همین رویدادِ کاربر باشد.
    audio.unlock();
    game.startSession();
  }, [audio, game]);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      if (!on) audio.unlock(); // روشن‌شدن هم باید در همین گذارِ کاربر باز شود
      return !on;
    });
  }, [audio]);

  const attempt = state.attempt;
  const timerRunning = phase === "playing" && !paused && !state.resuming && state.activeSince !== null;
  const elapsedAtStart = attempt ? Math.max(0, state.activeAccumMs - attempt.startedActive) : 0;
  const feedbackKind = state.feedback?.kind ?? null;

  const liveMessage = useMemo(() => {
    if (state.resuming) return "آماده؟";
    if (paused) return "بازی متوقف است";
    switch (phase) {
      case "resetFeedbackWrong":
        return "نادرست — از واحدِ اول";
      case "resetFeedbackTimeout":
        return "وقت تمام شد — از واحدِ اول";
      case "completed":
        return "کامل شد";
      default:
        return "";
    }
  }, [phase, paused, state.resuming]);

  return (
    <div
      ref={rootRef}
      className={`aruzr-root ${immersive ? "aruzr-root-immersive aruzr-night" : ""}`}
      data-phase={phase}
      data-immersive={immersive ? "true" : "false"}
      data-question={question?.id ?? ""}
      dir="rtl"
    >
      {/* ── جای ثابتِ نوارِ بالا ── */}
      <div className="aruzr-topbar-slot">
        {gameplay ? (
          <CompactGameTopBar onExit={game.backToIntro} soundOn={soundOn} onToggleSound={toggleSound}>
            <Progress
              attemptCount={Math.max(1, state.questionStats.attemptCount)}
              streak={state.currentStreak}
              compact={layout.compact}
            />
          </CompactGameTopBar>
        ) : null}
      </div>

      {/* ── جای ثابتِ صحنه ── */}
      <div className="aruzr-stage">
        {phase === "intro" ? (
          <IntroScreen
            shortSymbol={config.shortSymbol}
            longSymbol={config.longSymbol}
            onStart={startSession}
            loading={false}
          />
        ) : null}

        {phase === "loadingQuestion" ? (
          <div className="aruzr-notice aruzr-card aruzr-night container mx-auto my-10 max-w-md" dir="rtl">
            <span className="aruzr-spinner" aria-hidden="true" />
            <p className="text-sm">در حالِ آماده‌سازی…</p>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="aruzr-notice aruzr-card aruzr-night container mx-auto my-10 max-w-md" dir="rtl">
            <p className="text-base font-bold text-[color:var(--aruzr-rose)]">{state.error}</p>
            <button type="button" onClick={game.backToIntro} className="aruzr-ghost-btn">
              بازگشت
            </button>
          </div>
        ) : null}

        {boardVisible && question ? (
          <div className={`aruzr-board ${immersive ? "" : "aruzr-night"}`}>
            <div className="aruzr-preview-region">
              <SpoileredPreview
                text={question.previewText}
                reveal={state.revealProgress}
                spoilered={spoilered}
                accessible={previewUncovered && !paused && !state.resuming}
                label={previewUncovered ? "مصراع را بخوان" : "مصراعِ پوشیده"}
              />
              <div
                className="aruzr-preview-progress"
                data-running={phase === "preview" && !paused ? "true" : "false"}
                aria-hidden="true"
              >
                <div
                  className="aruzr-preview-progress-fill"
                  key={`preview:${state.questionEpoch}`}
                  style={{ animationDuration: `${config.previewDurationMs}ms` }}
                />
              </div>
              <UnitDots
                count={question.units.length}
                doneCount={phase === "completed" ? question.units.length : state.unitIndex}
                active={phase === "playing" || phase === "armingUnit"}
              />
            </div>

            <div className="aruzr-play-region">
              {/* واحد و مهلتش یک بلوکِ کانونی‌اند: نوار به همان واحد تعلق
                  دارد، نه به دکمه‌ها. */}
              <div className="aruzr-focus">
              <CurrentUnit
                display={unit?.display ?? ""}
                unitKey={`${state.questionEpoch}:${state.unitAttemptId}`}
                hidden={!(phase === "armingUnit" || phase === "playing") || paused || state.resuming}
                feedback={
                  feedbackKind === "correct" || feedbackKind === "wrong" || feedbackKind === "timeout"
                    ? feedbackKind
                    : null
                }
              />

              <StepTimer
                timerKey={`${state.unitAttemptId}:${state.activeSince ?? 0}`}
                durationMs={attempt?.durationMs ?? 0}
                elapsedMs={elapsedAtStart}
                running={timerRunning}
                idle={!(phase === "playing" || phase === "armingUnit")}
              />
              </div>

              <AnswerControls
                config={config}
                disabled={!acceptsInput}
                onAnswer={requestAnswer}
                lastPressed={lastPressed}
              />
            </div>

            {paused || state.resuming ? (
              <div className="aruzr-pause-overlay">
                <div className="aruzr-pause-card">
                  <p className="text-lg font-bold">{state.resuming ? "آماده؟" : "متوقف"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {state.resuming
                      ? "بازی همین حالا ادامه پیدا می‌کند."
                      : "برای ادامه به همین صفحه برگرد."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {resultsVisible ? (
          <ResultsScreen
            kind={phase === "sessionResults" ? "session" : "question"}
            question={question}
            questionStats={state.questionStats}
            questionActiveTimeMs={state.activeAccumMs}
            sessionStats={state.sessionStats}
            sessionActiveTimeMs={state.sessionStats.overallActiveTimeMs}
            questionNumber={state.questionIndex + 1}
            questionCount={state.questions.length}
            onNext={game.nextQuestion}
            onRetry={game.retryQuestion}
            onBackToIntro={game.backToIntro}
          />
        ) : null}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
    </div>
  );
}
