"use client";

import dynamic from "next/dynamic";
import { useMemo, useSyncExternalStore } from "react";
import { defaultAruzBridgeConfig } from "@/lib/aruz-bridge/config";
import {
  detectQualityTier,
  isWebGLAvailable,
  qualityFor,
  type QualityTier,
} from "@/lib/aruz-bridge/quality";
import { currentStep } from "@/lib/aruz-bridge/machine";
import type { Difficulty } from "@/lib/aruz-bridge/types";
import { GameHUD } from "./GameHUD";
import {
  FinishedScreen,
  GameOverScreen,
  IntroScreen,
  OrientationHint,
  WebGLFallback,
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
   این کَش، هر رندر یک context جدید باز می‌کرد.
   هیچ‌کدام هم عوض نمی‌شوند، بنابراین اشتراکشان یک تابعِ خالیِ لغو است. */
let webglCache: boolean | null = null;
let tierCache: QualityTier | null = null;

const getWebGL = () => (webglCache ??= isWebGLAvailable());
const getTier = () => (tierCache ??= detectQualityTier());
const noopSubscribe = () => () => {};

export default function AruzBridgeGame({ difficulty = 1 }: { difficulty?: Difficulty }) {
  const game = useAruzBridgeGame({ difficulty });
  const reducedMotion = useReducedMotion();
  const assets = useOptionalAssets();

  /* WebGL و پلهٔ کیفیت فقط در مرورگر معلوم می‌شوند. عکسِ سمتِ سرور `null`
     است، یعنی «هنوز نمی‌دانیم» — که با «نداریم» یکی نیست و نباید صفحهٔ
     «مرورگرت پشتیبانی نمی‌کند» را نشان بدهد. */
  const webgl = useSyncExternalStore(noopSubscribe, getWebGL, () => null);
  const tier = useSyncExternalStore(noopSubscribe, getTier, () => null);

  const quality = useMemo(() => qualityFor(tier ?? "medium", game.config), [tier, game.config]);

  useGameControls({ enabled: !game.inputLocked, onChoose: game.choose });

  const { state, machine } = game;
  const step = currentStep(machine);

  if (webgl === false) return <WebGLFallback />;

  const showIntro = state === "intro";
  const showGameOver = state === "gameOver";
  const showFinished = state === "finished";

  return (
    <div
      dir="rtl"
      // ارتفاعِ ثابت و نسبت به viewport، تا روی موبایل نوارِ آدرس بازی را نبُرد
      className="relative mx-auto mt-4 h-[calc(100dvh-11.5rem)] min-h-[420px] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-[#060c14]"
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
        />
      )}

      {!showIntro && (
        <GameHUD
          state={state}
          epoch={game.epoch}
          config={game.config}
          score={machine.score}
          streak={machine.streak}
          stepIndex={machine.stepIndex}
          totalSteps={machine.steps.length || defaultAruzBridgeConfig.questionsPerRun}
          muted={game.muted}
          onToggleMute={game.toggleMute}
          isDemoData={game.isDemoData}
        />
      )}

      {!showIntro && !showGameOver && !showFinished && <OrientationHint />}

      {showIntro && (
        <IntroScreen onStart={game.start} loading={game.loading} error={game.loadError} />
      )}
      {showGameOver && (
        <GameOverScreen
          summary={game.summary}
          reason={machine.failure}
          step={step}
          onRestart={game.restart}
        />
      )}
      {showFinished && <FinishedScreen summary={game.summary} onRestart={game.restart} />}
    </div>
  );
}
