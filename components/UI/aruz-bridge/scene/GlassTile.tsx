"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildFracture } from "@/lib/aruz-bridge/fracture";
import { TILE_DEPTH, TILE_THICKNESS, TILE_WIDTH } from "@/lib/aruz-bridge/layout";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import type { GlassState, Side } from "@/lib/aruz-bridge/types";
import { createGlassMaterial } from "./glassMaterial";
import { AnswerHitTarget, NO_RAYCAST } from "./AnswerHitTarget";
import { CrackLines } from "./CrackLines";
import { GlassLabel } from "./GlassLabel";
import type { ScenePalette } from "./palette";
import { Shards } from "./Shards";

/** هندسهٔ کاشی برای همهٔ کاشی‌ها یکی است — یک بار ساخته و یک بار به GPU فرستاده می‌شود. */
const SLAB_GEOMETRY = new THREE.BoxGeometry(TILE_WIDTH, TILE_THICKNESS, TILE_DEPTH);

/* یک کاشیِ شیشه‌ای.
 *
 * کاشی مسئولِ *ظاهرِ* خودش است و بس: `state` را می‌گیرد و می‌داند در هر حالت
 * چه شکلی باشد. اینکه چرا به `cracking` رسیده — پاسخِ غلط یا تمام‌شدنِ زمان —
 * به او ربطی ندارد. همهٔ واکنش‌ها uniformِ مادهٔ خودِ اوست و در `useFrame`
 * نوشته می‌شود؛ هیچ‌کدام از راهِ React رد نمی‌شود. */

export interface GlassTileProps {
  position: [number, number, number];
  state: GlassState;
  quality: QualitySettings;
  palette: ScenePalette;
  /** نقطهٔ تماسِ پا در مختصاتِ محلیِ کاشی؛ ترک از همین‌جا شروع می‌شود. */
  impactX?: number;
  impactZ?: number;
  /** ۰..۱ پیشرَویِ ترک — صحنه هر فریم از روی زمانِ حالتِ `cracking` پُرش می‌کند. */
  crackProgressRef: RefObject<number>;
  /** ثانیه از لحظهٔ جداشدنِ قطعات. */
  shatterElapsedRef: RefObject<number>;
  /** شیشه‌ای که هنوز از مه بیرون نیامده. */
  reveal?: number;
  seed: number;
  /** شناسهٔ یکتای این کاشی — hover و انتخاب هر دو با همین کار می‌کنند. */
  tileId?: string;
  side?: Side;
  /** آیا ماشینِ حالت همین حالا پاسخ می‌پذیرد. */
  selectable?: boolean;
  /** کدام کاشیِ کلِ صحنه hover است. مقایسه با `tileId` تنها معیار است. */
  hoveredTileId?: string | null;
  onHover?: (tileId: string, entering: boolean) => void;
  onSelect?: (side: Side) => void;
  debugHitTargets?: boolean;
  /** وزنی که روی این شیشه نوشته شده. نبودنش یعنی کاشیِ بی‌متن. */
  label?: string;
  /** ۰..۱ — نمایانیِ متن. بازی از روی حالت می‌دهد. */
  labelOpacity?: number;
  labelHighlight?: "correct" | "wrong" | null;
  /** بازیکن همین حالا درست روی این کاشی فرود آمد. */
  landedCorrect?: boolean;
  /** بازیکن روی این کاشی ایستاده. */
  standing?: boolean;
}

