"use client";
import { useGuestRounds } from "@/lib/guest/use-guest-rounds";
import GuestLimitModal from "@/components/UI/GuestLimitModal";

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
import { immersiveMode } from "@/lib/immersive-mode";
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
import { ReportTargetProvider, useSetReportTarget } from "@/lib/reports/target";

/** کلاسِ سراسری‌ای که فقط اسکرولِ صفحه را در بازیِ تمام‌صفحه قفل می‌کند. */
const IMMERSIVE_CLASS = "aruzr-immersive";

type RapidAruzGameProps = {
  config?: RapidAruzConfig;
  source?: RapidAruzQuestionSource;
};

/** این بازی عمداً داخلِ `GameShell` نیست (توضیحش در `app/game/aruz-rapid`)،
 *  پس provider‌ِ گزارش را خودش می‌آورد — وگرنه `useSetReportTarget` بی‌صدا
 *  کاری نمی‌کند و دکمهٔ گزارش هرگز ظاهر نمی‌شود. */
export default function RapidAruzGame(props: RapidAruzGameProps) {
  return (
    <ReportTargetProvider>
      <RapidAruzGameInner {...props} />
    </ReportTargetProvider>
  );
}

function RapidAruzGameInner({
  config = DEFAULT_RAPID_ARUZ_CONFIG,
  source = defaultRapidAruzSource,
}: RapidAruzGameProps) {
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

  useSetReportTarget(
    question
      ? {
          area: "aruz_rapid",
          targetId: question.id,
          snapshot: question.previewText,
          targetRef: {
            meter: question.meter ?? null,
            attribution: question.attribution ?? null,
          },
        }
      : null,
  );
  const phase = state.phase;

  const gameplay = isActiveGameplay(phase) || phase === "waitingForFont";
  const immersive = layout.compact && gameplay;
  const boardVisible = gameplay;
  const resultsVisible = phase === "questionResults" || phase === "sessionResults";
  // مهمان سه بیت تقطیع می‌کند، بعد مدالِ ورود.
  const guest = useGuestRounds("aruz-rapid");
  const [guestPrompt, setGuestPrompt] = useState(false);

  /* هر بیتِ تمام‌شده یک واحد از سهمیه است. ثبت در لحظهٔ رسیدن به completed
     انجام می‌شود، نه هنگامِ شروع: بیتی که نیمه‌کاره رها شود نباید بسوزد. */
  const doneRef = useRef(false);
  useEffect(() => {
    if (phase === "completed") {
      if (!doneRef.current) {
        doneRef.current = true;
        guest.recordRound();
      }
    } else {
      doneRef.current = false;
    }
  }, [phase, guest]);

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

  // ── پوستهٔ سایت ──
  //
  // همان کلیدِ سراسریِ lib/immersive-mode که «پلِ وزن» هم از آن استفاده
  // می‌کند: روی موبایلِ در حالِ بازی، سربرگ و پاورقی اصلاً رندر نمی‌شوند؛
  // روی رومیزی سربرگ جمع می‌شود. شکلِ درختِ SiteChrome با این تغییر عوض
  // نمی‌شود (جایگاه‌ها ثابت‌اند)، پس بازی وسطِ کار remount نمی‌شود.
  useEffect(() => {
    immersiveMode.set(immersive ? "fullscreen" : gameplay ? "compact" : "off");
    return () => immersiveMode.set("off");
  }, [immersive, gameplay]);

  // قفلِ اسکرولِ صفحه فقط در حالتِ تمام‌صفحه. این تنها کاری است که کلاسِ
  // روی <html> انجام می‌دهد.
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

  // ── نشانه‌های صوتیِ مرحله‌ها ──
  //
  // ورود به مطالعه، افتادنِ پرده، و آمدنِ هر واحد. هر کدام یک‌بار به ازای
  // هویتِ خودش پخش می‌شود، پس دوبار سوارشدنِ افکت در StrictMode صدا را
  // تکراری نمی‌کند. هیچ‌کدام چیزی را به تأخیر نمی‌اندازند.
  const lastCueRef = useRef("");
  useEffect(() => {
    let cue: string | null = null;
    let sound: "previewStart" | "spoilerTransition" | "unitAppear" | null = null;
    if (phase === "preview") {
      cue = `preview:${state.questionEpoch}`;
      sound = "previewStart";
    } else if (phase === "spoilerTransition") {
      cue = `spoiler:${state.questionEpoch}:${state.runId}`;
      sound = "spoilerTransition";
    } else if (phase === "playing") {
      cue = `unit:${state.unitAttemptId}`;
      sound = "unitAppear";
    }
    if (!cue || !sound || cue === lastCueRef.current) return;
    lastCueRef.current = cue;
    audio.play(sound);
  }, [phase, state.questionEpoch, state.runId, state.unitAttemptId, audio]);

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
      className={`aruzr-root ${immersive ? "aruzr-root-immersive aruzr-surface" : ""}`}
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

      {guestPrompt && (
        <GuestLimitModal section="aruz-rapid" onDismiss={() => setGuestPrompt(false)} />
      )}

      {/* ── جای ثابتِ صحنه ── */}
      <div className="aruzr-stage">
        {phase === "intro" ? (
          <IntroScreen
            shortSymbol={config.shortSymbol}
            longSymbol={config.longSymbol}
            onStart={() => {
              if (guest.blocked) {
                setGuestPrompt(true);
                return;
              }
              startSession();
            }}
            loading={false}
          />
        ) : null}

        {phase === "loadingQuestion" ? (
          <div className="aruzr-notice aruzr-card aruzr-surface container mx-auto my-10 max-w-md" dir="rtl">
            <span className="aruzr-spinner" aria-hidden="true" />
            <p className="text-sm">در حالِ آماده‌سازی…</p>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="aruzr-notice aruzr-card aruzr-surface container mx-auto my-10 max-w-md" dir="rtl">
            <p className="text-base font-bold text-[color:var(--aruzr-failure)]">{state.error}</p>
            <button type="button" onClick={game.backToIntro} className="aruzr-ghost-btn">
              بازگشت
            </button>
          </div>
        ) : null}

        {boardVisible && question ? (
          <div className={`aruzr-board ${immersive ? "" : "aruzr-surface"}`}>
            <div className="aruzr-preview-region">
              <SpoileredPreview
                text={question.previewText}
                reveal={state.revealProgress}
                spoilered={spoilered}
                accessible={previewUncovered && !paused && !state.resuming}
                label={previewUncovered ? "مصراع را بخوان" : "مصراعِ پوشیده"}
                complete={phase === "completed"}
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
                /* در ۲۶۰ms بازخوردِ شکست، واحد را پنهان نمی‌کنیم: بازیکن
                   باید ببیند روی کدام هجا اشتباه کرد، و فلاشِ قرمز جایی
                   برای نشستن داشته باشد. چیزی هم لو نمی‌رود — دور به‌هرحال
                   از اول شروع می‌شود. */
                hidden={
                  !(
                    phase === "armingUnit" ||
                    phase === "playing" ||
                    phase === "resetFeedbackWrong" ||
                    phase === "resetFeedbackTimeout"
                  ) ||
                  paused ||
                  state.resuming
                }
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
                flash={phase === "resetFeedbackTimeout" ? "timeout" : null}
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
                  <p className="aruzr-muted mt-1 text-xs">
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
