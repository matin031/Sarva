"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/** A small, real WebGL object for a guide chapter. The Canvas is mounted only
 *  while the chapter is near the viewport and torn down afterwards, so we never
 *  hold more than a couple of WebGL contexts alive — important on phones. */

export type Shape = "knot" | "torus" | "octa" | "box" | "sphere";

function Geometry({ shape }: { shape: Shape }) {
  switch (shape) {
    case "knot":
      return <torusKnotGeometry args={[0.78, 0.26, 128, 24]} />;
    case "torus":
      return <torusGeometry args={[0.85, 0.3, 24, 96]} />;
    case "octa":
      return <octahedronGeometry args={[1.15, 0]} />;
    case "box":
      return <boxGeometry args={[1.35, 1.35, 1.35]} />;
    default:
      return <sphereGeometry args={[1.1, 48, 48]} />;
  }
}

function Obj({ shape, color, distort }: { shape: Shape; color: string; distort: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const { x, y } = state.pointer;
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.4;
      const k = 1 - Math.pow(0.002, delta);
      mesh.current.rotation.x += (-y * 0.4 - mesh.current.rotation.x) * k;
      mesh.current.position.x += (x * 0.25 - mesh.current.position.x) * k;
    }
    if (wire.current) {
      wire.current.rotation.y -= delta * 0.22;
      wire.current.rotation.z += delta * 0.1;
    }
  });

  return (
    <group>
      <Float speed={1.6} rotationIntensity={0.6} floatIntensity={0.9}>
        <mesh ref={mesh}>
          <Geometry shape={shape} />
          {distort ? (
            <MeshDistortMaterial
              color={color}
              distort={0.32}
              speed={1.5}
              metalness={0.85}
              roughness={0.18}
              emissive={color}
              emissiveIntensity={0.25}
            />
          ) : (
            <meshStandardMaterial
              color={color}
              metalness={0.85}
              roughness={0.18}
              emissive={color}
              emissiveIntensity={0.25}
            />
          )}
        </mesh>
      </Float>

      {/* faint wireframe halo */}
      <mesh ref={wire} scale={1.55}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

export default function Chapter3D({
  shape,
  color,
  reduced = false,
}: {
  shape: Shape;
  color: string;
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
    const io = new IntersectionObserver(
      ([e]) => setLive(e.isIntersecting),
      // generous margin so it's ready just before it scrolls in
      { rootMargin: "220px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={holder} className="relative z-20 h-56 w-full sm:h-64">
      {live && (
        <Canvas
          dpr={coarse ? 1 : [1, 1.5]}
          camera={{ position: [0, 0, 4.2], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          frameloop={reduced ? "demand" : "always"}
          style={{ pointerEvents: "none", background: "transparent" }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 3]} intensity={2.4} />
          <pointLight position={[-3, -2, -2]} intensity={22} color={color} distance={12} />
          <Suspense fallback={null}>
            <Obj shape={shape} color={color} distort={!reduced} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
