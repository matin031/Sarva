"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LANE_OFFSET, STEP_DEPTH, stepZ } from "@/lib/aruz-bridge/layout";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import { makeRng } from "@/lib/aruz-bridge/fracture";
import { NO_RAYCAST } from "./AnswerHitTarget";
import { useProceduralEnvironment } from "./useProceduralEnv";

function SuspendedParticles({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const rng = makeRng(20260827);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - .5) * 24;
      positions[i * 3 + 1] = (rng() - .5) * 18;
      positions[i * 3 + 2] = -rng() * 100 + 6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y = Math.sin(clock.elapsedTime * .05) * .035;
  });
  if (!count) return null;
  return <points ref={ref} geometry={geometry} raycast={NO_RAYCAST}>
    <pointsMaterial color="#a5eee0" size={.027} transparent opacity={.55} depthWrite={false} />
  </points>;
}

/** Four static batches instead of one draw call for every architectural fitting. */
function MirrorHall({ steps, low }: { steps: number; low: boolean }) {
  const batches = useMemo(() => {
    const materials = {
      stone: new THREE.MeshStandardMaterial({ color: "#203f4b", metalness: .42, roughness: .65 }),
      steel: new THREE.MeshStandardMaterial({ color: "#162c37", metalness: .7, roughness: .36 }),
      gold: new THREE.MeshStandardMaterial({ color: "#bea16a", metalness: .72, roughness: .3 }),
      light: new THREE.MeshStandardMaterial({ color: "#89e7db", emissive: "#2fae9e", emissiveIntensity: 1.6 }),
    };
    type Kind = keyof typeof materials;
    const parts: Record<Kind, THREE.BufferGeometry[]> = { stone: [], steel: [], gold: [], light: [] };
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const block = (kind: Kind, x: number, y: number, z: number, w: number, h: number, d: number) => {
      parts[kind].push(unit.clone().scale(w, h, d).translate(x, y, z));
    };
    const length = (steps + 2) * STEP_DEPTH;
    const railX = LANE_OFFSET + 1.03;
    for (const side of [-1, 1]) {
      block("steel", side * railX, -.16, -length / 2 + 1, .16, .26, length);
      block("light", side * railX, -.012, -length / 2 + 1, .025, .025, length);
      for (let i = 0; i <= steps; i++) {
        block("steel", side * railX, -.45, -i * STEP_DEPTH, .18, .95, .18);
        block("gold", side * railX, .032, -i * STEP_DEPTH, .23, .07, .23);
      }
    }
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.5, 3.6, 0), new THREE.Vector3(-5.1, 6.2, 0),
      new THREE.Vector3(0, 8.8, 0), new THREE.Vector3(5.1, 6.2, 0), new THREE.Vector3(6.5, 3.6, 0),
    ]);
    const arch = new THREE.TubeGeometry(curve, low ? 20 : 36, .095, 6, false);
    for (let i = 0; i < Math.ceil(length / 7.8) + 1; i++) {
      const z = 2 - i * 7.8;
      parts.gold.push(arch.clone().translate(0, 0, z));
      for (const side of [-1, 1]) {
        block("stone", side * 6.5, -2.5, z, .7, 12.5, .85);
        block("gold", side * 6.5, 3.6, z, .95, .18, 1.05);
        block("light", side * 6.13, -.6, z + .1, .03, 7.5, .06);
        for (const y of [-4, -1, 2]) block("steel", side * 6.5, y, z, .82, .12, .97);
      }
    }
    block("stone", 0, -.25, stepZ(steps) - .3, 5, .42, 2.4);
    parts.light.push(new THREE.TorusGeometry(1.55, .045, 8, low ? 32 : 56).translate(0, 2.2, stepZ(steps) - 1));
    unit.dispose();
    arch.dispose();
    return (Object.keys(parts) as Kind[]).map(kind => {
      const geometry = mergeGeometries(parts[kind]);
      parts[kind].forEach(part => part.dispose());
      if (!geometry) throw new Error("Could not batch bridge architecture");
      geometry.computeBoundingSphere();
      return { kind, geometry, material: materials[kind] };
    });
  }, [steps, low]);
  useEffect(() => () => batches.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); }), [batches]);
  return <group dispose={null}>{batches.map(({ kind, geometry, material }) => (
    <mesh key={kind} geometry={geometry} material={material} raycast={NO_RAYCAST} />
  ))}</group>;
}
export function BridgeEnvironment({ quality, steps, fogNear, fogFar, reducedMotion }: {
  quality: QualitySettings; steps: number; fogNear: number; fogFar: number; reducedMotion: boolean;
}) {
  const envMap = useProceduralEnvironment(quality.envMapSize);
  return <>
    <fog attach="fog" args={["#102b35", fogNear, fogFar]} />
    <color attach="background" args={["#0b1e29"]} />
    {envMap && <primitive object={envMap} attach="environment" />}
    <hemisphereLight args={["#c8efec", "#142336", 1.45]} />
    <directionalLight position={[-5, 12, 5]} intensity={2.1} color="#dcf5f4" />
    <directionalLight position={[5, 5, -12]} intensity={1.5} color="#4ccfbf" />
    <directionalLight position={[-6, 4, -8]} intensity={.8} color="#efd09b" />
    <MirrorHall steps={steps} low={quality.tier === "low"} />
    <SuspendedParticles count={quality.particleCount} reducedMotion={reducedMotion} />
    {quality.tier !== "low" && [-5, -10, -16].map(y => (
      <mesh key={y} position={[0, y, -steps * STEP_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <planeGeometry args={[80, 150]} />
        <meshBasicMaterial color="#4b8990" transparent opacity={.065} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </>;
}
