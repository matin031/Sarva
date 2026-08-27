"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NO_RAYCAST } from "./AnswerHitTarget";
import type { FractureResult } from "@/lib/aruz-bridge/fracture";

/* ترک‌ها *همان* یال‌های نمودارِ شکست‌اند، نه یک بافتِ جدا. یعنی خطی که بازیکن
   می‌بیند دقیقاً همان جایی است که یک لحظه بعد شیشه از آن جدا می‌شود.

   پخشِ ترک از محلِ برخوردِ پا شروع می‌شود. برای همین هر رأس یک صفتِ «فاصله تا
   نقطهٔ برخورد» دارد و شیدر هر چیزی را که جلوتر از جبههٔ ترک باشد دور می‌ریزد.
   کلِ کار یک draw call است و در جاوااسکریپت هیچ چیزی هر فریم ساخته نمی‌شود. */

const vertexShader = /* glsl */ `
  attribute float aDist;
  varying float vDist;
  void main() {
    vDist = aDist;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHotColor;
  varying float vDist;

  void main() {
    if (vDist > uProgress) discard;
    // جبههٔ ترک روشن‌تر است و پشتِ سرش سرد می‌شود — همان درخششِ لحظهٔ شکستن.
    float hot = smoothstep(uProgress - 0.35, uProgress, vDist);
    vec3 color = mix(uColor, uHotColor, hot);
    gl_FragColor = vec4(color, uOpacity * (0.5 + 0.5 * hot));
  }
`;

export function CrackLines({
  fracture,
  /** ۰ تا ۱: جبههٔ ترک تا کجا پیش رفته.
   *  ref است و نه مقدار، چون هر فریم عوض می‌شود؛ اگر prop معمولی بود، پخشِ
   *  ترک یعنی شصت re-renderِ React در ثانیه. */
  progressRef,
  y,
  visible,
}: {
  fracture: FractureResult;
  progressRef: RefObject<number>;
  y: number;
  visible: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(fracture.edges.length * 6);
    const distances = new Float32Array(fracture.edges.length * 2);
    fracture.edges.forEach((edge, i) => {
      positions[i * 6 + 0] = edge.a[0];
      positions[i * 6 + 1] = 0;
      positions[i * 6 + 2] = edge.a[1];
      positions[i * 6 + 3] = edge.b[0];
      positions[i * 6 + 4] = 0;
      positions[i * 6 + 5] = edge.b[1];
      distances[i * 2 + 0] = edge.distance;
      distances[i * 2 + 1] = edge.distance;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aDist", new THREE.BufferAttribute(distances, 1));
    return g;
  }, [fracture]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uOpacity: { value: 0.95 },
      uColor: { value: new THREE.Color("#bfefff") },
      uHotColor: { value: new THREE.Color("#ffffff") },
    }),
    [],
  );

  // هندسه روی GPU جا می‌گیرد؛ بدونِ dispose، هر کاشیِ شکسته یک بافرِ ماندگار است.
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const mat = materialRef.current;
    if (mat) mat.uniforms.uProgress.value = progressRef.current * fracture.maxDistance * 1.15;
  });

  return (
    <lineSegments
      geometry={geometry}
      position={[0, y, 0]}
      visible={visible}
      renderOrder={3}
      // ترک تزئینی است — و خطوط با آستانهٔ یک‌متری تقاطع می‌گیرند
      raycast={NO_RAYCAST}
    >
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </lineSegments>
  );
}
