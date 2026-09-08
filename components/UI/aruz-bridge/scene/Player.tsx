"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ExplorerBody } from "./ExplorerBody";
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
  reducedMotion?: boolean;
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

export function Player({ positionRef, animation, jumpPhaseRef, facingRef, useModel, reducedMotion = false }: PlayerProps) {
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
        <ExplorerBody animation={animation} jumpPhaseRef={jumpPhaseRef} reducedMotion={reducedMotion} />
      )}
    </group>
  );
}
