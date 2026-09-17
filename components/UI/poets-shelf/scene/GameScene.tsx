"use client";

import { use, useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ARRIVAL_Z,
  BOOK_HEIGHT,
  CHARACTER_HEIGHT,
  HOME_X,
  HOME_Z,
  SHELF_Y,
  bookSlots,
  frameFor,
} from "@/lib/poets-shelf/layout";
import type { PoetsShelfConfig } from "@/lib/poets-shelf/config";
import type { MachineState } from "@/lib/poets-shelf/machine";
import type { QualitySettings } from "@/lib/poets-shelf/quality";
import type { ScenePalette } from "@/lib/poets-shelf/theme";
import { loadBookAsset } from "./bookAsset";
import { SLAM_RELEASE_AFTER_IMPACT, type BookCueKind } from "./bookChoreography";
import { Book } from "./Book";
import { Burst } from "./Burst";
import { Character, type CharacterMotion } from "./Character";
import { DizzyStars } from "./DizzyStars";
import { Environment } from "./Environment";
import { GameCamera } from "./GameCamera";
import { ParticleField } from "./ParticleField";

/* ═══════════════════════════════════════════════════════════════════════════
   صحنه — جایی که حالتِ بازی به تصویر ترجمه می‌شود.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ این کامپوننت هیچ تصمیمی نمی‌گیرد.

   هیچ تایمری ندارد، هیچ `setState`ای ندارد، و هیچ‌وقت نمی‌پرسد «حالا باید
   چه اتفاقی بیفتد». فقط `machine.state` را می‌خواند و می‌گوید هر چیزِ صحنه
   در آن حالت چه شکلی است. کلِ منطقِ زمان‌بندی در `PoetsShelfGame` است و کلِ
   منطقِ گذار در `machine.ts`.

   فایدهٔ این جداسازی وقتی معلوم می‌شود که چیزی خراب شود: یا حالت غلط است
   (ماشین) یا تصویرِ آن حالت غلط است (اینجا) — و هیچ‌وقت «هر دو کمی».
   ═══════════════════════════════════════════════════════════════════════════ */

export interface GameSceneProps {
  machine: MachineState;
  config: PoetsShelfConfig;
  quality: QualitySettings;
  palette: ScenePalette;
  reducedMotion: boolean;
  /** آیا شخصیت بلند شده و آمادهٔ دویدن به خانه است؟ */
  returningHome: boolean;
  onSelect: (index: number) => void;
  onArrive: () => void;
  /** لحظهٔ برخورد — تکانِ دوربین و پاشش از این می‌آیند. ref است تا شروعِ
   *  یک جلوه، رندرِ دوبارهٔ کلِ صحنه را لازم نداشته باشد. */
  impactAt: React.RefObject<number>;
  successAt: React.RefObject<number>;
  debugHits?: boolean;
}

