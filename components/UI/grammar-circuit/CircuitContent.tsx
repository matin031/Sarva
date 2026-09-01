"use client";

import type { GrammarCircuitConfig, PreparedQuestion } from "@/lib/grammar-circuit";
import type { SlotValidation } from "@/lib/grammar-circuit/reducer";
import AnalysisStrip from "./AnalysisStrip";
import CircuitSvgLayer, { type CurrentPhase } from "./CircuitSvgLayer";
import Lamp, { type LampState } from "./Lamp";
import PowerSource from "./PowerSource";
import type { CircuitGeometry } from "./hooks/useCircuitLayout";
import dynamic from "next/dynamic";
import type { RenderTier } from "./hooks/useRenderTier";

/** صحنه *جدا* بارگذاری می‌شود.
 *
 *  three و react-three-fiber روی هم چند صد کیلوبایت‌اند. اگر ایستا وارد
 *  شوند، همان گوشیِ ضعیفی که عمداً به ردهٔ سبک فرستادیمش، کدی را دانلود و
 *  پارس می‌کند که هیچ‌وقت اجرا نمی‌شود — یعنی دقیقاً برعکسِ چیزی که ردهٔ
 *  سبک برایش هست.
 *
 *  `ssr: false` چون صحنه به `window` و WebGL نیاز دارد و روی سرور اصلاً
 *  معنایی ندارد. */
const CircuitScene = dynamic(() => import("./scene/CircuitScene"), {
  ssr: false,
});

/** یک فضای مختصات، یک ردیف.
 *
 *  باتری، ردیفِ تحلیل و لامپ همه فرزندِ همین عنصرند و همهٔ اندازه‌ها نسبت به
 *  آن سنجیده می‌شوند؛ پس با اسکرولِ افقی همه با هم حرکت می‌کنند و سیم از
 *  سوکتش جدا نمی‌شود. */
export interface CircuitContentProps {
  prepared: PreparedQuestion;
  config: GrammarCircuitConfig;
  geometry: CircuitGeometry | null;
  measured: boolean;
  placements: Readonly<Record<string, string>>;
  validation: Readonly<Record<string, SlotValidation>>;
  lockedTokenIds: readonly string[];
  activeTargetTokenId: string | null;
  armed: boolean;
  interactive: boolean;
  freshTokenId: string | null;
  currentPhase: CurrentPhase;
  lampState: LampState;
  reducedMotion: boolean;
  epoch: number;
  runId: number;
  /** «غنی» یعنی لایهٔ WebGL هم رندر می‌شود و نسخهٔ تختِ آن پنهان می‌ماند. */
  tier: RenderTier;
  contentRef: React.RefObject<HTMLDivElement | null>;
  stripRef: React.RefObject<HTMLDivElement | null>;
  powerRef: React.RefObject<HTMLDivElement | null>;
  lampRef: React.RefObject<HTMLDivElement | null>;
  registerSocket: (tokenId: string, el: HTMLElement | null) => void;
  registerWord: (tokenId: string, el: HTMLElement | null) => void;
  registerHitTarget: (tokenId: string, el: HTMLElement | null) => void;
  onSocketActivate: (tokenId: string, viaKeyboard: boolean) => void;
  onCurrentFinished: (epoch: number, runId: number) => void;
}

export default function CircuitContent({
  prepared,
  config,
  geometry,
  measured,
  placements,
  validation,
  lockedTokenIds,
  activeTargetTokenId,
  armed,
  interactive,
  freshTokenId,
  currentPhase,
  lampState,
  reducedMotion,
  epoch,
  runId,
  tier,
  contentRef,
  stripRef,
  powerRef,
  lampRef,
  registerSocket,
  registerWord,
  registerHitTarget,
  onSocketActivate,
  onCurrentFinished,
}: CircuitContentProps) {
  const labelOf = (roleKey: string) =>
    prepared.roleByKey.get(roleKey)?.label ?? roleKey;
  const labelForPiece = (pieceId: string) => {
    const piece = prepared.pieceById.get(pieceId);
    return piece ? labelOf(piece.roleKey) : "";
  };

  return (
    <div
      ref={contentRef}
      className="gc-content"
      data-tier={tier}
      style={
        {
          // `position` درون‌خطی است چون لایهٔ SVG نسبت به همین کادر مطلق
          // می‌نشیند — نباید به بارگذاریِ شیوه‌نامه وابسته باشد.
          position: "relative",
          // ارتفاعِ سوکت از پیکربندیِ واکنش‌گرا می‌آید (عرضش از عرضِ واژه)؛
          // ستونِ بدونِ سوکت هم از همین ارتفاع استفاده می‌کند تا خطِ واژه‌ها
          // نشکند.
          "--gc-socket-h": `${config.slotHeight}px`,
          "--gc-snap": `${config.snapDurationMs}ms`,
          "--gc-contact": `${config.localContactPulseDurationMs}ms`,
          "--gc-check": `${config.diagnosticCheckMs}ms`,
        } as React.CSSProperties
      }
    >
      <div className="gc-trace-bg" aria-hidden />

      <CircuitSvgLayer
        geometry={geometry}
        measured={measured}
        circuitTokenIds={prepared.validationOrder}
        placements={placements}
        validation={validation}
        phase={currentPhase}
        reducedMotion={reducedMotion}
        config={config}
        epoch={epoch}
        runId={runId}
        onCurrentFinished={onCurrentFinished}
      />

      {/* صحنهٔ سه‌بعدی — فقط وقتی دستگاه توانش را دارد.
          `geometry` شرطِ لازم است: پیش از اندازه‌گیری هیچ مختصاتِ درستی
          وجود ندارد و صحنه جای اشتباه ساخته می‌شود. */}
      {tier === "rich" && geometry && measured && (
        <CircuitScene
          geometry={geometry}
          circuitTokenIds={prepared.validationOrder}
          placements={placements}
          validation={validation}
          phase={currentPhase}
          lampState={lampState}
        />
      )}

      {/* در RTL ستونِ اول سمتِ راست است: باتری ← خانه‌ها ← لامپ. */}
      <PowerSource live={currentPhase !== "idle"} hostRef={powerRef} />

      <AnalysisStrip
        tokens={prepared.question.tokens}
        placements={placements}
        validation={validation}
        lockedTokenIds={lockedTokenIds}
        labelForPiece={labelForPiece}
        activeTargetTokenId={activeTargetTokenId}
        armed={armed}
        interactive={interactive}
        freshTokenId={freshTokenId}
        onSocketActivate={onSocketActivate}
        registerSocket={registerSocket}
        registerWord={registerWord}
        registerHitTarget={registerHitTarget}
        stripRef={stripRef}
        wordWidths={geometry?.wordWidths ?? new Map()}
        roleFloorWidth={geometry?.roleFloorWidth ?? 0}
        slotMinWidth={config.slotMinWidth}
        slotWordPadding={config.slotWordPadding}
      />

      <Lamp
        state={lampState}
        turnOnMs={config.lampTurnOnDurationMs}
        flickerMs={config.lampFlickerDurationMs}
        reducedMotion={reducedMotion}
        hostRef={lampRef}
      />
    </div>
  );
}
