"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, PerspectiveCamera, View } from "@react-three/drei";
import * as THREE from "three";

/** A planet rendered as a drei <View> — it draws into the page's single shared
 *  canvas rather than creating its own. Geometry is deliberately low-poly: a
 *  32×32 sphere looks identical at this size to a 64×64 one but costs a quarter
 *  of the vertices, which matters because the distort material runs a noise
 *  function per vertex every frame. */

export type PlanetKind = {
  color: string;
  ring?: boolean;
  moon?: boolean;
  distort?: number;
};

function Body({
  color,
  ring,
  moon,
  distort = 0.2,
  reduced,
}: PlanetKind & { reduced: boolean }) {
  const root = useRef<THREE.Group>(null);
  const world = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const moonOrbit = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // clamp delta so a stalled tab doesn't make everything jump on resume
    const d = Math.min(delta, 0.05);
    if (world.current) world.current.rotation.y += d * 0.18;
    if (ringRef.current) ringRef.current.rotation.z += d * 0.05;
    if (moonOrbit.current) moonOrbit.current.rotation.y += d * 0.6;
    if (root.current) {
      const k = 1 - Math.pow(0.004, d);
      root.current.rotation.x += (-state.pointer.y * 0.22 - root.current.rotation.x) * k;
      root.current.rotation.y += (state.pointer.x * 0.22 - root.current.rotation.y) * k;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={world}>
        <sphereGeometry args={[1, 32, 32]} />
        {reduced ? (
          <meshStandardMaterial
            color={color}
            roughness={0.55}
            metalness={0.35}
            emissive={color}
            emissiveIntensity={0.18}
          />
        ) : (
          <MeshDistortMaterial
            color={color}
            distort={distort}
            speed={0.8}
            roughness={0.55}
            metalness={0.35}
            emissive={color}
            emissiveIntensity={0.18}
          />
        )}
      </mesh>

      {/* atmosphere shell */}
      <mesh scale={1.14}>
        <sphereGeometry args={[1, 24, 24]} />
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
          <torusGeometry args={[1.75, 0.045, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      )}

      {moon && (
        <group ref={moonOrbit} rotation={[0.4, 0, 0.2]}>
          <mesh position={[1.95, 0, 0]}>
            <sphereGeometry args={[0.17, 16, 16]} />
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

export default function PlanetView({
  kind,
  reduced = false,
}: {
  kind: PlanetKind;
  reduced?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  // Views that are far off-screen contribute nothing but still cost draw calls,
  // so only feed the renderer the ones the reader can plausibly see.
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      rootMargin: "200px 0px",
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
      {near && (
        <View className="size-full">
          <PerspectiveCamera makeDefault position={[0, 0, 4.6]} fov={45} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[-3, 3, 3]} intensity={2.6} />
          <pointLight
            position={[2, -1, 2]}
            intensity={18}
            color={kind.color}
            distance={12}
          />
          <Body {...kind} reduced={reduced} />
        </View>
      )}
    </div>
  );
}
