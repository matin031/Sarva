"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterAnimation } from "@/lib/aruz-bridge/types";
import { NO_RAYCAST } from "./AnswerHitTarget";

/** A small, jointed explorer. All poses share the game’s jump clock. */
export function ExplorerBody({ animation, jumpPhaseRef, reducedMotion }: {
  animation: CharacterAnimation; jumpPhaseRef: RefObject<number>; reducedMotion: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const elbows = useRef<(THREE.Group | null)[]>([]);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const knees = useRef<(THREE.Group | null)[]>([]);
  const elapsed = useRef(0);
  useEffect(() => { elapsed.current = 0; }, [animation]);
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, .05);
    elapsed.current += dt;
    const t = reducedMotion ? 0 : elapsed.current;
    const jump = animation === "jump" ? Math.sin(jumpPhaseRef.current * Math.PI) : 0;
    const fall = animation === "fall";
    const land = animation === "land";
    const blend = 1 - Math.exp(-18 * dt);
    if (body.current) {
      body.current.rotation.x = THREE.MathUtils.lerp(body.current.rotation.x,
        fall ? -.65 * (1 - Math.exp(-t * 3)) : jump * .22 + (land ? .18 : 0), blend);
      body.current.rotation.z = THREE.MathUtils.lerp(body.current.rotation.z,
        fall ? Math.sin(t * 5) * .13 : 0, blend);
      body.current.position.y = THREE.MathUtils.lerp(body.current.position.y,
        land ? -.075 : reducedMotion ? 0 : Math.sin(clock.elapsedTime * 2) * .006, blend);
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const wave = reducedMotion ? 0 : Math.sin(t * 11 + i * 2.5);
      const arm = arms.current[i], elbow = elbows.current[i];
      const leg = legs.current[i], knee = knees.current[i];
      if (arm) {
        arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x,
          fall ? 2.1 + wave * .55 : jump * 1.75 + (land ? .6 : .08), blend);
        arm.rotation.z = THREE.MathUtils.lerp(arm.rotation.z,
          side * (fall ? .75 + Math.cos(t * 8 + i) * .28 : .12 + jump * .15), blend);
      }
      if (elbow) elbow.rotation.x = THREE.MathUtils.lerp(elbow.rotation.x,
        fall ? .65 + Math.sin(t * 9 + i) * .5 : .22 + jump * .85, blend);
      if (leg) leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x,
        fall ? wave * .65 : jump * (i === 0 ? .85 : -.4) + (land ? .45 : 0), blend);
      if (knee) knee.rotation.x = THREE.MathUtils.lerp(knee.rotation.x,
        fall ? -.7 - Math.cos(t * 10 + i) * .5 : -jump * .9 - (land ? .8 : .03), blend);
    }
  });
  return <group ref={body} raycast={NO_RAYCAST}>
    {/* Hood and dark face opening; the silhouette reads from both sides. */}
    <mesh position={[0, .92, 0]} scale={[1, 1.08, .96]}>
      <sphereGeometry args={[.139, 16, 12]} />
      <meshStandardMaterial color="#193b44" roughness={.85} />
    </mesh>
    <mesh position={[0, .915, -.108]} scale={[1, 1.1, .35]}>
      <sphereGeometry args={[.095, 12, 8]} />
      <meshStandardMaterial color="#c59b79" roughness={.85} />
    </mesh>
    <mesh position={[0, .6, 0]} scale={[1, 1, .72]}>
      <capsuleGeometry args={[.153, .22, 5, 12]} />
      <meshStandardMaterial color="#376f72" roughness={.92} />
    </mesh>
    {/* Ochre scarf and a compact leather satchel, visible to the overhead camera. */}
    <mesh position={[0, .785, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.107, .031, 6, 16]} />
      <meshStandardMaterial color="#dbab5e" roughness={.86} />
    </mesh>
    <mesh position={[.065, .675, .126]} rotation={[0, 0, -.15]}>
      <boxGeometry args={[.06, .19, .025]} />
      <meshStandardMaterial color="#d1a05b" roughness={.9} />
    </mesh>
    <mesh position={[0, .615, .137]} scale={[1, 1.12, .45]}>
      <capsuleGeometry args={[.112, .075, 4, 10]} />
      <meshStandardMaterial color="#966e43" roughness={.92} />
    </mesh>
    <mesh position={[0, .628, .19]}>
      <boxGeometry args={[.035, .15, .018]} />
      <meshStandardMaterial color="#d5bb83" metalness={.45} roughness={.45} />
    </mesh>
    {[-1, 1].map((side, i) => <group key={side}>
      <group ref={g => { arms.current[i] = g; }} position={[side * .18, .73, 0]}>
        <mesh position={[0, -.075, 0]}>
          <capsuleGeometry args={[.052, .1, 4, 10]} />
          <meshStandardMaterial color="#376f72" roughness={.9} />
        </mesh>
        <group ref={g => { elbows.current[i] = g; }} position={[0, -.16, 0]}>
          <mesh position={[0, -.065, 0]}>
            <capsuleGeometry args={[.041, .095, 4, 8]} />
            <meshStandardMaterial color="#244f57" roughness={.9} />
          </mesh>
          <mesh position={[0, -.15, -.012]} scale={[.8, 1, .75]}>
            <sphereGeometry args={[.046, 10, 8]} />
            <meshStandardMaterial color="#b78c67" roughness={.85} />
          </mesh>
        </group>
      </group>
      <group ref={g => { legs.current[i] = g; }} position={[side * .08, .415, 0]}>
        <mesh position={[0, -.085, 0]}>
          <capsuleGeometry args={[.061, .11, 4, 10]} />
          <meshStandardMaterial color="#24343d" roughness={.95} />
        </mesh>
        <group ref={g => { knees.current[i] = g; }} position={[0, -.19, 0]}>
          <mesh position={[0, -.073, 0]}>
            <capsuleGeometry args={[.046, .085, 4, 8]} />
            <meshStandardMaterial color="#2e4149" roughness={.9} />
          </mesh>
          <mesh position={[0, -.17, -.035]} scale={[1, .65, 1.6]}>
            <sphereGeometry args={[.061, 10, 8]} />
            <meshStandardMaterial color="#172329" roughness={.8} />
          </mesh>
        </group>
      </group>
    </group>)}
  </group>;
}
