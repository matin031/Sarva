"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import { BRIDGE_Y, stepZ, tileX } from "@/lib/aruz-bridge/layout";
import type { MachineState } from "@/lib/aruz-bridge/machine";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import type {
  CameraMode,
  CharacterAnimation,
  GameState,
  GlassState,
  Side,
} from "@/lib/aruz-bridge/types";
import { BridgeEnvironment } from "./BridgeEnvironment";
import { GameCamera } from "./GameCamera";
import { GlassTile } from "./GlassTile";
import { Player } from "./Player";

/* ═══════════════════════════════════════════════════════════════════════════
   صحنه — تنها جایی که «حالتِ بازی» به «حرکت» ترجمه می‌شود.
   ═══════════════════════════════════════════════════════════════════════════

   قاعدهٔ سختِ این فایل: هیچ‌چیزی که هر فریم عوض می‌شود از راهِ state رد
   نمی‌شود. موقعیتِ بازیکن، پیشرَویِ ترک و زمانِ سقوطِ قطعات همه در ref
   می‌نشینند و در `useFrame` مستقیم روی اشیای three نوشته می‌شوند. React فقط
   وقتی کار می‌کند که *حالتِ بازی* عوض شود — یعنی چند بار در هر مرحله، نه شصت
   بار در ثانیه.
   ═══════════════════════════════════════════════════════════════════════════ */

/** ارتفاعِ قوسِ پرش. کمتر از این، پرش شبیهِ سُر خوردن می‌شود. */
const JUMP_PEAK = 1.15;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/** کدام کاشی زیرِ پای بازیکن است، پیش از مرحلهٔ `index`. */
function standSide(machine: MachineState, index: number): Side | null {
  if (index === 0) return null;
  return machine.steps[index - 1]?.correctSide ?? null;
}

function standVector(machine: MachineState, index: number): THREE.Vector3 {
  const side = standSide(machine, index);
  return side === null
    ? new THREE.Vector3(0, BRIDGE_Y, 0)
    : new THREE.Vector3(tileX(side), BRIDGE_Y, stepZ(index - 1));
}

const CAMERA_MODE: Record<GameState, CameraMode> = {
  intro: "gameplay",
  preparing: "gameplay",
  showingQuestion: "gameplay",
  waitingForAnswer: "gameplay",
  jumping: "jump",
  landing: "jump",
  correct: "gameplay",
  timeout: "gameplay",
  cracking: "gameplay",
  shattering: "gameplay",
  falling: "fall",
  gameOver: "gameOver",
  finished: "gameplay",
};

const CHARACTER_ANIMATION: Record<GameState, CharacterAnimation> = {
  intro: "idle",
  preparing: "idle",
  showingQuestion: "idle",
  waitingForAnswer: "idle",
  jumping: "jump",
  landing: "land",
  correct: "idle",
  timeout: "idle",
  cracking: "idle",
  shattering: "idle",
  falling: "fall",
  gameOver: "fall",
  finished: "idle",
};

export interface GameSceneProps {
  machine: MachineState;
  config: AruzBridgeConfig;
  quality: QualitySettings;
  reducedMotion: boolean;
  usePlayerModel: boolean;
  onChoose: (side: Side) => void;
  inputLocked: boolean;
}

