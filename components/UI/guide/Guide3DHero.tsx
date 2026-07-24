"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/** A real WebGL hero scene: a distorted, self-morphing core wrapped in a
 *  counter-rotating wireframe shell, ringed by orbiting shards and sparkles.
 *  The whole rig tilts toward the pointer, so it reads as a physical object in
 *  space rather than a CSS trick. Kept deliberately cheap — low-poly geometry,
 *  three lights, capped DPR — because this also runs on phones. */

const TURQUOISE = "#00b3ad";
const GOLD = "#d9a441";
const LAPIS = "#5b6ea8";

/** Lerps the whole rig toward the pointer for a parallax/orbit feel. */
function PointerRig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const { x, y } = state.pointer;
    // damp toward the target angles so motion feels weighted, not twitchy
    const k = 1 - Math.pow(0.001, delta);
    g.rotation.y += (x * 0.55 - g.rotation.y) * k;
    g.rotation.x += (-y * 0.35 - g.rotation.x) * k;
  });
  return <group ref={ref}>{children}</group>;
}

function Core() {
  const shell = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (shell.current) {
      shell.current.rotation.y -= delta * 0.25;
      shell.current.rotation.x += delta * 0.12;
    }
  });
  return (
    <group>
      {/* morphing inner core */}
      <mesh castShadow>
        <icosahedronGeometry args={[1.25, 12]} />
        <MeshDistortMaterial
          color={TURQUOISE}
          distort={0.42}
          speed={1.6}
          roughness={0.15}
          metalness={0.85}
          emissive={TURQUOISE}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* counter-rotating wireframe shell */}
      <mesh ref={shell} scale={1.72}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshBasicMaterial color={TURQUOISE} wireframe transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

/** Small shards orbiting the core on tilted rings. */
function Shards() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.32;
  });

  const shards = [
    { r: 3.1, y: 0.5, s: 0.2, c: GOLD, tilt: 0.3 },
    { r: 3.4, y: -0.8, s: 0.15, c: TURQUOISE, tilt: -0.4 },
    { r: 2.7, y: 1.2, s: 0.13, c: LAPIS, tilt: 0.15 },
    { r: 3.6, y: 0.1, s: 0.17, c: GOLD, tilt: -0.2 },
    { r: 2.9, y: -1.3, s: 0.12, c: TURQUOISE, tilt: 0.5 },
  ];

  return (
    <group ref={group}>
      {shards.map((s, i) => {
        const a = (i / shards.length) * Math.PI * 2;
        return (
          <Float key={i} speed={2} rotationIntensity={1.4} floatIntensity={1.1}>
            <mesh
              position={[Math.cos(a) * s.r, s.y, Math.sin(a) * s.r]}
              rotation={[s.tilt, a, 0]}
            >
              <octahedronGeometry args={[s.s, 0]} />
              <meshStandardMaterial
                color={s.c}
                metalness={0.9}
                roughness={0.2}
                emissive={s.c}
                emissiveIntensity={0.5}
              />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

/** A slim, tilted ring that grounds the composition. */
function Ring(props: ThreeElements["mesh"]) {
  return (
    <mesh {...props}>
      <torusGeometry args={[2.6, 0.012, 8, 128]} />
      <meshBasicMaterial color={TURQUOISE} transparent opacity={0.35} />
    </mesh>
  );
}

export default function Guide3DHero({ reduced = false }: { reduced?: boolean }) {
  // phones pay for every extra pixel; render them at 1x (this component is
  // client-only via next/dynamic, so touching window here is safe)
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  return (
    <Canvas
      dpr={coarse ? 1 : [1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduced ? "demand" : "always"}
      style={{ pointerEvents: "none", background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-4, -2, -3]} intensity={40} color={GOLD} distance={14} />
      <pointLight position={[3, 2, 4]} intensity={30} color={TURQUOISE} distance={14} />

      <Suspense fallback={null}>
        <PointerRig>
          <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.7}>
            <Core />
          </Float>
          <Shards />
          <Ring rotation={[Math.PI / 2.4, 0, 0]} />
          <Ring rotation={[Math.PI / 1.8, 0.6, 0.4]} scale={1.18} />
          <Sparkles
            count={coarse ? 26 : 60}
            scale={9}
            size={2.4}
            speed={0.35}
            color={TURQUOISE}
            opacity={0.7}
          />
        </PointerRig>
      </Suspense>
    </Canvas>
  );
}
