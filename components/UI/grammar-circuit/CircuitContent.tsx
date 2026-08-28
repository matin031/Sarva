"use client";

import { minimumLaneWidth, type GrammarCircuitConfig, type PreparedQuestion } from "@/lib/grammar-circuit";
import CircuitSvgLayer, { type CurrentPhase } from "./CircuitSvgLayer";
import Lamp, { type LampState } from "./Lamp";
import PowerSource from "./PowerSource";
import SentenceRow from "./SentenceRow";
import SlotLane from "./SlotLane";
import { SENTENCE_LANE_GAP } from "./constants";
import type { CircuitGeometry } from "./hooks/useCircuitLayout";

/** یک فضای مختصات، یک ردیف.
 *
 *  جمله، سوکت‌ها، سیم‌ها، باتری و لامپ همه فرزندِ همین یک عنصرند و همهٔ
 *  اندازه‌ها نسبت به آن سنجیده می‌شوند. نتیجه‌اش این است که با اسکرولِ افقیِ
 *  ناحیهٔ تحلیل، همه با هم حرکت می‌کنند و سیم از سوکتش جدا نمی‌شود. */
const TYPE_LABEL: Record<string, string> = {
  sentence: "جمله",
  hemistich: "مصراع",
  verse: "بیت",
};

export interface CircuitContentProps {
  prepared: PreparedQuestion;
  config: GrammarCircuitConfig;
  geometry: CircuitGeometry | null;
  measured: boolean;
  placements: Readonly<Record<string, string>>;
  selectedPieceId: string | null;
  activeTargetTokenId: string | null;
  rejectedTokenId: string | null;
  freshTokenId: string | null;
  interactive: boolean;
  phase: CurrentPhase;
  lampState: LampState;
  reducedMotion: boolean;
  epoch: number;
  contentRef: React.RefObject<HTMLDivElement | null>;
  laneRef: React.RefObject<HTMLDivElement | null>;
  powerRef: React.RefObject<HTMLDivElement | null>;
  lampRef: React.RefObject<HTMLDivElement | null>;
  registerWord: (tokenId: string, el: HTMLElement | null) => void;
  registerHitTarget: (tokenId: string, el: HTMLElement | null) => void;
  onTapToken: (tokenId: string, viaKeyboard: boolean) => void;
  onCurrentFinished: (epoch: number) => void;
}

export default function CircuitContent({
  prepared,
  config,
  geometry,
  measured,
  placements,
  selectedPieceId,
  activeTargetTokenId,
  rejectedTokenId,
  freshTokenId,
  interactive,
  phase,
  lampState,
  reducedMotion,
  epoch,
  contentRef,
  laneRef,
  powerRef,
  lampRef,
  registerWord,
  registerHitTarget,
  onTapToken,
  onCurrentFinished,
}: CircuitContentProps) {
  const slotTokenIds = prepared.layoutSlots.map((s) => s.tokenId);
  const circuitTokenIds = prepared.circuitSlots.map((s) => s.tokenId);

  const labelOf = (roleKey: string) =>
    prepared.roleByKey.get(roleKey)?.label ?? roleKey;
  const labelForPlacement = (pieceId: string) => {
    const piece = prepared.pieceById.get(pieceId);
    return piece ? labelOf(piece.roleKey) : "";
  };

  return (
    <div
      ref={contentRef}
      className="gc-content"
      /* مدت‌های بازخوردِ دیداری از همان پیکربندی می‌آیند، نه از عددی که در
         CSS تکرار شده باشد. */
      style={
        {
          "--gc-snap": `${config.snapDurationMs}ms`,
          "--gc-contact": `${config.localContactPulseDurationMs}ms`,
        } as React.CSSProperties
      }
    >
      <div className="gc-trace-bg" aria-hidden />

      <CircuitSvgLayer
        geometry={geometry}
        measured={measured}
        circuitTokenIds={circuitTokenIds}
        placements={placements}
        slotWidth={config.slotWidth}
        leaderLineThreshold={config.leaderLineThreshold}
        phase={phase}
        reducedMotion={reducedMotion}
        config={config}
        epoch={epoch}
        onCurrentFinished={onCurrentFinished}
      />

      <PowerSource live={phase !== "idle"} hostRef={powerRef} />

      <div
        className="gc-column"
        style={{
          // عرضِ لازمِ نوارِ سوکت‌ها *پیش از* اندازه‌گیری رزرو می‌شود تا
          // حل‌کننده هیچ‌وقت مجبور به فشردنِ سوکت‌ها نشود — و حلقهٔ
          // اندازه‌گیری ← چیدمان ← اندازه‌گیری پیش نیاید.
          minWidth: minimumLaneWidth(
            slotTokenIds.length,
            config.slotWidth,
            config.slotGap,
          ),
        }}
      >
        <SentenceRow
          tokens={prepared.question.tokens}
          placements={placements}
          armedTokenId={activeTargetTokenId}
          tapArmed={Boolean(selectedPieceId) && interactive}
          onTapToken={onTapToken}
          registerWord={registerWord}
        />
        <div style={{ height: SENTENCE_LANE_GAP }} aria-hidden />
        <SlotLane
          laneRef={laneRef}
          geometry={geometry}
          slotTokenIds={slotTokenIds}
          placements={placements}
          labelForPlacement={labelForPlacement}
          slotWidth={config.slotWidth}
          activeTargetTokenId={activeTargetTokenId}
          rejectedTokenId={rejectedTokenId}
          freshTokenId={freshTokenId}
          interactive={interactive}
          onTapSlot={onTapToken}
          registerHitTarget={registerHitTarget}
        />
        <p className="gc-caption">
          {TYPE_LABEL[prepared.question.type]}
          {prepared.question.attribution ? ` — ${prepared.question.attribution}` : ""}
        </p>
      </div>

      <Lamp state={lampState} turnOnMs={config.lampTurnOnDurationMs} hostRef={lampRef} />
    </div>
  );
}
