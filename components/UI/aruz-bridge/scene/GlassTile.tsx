"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildFracture } from "@/lib/aruz-bridge/fracture";
import { TILE_DEPTH, TILE_THICKNESS, TILE_WIDTH } from "@/lib/aruz-bridge/layout";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import type { GlassState } from "@/lib/aruz-bridge/types";
import { getEdgeMaterial, getGlassMaterial } from "./glassMaterial";
import { CrackLines } from "./CrackLines";
import { GlassLabel, TileHighlightRing } from "./GlassLabel";
import { Shards } from "./Shards";

/** هندسهٔ کاشی برای همهٔ کاشی‌ها یکی است — یک بار ساخته و یک بار به GPU
 *  فرستاده می‌شود. همان الگوی `GalaxyScene` برای کره‌ها و حلقه‌هایش. */
const SLAB_GEOMETRY = new THREE.BoxGeometry(TILE_WIDTH, TILE_THICKNESS, TILE_DEPTH);
const EDGE_GEOMETRY = new THREE.EdgesGeometry(SLAB_GEOMETRY);

/* یک کاشیِ شیشه‌ای.
 *
 * کاشی مسئولِ *ظاهرِ* خودش است و بس: `state` را می‌گیرد و می‌داند در هر حالت
 * چه شکلی باشد. اینکه چرا به `cracking` رسیده — پاسخِ غلط بوده یا تایمر تمام
 * شده — هیچ ربطی به او ندارد. منطقِ بازی فقط حالت را عوض می‌کند. */

export interface GlassTileProps {
  position: [number, number, number];
  state: GlassState;
  quality: QualitySettings;
  /** نقطهٔ تماسِ پا در مختصاتِ محلیِ کاشی؛ ترک از همین‌جا شروع می‌شود.
   *  دو عددِ جدا و نه یک آرایه، چون آرایه هر رندر مرجعِ تازه می‌گیرد و
   *  محاسبهٔ شکست را بی‌دلیل دوباره راه می‌اندازد. */
  impactX?: number;
  impactZ?: number;
  /** ۰..۱ پیشرَویِ ترک — صحنه هر فریم از روی زمانِ حالتِ `cracking` پُرش می‌کند. */
  crackProgressRef: RefObject<number>;
  /** ثانیه از لحظهٔ جداشدنِ قطعات. */
  shatterElapsedRef: RefObject<number>;
  /** شیشه‌ای که هنوز از مه بیرون نیامده. */
  reveal?: number;
  seed: number;
  onPointerSelect?: () => void;
  selectable?: boolean;
  /** وزنی که روی این شیشه نوشته شده. نبودنش یعنی کاشیِ بی‌متن (سکوی آغاز). */
  label?: string;
  /** ۰..۱ — نمایانیِ متن. بازی از روی حالت می‌دهد. */
  labelOpacity?: number;
  labelHighlight?: "correct" | "wrong" | null;
}

export function GlassTile({
  position,
  state,
  quality,
  impactX = 0,
  impactZ = 0.3,
  crackProgressRef,
  shatterElapsedRef,
  reveal = 1,
  seed,
  onPointerSelect,
  selectable = false,
  label,
  labelOpacity = 0,
  labelHighlight = null,
}: GlassTileProps) {
  const groupRef = useRef<THREE.Group>(null);
  const slabRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // ماده و هندسهٔ کاشی بینِ همهٔ کاشی‌ها مشترک‌اند (توضیحش در glassMaterial.ts)
  const glassMaterial = getGlassMaterial(quality, TILE_THICKNESS);
  const edgeMaterial = getEdgeMaterial();

  /* شکست فقط وقتی لازم می‌شود که کاشی واقعاً بشکند. تا آن لحظه ساختنش
     هزینهٔ بی‌دلیل است — و در یک دورِ ده‌مرحله‌ای فقط یکی از کاشی‌ها می‌شکند. */
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

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // ظهور از مه: بالا آمدن + بزرگ‌شدنِ ملایم، نه پاپ‌شدنِ ناگهانی.
    const targetY = position[1] + (1 - reveal) * -0.5;
    group.position.x = position[0];
    group.position.z = position[2];
    group.position.y += (targetY - group.position.y) * Math.min(1, delta * 8);

    const slab = slabRef.current;
    if (!slab) return;

    // لرزشِ پیش از ترک — کاشی هشدار می‌دهد که دارد می‌شکند.
    if (state === "impact" || state === "cracking") {
      const amp = state === "cracking" ? 0.012 : 0.004;
      slab.position.x = (Math.random() - 0.5) * amp;
      slab.position.z = (Math.random() - 0.5) * amp;
    } else {
      slab.position.x = 0;
      slab.position.z = 0;
    }

    /* بازخوردِ اشاره‌گر با بزرگ‌نماییِ خودِ کاشی است، نه با دست‌کاریِ ماده:
       ماده بینِ همهٔ کاشی‌ها مشترک است و تغییرش روی کلِ پل اثر می‌گذاشت. */
    const target = hovered ? 1.03 : 1;
    const s = slab.scale.x + (target - slab.scale.x) * Math.min(1, delta * 12);
    slab.scale.set(s, 1, s);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* تختهٔ اصلی. بعد از خردشدن پنهان می‌شود تا فقط قطعات بمانند —
          ولی حذف نمی‌شود، چون دورِ بعد دوباره لازمش داریم. */}
      <mesh
        ref={slabRef}
        geometry={SLAB_GEOMETRY}
        material={glassMaterial}
        visible={!shattered && reveal > 0.02}
        onPointerDown={
          selectable && onPointerSelect
            ? (e) => {
                e.stopPropagation();
                onPointerSelect();
              }
            : undefined
        }
        onPointerOver={selectable ? () => setHovered(true) : undefined}
        onPointerOut={selectable ? () => setHovered(false) : undefined}
      >
        <lineSegments geometry={EDGE_GEOMETRY} material={edgeMaterial} renderOrder={2} />

        {/* متن و حلقه *فرزندِ خودِ تخته‌اند*. برای همین هیچ محاسبهٔ
            هم‌ترازی‌ای وجود ندارد که بتواند اشتباه شود: هرجا کاشی برود،
            نوشته‌اش هم می‌رود — روی هر نسبتِ تصویری و در هر زاویه. */}
        {label && !shattered && (
          <GlassLabel text={label} opacity={labelOpacity} highlight={labelHighlight} />
        )}
        {selectable && <TileHighlightRing opacity={hovered ? 1 : 0} />}
      </mesh>

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
          material={glassMaterial}
          thickness={TILE_THICKNESS}
          y={0}
          elapsedRef={shatterElapsedRef}
          seed={seed}
        />
      )}
    </group>
  );
}
