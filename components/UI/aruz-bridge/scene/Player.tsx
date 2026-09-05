"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { NO_RAYCAST } from "./AnswerHitTarget";
import { aruzBridgeAssets } from "@/lib/aruz-bridge/assets";
import type { CharacterAnimation } from "@/lib/aruz-bridge/types";

/* کاراکتر.
 *
 * از سؤال و پاسخ چیزی نمی‌داند. فقط دو چیز می‌گیرد: کجا باشد، و چه حرکتی
 * بازی کند. تصمیمِ «چرا باید بپرد» بالاتر گرفته می‌شود. */

export interface PlayerHandle {
  group: THREE.Group | null;
}

interface PlayerProps {
  /** موقعیتِ فعلی — بازی هر فریم قوسِ پرش را حساب می‌کند و اینجا می‌گذارد. */
  positionRef: RefObject<THREE.Vector3>;
  animation: CharacterAnimation;
  /** ۰..۱ در طولِ پرش؛ اندام‌ها از روی همین حرکت می‌کنند. */
  jumpPhaseRef: RefObject<number>;
  /** رو به کدام سمت بچرخد (رادیان). */
  facingRef: RefObject<number>;
  useModel: boolean;
}

/* ── نسخهٔ رویه‌ای ─────────────────────────────────────────────────────────
   تا وقتی player.glb نرسیده، همین بدنهٔ ساده‌سازی‌شده بازی می‌کند: سر، تنه،
   دست‌ها و پاها. کپسولِ بی‌هویت نیست — سایه‌اش روی شیشه خوانده می‌شود و
   جهتِ روبه‌رویش پیداست. */
