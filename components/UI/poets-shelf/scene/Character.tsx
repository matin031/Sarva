"use client";

import { use, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CHARACTER_SCALE, HOME_X, HOME_Z } from "@/lib/poets-shelf/layout";
import { CHARACTER_URL, loadClipBundle, pickClip, resolveClips, type ClipName } from "@/lib/poets-shelf/clips";
import type { PoetsShelfConfig } from "@/lib/poets-shelf/config";
import { emitSound } from "@/lib/poets-shelf/sound";
import { NO_RAYCAST } from "./raycast";

/* ═══════════════════════════════════════════════════════════════════════════
   شخصیت: مدل + میکسر + حرکت.
   ═══════════════════════════════════════════════════════════════════════════

   ── تقسیمِ مسئولیت ────────────────────────────────────────────────────────

   این کامپوننت از پرسش و پاسخ هیچ نمی‌داند. فقط سه چیز می‌گیرد:

     • `motion` — کدام حرکت بازی شود.
     • `target` — کجا برود (یا `null` یعنی بایست).
     • `onArrive` — وقتی رسید خبر بده.

   تصمیمِ «چرا باید بدود» بالاتر و در ماشینِ حالت گرفته می‌شود.

   ── چرا موقعیت در ref است و نه در state ───────────────────────────────────

   حرکت هر فریم به‌روز می‌شود. اگر در `useState` بود، ۶۰ رندرِ React در
   ثانیه راه می‌افتاد و کلِ درختِ صحنه را با خودش می‌برد. اینجا فقط
   `group.position` عوض می‌شود که یک نوشتنِ ساده در یک ماتریس است و React
   اصلاً از آن خبردار نمی‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

export type CharacterMotion = ClipName;

export interface CharacterProps {
  motion: CharacterMotion;
  /** مقصد روی کف (x, z). `null` یعنی همین‌جا بایست. */
  target: readonly [number, number] | null;
  /** وقتی مقصد ندارد، رو به کدام زاویه بایستد (رادیان). */
  restFacing: number;
  onArrive: () => void;
  config: PoetsShelfConfig;
  shadows: boolean;
  /** برای جلوه‌هایی که باید سر را دنبال کنند (ستاره‌های گیجی). */
  headRef?: React.RefObject<THREE.Object3D | null>;
}

/** فاصلهٔ سرِ شخصیت از مبدأِ گروه، به واحدِ جهان. */
export const HEAD_OFFSET_Y = 1.45;

