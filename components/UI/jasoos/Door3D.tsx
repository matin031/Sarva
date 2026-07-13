"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { JasoosLevel } from "@/lib/jasoos-data";

export type DoorStatus = "locked" | "active" | "cleared";

function statusColor(status: DoorStatus) {
  if (status === "cleared") return "#3fae86";
  if (status === "active") return "#e0b23c";
  return "#3a3f4d";
}

function Door3D({
  level,
  position,
  rotationY = 0,
  status,
}: {
  level: JasoosLevel;
  position: [number, number, number];
  rotationY?: number;
  status: DoorStatus;
}) {
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: statusColor(status),
        emissive: new THREE.Color(statusColor(status)),
        emissiveIntensity: status === "active" ? 0.55 : 0.12,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    // three.js materials are mutable-by-design; mutating them imperatively
    // (instead of replacing React state) is the standard r3f pattern.
    panelMat.color.set(statusColor(status));
    panelMat.emissive.set(statusColor(status));
    // eslint-disable-next-line react-hooks/immutability
    panelMat.emissiveIntensity = status === "active" ? 0.55 : status === "cleared" ? 0.25 : 0.1;
  }, [status, panelMat]);

  useFrame((state) => {
    if (status === "active") {
      // eslint-disable-next-line react-hooks/immutability
      panelMat.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2.4) * 0.2;
    }
  });

  useEffect(() => () => panelMat.dispose(), [panelMat]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.15, 0]} material={panelMat} castShadow>
        <boxGeometry args={[1.1, 2.3, 0.12]} />
      </mesh>
      <Html position={[0, 2.55, 0]} center distanceFactor={9} occlude={false}>
        <div className="pointer-events-none text-center whitespace-nowrap">
          <div className="rounded-full glass px-3 py-1 text-xs sm:text-sm font-bold">
            {level.title}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {level.category === "دستوری" ? "نقش دستوری" : "آرایه‌ی ادبی"}
          </div>
        </div>
      </Html>
    </group>
  );
}

export default Door3D;
