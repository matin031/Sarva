"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

const TURN_RATE = 2.0;
const PITCH_LIMIT = 1.3;
const MOUSE_SENSITIVITY = 0.0022;

function PlayerRig({
  bounds,
  spawn,
  spawnYaw = 0,
  moveVectorRef,
  lookVectorRef,
  onLockChange,
  eyeHeight = 1.6,
  speed = 3.2,
}: {
  bounds: Bounds;
  spawn: [number, number, number];
  spawnYaw?: number;
  moveVectorRef: React.RefObject<{ x: number; y: number }>;
  lookVectorRef: React.RefObject<{ x: number; y: number }>;
  onLockChange?: (locked: boolean) => void;
  eyeHeight?: number;
  speed?: number;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(spawnYaw);
  const pitch = useRef(0);
  const keys = useRef({ forward: false, backward: false, left: false, right: false });

  // resets the live camera object to the scene's spawn point; imperative
  // mutation of the r3f camera is expected here, not React state
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    camera.position.set(spawn[0], eyeHeight, spawn[2]);
    yaw.current = spawnYaw;
    pitch.current = 0;
    camera.rotation.order = "YXZ";
    camera.rotation.set(0, spawnYaw, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawn[0], spawn[2], spawnYaw]);
  /* eslint-enable react-hooks/immutability */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = true;
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = false;
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * MOUSE_SENSITIVITY;
      pitch.current -= e.movementY * MOUSE_SENSITIVITY;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };
    const onLockChangeEvt = () => {
      onLockChange?.(document.pointerLockElement === canvas);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChangeEvt);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChangeEvt);
    };
  }, [gl, onLockChange]);

  // `camera` from useThree is a live three.js Object3D meant to be mutated
  // imperatively every frame — that's the standard r3f movement pattern.
  /* eslint-disable react-hooks/immutability */
  useFrame((_, delta) => {
    const look = lookVectorRef.current;
    if (look.x !== 0 || look.y !== 0) {
      yaw.current -= look.x * TURN_RATE * delta;
      pitch.current += look.y * TURN_RATE * delta;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    }

    let f = 0;
    let r = 0;
    const mv = moveVectorRef.current;
    if (mv.x !== 0 || mv.y !== 0) {
      r = mv.x;
      f = mv.y;
    } else {
      if (keys.current.forward) f += 1;
      if (keys.current.backward) f -= 1;
      if (keys.current.right) r += 1;
      if (keys.current.left) r -= 1;
    }

    if (f !== 0 || r !== 0) {
      const len = Math.hypot(f, r) || 1;
      f /= len;
      r /= len;
      const sinYaw = Math.sin(yaw.current);
      const cosYaw = Math.cos(yaw.current);
      const dx = -f * sinYaw + r * cosYaw;
      const dz = -f * cosYaw - r * sinYaw;
      const nextX = camera.position.x + dx * speed * delta;
      const nextZ = camera.position.z + dz * speed * delta;
      camera.position.x = Math.min(bounds.maxX, Math.max(bounds.minX, nextX));
      camera.position.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, nextZ));
    }

    camera.position.y = eyeHeight;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0);
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

export default PlayerRig;
