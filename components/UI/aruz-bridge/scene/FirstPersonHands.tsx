"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameState } from "@/lib/aruz-bridge/types";
import { NO_RAYCAST } from "./AnswerHitTarget";

function HandMesh() {
  return <>
    <mesh position={[0, -.13, .04]} raycast={NO_RAYCAST}>
      <capsuleGeometry args={[.064, .24, 4, 10]} />
      <meshStandardMaterial color="#128b87" roughness={.65} />
    </mesh>
    <mesh position={[0, .012, .015]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
      <torusGeometry args={[.063, .012, 6, 12]} />
      <meshStandardMaterial color="#d3ae6c" metalness={.65} roughness={.35} />
    </mesh>
    <mesh position={[0, .08, -.015]} scale={[.9, 1.3, .6]} raycast={NO_RAYCAST}>
      <sphereGeometry args={[.065, 12, 10]} />
      <meshStandardMaterial color="#d6b394" roughness={.75} />
    </mesh>
    {[-.036, -.012, .012, .036].map((x, i) => (
      <mesh key={x} position={[x, .15 + (i === 0 || i === 3 ? -.01 : 0), -.022]} raycast={NO_RAYCAST}>
        <capsuleGeometry args={[.012, .055, 3, 6]} />
        <meshStandardMaterial color="#d6b394" roughness={.75} />
      </mesh>
    ))}
    <mesh position={[-.063, .07, -.005]} rotation={[0, 0, -.5]} raycast={NO_RAYCAST}>
      <capsuleGeometry args={[.019, .045, 3, 6]} />
      <meshStandardMaterial color="#d6b394" roughness={.75} />
    </mesh>
  </>;
}

/** Camera-local sleeves and hands never participate in answer picking. */
export function FirstPersonHands({ state, reducedMotion }: { state: GameState; reducedMotion: boolean }) {
  const rig = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const clock = useRef({ state, start: 0 });
  useFrame(({ camera, clock: sceneClock }) => {
    if (!rig.current) return;
    if (clock.current.state !== state) clock.current = { state, start: sceneClock.elapsedTime };
    const t = reducedMotion ? 0 : sceneClock.elapsedTime - clock.current.start;
    const fall = state === "falling";
    const jump = state === "jumping";
    rig.current.position.copy(camera.position);
    rig.current.quaternion.copy(camera.quaternion);
    const lens = camera as THREE.PerspectiveCamera;
    const halfHeight = .65 * Math.tan(THREE.MathUtils.degToRad(lens.fov / 2));
    const halfWidth = halfHeight * lens.aspect;
    for (const [index, ref] of [left, right].entries()) {
      const hand = ref.current;
      if (!hand) continue;
      const sign = index === 0 ? -1 : 1;
      const wave = Math.sin(t * 9 + index * 1.7);
      // Screen-relative framing avoids oversized floating sleeves on portrait phones.
      hand.position.set(sign * halfWidth * .74, -halfHeight * (fall ? .66 : 1.05) + (fall ? wave * halfHeight * .04 : 0), -.65);
      hand.scale.set(halfHeight * 1.3 * (index === 0 ? -1 : 1), halfHeight * 1.3, halfHeight * 1.3);
      hand.rotation.set(fall ? -.45 + wave * .2 : jump ? -.3 : .12, sign * -.15,
        sign * (fall ? -.3 + wave * .25 : -.12));
    }
  });
  return <group ref={rig}><group ref={left}><HandMesh /></group><group ref={right}><HandMesh /></group></group>;
}
