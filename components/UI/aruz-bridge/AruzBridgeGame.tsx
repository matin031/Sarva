"use client";
import { useGuestRounds } from "@/lib/guest/use-guest-rounds";
import GuestLimitModal from "@/components/UI/GuestLimitModal";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  detectQualityTier,
  isWebGLAvailable,
  qualityFor,
  type QualityTier,
} from "@/lib/aruz-bridge/quality";
import { currentStep } from "@/lib/aruz-bridge/machine";
import { immersiveMode } from "@/lib/immersive-mode";
import { GameTopBar } from "./GameTopBar";
import { useGameViewportSize } from "./useGameViewportSize";
import { isMobileMode, useViewportMode } from "./useViewportMode";
import { GameHeader } from "./GameHeader";
import {SessionSetup} from "./SessionSetup";
/* Countdown از فایلِ خودش می‌آید: حالا خطِ زمانی و پایانِ شمارش را خودش
   دارد و دیگر یک نمایشِ ساده کنارِ SessionSetup نیست. */
import Countdown from "./Countdown";
import {
  FinishedScreen,
  GameOverScreen,
  OrientationHint,
  WebGLFallback,
  type ResultActions,
} from "./Screens";
import { useAruzBridgeGame } from "./useAruzBridgeGame";
import { useGameControls } from "./useGameControls";
import { useOptionalAssets, useReducedMotion } from "./useOptionalAssets";
import { useSetReportTarget } from "@/lib/reports/target";
import { useRoundGuard } from "@/lib/games/round-guard";

/* بومِ سه‌بعدی فقط وقتی بارگذاری می‌شود که کاربر واقعاً وارد این مسیر شده
   باشد. `ssr: false` لازم است چون WebGL روی سرور وجود ندارد — و در Next ۱۶
   این گزینه فقط داخلِ یک Client Component مجاز است، که همین فایل هست. */
const GameCanvas = dynamic(() => import("./runtime").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#060c14]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-xs text-muted-foreground">در حالِ ساختنِ پل…</p>
      </div>
    </div>
  ),
});

/* هر دو تشخیص یک بار در عمرِ صفحه انجام می‌شوند و کَش می‌مانند.
   `isWebGLAvailable` برای هر فراخوانی یک canvas می‌سازد و context می‌گیرد؛
   `useSyncExternalStore` تابعِ عکس‌برداری را در هر رندر صدا می‌زند، پس بدونِ
   این کَش، هر رندر یک context جدید باز می‌کرد. */
let webglCache: boolean | null = null;
let tierCache: QualityTier | null = null;

const getWebGL = () => (webglCache ??= isWebGLAvailable());
const getTier = () => (tierCache ??= detectQualityTier());
const noopSubscribe = () => () => {};

/** با `?debugHits=1` جعبه‌های برخورد دیده می‌شوند. پیش‌فرض خاموش. */
function useHitDebug(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).has("debugHits"),
    () => false,
  );
}

/**
 * پیامِ «صحنه دارد آماده می‌شود».
 *
 * ⚠️ پیش از این، در فاصلهٔ بارگذاری هیچ چیزی گفته نمی‌شد: بوم سیاه بود و
 * شمارش رویش می‌دوید. کاربر نمی‌دانست منتظرِ چیست یا اصلاً چیزی خراب شده.
 */
function SceneLoading() {
  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <p className="text-sm text-[#ffe9bd]/80">در حال آماده‌سازی پل…</p>
    </div>
  );
}

