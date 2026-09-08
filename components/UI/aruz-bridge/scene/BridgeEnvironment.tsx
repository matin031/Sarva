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
      stone: new THREE.MeshStandardMaterial({ color: "#24404a", vertexColors: true, metalness: .15, roughness: .8 }),
      steel: new THREE.MeshStandardMaterial({ color: "#243640", vertexColors: true, metalness: .65, roughness: .36 }),
      gold: new THREE.MeshStandardMaterial({ color: "#dfba79", vertexColors: true, metalness: .55, roughness: .32, emissive: "#604017", emissiveIntensity: .15 }),
      light: new THREE.MeshStandardMaterial({ color: "#89e7db", emissive: "#2fae9e", emissiveIntensity: 1.6 }),
      abyss: new THREE.MeshBasicMaterial({ color: "#040e18" }),
    };
    type Kind = keyof typeof materials;
    const parts: Record<Kind, THREE.BufferGeometry[]> = { stone: [], steel: [], gold: [], light: [], abyss: [] };
    const noise = new Uint8Array(128 * 128 * 4);
    const rng = makeRng(8813);
    for (let i = 0; i < 128 * 128; i++) {
      const shade = 205 + Math.floor(rng() * 45);
      noise.set([shade, shade, shade, 255], i * 4);
    }
    const stoneMap = new THREE.DataTexture(noise, 128, 128);
    stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping;
    stoneMap.repeat.set(3, 8);
    stoneMap.magFilter = THREE.LinearFilter;
    stoneMap.needsUpdate = true;
    materials.stone.map = stoneMap;
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const block = (kind: Kind, x: number, y: number, z: number, w: number, h: number, d: number) => {
      parts[kind].push(unit.clone().scale(w, h, d).translate(x, y, z));
    };
    const rod = (kind: Kind, a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
      const direction = b.clone().sub(a);
      const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 6);
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
      geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      parts[kind].push(geometry);
    };
    const length = (steps + 2) * STEP_DEPTH;
    const railX = LANE_OFFSET + 1.03;
    for (const side of [-1, 1]) {
      block("steel", side * railX, -.16, -length / 2 + 1, .16, .26, length);
      block("light", side * railX, -.012, -length / 2 + 1, .025, .025, length);
      for (let i = 0; i <= steps; i++) {
        block("steel", side * railX, -.45, -i * STEP_DEPTH, .18, .95, .18);
        block("gold", side * railX, .032, -i * STEP_DEPTH, .23, .07, .23);
        rod("steel", new THREE.Vector3(side * railX, -.3, -i * STEP_DEPTH),
          new THREE.Vector3(side * 3.8, -3.2, -i * STEP_DEPTH - 1.3), .065);
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
        for (const [y, width, height] of [[-5.8, 1.5, .45], [-5.4, 1.2, .3], [2.1, 1.1, .22]] as const) {
          block("stone", side * 4.35, y, z, width, height, width);
          block("gold", side * 4.35, y + height / 2, z, width, .035, width);
        }
        parts.stone.push(new THREE.CylinderGeometry(.29, .4, 7.3, 10).translate(side * 4.35, -1.55, z));
        for (const offset of [-.2, .2]) block("gold", side * 4.35 + offset, -1.55, z + .27, .023, 7.1, .025);
        block("steel", side * 4.35, 2.7, z, .05, 1, .05);
        parts.gold.push(new THREE.OctahedronGeometry(.25).scale(1, 1.6, 1).translate(side * 4.35, 2.08, z));
        parts.light.push(new THREE.OctahedronGeometry(.15).scale(1, 1.6, 1).translate(side * 4.35, 2.08, z + .12));
      }
      const innerCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4.35, 2.15, z), new THREE.Vector3(-3.6, 4.1, z),
        new THREE.Vector3(0, 6.1, z), new THREE.Vector3(3.6, 4.1, z), new THREE.Vector3(4.35, 2.15, z),
      ]);
      parts.stone.push(new THREE.TubeGeometry(innerCurve, low ? 16 : 24, .17, 6, false));
      parts.gold.push(new THREE.TubeGeometry(innerCurve, low ? 16 : 24, .027, 5, false).translate(0, -.18, .14));
    }
    // A distant patterned gallery establishes depth below the transparent panes.
    block("abyss", 0, -17, -length / 2, 24, .4, length + 30);
    for (let i = 0; i < Math.ceil(length / 7.8); i++) {
      const z = 2 - i * 7.8;
      parts.gold.push(new THREE.TorusGeometry(2.5, .022, 4, 32).rotateX(Math.PI / 2).translate(0, -16.77, z));
      for (const side of [-1, 1]) {
        block("gold", side * 6, -16.77, z, .025, .025, 7.8);
        block("steel", side * 6, -10.9, z, 1.1, 12, 1.1);
      }
    }
    block("stone", 0, -.25, stepZ(steps) - .3, 5, .42, 2.4);
    parts.light.push(new THREE.TorusGeometry(1.55, .045, 8, low ? 32 : 56).translate(0, 2.2, stepZ(steps) - 1));
    for (const radius of [1.72, 1.85]) {
      parts.gold.push(new THREE.TorusGeometry(radius, .035, 6, 48).translate(0, 2.2, stepZ(steps) - 1));
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      parts.gold.push(new THREE.OctahedronGeometry(.16).scale(.6, 1.7, .3)
        .rotateZ(-angle).translate(Math.sin(angle) * 1.83, 2.2 + Math.cos(angle) * 1.83, stepZ(steps) - 1));
    }
    unit.dispose();
    arch.dispose();
    return (Object.keys(parts) as Kind[]).map(kind => {
      // Polyhedra are non-indexed; normalize before merging with indexed tubes.
      const normalized = parts[kind].map(part => part.index ? part.toNonIndexed() : part);
      const geometry = mergeGeometries(normalized);
      normalized.forEach((part, i) => { if (part !== parts[kind][i]) part.dispose(); });
      parts[kind].forEach(part => part.dispose());
      if (!geometry) throw new Error("Could not batch bridge architecture");
      if (kind === "stone" || kind === "steel" || kind === "gold") {
        const position = geometry.getAttribute("position");
        const colors = new Float32Array(position.count * 3);
        for (let i = 0; i < position.count; i++) {
          // Baked vertical shading gives the shaft depth without extra lighting passes.
          const shade = THREE.MathUtils.clamp((position.getY(i) + 13) / 16, .08, 1);
          colors.set([shade, shade, shade], i * 3);
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      }
      geometry.computeBoundingSphere();
      return { kind, geometry, material: materials[kind], stoneMap };
    });
  }, [steps, low]);
  useEffect(() => () => {
    batches[0]?.stoneMap.dispose();
    batches.forEach(({ geometry, material }) => { geometry.dispose(); material.dispose(); });
  }, [batches]);
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
    <hemisphereLight args={["#c8efec", "#142336", .85]} />
    <directionalLight position={[-5, 12, 5]} intensity={2.4} color="#dcf5f4" />
    <directionalLight position={[5, 5, -12]} intensity={1.8} color="#4ccfbf" />
    <directionalLight position={[-6, 4, -8]} intensity={.8} color="#efd09b" />
    <MirrorHall steps={steps} low={quality.tier === "low"} />
    <SuspendedParticles count={quality.particleCount} reducedMotion={reducedMotion} />
    {quality.tier !== "low" && [-9, -14].map(y => (
      <mesh key={y} position={[0, y, -steps * STEP_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_RAYCAST}>
        <planeGeometry args={[80, 150]} />
        <meshBasicMaterial color="#102d37" transparent opacity={.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </>;
}