function ProceduralBody({
  animation,
  jumpPhaseRef,
}: {
  animation: CharacterAnimation;
  jumpPhaseRef: RefObject<number>;
}) {
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);

  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e6c9a8", roughness: 0.75, metalness: 0 }),
    [],
  );
  const cloth = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#12a3a5",
        roughness: 0.62,
        metalness: 0.05,
        emissive: new THREE.Color("#0b4f52"),
        emissiveIntensity: 0.35,
      }),
    [],
  );
  const trim = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d9a441", roughness: 0.45, metalness: 0.3 }),
    [],
  );

  useEffect(
    () => () => {
      skin.dispose();
      cloth.dispose();
      trim.dispose();
    },
    [skin, cloth, trim],
  );

  /* ⚠️ ساعتِ *همین ژست*، نه ساعتِ صحنه.

     ژستِ سقوط از `state.clock.elapsedTime` تغذیه می‌شد — یعنی از زمانی که
     صفحه باز شده. دو پیامد داشت: فازِ شروعِ سقوط به لحظهٔ باز شدنِ صفحه
     بستگی داشت (پس دست و پا در اولین فریم می‌پریدند به یک وضعیتِ دلخواه)، و
     هیچ چیزی نمی‌توانست به «چقدر از سقوط گذشته» واکنش نشان دهد، چون این عدد
     هیچ‌وقت صفر نمی‌شد. با هر تغییرِ ژست از نو صفر می‌شود. */
  const poseClock = useRef(0);
  useEffect(() => {
    poseClock.current = 0;
  }, [animation]);

  useFrame((state, delta) => {
    // مثلِ ساعتِ صحنه، برای تبِ برگشته یا فریمِ جامانده سقف می‌خورد
    poseClock.current += Math.min(delta, 0.05);
    const p = poseClock.current;
    const swing = Math.sin(jumpPhaseRef.current * Math.PI);

    /* ⚠️ هر ژست *همهٔ* کانال‌ها را می‌نویسد.

       پیش از این هر ژست فقط چیزهایی را می‌نوشت که خودش لازم داشت، پس
       مقدارها از ژستِ قبلی نشت می‌کردند: `land` تنه را ۹ سانت پایین می‌برد و
       `jump` و `fall` هیچ‌وقت برش نمی‌گرداندند. تنها چیزی که تصادفاً نجاتش
       می‌داد این بود که ژستِ ایستاده وسطشان می‌آمد و پاک‌سازی می‌کرد — یک
       وابستگیِ ناگفته به ترتیبِ حالت‌ها. */
    switch (animation) {
      case "jump": {
        /* دست‌ها *به سمتِ جلو* بالا می‌آیند.

           پل به سمتِ ‎−Z‎ می‌رود و چرخشِ حولِ محورِ X با زاویهٔ مثبت، نوکِ
           عضوِ آویزان را به همان سمت می‌برد. مقدارِ پیشین منفی بود، یعنی
           بازیکن در حالِ پریدن به جلو، دست‌هایش را به عقب می‌برد. */
        const arm = 2.0 * swing;
        if (leftArm.current) leftArm.current.rotation.x = arm;
        if (rightArm.current) rightArm.current.rotation.x = arm;
        // پاها قیچی می‌شوند: یکی جلو، یکی عقب
        if (leftLeg.current) leftLeg.current.rotation.x = 0.85 * swing;
        if (rightLeg.current) rightLeg.current.rotation.x = -0.7 * swing;
        if (torso.current) {
          torso.current.rotation.x = 0.18 * swing;
          torso.current.position.y = 0;
        }
        break;
      }

      case "land":
        // زانوها خم می‌شوند و ضربه را می‌گیرند
        if (leftLeg.current) leftLeg.current.rotation.x = -0.32;
        if (rightLeg.current) rightLeg.current.rotation.x = -0.32;
        if (leftArm.current) leftArm.current.rotation.x = 0.5;
        if (rightArm.current) rightArm.current.rotation.x = 0.5;
        if (torso.current) {
          torso.current.rotation.x = 0.1;
          torso.current.position.y = -0.09;
        }
        break;

      case "fall": {
        /* سقوط: یک تقلای کوتاه که فرو می‌نشیند، نه دست‌وپا زدنِ بی‌پایان.

           نسخهٔ پیشین چهار موجِ تندِ ناهمگام داشت (۱۵، ۱۴، ۱۲ و ۱۳ رادیان بر
           ثانیه) که با هم هیچ نسبتی نداشتند؛ نتیجه‌اش لرزشِ بی‌معنا بود، نه
           حرکت. حالا یک موجِ کندتر با فازِ مخالف بینِ چپ و راست — که چشم آن
           را به‌صورتِ «تقلا» می‌خواند — و دامنه‌اش با زمان می‌خوابد، چون
           آدمِ در حالِ سقوط بعد از لحظهٔ اول تسلیم می‌شود. */
        const struggle = Math.exp(-p * 1.3);
        const wave = Math.sin(p * 6.5) * 0.55 * struggle;
        // بالا رفتنِ دست‌ها از هوایی که از کنارشان می‌گذرد، نه از تصمیمِ آن‌ها
        const lift = 2.2 * (1 - Math.exp(-p * 4));
        if (leftArm.current) leftArm.current.rotation.x = lift + wave;
        if (rightArm.current) rightArm.current.rotation.x = lift - wave;
        if (leftLeg.current) leftLeg.current.rotation.x = wave * 1.1;
        if (rightLeg.current) rightLeg.current.rotation.x = -wave * 1.1;
        if (torso.current) {
          // تنه به‌آرامی به عقب می‌چرخد؛ سقوط با پشت، نه با صورت
          torso.current.rotation.x = -0.15 - 0.45 * (1 - Math.exp(-p * 1.6));
          torso.current.position.y = 0;
        }
        break;
      }

      default: {
        /* نفس‌کشیدنِ آرام. تنها ژستی که عمداً ساعتِ صحنه را می‌خواند: تنفس
           نباید با هر بار برگشتن به همین حالت از نو شروع شود. */
        const idle = Math.sin(state.clock.elapsedTime * 1.8) * 0.03;
        if (torso.current) {
          torso.current.position.y = idle;
          torso.current.rotation.x = 0;
        }
        if (leftArm.current) leftArm.current.rotation.x = idle * 1.5;
        if (rightArm.current) rightArm.current.rotation.x = -idle * 1.5;
        if (leftLeg.current) leftLeg.current.rotation.x = 0;
        if (rightLeg.current) rightLeg.current.rotation.x = 0;
      }
    }
  });

  return (
    <group ref={torso}>
      {/* سر */}
      <mesh position={[0, 0.92, 0]} material={skin} castShadow>
        <sphereGeometry args={[0.13, 20, 16]} />
      </mesh>
      {/* تنه */}
      <mesh position={[0, 0.6, 0]} material={cloth} castShadow>
        <capsuleGeometry args={[0.15, 0.3, 6, 14]} />
      </mesh>
      {/* کمربند */}
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={trim}>
        <torusGeometry args={[0.15, 0.022, 8, 20]} />
      </mesh>

      <group ref={leftArm} position={[-0.19, 0.76, 0]}>
        <mesh position={[0, -0.16, 0]} material={cloth} castShadow>
          <capsuleGeometry args={[0.045, 0.26, 4, 10]} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.19, 0.76, 0]}>
        <mesh position={[0, -0.16, 0]} material={cloth} castShadow>
          <capsuleGeometry args={[0.045, 0.26, 4, 10]} />
        </mesh>
      </group>

      <group ref={leftLeg} position={[-0.075, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} material={cloth} castShadow>
          <capsuleGeometry args={[0.055, 0.3, 4, 10]} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.075, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} material={cloth} castShadow>
          <capsuleGeometry args={[0.055, 0.3, 4, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── نسخهٔ GLB ─────────────────────────────────────────────────────────────
   وقتی player.glb اضافه شد، همین شاخه فعال می‌شود. کلیپ‌های موردانتظار
   Idle / Jump / Land / Fall هستند؛ اگر Land نبود، Jump جایش را می‌گیرد، پس
   مدلی با سه کلیپ هم کار می‌کند. */
function ModelBody({ animation }: { animation: CharacterAnimation }) {
  const { scene, animations } = useGLTF(aruzBridgeAssets.models.player);
  const root = useMemo(() => scene.clone(true), [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(root), [root]);
  const currentRef = useRef<THREE.AnimationAction | null>(null);

  const clips = useMemo(() => {
    const byName = new Map<string, THREE.AnimationClip>();
    for (const clip of animations) byName.set(clip.name.toLowerCase(), clip);
    const pick = (...names: string[]) => names.map((n) => byName.get(n)).find(Boolean) ?? null;
    return {
      idle: pick("idle"),
      jump: pick("jump"),
      // نبودِ Land نباید بازی را متوقف کند؛ Jump قابل‌قبول‌ترین جایگزین است.
      land: pick("land", "landing", "jump"),
      fall: pick("fall", "falling", "jump"),
    } satisfies Record<CharacterAnimation, THREE.AnimationClip | null>;
  }, [animations]);

  useEffect(() => {
    const clip = clips[animation] ?? clips.idle;
    if (!clip) return;
    const next = mixer.clipAction(clip);
    next.reset().fadeIn(0.18).play();
    const prev = currentRef.current;
    if (prev && prev !== next) prev.fadeOut(0.18);
    currentRef.current = next;
  }, [animation, clips, mixer]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
    },
    [mixer],
  );

  useFrame((_, delta) => mixer.update(delta));

  return <primitive object={root} />;
}

export function Player({ positionRef, animation, jumpPhaseRef, facingRef, useModel }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.copy(positionRef.current);
    // چرخشِ نرم به سمتِ مقصد، بدونِ پرش از ‎π به ‎−π
    const delta = ((facingRef.current - g.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += delta * 0.2;
  });

  return (
    <group ref={groupRef} raycast={NO_RAYCAST}>
      {useModel ? (
        <ModelBody animation={animation} />
      ) : (
        <ProceduralBody animation={animation} jumpPhaseRef={jumpPhaseRef} />
      )}
    </group>
  );
}
