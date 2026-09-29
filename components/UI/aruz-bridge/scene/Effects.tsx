"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { makeRng } from "@/lib/aruz-bridge/fracture";
import { NO_RAYCAST } from "./AnswerHitTarget";

/* ═══════════════════════════════════════════════════════════════════════════
   جلوه‌های لحظه‌ای: موجِ نور و جرقه.
   ═══════════════════════════════════════════════════════════════════════════

   «حسِ بازی» بیشتر از هر چیز در لحظهٔ *فرود* ساخته می‌شود: بازیکن باید
   ببیند پاسخش اثری در دنیا گذاشته. فرودِ درست یک حلقهٔ نور و فوارهٔ جرقه
   می‌سازد؛ ترک‌خوردن یک حلقهٔ قرمز.

   هر دو تماماً روی GPU حرکت می‌کنند: JS فقط زمانِ شروع و سنِ جلوه را در یک
   uniform می‌نویسد. هیچ ذره‌ای در JS جابه‌جا نمی‌شود و هیچ شیئی هنگامِ
   شلیک ساخته نمی‌شود — یک نمونه برای کلِ دور.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BurstTrigger {
  /** هر مقدارِ تازه یعنی یک شلیکِ تازه. */
  key: number;
  position: [number, number, number];
  color: THREE.Color;
  accent: THREE.Color;
  /** شلیکِ «درست» جرقه دارد؛ شلیکِ «ترک» فقط حلقه. */
  sparks: boolean;
}

const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAge;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float radius = 1.0 - exp(-uAge * 5.0);
    float width = 0.05 + uAge * 0.08;
    float ring = exp(-pow((r - radius) / width, 2.0));
    float fade = exp(-uAge * 3.2);
    float inner = smoothstep(radius, 0.0, r) * 0.25 * exp(-uAge * 8.0);
    gl_FragColor = vec4(uColor * (ring + inner) * fade * uGain, 1.0);
    #include <colorspace_fragment>
  }
`;

const SPARK_VERTEX = /* glsl */ `
  attribute vec3 aDir;
  attribute float aSeed;
  uniform float uAge;
  uniform float uSize;
  varying float vLife;
  varying float vMix;
  void main() {
    float t = uAge * (0.75 + aSeed * 0.5);
    vec3 p = aDir * t * (3.4 + aSeed * 2.0);
    p.y += 3.2 * t - 5.5 * t * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vLife = clamp(1.0 - uAge * (1.1 + aSeed * 0.8), 0.0, 1.0);
    vMix = aSeed;
    gl_PointSize = uSize * (22.0 + aSeed * 30.0) * vLife / -mv.z;
  }
`;

const SPARK_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uGain;
  varying float vLife;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uColor, uAccent, step(0.6, vMix)) + vec3(0.6) * smoothstep(0.2, 0.0, d);
    gl_FragColor = vec4(color * a * vLife * uGain, 1.0);
    #include <colorspace_fragment>
  }
`;

const SPARK_COUNT = 42;
const RING_PLANE = new THREE.PlaneGeometry(4.2, 4.2);

export function Burst({
  trigger,
  enabled,
  gain,
}: {
  trigger: BurstTrigger | null;
  /** روی دستگاهِ ضعیف یا با کاهشِ حرکت، جرقه حذف می‌شود؛ حلقه می‌ماند. */
  enabled: boolean;
  gain: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const lastKey = useRef<number | null>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const ring = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uAge: { value: 99 }, uGain: { value: 1 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: RING_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const sparkGeometry = useMemo(() => {
    const rng = makeRng(424242);
    const dirs = new Float32Array(SPARK_COUNT * 3);
    const seeds = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const up = 0.25 + rng() * 0.75;
      const r = Math.sqrt(1 - up * up) + 0.35;
      dirs[i * 3] = Math.cos(a) * r * 0.55;
      dirs[i * 3 + 1] = up * 0.4;
      dirs[i * 3 + 2] = Math.sin(a) * r * 0.55;
      seeds[i] = rng();
    }
    const g = new THREE.BufferGeometry();
    // موقعیت فقط برای شمارشِ رأس‌ها لازم است؛ جای واقعی را شیدر می‌سازد.
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3), 3));
    g.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);

  const sparks = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color() },
          uAccent: { value: new THREE.Color() },
          uAge: { value: 99 },
          uSize: { value: 1 },
          uGain: { value: 1 },
        },
        vertexShader: SPARK_VERTEX,
        fragmentShader: SPARK_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      ring.dispose();
      sparks.dispose();
      sparkGeometry.dispose();
    },
    [ring, sparks, sparkGeometry],
  );

  const ringMesh = useRef<THREE.Mesh>(null);
  const sparkPoints = useRef<THREE.Points>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const now = state.clock.elapsedTime;

    if (trigger && trigger.key !== lastKey.current) {
      lastKey.current = trigger.key;
      started.current = now;
      group.position.set(...trigger.position);
      ring.uniforms.uColor.value.copy(trigger.color);
      sparks.uniforms.uColor.value.copy(trigger.color);
      sparks.uniforms.uAccent.value.copy(trigger.accent);
    }

    const age = started.current === null ? 99 : now - started.current;
    const alive = age < 2;
    group.visible = alive;
    if (!alive) return;

    ring.uniforms.uAge.value = age;
    ring.uniforms.uGain.value = gain;
    sparks.uniforms.uAge.value = age;
    sparks.uniforms.uSize.value = dpr;
    sparks.uniforms.uGain.value = gain;
    if (sparkPoints.current) sparkPoints.current.visible = enabled && Boolean(trigger?.sparks);
    if (ringMesh.current) ringMesh.current.visible = true;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        ref={ringMesh}
        geometry={RING_PLANE}
        material={ring}
        position={[0, 0.09, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={5}
        raycast={NO_RAYCAST}
      />
      <points
        ref={sparkPoints}
        geometry={sparkGeometry}
        material={sparks}
        position={[0, 0.15, 0]}
        renderOrder={6}
        frustumCulled={false}
        raycast={NO_RAYCAST}
      />
    </group>
  );
}
