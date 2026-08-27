"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { GameAudio } from "@/lib/aruz-bridge/audio";
import {
  configForDifficulty,
  defaultAruzBridgeConfig,
  defaultScoring,
  type AruzBridgeConfig,
} from "@/lib/aruz-bridge/config";
import {
  currentStep,
  initialMachineState,
  isInputLocked,
  machineReducer,
  prepareSteps,
  summarize,
  type MachineState,
} from "@/lib/aruz-bridge/machine";
import { LocalQuestionSource, type QuestionSource } from "@/lib/aruz-bridge/source";
import type { Difficulty, GameState, Side } from "@/lib/aruz-bridge/types";

/**
 * مدتِ هر حالتِ خودکار، بر حسبِ میلی‌ثانیه.
 *
 * `null` یعنی «این حالت خودش تمام نمی‌شود» — یا منتظرِ بازیکن است
 * (`waitingForAnswer`) یا حالتِ پایانی است. هر حالتِ دیگری *باید* اینجا یک
 * عدد داشته باشد، وگرنه بازی همان‌جا می‌ماند؛ نوعِ Record این را در زمانِ
 * کامپایل تضمین می‌کند.
 */
function durationFor(state: GameState, config: AruzBridgeConfig): number | null {
  const table: Record<GameState, number | null> = {
    intro: null,
    // مکثِ کوتاه تا جفتِ بعدی از مه بیرون بیاید
    preparing: 420,
    showingQuestion: config.questionDisplayDuration,
    waitingForAnswer: config.answerTime,
    jumping: config.jumpDuration,
    landing: config.landingDelay,
    // لرزشِ کاشیِ زیرِ پا، پیش از ترک‌خوردن
    timeout: 520,
    correct: config.correctPauseDuration,
    cracking: config.crackDuration,
    shattering: config.glassBreakDelay,
    falling: config.fallDuration,
    gameOver: null,
    finished: null,
  };
  return table[state];
}

export interface UseAruzBridgeGameOptions {
  difficulty?: Difficulty;
  source?: QuestionSource;
  configOverrides?: Partial<AruzBridgeConfig>;
  reducedMotion?: boolean;
}