export function GlassTile({
  position,
  state,
  quality,
  palette,
  impactX = 0,
  impactZ = 0.3,
  crackProgressRef,
  shatterElapsedRef,
  reveal = 1,
  seed,
  tileId,
  side,
  selectable = false,
  hoveredTileId = null,
  onHover,
  onSelect,
  debugHitTargets = false,
  label,
  labelOpacity = 0,
  labelHighlight = null,
  landedCorrect = false,
  standing = false,
}: GlassTileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const slabRef = useRef<THREE.Mesh>(null);
  /* hover حالتِ درونیِ کاشی نیست: یک شناسه در سطحِ صحنه نگه داشته می‌شود و هر
     کاشی فقط می‌پرسد «آن یکی من هستم؟» — پس دو کاشی هم‌زمان روشن نمی‌شوند. */
  const hovered = tileId != null && hoveredTileId === tileId;

  const material = useMemo(() => createGlassMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  /* شکست فقط وقتی ساخته می‌شود که کاشی واقعاً بشکند؛ در یک دور فقط یکی. */
  const needsFracture = state === "cracking" || state === "shattering" || state === "broken";
  const fracture = useMemo(() => {
    if (!needsFracture) return null;
    return buildFracture({
      width: TILE_WIDTH,
      depth: TILE_DEPTH,
      impact: [impactX, impactZ],
      shardCount: quality.shardCount,
      seed,
    });
  }, [needsFracture, impactX, impactZ, quality.shardCount, seed]);

  const shattered = state === "shattering" || state === "broken";

  const hover = useRef(0);
  const selectableAmt = useRef(0);
  const flash = useRef(0);
  const visited = useRef(0);
  const shownReveal = useRef(reveal);
  const landedAt = useRef<number | null>(null);
  const shatteredAt = useRef<number | null>(null);

  useFrame((frame, delta) => {
    const group = groupRef.current;
    const slab = slabRef.current;
    if (!group || !slab) return;
    const dt = Math.min(delta, 0.05);
    const time = frame.clock.elapsedTime;
    const k = (speed: number) => 1 - Math.exp(-speed * dt);

    // ظهور از مه: بالا آمدن و روشن‌شدنِ نرم، نه پاپ‌شدنِ ناگهانی
    shownReveal.current += (reveal - shownReveal.current) * k(5);
    const r = shownReveal.current;
    group.position.set(position[0], position[1] - (1 - r) * 0.7, position[2]);

    // لرزشِ پیش از ترک — کاشی هشدار می‌دهد
    if (state === "impact" || state === "cracking") {
      const amp = state === "cracking" ? 0.014 : 0.006;
      slab.position.x = (Math.random() - 0.5) * amp;
      slab.position.z = (Math.random() - 0.5) * amp;
    } else {
      slab.position.x = 0;
      slab.position.z = 0;
    }

    hover.current += ((hovered && selectable ? 1 : 0) - hover.current) * k(14);
    selectableAmt.current += ((selectable ? 1 : 0) - selectableAmt.current) * k(6);
    visited.current += ((standing ? 1 : 0) - visited.current) * k(4);

    /* فلش. فرودِ درست یک ضربهٔ روشن است که فرو می‌نشیند؛ ترک قرمزیِ رو به
       افزایش؛ و قطعات قرمزی‌ای که در سقوط خاموش می‌شود. */
    let flashTarget = 0;
    let flashColor = palette.success;
    if (landedCorrect) {
      if (landedAt.current === null) landedAt.current = time;
      flashTarget = Math.exp(-(time - landedAt.current) * 3.2);
    } else {
      landedAt.current = null;
    }
    if (state === "impact") {
      flashTarget = 0.18 + 0.12 * Math.sin(time * 30);
      flashColor = palette.danger;
    } else if (state === "cracking") {
      flashTarget = 0.35 + 0.5 * crackProgressRef.current;
      flashColor = palette.danger;
    } else if (shattered) {
      if (shatteredAt.current === null) shatteredAt.current = time;
      flashTarget = 0.9 * Math.exp(-(time - shatteredAt.current) * 1.5);
      flashColor = palette.danger;
    } else {
      shatteredAt.current = null;
    }
    flash.current += (flashTarget - flash.current) * k(landedCorrect ? 30 : 12);

    const u = material.uniforms;
    u.uTime.value = time;
    u.uOpacity.value = r;
    u.uHover.value = hover.current;
    u.uSelectable.value = selectableAmt.current;
    u.uVisited.value = visited.current;
    u.uFlash.value = flash.current;
    u.uGlowGain.value = palette.glowGain;
    u.uLight.value = palette.dark ? 0 : 1;
    u.uDeep.value.copy(palette.glassDeep);
    u.uTint.value.copy(palette.glassTint);
    u.uRim.value.copy(palette.glassRim);
    u.uAccent.value.copy(palette.gold);
    u.uFlashColor.value.copy(flashColor);

    /* hover با بالاآمدنِ کاشی دیده می‌شود، نه فقط با رنگ. بزرگ‌نمایی ملایم
       است و روی خودِ تخته، پس جعبهٔ برخورد تکان نمی‌خورد. */
    const lift = hover.current * 0.06 + (landedCorrect ? -0.05 * flash.current : 0);
    slab.position.y = lift;
    const s = 1 + hover.current * 0.035;
    slab.scale.set(s, 1, s);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* تخته و هر چیزِ درونش صرفاً دیداری‌اند: هیچ‌کدام رویدادِ اشاره‌گر نمی‌گیرند.
          ثبتِ پاسخ فقط کارِ `AnswerHitTarget` است. */}
      <mesh
        ref={slabRef}
        geometry={SLAB_GEOMETRY}
        material={material}
        visible={!shattered}
        renderOrder={2}
        raycast={NO_RAYCAST}
      >
        {/* متن فرزندِ خودِ تخته است؛ هرجا کاشی برود نوشته‌اش هم می‌رود. */}
        {label && !shattered && (
          <GlassLabel
            text={label}
            opacity={labelOpacity}
            highlight={labelHighlight}
            hoverRef={hover}
            palette={palette}
          />
        )}
      </mesh>

      {/* تنها شنوندهٔ رویداد. بیرون از تخته است تا بالاآمدنِ hover رویش اثر نگذارد. */}
      {selectable && tileId && side && onHover && onSelect && (
        <AnswerHitTarget
          side={side}
          tileId={tileId}
          enabled={selectable}
          onHover={onHover}
          onSelect={onSelect}
          debug={debugHitTargets}
        />
      )}

      {fracture && !shattered && (
        <CrackLines
          fracture={fracture}
          progressRef={crackProgressRef}
          y={TILE_THICKNESS / 2 + 0.002}
          visible={state === "cracking"}
        />
      )}

      {fracture && shattered && (
        <Shards
          fracture={fracture}
          material={material}
          thickness={TILE_THICKNESS}
          y={0}
          elapsedRef={shatterElapsedRef}
          seed={seed}
        />
      )}
    </group>
  );
}
