"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, PerspectiveCamera, View } from "@react-three/drei";
import * as THREE from "three";

/** A planet rendered as a drei <View>: it draws into the page's single shared
 *  canvas instead of creating its own WebGL context.
 *
 *  Three principles are doing the heavy lifting here, and none of them cost
 *  anything visually:
 *
 *  1. Geometry is created ONCE at module scope and reused by every planet.
 *     Planets mount and unmount as you scroll, and building a sphere per mount
 *     meant re-uploading vertex buffers to the GPU over and over. Shared
 *     geometry is uploaded a single time for the whole page. `dispose={null}`
 *     stops R3F from freeing buffers that other planets still need.
 *  2. Low-poly where it cannot be seen. The atmosphere shell is a soft, blurry
 *     glow, so 16 segments look identical to 48 and cost a third as much.
 *  3. Only planets near the viewport are mounted at all, so the renderer never
 *     walks a scene graph the reader cannot see. */

export type PlanetKind = {
  color: string;
  ring?: boolean;
  moon?: boolean;
  distort?: number;
};

// ---- shared, uploaded to the GPU once for the entire page ----
const SPHERE_GEO = new THREE.SphereGeometry(1, 32, 32);
const ATMOSPHERE_GEO = new THREE.SphereGeometry(1, 16, 16);
const RING_GEO = new THREE.TorusGeometry(1.75, 0.045, 8, 64);
const MOON_GEO = new THREE.SphereGeometry(0.17, 12, 12);

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

  // materials are per-planet (each has its own colour) but memoised so a
  // re-render never rebuilds a shader program
  const atmosphereMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
    [color],
  );
  const moonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#cfd6e6",
        roughness: 0.8,
        emissive: new THREE.Color("#8fa0c0"),
        emissiveIntensity: 0.25,
      }),
    [],
  );
  useEffect(
    () => () => {
      atmosphereMat.dispose();
      ringMat.dispose();
      moonMat.dispose();
    },
    [atmosphereMat, ringMat, moonMat],
  );

  useFrame((state, delta) => {
    // clamp delta so a stalled tab doesn't make everything jump on resume
    const d = Math.min(delta, 0.05);
    if (world.current) world.current.rotation.y += d * 0.18;
    if (ringRef.current) ringRef.current.rotation.z += d * 0.05;
    if (moonOrbit.current) moonOrbit.current.rotation.y += d * 0.6;
    if (root.current) {
      const k = 1 - Math.pow(0.004, d);
      root.current.rotation.x +=
        (-state.pointer.y * 0.22 - root.current.rotation.x) * k;
      root.current.rotation.y +=
        (state.pointer.x * 0.22 - root.current.rotation.y) * k;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={world} geometry={SPHERE_GEO} dispose={null}>
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
      <mesh
        scale={1.14}
        geometry={ATMOSPHERE_GEO}
        material={atmosphereMat}
        dispose={null}
      />

      {ring && (
        <mesh
          ref={ringRef}
          rotation={[Math.PI / 2.6, 0, 0.35]}
          geometry={RING_GEO}
          material={ringMat}
          dispose={null}
        />
      )}

      {moon && (
        <group ref={moonOrbit} rotation={[0.4, 0, 0.2]}>
          <mesh
            position={[1.95, 0, 0]}
            geometry={MOON_GEO}
            material={moonMat}
            dispose={null}
          />
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
          {/* two lights, not three: every extra light multiplies the fragment
              shader's work on a PBR material, and the key + ambient below
              already give the planet its shape */}
          <ambientLight intensity={0.55} />
          <directionalLight position={[-3, 3, 3]} intensity={2.8} />
          <Body {...kind} reduced={reduced} />
        </View>
      )}
    </div>
  );
}