export function GameScene({
  machine,
  config,
  quality,
  reducedMotion,
  usePlayerModel,
  onChoose,
  inputLocked,
}: GameSceneProps) {
  const { state, stepIndex, chosen, epoch } = machine;
  const step = machine.steps[stepIndex] ?? null;

  /* ── ساعتِ حالت ─────────────────────────────────────────────────────────
     ثانیه از لحظهٔ ورود به حالتِ فعلی. با هر گذار صفر می‌شود. همهٔ
     انیمیشن‌های زمان‌دار از همین یک عدد تغذیه می‌شوند، پس تصویر دقیقاً با
     همان زمان‌بندی‌ای پیش می‌رود که ماشینِ حالت تایمرش را روی آن گذاشته. */
  const clock = useRef(0);
  useEffect(() => {
    clock.current = 0;
  }, [state, epoch]);

  const playerPos = useRef(new THREE.Vector3(0, BRIDGE_Y, 0));
  const jumpPhase = useRef(0);
  const facing = useRef(0);
  const crackProgress = useRef(0);
  const shatterElapsed = useRef(0);
  const cameraImpulse = useRef(0);

  /* مبدأ و مقصدِ پرشِ فعلی. فقط وقتی مرحله عوض می‌شود دوباره حساب می‌شوند. */
  const origin = useMemo(() => standVector(machine, stepIndex), [machine, stepIndex]);
  const destination = useMemo(() => {
    if (!step || !chosen) return origin.clone();
    return new THREE.Vector3(tileX(chosen), BRIDGE_Y, stepZ(stepIndex));
  }, [step, chosen, stepIndex, origin]);

  // بازیکن بیرون از پرش، سرِ جای ایستادنش است (مثلاً بعد از restart)
  useEffect(() => {
    if (state === "preparing" || state === "intro") {
      playerPos.current.copy(origin);
      jumpPhase.current = 0;
    }
  }, [state, origin]);

  /** نقطهٔ تماسِ پا روی کاشی — ترک باید از همین‌جا شروع شود، نه از مرکزِ هندسی. */
  const impact = useMemo(() => {
    // بازیکن از پشت می‌آید، پس تماس نزدیکِ لبهٔ عقبی است؛ کمی هم پراکندگی
    // می‌گیرد تا دو شکستِ پیاپی مثلِ هم نباشند.
    const jitter = ((stepIndex * 37) % 11) / 11 - 0.5;
    return { x: jitter * 0.4, z: 0.28 };
  }, [stepIndex]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    clock.current += dt;
    const t = clock.current;

    switch (state) {
      case "jumping": {
        const p = Math.min(1, t / (config.jumpDuration / 1000));
        jumpPhase.current = p;
        // افقی با easing ملایم، عمودی یک سهمیِ واقعی — نه خطی، نه تله‌پورت
        const e = easeInOutSine(p);
        playerPos.current.lerpVectors(origin, destination, e);
        playerPos.current.y = BRIDGE_Y + 4 * JUMP_PEAK * p * (1 - p);
        facing.current = Math.atan2(destination.x - origin.x, -(destination.z - origin.z)) * 0.5;
        break;
      }

      case "landing":
        jumpPhase.current = 0;
        playerPos.current.copy(destination);
        facing.current = 0;
        break;

      case "cracking": {
        // ترک از صفر تا یک، در همان مدتی که ماشینِ حالت برای این حالت گذاشته
        crackProgress.current = Math.min(1, t / (config.crackDuration / 1000));
        shatterElapsed.current = 0;
        // ضربهٔ دوربین: فقط ~۱۰۰ میلی‌ثانیهٔ اولِ ترک
        cameraImpulse.current = Math.max(0, 1 - t / 0.1);
        break;
      }

      case "shattering":
        crackProgress.current = 1;
        shatterElapsed.current = t;
        cameraImpulse.current = 0;
        break;

      case "falling": {
        shatterElapsed.current = t + config.glassBreakDelay / 1000;
        // سقوطِ شتاب‌دار — سرعت زیاد می‌شود، پس عمق واقعی حس می‌شود
        playerPos.current.y = BRIDGE_Y - 0.5 * 15 * t * t;
        break;
      }

      case "gameOver":
        shatterElapsed.current += dt;
        playerPos.current.y -= 9 * dt;
        break;

      default:
        crackProgress.current = 0;
        cameraImpulse.current = 0;
        if (state !== "correct") jumpPhase.current = 0;
    }
  });

  /* ── حالتِ دیداریِ هر کاشی ───────────────────────────────────────────────
     دو سناریوی مرگ، دو کاشیِ متفاوت:
       • پاسخِ غلط  → کاشیِ *انتخاب‌شده* می‌شکند.
       • پایانِ زمان → کاشیِ *زیرِ پا* می‌شکند (بی‌عملی هم سقوط دارد). */
  const breaking = useMemo(() => {
    const failing =
      state === "cracking" || state === "shattering" || state === "falling" || state === "gameOver";
    if (!failing) return null;

    if (machine.failure === "timeout") {
      const side = standSide(machine, stepIndex);
      return { index: side === null ? -1 : stepIndex - 1, side };
    }
    return chosen ? { index: stepIndex, side: chosen } : null;
  }, [state, machine, stepIndex, chosen]);

  const glassStateFor = (index: number, side: Side | null): GlassState => {
    if (!breaking || breaking.index !== index || breaking.side !== side) return "intact";
    switch (state) {
      case "cracking":
        return "cracking";
      case "shattering":
        return "shattering";
      default:
        return "broken";
    }
  };

  /* چند جفت رندر شود. مه بقیه را می‌خورد، پس بیش از این هزینهٔ بی‌فایده است —
     و کمتر از این یعنی جفتِ بعدی جلوی چشمِ بازیکن ناگهان ظاهر می‌شود. */
  const visiblePairs = useMemo(() => {
    const out: number[] = [];
    for (let i = Math.max(0, stepIndex - 1); i <= Math.min(machine.steps.length - 1, stepIndex + 3); i++) {
      out.push(i);
    }
    return out;
  }, [stepIndex, machine.steps.length]);

  /* شفافیتِ برچسب‌ها از *حالت* می‌آید، نه از هر فریم: مقدارهای گسسته و
     گذارِ CSS. یعنی حرکتِ نرم بدونِ حتی یک re-render. */
  const optionsOpacity =
    state === "preparing" || state === "intro"
      ? 0
      : state === "showingQuestion"
        ? 0.85
        : state === "gameOver" || state === "finished"
          ? 0.9
          : 1;

  const selectable = !inputLocked;

  const revealFor = (index: number) => (index <= stepIndex + 3 ? 1 : 0);

  return (
    <>
      <GameCamera
        targetRef={playerPos}
        mode={CAMERA_MODE[state]}
        followSpeed={config.cameraFollowSpeed}
        impulseRef={cameraImpulse}
        reducedMotion={reducedMotion}
      />

      <BridgeEnvironment
        quality={quality}
        steps={machine.steps.length || config.questionsPerRun}
        fogNear={config.fogNear}
        fogFar={config.fogFar}
      />

      {/* سکوی آغاز. همان شیشه است تا اگر زمان در مرحلهٔ اول تمام شد،
          مرگ دقیقاً مثلِ بقیهٔ مراحل اتفاق بیفتد. */}
      <GlassTile
        position={[0, BRIDGE_Y, 0]}
        state={glassStateFor(-1, null)}
        quality={quality}
        impactX={impact.x}
        impactZ={impact.z}
        crackProgressRef={crackProgress}
        shatterElapsedRef={shatterElapsed}
        seed={7}
      />

      {visiblePairs.map((index) => {
        const pair = machine.steps[index];
        if (!pair) return null;
        const isCurrent = index === stepIndex;
        const reveal = revealFor(index);
        const revealAnswer = isCurrent && (state === "gameOver" || state === "finished");

        return (
          <group key={pair.question.id}>
            {(["left", "right"] as const).map((side) => (
              <GlassTile
                key={side}
                position={[tileX(side), BRIDGE_Y, stepZ(index)]}
                state={glassStateFor(index, side)}
                quality={quality}
                impactX={impact.x}
                impactZ={impact.z}
                crackProgressRef={crackProgress}
                shatterElapsedRef={shatterElapsed}
                reveal={reveal}
                seed={index * 31 + (side === "left" ? 1 : 2)}
                selectable={isCurrent && selectable}
                onPointerSelect={isCurrent && selectable ? () => onChoose(side) : undefined}
                /* فقط جفتِ فعلی متن دارد. جفت‌های بعدی از دلِ مه پیدا
                   می‌شوند ولی هنوز خالی‌اند — چشمِ بازیکن نباید بینِ چند
                   وزن در چند عمق تقسیم شود. */
                label={isCurrent ? (side === "left" ? pair.leftPattern : pair.rightPattern) : undefined}
                labelOpacity={isCurrent ? optionsOpacity : 0}
                labelHighlight={
                  revealAnswer ? (pair.correctSide === side ? "correct" : "wrong") : null
                }
              />
            ))}
          </group>
        );
      })}

      <Player
        positionRef={playerPos}
        animation={CHARACTER_ANIMATION[state]}
        jumpPhaseRef={jumpPhase}
        facingRef={facing}
        useModel={usePlayerModel}
      />
    </>
  );
}
