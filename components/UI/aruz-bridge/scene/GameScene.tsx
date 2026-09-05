"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import { BRIDGE_Y, stepZ, tileX } from "@/lib/aruz-bridge/layout";
import { breakingTile, glassStateFor, standSide } from "@/lib/aruz-bridge/glass";
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
import { publishInteractionDebug } from "./interactionDebug";
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

function standVector(machine: MachineState, index: number): THREE.Vector3 {
  /* همان `standSide` که منطقِ شکستن هم از آن استفاده می‌کند. یک نسخهٔ محلی
     اینجا بود؛ دو کپی از «کدام کاشی زیرِ پاست» دیر یا زود از هم دور می‌شوند. */
  const side = standSide(machine.steps, index);
  return side === null
    ? new THREE.Vector3(0, BRIDGE_Y, 0)
    : new THREE.Vector3(tileX(side), BRIDGE_Y, stepZ(index - 1));
}

const CAMERA_MODE: Record<GameState, CameraMode> = {
  intro: "gameplay",
  countdown: "gameplay",
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
  countdown: "idle",
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
  /** حالتِ توسعه: جعبه‌های برخورد را دیدنی می‌کند. */
  debugHitTargets?: boolean;
}

export function GameScene({
  machine,
  config,
  quality,
  reducedMotion,
  usePlayerModel,
  onChoose,
  inputLocked,
  debugHitTargets = false,
}: GameSceneProps) {
  const { state, stepIndex, chosen, epoch } = machine;
  const step = machine.steps[stepIndex] ?? null;

  /* ── ساعتِ حالت ─────────────────────────────────────────────────────────
     ثانیه از لحظهٔ ورود به حالتِ فعلی. با هر گذار صفر می‌شود. همهٔ
     انیمیشن‌های زمان‌دار از همین یک عدد تغذیه می‌شوند، پس تصویر دقیقاً با
     همان زمان‌بندی‌ای پیش می‌رود که ماشینِ حالت تایمرش را روی آن گذاشته. */
  /* ⚠️ ساعتِ دیواری، نه جمعِ deltaهای سقف‌خورده.

     پیش از این `clock` جمعِ `Math.min(delta, 0.05)` بود. سقف برای پایداریِ
     انتگرال‌گیری درست است، ولی همین سقف این ساعت را از ساعتی که *ماشینِ
     حالت* با آن کار می‌کند جدا می‌کرد: تایمرهای ماشین `setTimeout`اند و
     زمانِ واقعی را می‌شمارند.

     هر فریمِ کندتر از ۵۰ میلی‌ثانیه — یک وقفهٔ زباله‌روبی، یک تبِ کُندشده —
     فقط ۵۰ میلی‌ثانیه به این ساعت اضافه می‌کرد ولی زمانِ واقعی همان‌قدر که
     بود می‌گذشت. پس در لحظه‌ای که ماشین `landed` می‌فرستاد، `p` هنوز به ۱
     نرسیده بود و `landing` بازیکن را با یک `copy(destination)` به مقصد
     می‌چسباند: بقیهٔ مسیر پریده می‌شد.

     با ساعتِ دیواری، `p` دقیقاً وقتی به ۱ می‌رسد که تایمر هم می‌رسد. سقفِ
     `dt` سرِ جایش می‌ماند، چون هنوز برای حالت‌هایی که مستقیم انتگرال
     می‌گیرند (مثلِ `gameOver`) لازم است. */
  const clock = useRef(0);
  const stateStart = useRef(0);
  /* ⚠️ مهرِ زمان داخلِ خودِ فریم زده می‌شود و نه در یک `useEffect`.

     با effect، فریمی که *پیش از* اجرای effect می‌رسید هنوز مهرِ حالتِ قبلی
     را می‌دید و انیمیشن برای یک فریم از وسط شروع می‌شد. اینجا اولین فریمی
     که حالتِ تازه را می‌بیند، خودش مهر می‌زند — پس چنین فریمی وجود ندارد. */
  const stamped = useRef<{ state: GameState; epoch: number } | null>(null);

  /* یک شناسه برای کلِ صحنه. «کدام کاشی hover است» یک پرسشِ سراسری است، نه
     حالتی که هر کاشی جدا برای خودش نگه دارد؛ وگرنه دو کاشی می‌توانند
     هم‌زمان فکر کنند که انتخاب‌شده‌اند. */
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);

  const handleHover = useCallback(
    (tileId: string, entering: boolean) => {
      setHoveredTileId((current) => {
      if (entering) return tileId;
      /* هنگامِ عبورِ سریع از یک کاشی به کاشیِ دیگر، «خروج» از اولی گاهی
         *بعد* از «ورود» به دومی می‌رسد. اگر کورکورانه پاک می‌کردیم،
         انتخابِ تازه بلافاصله خاموش می‌شد؛ پس فقط کسی که خودش روشن کرده
         حق دارد خاموش کند. */
      return current === tileId ? null : current;
      });
      if (debugHitTargets) {
        publishInteractionDebug({ hoveredTileId: entering ? tileId : null });
      }
    },
    [debugHitTargets],
  );

  /* انتخاب از همان شیئی می‌آید که hover و متن و مقصدِ پرش را هم تعیین
     می‌کند — یعنی هیچ‌جا سمت دوباره حدس زده نمی‌شود. */
  const handleSelect = useCallback(
    (side: Side) => {
      if (debugHitTargets) {
        const target = machine.steps[machine.stepIndex];
        publishInteractionDebug({
          lastSelectedSide: side,
          lastClickedTileId: target ? `${target.uid}:${side}` : null,
          lastJumpTarget: { x: tileX(side), z: stepZ(machine.stepIndex) },
        });
      }
      onChoose(side);
    },
    [debugHitTargets, machine.steps, machine.stepIndex, onChoose],
  );

  /* hoverـِ *مؤثر* محاسبه می‌شود، نه همگام‌سازی.
     تا وقتی ماشینِ حالت پاسخ نمی‌پذیرد، هیچ کاشی‌ای hover نیست — حتی اگر
     اشاره‌گر هنوز رویش باشد. چون مشتق است، امکان ندارد یک hoverـِ جامانده
     از مرحلهٔ قبل روی صفحه بماند. */
  const effectiveHoverId = inputLocked ? null : hoveredTileId;

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

    const now = performance.now();
    if (stamped.current?.state !== state || stamped.current?.epoch !== epoch) {
      stamped.current = { state, epoch };
      stateStart.current = now;
    }
    // زمانِ سپری‌شده از ورود به این حالت — همان ساعتی که تایمرِ ماشین دارد
    clock.current = (now - stateStart.current) / 1000;
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

  /* حالتِ دیداریِ کاشی‌ها منطقِ خالص است و در `lib/aruz-bridge/glass.ts`
     زندگی می‌کند — همان‌جا هم تست دارد. صحنه فقط صدایش می‌زند. */
  const breaking = useMemo(
    () =>
      breakingTile({
        state,
        failure: machine.failure,
        stepIndex,
        chosen,
        steps: machine.steps,
      }),
    [state, machine.failure, machine.steps, stepIndex, chosen],
  );

  const tileState = (index: number, side: Side | null): GlassState =>
    glassStateFor(state, breaking, index, side);

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
        state={tileState(-1, null)}
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
          <group key={pair.uid}>
            {(["left", "right"] as const).map((side) => (
              <GlassTile
                key={side}
                position={[tileX(side), BRIDGE_Y, stepZ(index)]}
                state={tileState(index, side)}
                quality={quality}
                impactX={impact.x}
                impactZ={impact.z}
                crackProgressRef={crackProgress}
                shatterElapsedRef={shatterElapsed}
                reveal={reveal}
                seed={index * 31 + (side === "left" ? 1 : 2)}
                /* یک شیء، یک هویت: همین `tileId` هم hover را تعیین می‌کند،
                   هم انتخاب را، هم مقصدِ پرش — چون `side` از همان جفت
                   آماده‌شده می‌آید و جای دیگری دوباره قرعه نمی‌خورد.

                   ⚠️ از `uid` ساخته می‌شود و نه `question.id`: با تکرارِ
                   مجاز، دو نوبت از یک پرسش می‌توانند هم‌زمان دیده شوند و
                   شناسهٔ مشترک یعنی hoverِ یکی، دیگری را هم روشن می‌کرد. */
                tileId={`${pair.uid}:${side}`}
                side={side}
                selectable={isCurrent && selectable}
                hoveredTileId={effectiveHoverId}
                onHover={handleHover}
                onSelect={handleSelect}
                debugHitTargets={debugHitTargets}
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
