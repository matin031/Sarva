"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NO_RAYCAST } from "./raycast";

/* ═══════════════════════════════════════════════════════════════════════════
   پاشش — یک جلوهٔ کوتاه، دو کاربرد.
   ═══════════════════════════════════════════════════════════════════════════

   «کوبیده شد» و «درست بود» هر دو به یک چیز نیاز دارند: یک تأکیدِ لحظه‌ای در
   یک نقطهٔ مشخص. تفاوتشان فقط در رنگ، جهت و شتاب است — نه در ساختار. پس یک
   کامپوننت با دو حالت، و نه دو کامپوننتِ تقریباً یکسان.

     impact  — حلقه‌ای که تند باز می‌شود و خرده‌هایی که به بیرون و پایین
               می‌پاشند. تند و کوبنده.
     success — حلقه‌ای آرام‌تر و خرده‌هایی که *بالا* می‌روند و شناور می‌مانند.

   ⚠️ مثلِ ستاره‌های گیجی، این هم همیشه سوار است و فقط نامرئی می‌شود.
   ساختن و دورریختنِ هندسه در هر دور، همان انباشتی است که صورت‌مسئله منع
   کرده بود.
   ═══════════════════════════════════════════════════════════════════════════ */

const SPECK_COUNT = 14;
const IMPACT_MS = 620;
const SUCCESS_MS = 900;

export interface BurstProps {
  /** مرکزِ پاشش. */
  position: readonly [number, number, number];
  /**
   * لحظهٔ شلیک (`performance.now`)، به‌صورتِ ref. صفر یعنی هنوز هیچ.
   *
   * ⚠️ چرا ref و نه prop عددی. اگر عدد بود، هر برخورد یک `setState` در
   * لایهٔ بازی لازم داشت و آن یعنی رندرِ دوبارهٔ کلِ درختِ صحنه — پنج
   * کتاب، شخصیت و محیط — فقط برای اینکه یک جلوهٔ ۶۲۰ میلی‌ثانیه‌ای شروع
   * شود. با ref، لایهٔ بازی فقط یک عدد می‌نویسد و حلقهٔ رندر همان فریمِ
   * بعد می‌بیندش. React اصلاً درگیر نمی‌شود.
   */
  trigger: React.RefObject<number>;
  variant: "impact" | "success";
  color: string;
  reducedMotion: boolean;
}

export function Burst({ position, trigger, variant, color, reducedMotion }: BurstProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const specksRef = useRef<THREE.Points>(null);

  const duration = variant === "impact" ? IMPACT_MS : SUCCESS_MS;

  /* جهت‌های اولیهٔ خرده‌ها. یک بار حساب می‌شوند و قطعی‌اند — پاششِ تصادفی
     در هر دور، حسِ «همان ضربه» را از بین می‌برد. */
  const directions = useMemo(() => {
    const out = new Float32Array(SPECK_COUNT * 3);
    for (let i = 0; i < SPECK_COUNT; i++) {
      const angle = (i / SPECK_COUNT) * Math.PI * 2 + (i % 3) * 0.37;
      /* پخشِ نامنظمِ ارتفاع: پاششِ کاملاً متقارن مصنوعی دیده می‌شود. */
      const lift = 0.35 + ((i * 7) % 11) / 18;
      out[i * 3] = Math.cos(angle);
      out[i * 3 + 1] = lift;
      out[i * 3 + 2] = Math.sin(angle) * 0.55;
    }
    return out;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPECK_COUNT * 3), 3));
    return geo;
  }, []);

  const speckMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(color),
        size: 0.055,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [color],
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [color],
  );

  useEffect(() => {
    speckMaterial.color.set(color);
    ringMaterial.color.set(color);
  }, [speckMaterial, ringMaterial, color]);

  useEffect(
    () => () => {
      geometry.dispose();
      speckMaterial.dispose();
      ringMaterial.dispose();
    },
    [geometry, speckMaterial, ringMaterial],
  );

  useFrame(() => {
    const group = groupRef.current;
    const ring = ringRef.current;
    const specks = specksRef.current;
    if (!group || !ring || !specks) return;

    const startedAt = trigger.current;
    if (!startedAt) {
      group.visible = false;
      return;
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed < 0 || elapsed > duration) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.set(position[0], position[1], position[2]);

    const t = elapsed / duration;
    const fade = 1 - t;

    /* ── حلقه ──────────────────────────────────────────────────────────────
       باز می‌شود و محو. `easeOut` یعنی بیشترِ رشد در همان دهمِ اولِ ثانیه
       رخ می‌دهد — چیزی که چشم به‌صورتِ «ضربه» می‌خواند و نه «موج». */
    const grow = 1 - (1 - t) ** 3;
    const ringScale = variant === "impact" ? 0.12 + grow * 0.5 : 0.1 + grow * 0.42;
    ring.scale.setScalar(ringScale);
    ringMaterial.opacity = fade * (variant === "impact" ? 0.7 : 0.45);

    /* ── خرده‌ها ───────────────────────────────────────────────────────────
       حرکتِ پرتابی: سرعتِ اولیه در زمان، منهای جاذبه در زمانِ توان دو.
       در حالتِ «حرکتِ کم» خرده‌ها سرِ جایشان می‌مانند و فقط محو می‌شوند. */
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const spread = variant === "impact" ? 0.62 : 0.4;
    const gravity = variant === "impact" ? 1.15 : 0.22;
    const seconds = elapsed / 1000;

    for (let i = 0; i < SPECK_COUNT; i++) {
      const travel = reducedMotion ? 0.05 : spread * t;
      array[i * 3] = directions[i * 3] * travel;
      array[i * 3 + 1] =
        directions[i * 3 + 1] * travel * (variant === "success" ? 1.5 : 1) - gravity * seconds * seconds;
      array[i * 3 + 2] = directions[i * 3 + 2] * travel;
    }
    attribute.needsUpdate = true;
    speckMaterial.opacity = fade * 0.9;
  });

  return (
    <group ref={groupRef} visible={false} raycast={NO_RAYCAST}>
      {/* حلقه رو به دوربین می‌ایستد. چون دوربین این بازی تقریباً ثابت است،
          یک چرخشِ ثابت کافی است و نیازی به بیلبوردِ هر فریم نیست. */}
      <mesh ref={ringRef} material={ringMaterial} raycast={NO_RAYCAST}>
        <ringGeometry args={[0.62, 0.8, 28]} />
      </mesh>
      <points ref={specksRef} geometry={geometry} material={speckMaterial} raycast={NO_RAYCAST} />
    </group>
  );
}