export function GameScene({
  machine,
  config,
  quality,
  palette,
  reducedMotion,
  returningHome,
  onSelect,
  onArrive,
  impactAt,
  successAt,
  debugHits = false,
}: GameSceneProps) {
  const asset = use(loadBookAsset());
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const headRef = useRef<THREE.Object3D | null>(null);

  /* ⚠️ زمینه اینجا به‌روز می‌شود و نه در `onCreated`.
     `onCreated` فقط یک بار اجرا می‌شود؛ اگر رنگِ زمینه فقط آنجا نشانده
     می‌شد، عوض‌کردنِ تم یا پالت همه‌چیز را عوض می‌کرد جز پس‌زمینه — و
     درزِ اطرافِ دیوار با رنگِ تمِ قبلی می‌ماند.
     شیءِ `Color` هم دوباره ساخته نمی‌شود، فقط مقدارش کپی می‌شود. */
  useEffect(() => {
    const next = new THREE.Color(palette.fog);
    if (scene.background instanceof THREE.Color) scene.background.copy(next);
    else scene.background = next;
  }, [scene, palette.fog]);

  const { state, round, chosen, outcome } = machine;
  const optionCount = round?.options.length ?? config.optionCount;

  /* ── قاب و جایگاه‌ها ────────────────────────────────────────────────────
     یک محاسبه، دو مصرف‌کننده: دوربین و چیدمانِ کتاب‌ها. همین یکی‌بودن است
     که تضمین می‌کند کتاب‌ها هیچ‌وقت بیرونِ کادر نیفتند. */
  const aspect = size.height > 0 ? size.width / size.height : 16 / 9;
  const frame = useMemo(() => frameFor(aspect, optionCount), [aspect, optionCount]);
  const slots = useMemo(() => bookSlots(optionCount, frame.spacing), [optionCount, frame.spacing]);

  /* ── ترجمهٔ حالت به نشانهٔ هر کتاب ──────────────────────────────────────── */
  const cueFor = (index: number): BookCueKind => {
    if (chosen === null || index !== chosen) return "rest";
    switch (state) {
      case "moving":
      case "arrived":
        return "chosen";
      case "resolving":
      case "success":
      case "failure":
        return outcome === "correct" ? "cheer" : "slam";
      default:
        return "rest";
    }
  };

  /* ── ترجمهٔ حالت به حرکتِ شخصیت ──────────────────────────────────────────

     ⚠️ `resetting` دو پرده دارد و این تنها جایی است که یک حالتِ ماشین به
     دو تصویر نگاشته می‌شود. دلیلش کمبودِ دارایی است: هیچ کلیپِ
     «بلندشدن»ی وجود ندارد. پس شخصیتِ زمین‌خورده اول با یک محوِ متقابلِ
     کمی بلندتر به `idle` می‌رود — که چشم آن را به‌صورتِ برخاستن می‌خواند —
     و تازه بعد می‌دود. بدونِ این، او از حالتِ درازکش مستقیم به دویدن
     می‌پرید. */
  const motion: CharacterMotion = (() => {
    switch (state) {
      case "moving":
        return "run";
      case "success":
        return "victory";
      case "failure":
        return "hit";
      case "resetting":
        return returningHome ? "run" : "idle";
      default:
        return "idle";
    }
  })();

  /* ⚠️ مقصد باید *از نظرِ ارجاع* پایدار باشد و نه فقط از نظرِ مقدار.
     `Character` یک effect دارد که با هر مقصدِ تازه نگهبانِ «رسیدم» را باز
     می‌کند و صدای شروعِ دویدن را می‌زند. اگر اینجا در هر رندر یک آرایهٔ
     تازه ساخته می‌شد — که نسخهٔ اول می‌کرد — آن effect با هر رندرِ صحنه
     دوباره اجرا می‌شد: نگهبان وسطِ راه باز می‌شد و صدای دویدن چند بار
     شلیک می‌کرد. پس فقط به مختصاتِ *عددی* وابسته است. */
  const movingTo = state === "moving" && chosen !== null ? slots[chosen] : null;
  const goingHome = state === "resetting" && returningHome;
  const targetX = movingTo ? movingTo.arrival[0] : goingHome ? HOME_X : 0;
  const targetZ = movingTo ? movingTo.arrival[2] : goingHome ? HOME_Z : 0;
  const hasTarget = Boolean(movingTo) || goingHome;

  const target = useMemo<readonly [number, number] | null>(
    () => (hasTarget ? [targetX, targetZ] : null),
    [hasTarget, targetX, targetZ],
  );

  /* رو به کجا بایستد وقتی مقصدی ندارد.
     ‎π‎ یعنی رو به دیوار و کتاب‌ها (شخصیت در فضای مدل رو به ‎+z‎ است). */
  const restFacing = (() => {
    if (state === "success") {
      /* ⚠️ برای جشن به سمتِ دوربین برمی‌گردد. کلیپِ Victory دست‌ها را بالا
         می‌برد و اگر پشتش به بازیکن بود، کلِ جشن پشتِ سرِ او اتفاق می‌افتاد.
         زاویهٔ کمی مایل (و نه صفرِ دقیق) سیلوئت را تخت نمی‌کند. */
      return 0.28;
    }
    return Math.PI;
  })();

  /* ── جای پاشش‌ها ──────────────────────────────────────────────────────── */
  const chosenX = chosen !== null && slots[chosen] ? slots[chosen].position[0] : 0;

  /* برخورد دقیقاً روی سرِ شخصیت رخ می‌دهد — همان‌جا که کتاب فرود می‌آید. */
  const impactPosition = useMemo(
    () => [chosenX, CHARACTER_HEIGHT * 0.95, ARRIVAL_Z - 0.08] as const,
    [chosenX],
  );
  /* جشن از خودِ کتاب می‌جوشد و نه از شخصیت. */
  const successPosition = useMemo(
    () => [chosenX, SHELF_Y + BOOK_HEIGHT * 0.6, 0.3] as const,
    [chosenX],
  );

  return (
    <>
      <GameCamera
        frame={frame}
        shakeAt={impactAt}
        shakeStrength={1}
        reducedMotion={reducedMotion}
      />

      <Environment palette={palette} quality={quality} />

      <ParticleField count={quality.particleCount} color={palette.particle} reducedMotion={reducedMotion} />

      {round?.options.map((option, index) => {
        const slot = slots[index];
        if (!slot) return null;
        return (
          <Book
            key={option.work.id}
            slot={slot}
            title={option.work.title}
            cue={cueFor(index)}
            enabled={state === "ready"}
            onSelect={onSelect}
            palette={palette}
            asset={asset}
            reducedMotion={reducedMotion}
            shadows={quality.shadows}
            debugHits={debugHits}
          />
        );
      })}

      <Character
        motion={motion}
        target={target}
        restFacing={restFacing}
        onArrive={onArrive}
        config={config}
        shadows={quality.shadows}
        headRef={headRef}
      />

      {/* گیجی فقط در همان پنجره‌ای که شخصیت روی زمین است. با پایانِ حالتِ
          `failure` خودش محو می‌شود — هیچ تایمری لازم نیست.

          تأخیر از خودِ رقصِ کتاب می‌آید و یک عددِ دستی نیست: ستاره‌ها
          دقیقاً وقتی پیدا می‌شوند که کتاب از روی سر بلند شده باشد. */}
      <DizzyStars
        headRef={headRef}
        active={state === "failure"}
        delayMs={SLAM_RELEASE_AFTER_IMPACT}
        color={palette.wrong}
        reducedMotion={reducedMotion}
      />

      <Burst
        position={impactPosition}
        trigger={impactAt}
        variant="impact"
        color={palette.wrong}
        reducedMotion={reducedMotion}
      />
      <Burst
        position={successPosition}
        trigger={successAt}
        variant="success"
        color={palette.correct}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
