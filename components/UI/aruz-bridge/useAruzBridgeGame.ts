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
import { RemoteQuestionSource, type QuestionSource } from "@/lib/aruz-bridge/source";
import {
  buildReviewQuestions,
  defaultSessionConfig,
  difficultyForPace,
  PACE_TIMINGS,
  sampleSessionQuestions,
  type AruzBridgeSessionConfig,
} from "@/lib/aruz-bridge/session";
import type { AruzBridgeQuestion, GameState, Side } from "@/lib/aruz-bridge/types";

/**
 * مدتِ هر حالتِ خودکار، بر حسبِ میلی‌ثانیه.
 *
 * `null` یعنی «این حالت خودش تمام نمی‌شود» — یا منتظرِ بازیکن است
 * (`waitingForAnswer`) یا حالتِ پایانی است. هر حالتِ دیگری *باید* اینجا یک
 * عدد داشته باشد، وگرنه بازی همان‌جا می‌ماند؛ نوعِ Record این را در زمانِ
 * کامپایل تضمین می‌کند.
 */
function durationFor(
  state: GameState,
  config: AruzBridgeConfig,
  /** آیا پاسخِ همین مرحله درست بوده. مکثِ بعد از فرود فقط برای شکست است. */
  answeredCorrectly: boolean,
): number | null {
  const table: Record<GameState, number | null> = {
    intro: null,
    countdown: config.countdownDuration,
    // مکثِ کوتاه تا جفتِ بعدی از مه بیرون بیاید
    preparing: 420,
    showingQuestion: config.questionDisplayDuration,
    waitingForAnswer: config.answerTime,
    jumping: config.jumpDuration,
    /* سکوتِ کوتاهِ بعد از فرود کارکردش *تعلیق* است: لحظه‌ای که هنوز معلوم
       نیست شیشه تاب می‌آورد یا نه. روی پاسخِ درست این تعلیق معنا ندارد و
       فقط بازی را کُند نشان می‌دهد. */
    landing: answeredCorrectly ? 0 : config.landingDelay,
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
  source?: QuestionSource;
  configOverrides?: Partial<AruzBridgeConfig>;
}

export function useAruzBridgeGame({
  source,
  configOverrides,
}: UseAruzBridgeGameOptions = {}) {
  /* پیکربندیِ دور: چیزی که بازیکن در صفحهٔ تنظیمات انتخاب کرده. تا وقتی
     خودش عوضش نکند، «دوباره» با همین اجرا می‌شود. */
  const [session, setSession] = useState<AruzBridgeSessionConfig>(defaultSessionConfig);

  const config = useMemo(() => {
    // سرعت تنها چیزی است که زمان‌بندی را تعیین می‌کند؛ اعداد در session.ts‌اند.
    const timings = PACE_TIMINGS[session.pace];
    return configForDifficulty(difficultyForPace(session.pace), {
      ...timings,
      questionsPerRun: session.questionCount,
      ...configOverrides,
    });
  }, [session.pace, session.questionCount, configOverrides]);

  const [machine, dispatch] = useReducer(
    machineReducer,
    config,
    (c) => initialMachineState(c, defaultScoring),
  );

  /* پرسش‌ها از دیتابیس می‌آیند. اگر مسیر در دسترس نباشد، خطا نشان داده
     می‌شود و به دادهٔ نمایشی عقب‌نشینی نمی‌کنیم: نمایشِ محتوای تأییدنشده
     به‌جای محتوای واقعی، بدتر از یک پیامِ خطای صادق است. */
  const questionSource = useMemo(() => source ?? new RemoteQuestionSource(), [source]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /* بی‌صدایی مشتقِ همان `session.soundEnabled` است و حالتِ دومی ندارد؛ پس
     کلیدِ داخلِ بازی و کلیدِ صفحهٔ تنظیمات همیشه یک چیز را نشان می‌دهند. */
  const muted = !session.soundEnabled;

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

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSession((prev) => ({ ...prev, soundEnabled: enabled }));
  }, []);

  const toggleMute = useCallback(() => {
    setSession((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  // مدیرِ صدا دنبالِ همان یک منبعِ حقیقت می‌آید.
  useEffect(() => {
    audioRef.current?.setMuted(!session.soundEnabled);
  }, [session.soundEnabled]);

  /* ── شروعِ یک دور ──────────────────────────────────────────────────────── */
  /* شمارهٔ دور و کنترلرِ لغو، در یک جعبهٔ پایدار.
     خودِ *شیء* هیچ‌وقت عوض نمی‌شود؛ فقط محتوایش. برای همین می‌شود یک بار
     هنگامِ ثبتِ effect گرفتش و در پاک‌سازی به همان اشاره کرد — که دقیقاً
     همان کاری است که قاعدهٔ «ref در cleanup» می‌خواهد. */
  const lifecycleRef = useRef({ runId: 0, controller: null as AbortController | null });

  /* مخزنِ پرسش‌ها یک بار گرفته می‌شود و کَش می‌ماند.
     ref منبعِ حقیقت است (منطق هر لحظه ممکن است لازمش داشته باشد) و state
     فقط برای این است که صفحهٔ تنظیمات بتواند تعدادِ یکتاها را نشان دهد و
     گزینه‌های ناممکن را غیرفعال کند. */
  const poolRef = useRef<AruzBridgeQuestion[] | null>(null);
  const [pool, setPool] = useState<AruzBridgeQuestion[] | null>(null);

  const loadPool = useCallback(
    async (signal?: AbortSignal): Promise<AruzBridgeQuestion[]> => {
      if (poolRef.current) return poolRef.current;
      const rows = await questionSource.load({
        // همهٔ مخزن را می‌خواهیم، نه فقط اندازهٔ یک دور
        difficulty: 1,
        count: Number.MAX_SAFE_INTEGER,
        signal,
      });
      poolRef.current = rows;
      return rows;
    },
    [questionSource],
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      try {
        const rows = await loadPool(controller.signal);
        // setState داخلِ callbackـِ ناهمگام است، نه در تنهٔ effect
        if (!cancelled) setPool(rows);
      } catch {
        /* صفحهٔ تنظیمات با مخزنِ نامعلوم هم کار می‌کند؛ خطا موقعِ شروع گزارش می‌شود */
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loadPool]);

  /**
   * یک دور را می‌سازد و شروع می‌کند.
   *
   * دنبالهٔ پرسش‌ها دقیقاً همین‌جا — یک بار — ساخته و به ماشینِ حالت سپرده
   * می‌شود. از آن به بعد در `machine.steps` منجمد است: هیچ رندری، تغییرِ
   * اندازه‌ای یا زدنِ کلیدِ صدایی نمی‌تواند ترتیب را عوض کند، چون هیچ‌کس
   * دیگر قرعه نمی‌زند.
   */
  const beginRun = useCallback(
    async (overrides?: { reviewIds?: readonly string[]; sessionOverride?: AruzBridgeSessionConfig }) => {
      const lifecycle = lifecycleRef.current;
      const runId = ++lifecycle.runId;
      lifecycle.controller?.abort();
      const controller = new AbortController();
      lifecycle.controller = controller;

      const activeSession = overrides?.sessionOverride ?? session;

      /* ⚠️ هر دورِ تازه از نو منتظرِ صحنه می‌ماند.
         `beginRun` تنها راهِ ورود به دور است — «شروع»، «دوباره» و «مرورِ
         اشتباه‌ها» هر سه از همین‌جا می‌گذرند — پس یک جا صفر کردن، برای هر
         سه یکسان عمل می‌کند. بدونِ این، دورِ دوم شمارش را بدونِ انتظار
         شروع می‌کرد چون پرچم از دورِ قبل روشن مانده بود. */
      setSceneReady(false);

      // «شروع» یک ژستِ واقعیِ کاربر است — تنها جایی که مرورگر اجازهٔ باز کردنِ صدا می‌دهد.
      void audioRef.current?.unlock();

      setLoading(true);
      setLoadError(null);
      try {
        const rows = await loadPool(controller.signal);
        if (runId !== lifecycle.runId) return;

        const questions = overrides?.reviewIds?.length
          ? buildReviewQuestions({ pool: rows, failedIds: overrides.reviewIds })
          : sampleSessionQuestions({
              pool: rows,
              count: activeSession.questionCount,
              allowRepeat: activeSession.allowRepeatQuestions,
            }).questions;

        if (!questions.length) throw new Error("پرسشی برای این دور پیدا نشد.");

        const runConfig = configForDifficulty(difficultyForPace(activeSession.pace), {
          ...PACE_TIMINGS[activeSession.pace],
          questionsPerRun: questions.length,
          ...configOverrides,
        });

        dispatch({ type: "start", steps: prepareSteps(questions), config: runConfig });
      } catch (err) {
        if (runId !== lifecycle.runId) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "بارگذاریِ پرسش‌ها ناموفق بود.");
      } finally {
        if (runId === lifecycle.runId) setLoading(false);
      }
    },
    [session, loadPool, configOverrides],
  );

  useEffect(() => {
    const lifecycle = lifecycleRef.current;
    return () => {
      // خروج از مسیر وسطِ بارگذاری: پاسخ که برسد دیگر کسی گوش نمی‌دهد.
      lifecycle.runId++;
      lifecycle.controller?.abort();
    };
  }, []);

  /* ── آماده‌بودنِ صحنه ──────────────────────────────────────────────────
     ⚠️ شمارشِ معکوس تا اینجا با یک `setTimeout` خالص جلو می‌رفت و هیچ
     ربطی به بارگذاریِ صحنه نداشت. روی اولین بازدید با کشِ خالی، ممکن بود
     «۳ ۲ ۱» روی یک بومِ خالی بشمارد و بازی وقتی شروع شود که کاربر هنوز
     پل را ندیده.

     `sceneReady` را خودِ صحنه از داخلِ مرزِ Suspense خبر می‌دهد
     (scene/SceneReady.tsx) و یک‌بارمصرف است: با هر شروعِ دوباره صفر
     می‌شود تا دورِ تازه هم منتظر بماند. */
  const [sceneReady, setSceneReady] = useState(false);
  const markSceneReady = useCallback(() => setSceneReady(true), []);

  /* ── ساعتِ بازی ────────────────────────────────────────────────────────── */
  /* یک تایمر برای هر حالت. کلیدِ اثر `[state, epoch]` است، پس هر گذارِ
     پذیرفته‌شده تایمرِ قبلی را لغو می‌کند و هیچ callbackِ کهنه‌ای شلیک
     نمی‌شود — همان چیزی که «تایمر بعد از پایانِ بازی» را غیرممکن می‌کند. */
  const { state, epoch } = machine;

  /* پاسخِ درست را از روی همان شیءِ آماده‌شده می‌سنجیم — همان یکی که متن،
     hover و مقصدِ پرش را هم تعیین می‌کند. جای دیگری دوباره حدس زده نمی‌شود. */
  const answeredCorrectly =
    machine.chosen != null && machine.chosen === currentStep(machine)?.correctSide;

  useEffect(() => {
    /* ⚠️ `countdown` عمداً اینجا تایمر ندارد. خطِ زمانی‌اش را خودِ
       کامپوننتِ Countdown دارد و پایانش را با `countdownDone` خبر می‌دهد،
       تا عددِ «۱» حتماً دیده شود و مکثِ تبِ مخفی روی هر دو اثر بگذارد. */
    if (state === "countdown") return;

    const duration = durationFor(state, config, answeredCorrectly);
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
          dispatch({ type: "advance", now: performance.now() });
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
  }, [state, epoch, config, answeredCorrectly]);

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
  }, [state, epoch, config, answeredCorrectly]);

  /* ── ورودیِ بازیکن ─────────────────────────────────────────────────────── */
  const choose = useCallback((side: Side) => {
    // ماشین خودش هر ورودیِ نامعتبری را رد می‌کند؛ این فقط جلوی کارِ بی‌هوده را می‌گیرد.
    dispatch({ type: "answer", side, now: performance.now() });
  }, []);

  /** «دوباره»: همان تنظیمات، دنبالهٔ تازه. بازیکن به صفحهٔ تنظیمات برنمی‌گردد. */
  const retry = useCallback(() => {
    void beginRun();
  }, [beginRun]);

  /** «تمرینِ اشتباه‌ها»: فقط همان پرسش‌هایی که شکست خورده‌اند. */
  const reviewMistakes = useCallback(
    (ids: readonly string[]) => {
      void beginRun({ reviewIds: ids });
    },
    [beginRun],
  );

  /** «تغییرِ تنظیمات»: بازگشت به صفحهٔ آغاز، با حفظِ همان انتخاب‌ها. */
  const backToSetup = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

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
    session,
    setSession,
    setSoundEnabled,
    pool,
    choose,
    startRun: beginRun,
    /* آماده‌بودنِ صحنه و راهِ اعلامش — مصرف‌کننده شمارش را به این گره می‌زند. */
    sceneReady,
    markSceneReady,
    /** پایانِ شمارش را خودِ Countdown خبر می‌دهد، نه یک تایمرِ موازی. */
    finishCountdown: useCallback(() => dispatch({ type: "countdownDone" }), []),
    retry,
    reviewMistakes,
    backToSetup,
  };
}

export type AruzBridgeGameApi = ReturnType<typeof useAruzBridgeGame>;