export default function AruzBridgeGame() {
  const game = useAruzBridgeGame();
  const reducedMotion = useReducedMotion();
  const assets = useOptionalAssets();
  const debugHitTargets = useHitDebug();

  /* WebGL و پلهٔ کیفیت فقط در مرورگر معلوم می‌شوند. عکسِ سمتِ سرور `null`
     است، یعنی «هنوز نمی‌دانیم» — که با «نداریم» یکی نیست. */
  const webgl = useSyncExternalStore(noopSubscribe, getWebGL, () => null);
  const tier = useSyncExternalStore(noopSubscribe, getTier, () => null);
  const quality = useMemo(() => qualityFor(tier ?? "medium", game.config), [tier, game.config]);

  useGameControls({ enabled: !game.inputLocked, onChoose: game.choose });

  const { state, machine } = game;
  const step = currentStep(machine);

  useSetReportTarget(
    step
      ? {
          area: "aruz_bridge",
          targetId: step.question.id,
          snapshot: `${step.question.promptText}\nوزنِ درست: ${step.question.correctPattern}`,
          targetRef: { correct_side: step.correctSide },
        }
      : null,
  );

  const shellRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  // مهمان یک دست بازی می‌کند؛ دستِ دوم مدالِ ورود می‌آید.
  const guest = useGuestRounds("aruz-bridge");
  const [guestPrompt, setGuestPrompt] = useState(false);

  const inSetup = state === "intro";
  const isOver = state === "gameOver";
  const isFinished = state === "finished";
  const showBridge = !inSetup && !isOver && !isFinished;

  /* همان شرطی که پل را نشان می‌دهد، نگهبانِ خروج را هم مسلح می‌کند — یک
     حالت، دو مصرف. روی صفحهٔ تنظیمات و صفحهٔ نتیجه چیزی برای از دست دادن
     نیست، پس نوسازیِ صفحه هم نباید سؤال کند. */
  useRoundGuard(showBridge);

  /* پایانِ دست یک «دور» است — چه باخت چه تمام کردن. ثبت در همان لحظه‌ای که
     صفحهٔ پایان می‌آید، نه هنگامِ شروع: مهمانی که وسطِ دست صفحه را ببندد
     نباید سهمیه‌اش سوخته باشد. */
  const endedRef = useRef(false);
  useEffect(() => {
    if (isOver || isFinished) {
      if (!endedRef.current) {
        endedRef.current = true;
        guest.recordRound();
      }
    } else {
      endedRef.current = false;
    }
  }, [isOver, isFinished, guest]);

  /* یک مالکِ واحد برای «چه‌جور صفحه‌ای». چیدمان از همین یک مقدار شاخه
     می‌گیرد، نه از چند پرسمانِ CSS که با هم رقابت کنند. */
  const viewportMode = useViewportMode();
  const mobileActive = showBridge && isMobileMode(viewportMode);
  const desktopActive = showBridge && !mobileActive;

  /* اندازهٔ نسبت‌محور فقط برای دسکتاپ. روی موبایل ابعاد را flex می‌دهد و
     هیچ نسبتِ ثابتی تحمیل نمی‌شود — دقیقاً همان چیزی که باعثِ سرریز بود. */
  const viewport = useGameViewportSize({ containerRef: outerRef, hudRef, active: desktopActive });

  /* پوستهٔ سایت فقط در *حینِ بازی* عوض می‌شود: روی دسکتاپ جمع، روی موبایل
     کاملاً برداشته. صفحهٔ تنظیمات و نتیجه چیدمانِ عادیِ سروا را می‌گیرند و با
     ترکِ صفحه همه‌چیز برمی‌گردد. */
  useEffect(() => {
    immersiveMode.set(
      mobileActive ? "fullscreen" : desktopActive ? "compact" : "off",
    );
    return () => immersiveMode.set("off");
  }, [mobileActive, desktopActive]);

  if (webgl === false) return <WebGLFallback />;

  const availableUnique = game.pool
    ? new Set(game.pool.map((q) => q.id)).size
    : null;

  const resultActions: ResultActions = {
    onRetry: game.retry,
    onChangeSettings: game.backToSetup,
    failedCount: machine.failedQuestionIds.length,
    onReview: game.session.reviewMistakes
      ? () => game.reviewMistakes(machine.failedQuestionIds)
      : undefined,
  };

  /* ── بازیِ فعال روی موبایل: یک صفحهٔ تمام‌قد ──────────────────────────────
     ریشه دقیقاً به اندازهٔ `100dvh` است و سرریز ندارد؛ نوارِ بالا و HUD
     ارتفاعِ محتواییِ خودشان را می‌گیرند و بومِ سه‌بعدی *تمامِ باقی‌مانده* را.

     `min-h-0` روی زنجیرهٔ flex حیاتی است: بدونِ آن، فرزندِ flex ارتفاعِ ذاتیِ
     خودش را نگه می‌دارد و حتی با ریشهٔ ۱۰۰dvh باز سرریز می‌سازد. همین یک
     خاصیت بود که چند بار جلوتر باعثِ اسکرولِ موبایل می‌شد. */
  if (mobileActive) {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-40 flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-background"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <GameTopBar muted={game.muted} onToggleMute={game.toggleMute} />

        <div ref={hudRef} className="shrink-0 border-b border-border bg-card">
          <GameHeader
            state={state}
            epoch={game.epoch}
            config={game.config}
            promptText={step?.question.promptText ?? null}
            stepIndex={machine.stepIndex}
            totalSteps={machine.steps.length}
            score={machine.score}
            streak={machine.streak}
            muted={game.muted}
            onToggleMute={game.toggleMute}
            compact
          />
        </div>

        {/* تمامِ ارتفاعِ باقی‌مانده، و اجازهٔ کوچک‌شدن. */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#060c14]">
          {webgl === null ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          ) : (
            <GameCanvas
              machine={machine}
              config={game.config}
              quality={quality}
              reducedMotion={reducedMotion}
              usePlayerModel={assets.playerModel}
              inputLocked={game.inputLocked}
              onChoose={game.choose}
              debugHitTargets={debugHitTargets}
              onSceneReady={game.markSceneReady}
            />
          )}
          {/* ⚠️ شمارش فقط پس از آماده‌شدنِ واقعیِ صحنه. تا آن‌وقت پیامِ
              روشن، نه یک بومِ خالی که کاربر نداند منتظرِ چیست. */}
          {state === "countdown" &&
            (game.sceneReady ? (
              <Countdown
                duration={game.config.countdownDuration}
                onDone={game.finishCountdown}
                reducedMotion={reducedMotion}
              />
            ) : (
              <SceneLoading />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      dir="rtl"
      className="container mx-auto max-w-6xl px-3 pb-3 pt-2 sm:px-4"
    >
      {guestPrompt && (
        <GuestLimitModal section="aruz-bridge" onDismiss={() => setGuestPrompt(false)} />
      )}

      {inSetup && (
        <SessionSetup
          session={game.session}
          onChange={game.setSession}
          onStart={() => {
            if (guest.blocked) {
              setGuestPrompt(true);
              return;
            }
            void game.startRun();
          }}
          loading={game.loading}
          error={game.loadError}
          availableUnique={availableUnique}
        />
      )}

      {isOver && (
        <GameOverScreen
          summary={game.summary}
          reason={machine.failure}
          step={step}
          actions={resultActions}
        />
      )}
      {isFinished && <FinishedScreen summary={game.summary} actions={resultActions} />}

      {desktopActive && (
        /* ── یک پوسته، نه سه کارتِ تودرتو ────────────────────────────────
           پیش‌تر صفحه سه سطح داشت: کارتِ پرسش، فاصله، و کارتِ بازی. روی هم
           آن‌قدر ارتفاع می‌خوردند که کاربر مجبور بود بینِ پرسش و پل اسکرول
           کند. حالا HUD و بوم *یک* جزء‌اند: یک حاشیه، یک شعاع، یک مرز. */
        <div
          ref={shellRef}
          className="mx-auto overflow-hidden rounded-2xl border border-border bg-card"
          style={{ width: viewport.width }}
        >
          <div ref={hudRef}>
            <GameHeader
              state={state}
              epoch={game.epoch}
              config={game.config}
              promptText={step?.question.promptText ?? null}
              stepIndex={machine.stepIndex}
              totalSteps={machine.steps.length}
              score={machine.score}
              streak={machine.streak}
              muted={game.muted}
              onToggleMute={game.toggleMute}
            />
          </div>

          {/* بومِ سه‌بعدی. اندازه‌اش را تنها یک جا تصمیم می‌گیرد
              (`useGameViewportSize`), پس هیچ پرسمانِ CSSـی نمی‌تواند سرِ
              ارتفاع با دیگری رقابت کند. */}
          <div
            className="relative w-full overflow-hidden bg-[#060c14]"
            style={{ height: viewport.height }}
          >
            {webgl === null ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            ) : (
              <GameCanvas
                machine={machine}
                config={game.config}
                quality={quality}
                reducedMotion={reducedMotion}
                usePlayerModel={assets.playerModel}
                inputLocked={game.inputLocked}
                onChoose={game.choose}
                debugHitTargets={debugHitTargets}
                onSceneReady={game.markSceneReady}
              />
            )}

            {/* ⚠️ شمارش فقط پس از آماده‌شدنِ واقعیِ صحنه. تا آن‌وقت پیامِ
              روشن، نه یک بومِ خالی که کاربر نداند منتظرِ چیست. */}
          {state === "countdown" &&
            (game.sceneReady ? (
              <Countdown
                duration={game.config.countdownDuration}
                onDone={game.finishCountdown}
                reducedMotion={reducedMotion}
              />
            ) : (
              <SceneLoading />
            ))}
            <OrientationHint />
          </div>
        </div>
      )}

      {desktopActive && game.isDemoData && (
        <p className="mt-1.5 text-center text-[0.6rem] text-muted-foreground">
          دادهٔ نمایشی — محتوای عروضیِ نهاییِ سروا نیست.
        </p>
      )}
    </div>
  );
}
