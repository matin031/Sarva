"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/** A single planet: a slowly turning world with a glowing atmosphere, an
 *  optional tilted ring and an orbiting moon. Each planet gets its own Canvas,
 *  mounted only while near the viewport and torn down afterwards, so we never
 *  keep many WebGL contexts alive at once. */

export type PlanetKind = {
  color: string;
  ring?: boolean;
  moon?: boolean;
  /** subtle surface churn */
  distort?: number;
};

function Body({ color, ring, moon, distort = 0.2 }: PlanetKind) {
  const world = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const moonOrbit = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (world.current) world.current.rotation.y += delta * 0.18;
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.05;
    if (moonOrbit.current) moonOrbit.current.rotation.y += delta * 0.6;
    // gentle pointer lean, damped
    const g = world.current?.parent;
    if (g) {
      const k = 1 - Math.pow(0.004, delta);
      g.rotation.x += (-state.pointer.y * 0.25 - g.rotation.x) * k;
      g.rotation.y += (state.pointer.x * 0.25 - g.rotation.y) * k;
    }
  });

  return (
    <group>
      {/* the world */}
      <mesh ref={world}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={0.8}
          roughness={0.55}
          metalness={0.35}
          emissive={color}
          emissiveIntensity={0.18}
        />
      </mesh>

      {/* atmosphere: a slightly bigger shell lit from inside */}
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {ring && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.6, 0, 0.35]}>
          <torusGeometry args={[1.75, 0.045, 10, 128]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      )}

      {moon && (
        <group ref={moonOrbit} rotation={[0.4, 0, 0.2]}>
          <mesh position={[1.95, 0, 0]}>
            <sphereGeometry args={[0.17, 24, 24]} />
            <meshStandardMaterial
              color="#cfd6e6"
              roughness={0.8}
              emissive="#8fa0c0"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function Planet({
  kind,
  reduced = false,
}: {
  kind: PlanetKind;
  reduced?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), {
      rootMargin: "260px 0px",
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={holder}
      className="pointer-events-none relative z-10 aspect-square w-full max-w-[340px]"
    >
      {live && (
        <Canvas
          dpr={coarse ? 1 : [1, 1.5]}
          camera={{ position: [0, 0, 4.6], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          frameloop={reduced ? "demand" : "always"}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.45} />
          {/* key light from upper-left, like a distant sun */}
          <directionalLight position={[-3, 3, 3]} intensity={2.6} />
          <pointLight
            position={[2, -1, 2]}
            intensity={18}
            color={kind.color}
            distance={12}
          />
          <Suspense fallback={null}>
            <Body {...kind} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
