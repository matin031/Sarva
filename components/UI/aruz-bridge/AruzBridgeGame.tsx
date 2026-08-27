"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  detectQualityTier,
  isWebGLAvailable,
  qualityFor,
  type QualityTier,
} from "@/lib/aruz-bridge/quality";
import { currentStep } from "@/lib/aruz-bridge/machine";
import { GameHeader } from "./GameHeader";
import { Countdown, SessionSetup } from "./SessionSetup";
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

  if (webgl === false) return <WebGLFallback />;

  const inSetup = state === "intro";
  const isOver = state === "gameOver";
  const isFinished = state === "finished";
  const showBridge = !inSetup && !isOver && !isFinished;

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

  return (
    <div dir="rtl" className="container mx-auto max-w-6xl px-3 pb-8 pt-3 sm:px-4 sm:pt-4">
      {inSetup && (
        <SessionSetup
          session={game.session}
          onChange={game.setSession}
          onStart={() => void game.startRun()}
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

      {showBridge && (
        /* ساختارِ صفحه عمداً کم‌لایه است: سرصفحه، بعد کادرِ بازی. نه کارتی
           داخلِ کارتِ دیگر، نه HUDـی که روی صحنه شناور بماند. */
        <div className="space-y-3">
          <GameHeader
            state={state}
            epoch={game.epoch}
            config={game.config}
            promptText={step?.question.promptText ?? null}
            stepIndex={machine.stepIndex}
            totalSteps={machine.steps.length}
            score={machine.score}
            streak={machine.streak}
          />

          <div
            /* ═══ اندازهٔ کادرِ بازی: *نسبت‌محور*، نه باقی‌ماندهٔ ارتفاعِ پنجره ═══
               پیش‌تر ارتفاع از `calc(100dvh - 22rem)` می‌آمد، یعنی «هرچه از
               پنجره بعدِ سربرگ‌ها ماند». چون پهنا ثابت بود (۹۹۰ پیکسل)، روی
               هر نمایشگرِ کوتاه‌تر نسبت بی‌مهار خراب می‌شد:

                 ۱۹۲۰×۱۰۸۰ → ۹۹۰×۷۲۶ (۱٫۳۶)
                 ۱۳۶۶×۷۶۸  → ۹۹۰×۴۱۴ (۲٫۳۹)  ← نوارِ باریک
                 ۱۲۸۰×۷۲۰  → ۹۹۰×۳۶۶ (۲٫۷۰)  ← بدتر

               یعنی دقیقاً روی دو اندازهٔ رایجِ لپ‌تاپ، پل به یک نوارِ پانورامیک
               تبدیل می‌شد. حالا ارتفاع از *نسبت* می‌آید، پس روی هر نمایشگری
               ثابت است و اگر صفحه بلندتر شد، بگذار اسکرول شود — خوانایی
               بازی مهم‌تر از جاشدنِ کلِ صفحه در یک پرده است.

               سه حالتِ ناهم‌پوشان:
                 • پیش‌فرض (دسکتاپ و لپ‌تاپ): ۱۶:۹
                 • گوشیِ عمودی (باریک ولی بلند): ۴:۵ — نمای عمودیِ خودش
                 • پنجرهٔ کوتاه (گوشیِ افقی): تنها جایی که ارتفاع واقعاً
                   محدودکننده است و اجازه دارد نسبت را تعیین کند */
            className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#060c14] aspect-[16/9] max-h-[680px] min-h-[360px] [@media(max-width:639px)_and_(min-height:561px)]:aspect-[4/5] [@media(max-height:560px)]:aspect-auto [@media(max-height:560px)]:h-[70vh] [@media(max-height:560px)]:max-h-none [@media(max-height:560px)]:min-h-[190px]"
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
              />
            )}

            {state === "countdown" && <Countdown duration={game.config.countdownDuration} />}

            {/* تنها کنترل‌هایی که باید روی خودِ کادر باشند */}
            <div className="pointer-events-auto absolute left-2 top-2 z-20 flex items-center gap-1.5 sm:left-3 sm:top-3">
              <button
                type="button"
                onClick={game.toggleMute}
                aria-label={game.muted ? "روشن‌کردن صدا" : "خاموش‌کردن صدا"}
                aria-pressed={game.muted}
                className="rounded-lg border border-white/15 bg-black/40 p-1.5 text-white/85 backdrop-blur-md transition-all hover:bg-black/60 active:scale-95"
              >
                {game.muted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
                  </svg>
                )}
              </button>
              <Link
                href="/game"
                aria-label="خروج از بازی"
                className="rounded-lg border border-white/15 bg-black/40 p-1.5 text-white/85 backdrop-blur-md transition-all hover:bg-black/60 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </Link>
            </div>

            <OrientationHint />
          </div>

          {game.isDemoData && (
            <p className="text-center text-[0.65rem] text-muted-foreground">
              دادهٔ نمایشی — محتوای عروضیِ نهاییِ سروا نیست.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
