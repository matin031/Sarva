"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NO_RAYCAST } from "./AnswerHitTarget";
import type { FractureCell, FractureResult } from "@/lib/aruz-bridge/fracture";
import { makeRng } from "@/lib/aruz-bridge/fracture";

/* قطعاتِ جداشدهٔ شیشه.
 *
 * حرکتشان اسکریپت‌شده است، نه شبیه‌سازیِ فیزیکی: یک موتورِ فیزیک برای چیزی که
 * دو ثانیه دیده می‌شود و با هیچ‌چیز برخورد نمی‌کند، هم باندل را سنگین می‌کند
 * هم قابلِ پیش‌بینی نیست. اینجا هر قطعه سرعتِ خطی و زاویه‌ایِ خودش را دارد و
 * شتابِ ثقل هر فریم رویش جمع می‌شود — از بیرون تفاوتی دیده نمی‌شود.
 *
 * هر قطعه ماده‌ای *مشترک* با بقیه دارد (یک نمونه برای کلِ کاشی)، پس شفافیت و
 * بازتابِ محیط را در حینِ سقوط حفظ می‌کند بی‌آنکه بیست ماده ساخته شود. */

const GRAVITY = -13.5;

/** منشورِ محدب از یک سلولِ ورونوی: سقف، کف و دیواره‌ها. */
function buildShardGeometry(cell: FractureCell, thickness: number): THREE.BufferGeometry {
  const poly = cell.polygon;
  const n = poly.length;
  const half = thickness / 2;
  const positions: number[] = [];

  // مبدأ را به مرکزِ قطعه می‌بریم تا چرخش حولِ خودش باشد، نه حولِ مرکزِ کاشی.
  const [cx, cz] = cell.centroid;
  const vx = (i: number) => poly[i][0] - cx;
  const vz = (i: number) => poly[i][1] - cz;

  for (let i = 1; i < n - 1; i++) {
    // سقف (رو به بالا)
    positions.push(vx(0), half, vz(0), vx(i), half, vz(i), vx(i + 1), half, vz(i + 1));
    // کف (ترتیبِ معکوس تا نرمالش رو به پایین باشد)
    positions.push(vx(0), -half, vz(0), vx(i + 1), -half, vz(i + 1), vx(i), -half, vz(i));
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    positions.push(vx(i), -half, vz(i), vx(j), -half, vz(j), vx(j), half, vz(j));
    positions.push(vx(i), -half, vz(i), vx(j), half, vz(j), vx(i), half, vz(i));
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

interface ShardMotion {
  geometry: THREE.BufferGeometry;
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
}

export function Shards({
  fracture,
  material,
  thickness,
  y,
  /** ثانیه از لحظهٔ جداشدن. صفر یعنی هنوز سرِ جای خود. ref، به همان دلیلِ CrackLines. */
  elapsedRef,
  seed,
}: {
  fracture: FractureResult;
  material: THREE.Material;
  thickness: number;
  y: number;
  elapsedRef: RefObject<number>;
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const shards = useMemo<ShardMotion[]>(() => {
    const rng = makeRng(seed + 977);
    return fracture.cells.map((cell) => {
      const [cx, cz] = cell.centroid;
      const dist = Math.max(cell.distance, 0.001);
      // ضربه از محلِ برخورد بیرون می‌زند: قطعاتِ نزدیک تندتر و پرتاب‌شده‌ترند.
      const outward = new THREE.Vector3(cx, 0, cz).normalize();
      const push = 1.5 / (1 + dist * 2.2);
      return {
        geometry: buildShardGeometry(cell, thickness),
        origin: new THREE.Vector3(cx, 0, cz),
        velocity: new THREE.Vector3(
          outward.x * push + (rng() - 0.5) * 0.45,
          -0.35 - rng() * 0.7,
          outward.z * push + (rng() - 0.5) * 0.45,
        ),
        spin: new THREE.Vector3(
          (rng() - 0.5) * 7,
          (rng() - 0.5) * 5,
          (rng() - 0.5) * 7,
        ),
      };
    });
  }, [fracture, thickness, seed]);

  /* هندسهٔ هر قطعه یک بافرِ GPU است. بدونِ این پاک‌سازی، هر پرسش یک کاشیِ
     شکسته به حافظه اضافه می‌کرد و هیچ‌وقت پس نمی‌داد. */
  useEffect(() => {
    return () => {
      for (const s of shards) s.geometry.dispose();
    };
  }, [shards]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const t = elapsedRef.current;
    if (t <= 0) return;

    for (let i = 0; i < group.children.length; i++) {
      const mesh = group.children[i];
      const s = shards[i];
      if (!s) continue;
      mesh.position.set(
        s.origin.x + s.velocity.x * t,
        s.origin.y + s.velocity.y * t + 0.5 * GRAVITY * t * t,
        s.origin.z + s.velocity.z * t,
      );
      mesh.rotation.set(s.spin.x * t, s.spin.y * t, s.spin.z * t);
    }
  });

  return (
    <group ref={groupRef} position={[0, y, 0]}>
      {shards.map((s, i) => (
        <mesh key={i} geometry={s.geometry} material={material} castShadow={false} raycast={NO_RAYCAST} />
      ))}
    </group>
  );
}