export function Character({
  motion,
  target,
  restFacing,
  onArrive,
  config,
  shadows,
  headRef,
}: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(CHARACTER_URL);
  const bundle = use(loadClipBundle());

  /* ⚠️ `SkeletonUtils.clone` و نه `scene.clone(true)`.
     کلونِ معمولیِ three استخوان‌ها را کپی می‌کند ولی `SkinnedMesh` را به
     *اسکلتِ اصلی* وصل نگه می‌دارد. نتیجه‌اش این است که دو نمونه یک اسکلت را
     می‌رانند — و در حالتِ سخت‌گیرانهٔ React که هر کامپوننت دو بار سوار
     می‌شود، همین یک تفاوت باعث می‌شد شخصیت بی‌دلیل بلرزد. */
  const root = useMemo(() => cloneSkinned(scene), [scene]);

  const clips = useMemo(() => resolveClips(animations, bundle), [animations, bundle]);
  const mixer = useMemo(() => new THREE.AnimationMixer(root), [root]);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const runAction = useRef<THREE.AnimationAction | null>(null);

  /* حالتِ حرکت. همه در ref، چون هر فریم عوض می‌شوند.
     ⚠️ موقعیتِ اولیه *خانه* است و نه مبدأ. مبدأِ صحنه پای دیوار و زیرِ
     طاقچه است؛ شخصیتی که آنجا شروع کند، اولین فریم را داخلِ قفسه ظاهر
     می‌شود و بعد به بیرون سُر می‌خورد. */
  const position = useRef(new THREE.Vector3(HOME_X, 0, HOME_Z));
  const speed = useRef(0);
  const facing = useRef(restFacing);
  const arrived = useRef(false);

  /* شیءهای موقتِ قابلِ استفادهٔ دوباره — تا در `useFrame` هیچ برداری تخصیص نشود. */
  const scratch = useMemo(() => ({ delta: new THREE.Vector3() }), []);

  /* ── سایه و مرتب‌سازی ───────────────────────────────────────────────────── */
  useEffect(() => {
    root.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;
        mesh.castShadow = shadows;
        mesh.receiveShadow = false;
        /* ⚠️ شخصیت از پرتوافکنی بیرون است. یک مشِ پوست‌دار با ۹۶ هزار مثلث،
           هر حرکتِ اشاره‌گر را به یک آزمونِ برخوردِ گران تبدیل می‌کرد — و
           هیچ‌وقت هم قرار نیست کلیک بگیرد. */
        mesh.raycast = NO_RAYCAST;
        /* بدونِ این، جعبهٔ محیطی از ژستِ بایند حساب می‌ماند و شخصیت هنگامِ
           افتادن (که از جعبهٔ ایستاده بیرون می‌زند) ناگهان از دید حذف می‌شد. */
        mesh.frustumCulled = false;
      }
    });
  }, [root, shadows]);

  /* ── پخشِ کلیپ با محوِ متقابل ─────────────────────────────────────────────

     ⚠️ نکتهٔ ظریف: `reset()` روی اکشنی که همین حالا در حالِ پخش است، آن را
     از نو شروع می‌کند. برای `idle` یعنی هر بار که دلیلِ بی‌ربطی باعثِ
     اجرای دوبارهٔ این effect شود، نفس‌کشیدنِ شخصیت می‌پرد. پس اگر همان
     حرکت خواسته شده، کاری نمی‌کنیم. */
  useEffect(() => {
    const resolved = pickClip(clips, motion);
    if (!resolved) return;

    const next = mixer.clipAction(resolved.clip);

    /* ⚠️ این *پیش از* بازگشتِ زودهنگامِ زیر نوشته می‌شود.

       `mixer.clipAction` برای یک کلیپِ یکسان همیشه همان شیءِ اکشن را
       برمی‌گرداند. پس اگر حرکتِ تازه به همان کلیپِ فعلی حل شود — که با
       جایگزین‌های `pickClip` ممکن است (نبودِ `victory` به `idle` می‌رسد) —
       شرطِ زیر زود بیرون می‌زند. اگر تعیینِ اکشنِ دویدن بعد از آن بود،
       مقدارِ کهنه‌اش می‌ماند و کِش‌دادنِ زمان روی کلیپِ اشتباهی اعمال
       می‌شد. */
    runAction.current = motion === "run" ? next : null;

    const previous = currentAction.current;
    if (previous === next) return;

    const fade = config.crossfadeMs / 1000;

    next.reset();
    next.setLoop(resolved.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    /* ⚠️ کلیپ‌های یک‌باره باید روی *آخرین فریم* بمانند. بدونِ این، شخصیتِ
       زمین‌خورده در پایانِ کلیپ ناگهان به ژستِ بایند برمی‌گشت — یعنی وسطِ
       مکثِ کمدی، صاف می‌ایستاد. */
    next.clampWhenFinished = !resolved.loop;
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();

    if (previous) previous.fadeOut(fade);
    currentAction.current = next;
  }, [motion, clips, mixer, config.crossfadeMs]);

  /* ── تمیزکاری ─────────────────────────────────────────────────────────────
     ⚠️ `uncacheRoot` لازم است: `AnimationMixer` برای هر ریشه یک حافظهٔ
     اتصالِ ویژگی نگه می‌دارد. بدونِ پاک‌کردنش، هر بار که بازی دوباره سوار
     می‌شود (تغییرِ مسیر، بارگذاریِ داغ) یک مجموعهٔ کاملِ اتصال‌ها روی همان
     اسکلت جا می‌ماند. */
  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
    [mixer, root],
  );

  /* ── جای اولیه ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(position.current);
    group.rotation.y = facing.current;
  }, []);

  /* هر بار که مقصدِ تازه‌ای می‌آید، نگهبانِ «رسیدم» باز می‌شود. */
  useEffect(() => {
    arrived.current = false;
    if (target) emitSound("runStart");
  }, [target]);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    /* سقفِ گامِ زمانی. اگر کاربر به تبِ دیگری برود و برگردد، `delta` می‌تواند
       چند ثانیه باشد و شخصیت در یک فریم از کلِ صحنه رد شود. */
    const delta = Math.min(rawDelta, 0.05);

    const { runSpeed, runAccel, turnSpeed, arriveEpsilon } = config;

    if (target) {
      scratch.delta.set(target[0] - position.current.x, 0, target[1] - position.current.z);
      const distance = scratch.delta.length();

      if (distance <= arriveEpsilon) {
        /* رسیدنِ *دقیق*: موقعیت روی مقصد نشانده می‌شود و نه «نزدیکِ» آن.
           بدونِ این، خطای هر دور جمع می‌شد و کتاب‌ها و شخصیت کم‌کم از هم
           فاصله می‌گرفتند. */
        position.current.x = target[0];
        position.current.z = target[1];
        speed.current = 0;
        if (!arrived.current) {
          arrived.current = true;
          emitSound("arrive");
          onArrive();
        }
      } else {
        scratch.delta.divideScalar(distance);

        /* چرخش به سمتِ مقصد، از کوتاه‌ترین کمان. */
        const desired = Math.atan2(scratch.delta.x, scratch.delta.z);
        const diff = ((desired - facing.current + Math.PI) % (Math.PI * 2)) - Math.PI;
        const turn = Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * delta);
        facing.current += turn;

        /* ⚠️ «آماده‌شدن» پیش از حرکت.

           سرعت در ضریبِ هم‌راستایی ضرب می‌شود، پس شخصیتی که هنوز رو به
           مقصد نیست تقریباً حرکت نمی‌کند: اول می‌چرخد و بعد راه می‌افتد.
           بدونِ این، او به‌صورتِ پهلو به سمتِ کتاب سُر می‌خورد و بعد
           می‌چرخید — همان حرکتی که شبیهِ جابه‌جاییِ یک عنصرِ DOM است و نه
           دویدنِ یک شخصیت. */
        const alignment = Math.max(0, Math.cos(diff));

        /* فاصلهٔ لازم برای ایستادن، از روی سرعتِ فعلی. وقتی به آن رسیدیم
           ترمز می‌گیریم تا دقیقاً سرِ مقصد بایستد و نه از آن رد شود. */
        const braking = (speed.current * speed.current) / (2 * runAccel);
        const wanted = distance <= braking ? 0 : runSpeed * alignment;

        speed.current += Math.sign(wanted - speed.current) * runAccel * delta;
        speed.current = Math.max(0, Math.min(speed.current, runSpeed));

        const step = Math.min(speed.current * delta, distance);
        position.current.x += scratch.delta.x * step;
        position.current.z += scratch.delta.z * step;
      }
    } else {
      speed.current = 0;
      /* بدونِ مقصد، به زاویهٔ خواسته‌شده می‌چرخد — مثلاً رو به کتاب. */
      const diff = ((restFacing - facing.current + Math.PI) % (Math.PI * 2)) - Math.PI;
      facing.current += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * delta);
    }

    group.position.copy(position.current);
    group.rotation.y = facing.current;

    /* ⚠️ همگام‌سازیِ گام با سرعت — علاجِ سُرخوردنِ پا.

       چرخهٔ `Running` برای یک سرعتِ مشخص ساخته شده. وقتی شخصیت در حالِ
       شتاب‌گرفتن یا ترمز است، سرعتِ واقعی کمتر از آن است و پاها روی زمین
       می‌لغزند. کِش‌دادنِ زمانِ کلیپ به نسبتِ سرعت، گام را دوباره با
       زمین قفل می‌کند.

       کف و سقف لازم‌اند: نزدیکِ سرعتِ صفر، نسبت به سمتِ صفر می‌رود و
       انیمیشن کاملاً می‌ایستد که بدتر از لغزش است. */
    const run = runAction.current;
    if (run) {
      const ratio = speed.current / runSpeed;
      run.setEffectiveTimeScale(Math.max(0.55, Math.min(1.25, ratio)));
    }

    mixer.update(delta);
  });

  return (
    <group ref={groupRef}>
      <group scale={CHARACTER_SCALE}>
        <primitive object={root} />
      </group>
      {/* لنگرِ سر. یک شیءِ خالی که جلوه‌های وابسته (ستاره‌های گیجی) موقعیتِ
          جهانی‌شان را از آن می‌گیرند، پس با چرخش و جابه‌جاییِ شخصیت
          خودبه‌خود همراه می‌شوند. */}
      <object3D ref={headRef} position={[0, HEAD_OFFSET_Y, 0]} />
    </group>
  );
}

/* پیش‌بارگذاری در سطحِ ماژول: به‌محضِ اینکه chunkِ صحنه رسید، دانلودِ مدل
   شروع می‌شود و منتظرِ سوارشدنِ کامپوننت نمی‌ماند. */
useGLTF.preload(CHARACTER_URL);
