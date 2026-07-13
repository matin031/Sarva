"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { SuspectRole } from "@/lib/jasoos-data";

export type Suspect3DState = "idle" | "shot-correct" | "shot-wrong" | "dimmed";

const IDLE_COLOR = "#c7ccd6";
const CORRECT_COLOR = "#c1483a";
const WRONG_COLOR = "#e0b23c";
const DIMMED_COLOR = "#5b6069";

function colorFor(state: Suspect3DState) {
  if (state === "shot-correct") return CORRECT_COLOR;
  if (state === "shot-wrong") return WRONG_COLOR;
  if (state === "dimmed") return DIMMED_COLOR;
  return IDLE_COLOR;
}

function Suspect3D({
  role,
  isSpy,
  position,
  rotationY = 0,
  state,
  registerHit,
}: {
  role: SuspectRole;
  isSpy: boolean;
  position: [number, number, number];
  rotationY?: number;
  state: Suspect3DState;
  registerHit: (object: THREE.Object3D, role: SuspectRole) => void;
}) {
  const group = useRef<THREE.Group>(null);
  // deterministic per-suspect phase offset (derived from position, not
  // Math.random) so each idle bob is out of sync without impure render
  const t = useRef(position[0] * 3.7);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: IDLE_COLOR,
        transparent: true,
        opacity: 1,
      }),
    [],
  );

  useEffect(() => {
    if (group.current) {
      group.current.userData.role = role;
      group.current.userData.isSpy = isSpy;
      registerHit(group.current, role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    material.color.set(colorFor(state));
  }, [state, material]);

  useEffect(() => () => material.dispose(), [material]);

  // the mesh group and the shared three.js material are external mutable
  // objects driven imperatively per frame — the standard r3f animation
  // pattern, not React state
  /* eslint-disable react-hooks/immutability */
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    t.current += delta;

    if (state === "idle") {
      g.position.y = position[1] + Math.sin(t.current * 1.3) * 0.025;
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, 0, delta * 4);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, delta * 4);
      material.opacity = THREE.MathUtils.lerp(material.opacity, 1, delta * 4);
    } else if (state === "shot-correct") {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 1.15, delta * 2.6);
      g.position.y = THREE.MathUtils.lerp(g.position.y, position[1] - 0.55, delta * 2.6);
      material.opacity = Math.max(0, material.opacity - delta * 0.7);
    } else if (state === "shot-wrong") {
      g.position.x = position[0] + Math.sin(t.current * 45) * 0.05;
      g.position.y = position[1];
    } else if (state === "dimmed") {
      material.opacity = THREE.MathUtils.lerp(material.opacity, 0.3, delta * 3);
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      {/* head */}
      <mesh position={[0, 1.62, 0]} material={material}>
        <sphereGeometry args={[0.22, 16, 16]} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.15, 0]} material={material}>
        <capsuleGeometry args={[0.26, 0.55, 4, 8]} />
      </mesh>
      {/* left arm raised */}
      <mesh position={[-0.34, 1.55, -0.05]} rotation={[0, 0, 0.75]} material={material}>
        <cylinderGeometry args={[0.07, 0.07, 0.62, 8]} />
      </mesh>
      {/* right arm raised */}
      <mesh position={[0.34, 1.55, -0.05]} rotation={[0, 0, -0.75]} material={material}>
        <cylinderGeometry args={[0.07, 0.07, 0.62, 8]} />
      </mesh>
      {/* legs */}
      <mesh position={[-0.13, 0.42, 0]} material={material}>
        <cylinderGeometry args={[0.09, 0.09, 0.85, 8]} />
      </mesh>
      <mesh position={[0.13, 0.42, 0]} material={material}>
        <cylinderGeometry args={[0.09, 0.09, 0.85, 8]} />
      </mesh>

      <Html position={[0, 2.05, 0]} center distanceFactor={8} occlude={false}>
        <span className="pointer-events-none whitespace-nowrap rounded-full glass px-3 py-1 text-xs sm:text-sm font-bold">
          {role}
        </span>
      </Html>
    </group>
  );
}

export default Suspect3D;