export function useAruzBridgeGame({
  difficulty = 1,
  source,
  configOverrides,
}: UseAruzBridgeGameOptions = {}) {
  const config = useMemo(
    () => configForDifficulty(difficulty, configOverrides),
    [difficulty, configOverrides],
  );

  const [machine, dispatch] = useReducer(
    machineReducer,
    config,
    (c) => initialMachineState(c, defaultScoring),
  );

  const questionSource = useMemo(() => source ?? new LocalQuestionSource(), [source]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  /* ── صدا ───────────────────────────────────────────────────────────────── */
  /* نمونه در یک effect ساخته می‌شود و نه هنگامِ رندر. غیر از قاعدهٔ React،
     یک دلیلِ عملی هم دارد: ساختِ AudioContext روی سرور معنایی ندارد و در
     رندرِ دوباره‌ی احتمالی، یک context اضافه جا می‌گذاشت. تا پیش از اولین
     effect کسی به صدا دست نمی‌زند، چون همه‌چیز از دکمهٔ «شروع» راه می‌افتد. */
  const audioRef = useRef<GameAudio | null>(null);

  useEffect(() => {
    const audio = new GameAudio(defaultAruzBridgeConfig.soundVolume);
    audioRef.current = audio;
    return () => {
      // خروج از صفحه در میانهٔ صدا نباید صدایی جامانده بگذارد.
      audioRef.current = null;
      audio.dispose();
    };
  }, []);

  // بلندیِ صدا از config می‌آید و ممکن است با سطحِ سختی عوض شود.
  useEffect(() => {
    audioRef.current?.setVolume(config.soundVolume);
  }, [config.soundVolume]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      audioRef.current?.setMuted(!m);
      return !m;
    });
  }, []);

  /* ── شروعِ یک دور ──────────────────────────────────────────────────────── */
  /* شمارهٔ دور و کنترلرِ لغو، در یک جعبهٔ پایدار.
     خودِ *شیء* هیچ‌وقت عوض نمی‌شود؛ فقط محتوایش. برای همین می‌شود یک بار
     هنگامِ ثبتِ effect گرفتش و در پاک‌سازی به همان اشاره کرد — که دقیقاً
     همان کاری است که قاعدهٔ «ref در cleanup» می‌خواهد. */
  const lifecycleRef = useRef({ runId: 0, controller: null as AbortController | null });

  const start = useCallback(async () => {
    const lifecycle = lifecycleRef.current;
    const runId = ++lifecycle.runId;
    lifecycle.controller?.abort();
    const controller = new AbortController();
    lifecycle.controller = controller;

    // «شروع» یک ژستِ واقعیِ کاربر است — تنها جایی که مرورگر اجازهٔ باز کردنِ صدا می‌دهد.
    void audioRef.current?.unlock();

    setLoading(true);
    setLoadError(null);
    try {
      const questions = await questionSource.load({
        difficulty,
        count: config.questionsPerRun,
        signal: controller.signal,
      });
      // اگر در این فاصله دورِ تازه‌ای شروع شده یا صفحه بسته شده، نتیجه بی‌اثر است.
      if (runId !== lifecycle.runId) return;
      if (!questions.length) throw new Error("پرسشی برای این سطح پیدا نشد.");
      dispatch({ type: "start", steps: prepareSteps(questions), config });
    } catch (err) {
      if (runId !== lifecycle.runId) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(err instanceof Error ? err.message : "بارگذاریِ پرسش‌ها ناموفق بود.");
    } finally {
      if (runId === lifecycle.runId) setLoading(false);
    }
  }, [config, difficulty, questionSource]);

  useEffect(() => {
    const lifecycle = lifecycleRef.current;
    return () => {
      // خروج از مسیر وسطِ بارگذاری: پاسخ که برسد دیگر کسی گوش نمی‌دهد.
      lifecycle.runId++;
      lifecycle.controller?.abort();
    };
  }, []);

  /* ── ساعتِ بازی ────────────────────────────────────────────────────────── */
  /* یک تایمر برای هر حالت. کلیدِ اثر `[state, epoch]` است، پس هر گذارِ
     پذیرفته‌شده تایمرِ قبلی را لغو می‌کند و هیچ callbackِ کهنه‌ای شلیک
     نمی‌شود — همان چیزی که «تایمر بعد از پایانِ بازی» را غیرممکن می‌کند. */
  const { state, epoch } = machine;

  useEffect(() => {
    const duration = durationFor(state, config);
    if (duration === null) return;

    const id = window.setTimeout(() => {
      switch (state) {
        case "preparing":
          dispatch({ type: "questionShown", now: performance.now() });
          break;
        case "showingQuestion":
          dispatch({ type: "answerWindowOpen", now: performance.now() });
          break;
        case "waitingForAnswer":
          dispatch({ type: "timeout" });
          break;
        case "jumping":
          dispatch({ type: "landed" });
          break;
        case "landing":
        case "timeout":
          dispatch({ type: "resolve" });
          break;
        case "correct":
          dispatch({ type: "advance" });
          break;
        case "cracking":
          dispatch({ type: "crackDone" });
          break;
        case "shattering":
          dispatch({ type: "shatterDone" });
          break;
        case "falling":
          dispatch({ type: "fallDone" });
          break;
      }
    }, duration);

    return () => window.clearTimeout(id);
  }, [state, epoch, config]);

  /* ── صدا، چسبیده به گذارها ─────────────────────────────────────────────── */
  /* هر صدا دقیقاً در لحظهٔ *ورود* به حالتِ متناظرش پخش می‌شود. چون گذارها
     همان‌هایی‌اند که صحنه هم با آن‌ها انیمیشن را شروع می‌کند، تصویر و صدا
     به‌طور خودکار هم‌زمان‌اند و لازم نیست جداگانه کوک شوند. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    switch (state) {
      case "jumping":
        audio.stopHeartbeat();
        audio.playJump();
        break;
      case "landing":
        audio.playLanding();
        break;
      case "timeout":
        audio.stopHeartbeat();
        break;
      case "correct":
        audio.playCorrect();
        break;
      case "cracking":
        audio.playCrack();
        break;
      case "shattering":
        audio.playShatter();
        break;
      case "gameOver":
        audio.playGameOver();
        break;
    }
  }, [state, epoch]);

  /* ── ضربانِ قلبِ پایانِ تایمر ───────────────────────────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || state !== "waitingForAnswer") return;

    const { answerTime, pressureThreshold, panicThreshold } = config;
    const startAt = answerTime * (1 - pressureThreshold);
    const panicAt = answerTime * (1 - panicThreshold);

    const t1 = window.setTimeout(() => audio.startHeartbeat(1), startAt);
    const t2 = window.setTimeout(() => audio.setHeartbeatRate(1.55), panicAt);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      audio.stopHeartbeat();
    };
  }, [state, epoch, config]);

  /* ── ورودیِ بازیکن ─────────────────────────────────────────────────────── */
  const choose = useCallback((side: Side) => {
    // ماشین خودش هر ورودیِ نامعتبری را رد می‌کند؛ این فقط جلوی کارِ بی‌هوده را می‌گیرد.
    dispatch({ type: "answer", side, now: performance.now() });
  }, []);

  const restart = useCallback(() => {
    void start();
  }, [start]);

  const step = currentStep(machine);
  const summary = useMemo(() => summarize(machine), [machine]);

  return {
    machine: machine as MachineState,
    state,
    epoch,
    step,
    config,
    summary,
    loading,
    loadError,
    inputLocked: isInputLocked(state),
    isDemoData: questionSource.isDemo,
    muted,
    toggleMute,
    audio: audioRef,
    choose,
    start,
    restart,
  };
}

export type AruzBridgeGameApi = ReturnType<typeof useAruzBridgeGame>;
