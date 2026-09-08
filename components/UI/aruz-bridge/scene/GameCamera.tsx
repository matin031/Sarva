"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { BRIDGE_Y, LANE_OFFSET, TILE_WIDTH, TILE_DEPTH } from "@/lib/aruz-bridge/layout";
import type { CameraMode, CameraView } from "@/lib/aruz-bridge/types";

interface GameCameraProps {
  cameraView: CameraView;
  targetRef: RefObject<THREE.Vector3>;
  questionZ: number;
  mode: CameraMode;
  followSpeed: number;
  impulseRef: RefObject<number>;
  reducedMotion: boolean;
}

/** First-person eyes follow the actual player, with both answer panes framed. */
export function GameCamera({ cameraView, targetRef, questionZ, mode, followSpeed, impulseRef, reducedMotion }: GameCameraProps) {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  const look = useRef(new THREE.Vector3(0, 0, -2.6));
  const nextLook = useRef(new THREE.Vector3());
  const point = useRef(new THREE.Vector3());
  const inverse = useRef(new THREE.Matrix4());
  const initialized = useRef(false);
  const previousView = useRef(cameraView);
  useFrame((_, delta) => {
    const camera = ref.current;
    if (!camera) return;
    const p = targetRef.current;
    const dt = Math.min(delta, .05);
    const falling = mode === "fall" || mode === "gameOver";
    const third = cameraView === "third";
    const switched = previousView.current !== cameraView;
    previousView.current = cameraView;
    const eyeHeight = camera.aspect < .8 ? 2 : 1.65;
    camera.position.set(p.x, (reducedMotion ? BRIDGE_Y : p.y) + eyeHeight, p.z + .08);
    if (falling) nextLook.current.set(p.x, camera.position.y - .8, p.z - 4);
    else nextLook.current.set(0, BRIDGE_Y + .65, Math.min(questionZ - .6, p.z - 2));
    if (third) {
      // Strictly on the bridge axis: no yaw, roll or horizontal following.
      camera.position.set(0, BRIDGE_Y + 3.6, p.z + 3.1);
      nextLook.current.set(0, falling ? BRIDGE_Y - 1.4 : BRIDGE_Y + .15, p.z - 1.35);
    }
    if (!initialized.current || reducedMotion || switched || third) {
      look.current.copy(nextLook.current);
      initialized.current = true;
    } else look.current.lerp(nextLook.current, 1 - Math.exp(-Math.max(8, followSpeed) * dt));
    if (!reducedMotion) camera.position.y -= impulseRef.current * .025;
    camera.lookAt(look.current);
    // Freeze lens during travel; zooming to the surface underfoot causes nausea.
    if (mode === "gameplay" || switched) {
      camera.updateMatrixWorld();
      inverse.current.copy(camera.matrixWorld).invert();
      const minimum = third ? 44 : 52;
      let tangent = Math.tan(THREE.MathUtils.degToRad(minimum / 2));
      const halfWidth = LANE_OFFSET + TILE_WIDTH / 2;
      for (const x of [-halfWidth, halfWidth]) for (const z of [questionZ - TILE_DEPTH / 2, questionZ + TILE_DEPTH / 2]) {
        point.current.set(x, BRIDGE_Y + .08, z).applyMatrix4(inverse.current);
        const depth = -point.current.z;
        if (depth < .3) continue;
        tangent = Math.max(tangent, Math.abs(point.current.y) / depth * 1.23,
          Math.abs(point.current.x) / (depth * camera.aspect) * 1.18);
      }
      if (third && !falling) {
        for (const y of [BRIDGE_Y, BRIDGE_Y + 1.1]) {
          point.current.set(p.x, y, p.z).applyMatrix4(inverse.current);
          const depth = -point.current.z;
          if (depth > .3) tangent = Math.max(tangent, Math.abs(point.current.y) / depth * 1.2, Math.abs(point.current.x) / (depth * camera.aspect) * 1.2);
        }
      }
      const needed = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(tangent)), minimum, 110);
      const fov = switched ? needed : THREE.MathUtils.damp(camera.fov, needed, 12, dt);
      if (Math.abs(fov - camera.fov) > .01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
  });
  return <PerspectiveCamera ref={ref} makeDefault fov={65} near={.05} far={220} position={[0, 1.65, .08]} />;
}
