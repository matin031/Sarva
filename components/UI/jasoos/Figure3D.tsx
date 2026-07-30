"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type FigureMood = "calm" | "scared" | "smug" | "dead";

/** One suspect, built out of solid geometry.
 *
 *  Bodies are primitives rather than a loaded model on purpose: the whole
 *  line-up then costs a handful of draw calls and no download, and the shapes
 *  can be posed from numbers — arms swing up, the head turns to follow the
 *  player, the whole figure topples when it is shot.
 *
 *  Everything that moves is interpolated inside `useFrame` towards a target, so
 *  a mood change is a lerp rather than a hard cut, and React never re-renders
 *  during the animation. */
export default function Figure3D({
  mood,
  /** where the player's crosshair is, in world space — the head looks at it */
  aimTarget,
  accent,
  bodyColor,
  onPointerOver,
  onPointerOut,
  onClick,
  seed = 0,
}: {
  mood: FigureMood;
  aimTarget: THREE.Vector3;
  accent: string;
  bodyColor: string;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  onClick?: () => void;
  seed?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const browL = useRef<THREE.Mesh>(null);
  const browR = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);

  // one shared vector, reused every frame instead of allocating
  const look = useMemo(() => new THREE.Vector3(), []);
  const t = useRef(seed * 1.7);

  const skin = useMemo(() => new THREE.Color(bodyColor), [bodyColor]);
  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  useFrame((_, dt) => {
    const g = group.current;
    const h = head.current;
    if (!g || !h) return;
    t.current += dt;

    const scared = mood === "scared";
    const smug = mood === "smug";
    const dead = mood === "dead";

    // ---- body: idle breathing, a flinch backwards, or a topple ----
    const targetTilt = dead ? -Math.PI / 2.1 : scared ? -0.16 : 0;
    const targetY = dead ? -0.55 : scared ? 0.06 : 0;
    const breathe = dead ? 0 : Math.sin(t.current * (smug ? 2.2 : 1.4)) * 0.03;

    g.rotation.x += (targetTilt - g.rotation.x) * Math.min(1, dt * (dead ? 6 : 9));
    g.position.y += (targetY + breathe - g.position.y) * Math.min(1, dt * 8);
    g.position.z += ((scared ? -0.28 : 0) - g.position.z) * Math.min(1, dt * 9);

    // ---- head: follows the crosshair, unless it is down or gloating ----
    if (dead) {
      h.rotation.set(0, 0, 0.5);
    } else if (smug) {
      // chin up, turned slightly away — the look of someone enjoying this
      h.rotation.y += (0.5 - h.rotation.y) * Math.min(1, dt * 5);
      h.rotation.x += (-0.18 - h.rotation.x) * Math.min(1, dt * 5);
      h.rotation.z += (0.12 - h.rotation.z) * Math.min(1, dt * 5);
    } else {
      look.copy(aimTarget);
      g.worldToLocal(look);
      const yaw = Math.atan2(look.x, look.z + 4) * 0.55;
      const pitch = -Math.atan2(look.y - 1.55, 4) * 0.5;
      h.rotation.y += (yaw - h.rotation.y) * Math.min(1, dt * 7);
      h.rotation.x += (pitch - h.rotation.x) * Math.min(1, dt * 7);
      h.rotation.z += (0 - h.rotation.z) * Math.min(1, dt * 7);
    }

    // ---- arms: higher when frightened, slack when down ----
    const armZ = dead ? 0.35 : scared ? 2.72 : 2.42;
    if (leftArm.current) {
      leftArm.current.rotation.z +=
        (armZ - leftArm.current.rotation.z) * Math.min(1, dt * 8);
    }
    if (rightArm.current) {
      rightArm.current.rotation.z +=
        (-armZ - rightArm.current.rotation.z) * Math.min(1, dt * 8);
    }

    // ---- face: brows and mouth are posed, not swapped ----
    const browY = scared ? 0.1 : smug ? -0.02 : 0.04;
    const browTilt = smug ? 0.4 : scared ? -0.25 : 0;
    for (const [ref, sign] of [
      [browL, 1],
      [browR, -1],
    ] as const) {
      const b = ref.current;
      if (!b) continue;
      b.position.y += (browY - b.position.y) * Math.min(1, dt * 8);
      b.rotation.z += (browTilt * sign - b.rotation.z) * Math.min(1, dt * 8);
      b.visible = !dead;
    }
    const m = mouth.current;
    if (m) {
      const w = scared ? 0.9 : smug ? 1.25 : 1;
      const hgt = scared ? 1.9 : smug ? 0.7 : 0.5;
      m.scale.x += (w - m.scale.x) * Math.min(1, dt * 8);
      m.scale.y += (hgt - m.scale.y) * Math.min(1, dt * 8);
      m.rotation.z += ((smug ? -0.32 : 0) - m.rotation.z) * Math.min(1, dt * 8);
    }
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* a generous invisible hull so the whole figure is clickable — raycast
          against one capsule instead of four limbs, and no sibling can steal
          the hit the way overlapping DOM boxes did */}
      <mesh position={[0, 1.05, 0]} visible={false}>
        <capsuleGeometry args={[0.62, 1.9, 4, 8]} />
      </mesh>

      {/* torso */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.72, 6, 16]} />
        <meshStandardMaterial color={skin} roughness={0.55} metalness={0.08} />
      </mesh>

      {/* legs */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.28, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.44, 4, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      ))}

      {/* arms, hinged at the shoulder so they can be raised */}
      <group ref={leftArm} position={[-0.34, 1.28, 0]} rotation={[0, 0, 2.42]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <capsuleGeometry args={[0.095, 0.62, 4, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.34, 1.28, 0]} rotation={[0, 0, -2.42]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <capsuleGeometry args={[0.095, 0.62, 4, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>

      {/* head + face */}
      <group ref={head} position={[0, 1.62, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.3, 24, 20]} />
          <meshStandardMaterial color={skin} roughness={0.5} />
        </mesh>

        {/* eye whites, set into the face */}
        {[-0.11, 0.11].map((x) => (
          <mesh key={`w${x}`} position={[x, 0.05, 0.26]}>
            <sphereGeometry args={[0.075, 16, 14]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} />
          </mesh>
        ))}
        {/* pupils — they sit on the eye and inherit the head's aim */}
        {[-0.11, 0.11].map((x) => (
          <mesh key={`p${x}`} position={[x, 0.05, 0.325]}>
            <sphereGeometry args={[0.034, 12, 10]} />
            <meshStandardMaterial color="#0b1220" roughness={0.2} />
          </mesh>
        ))}

        {/* brows */}
        <mesh ref={browL} position={[-0.11, 0.04, 0.3]}>
          <boxGeometry args={[0.11, 0.022, 0.02]} />
          <meshStandardMaterial color="#0b1220" />
        </mesh>
        <mesh ref={browR} position={[0.11, 0.04, 0.3]}>
          <boxGeometry args={[0.11, 0.022, 0.02]} />
          <meshStandardMaterial color="#0b1220" />
        </mesh>

        {/* mouth — scaled and rotated into an O, a line, or a crooked grin */}
        <mesh ref={mouth} position={[0, -0.11, 0.28]}>
          <boxGeometry args={[0.12, 0.03, 0.02]} />
          <meshStandardMaterial color="#0b1220" />
        </mesh>
      </group>

      {/* a faint ring of the accent colour, so the aimed-at one reads instantly */}
      <mesh
        position={[0, 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={mood === "scared" || mood === "smug"}
      >
        <ringGeometry args={[0.5, 0.62, 32]} />
        <meshBasicMaterial
          color={mood === "smug" ? "#ef4444" : accentColor}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
