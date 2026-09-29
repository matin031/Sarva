"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TILE_THICKNESS, TILE_WIDTH } from "@/lib/aruz-bridge/layout";
import { NO_RAYCAST } from "./AnswerHitTarget";
import { LABEL_ASPECT, loadLabelTexture, peekLabelTexture } from "./labelTexture";
import type { ScenePalette } from "./palette";

/* ═══════════════════════════════════════════════════════════════════════════
   نامِ رکن، نوشته روی خودِ شیشه.
   ═══════════════════════════════════════════════════════════════════════════

   متن فرزندِ خودِ کاشی است؛ هم‌ترازی محاسبه نمی‌شود، از ساختارِ صحنه می‌آید.
   هر حرکتی که کاشی بکند — ظاهرشدن، لرزش، hover — عیناً روی متن هم می‌رود.

   ── نوشته‌شدن از راست به چپ ───────────────────────────────────────────────
   وقتی پرسش می‌آید، رکن یک‌جا «پاپ» نمی‌شود؛ از راست به چپ روی شیشه نوشته
   می‌شود، با یک نوکِ قلمِ درخشان در جبهه‌اش. همان جهتی که خطِ فارسی نوشته
   می‌شود — و چشم را هم به همان جهتی می‌برد که باید بخواند.

   ── جبرانِ کوتاه‌شدگی ─────────────────────────────────────────────────────
   متنِ خوابیده روی سطحِ افقی از زاویهٔ دوربین در راستای عمق فشرده می‌شود.
   صفحهٔ متن در راستای z کشیده می‌شود تا بعد از تصویرشدن متناسب دیده شود —
   مثلِ نوشته‌های روی آسفالت. جبرانِ کامل (~۲) متن را شناور نشان می‌داد.
   ═══════════════════════════════════════════════════════════════════════════ */

const DEPTH_STRETCH = 1.85;
const LABEL_WIDTH = TILE_WIDTH * 0.92;
const LABEL_HEIGHT = (LABEL_WIDTH / LABEL_ASPECT) * DEPTH_STRETCH;
const PLANE = new THREE.PlaneGeometry(LABEL_WIDTH, LABEL_HEIGHT);
/** مدتِ نوشته‌شدن، ثانیه. */
const WRITE_SECONDS = 0.42;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uInk;
  uniform vec3 uGlow;
  uniform float uOpacity;
  uniform float uReveal;
  uniform float uGlowStrength;
  varying vec2 vUv;

  void main() {
    vec2 t = texture2D(uMap, vUv).rg;

    // جبههٔ نوشتن از لبهٔ راست (uv.x = 1) به چپ می‌رود
    float front = 1.08 - uReveal * 1.2;
    float shown = smoothstep(front, front + 0.1, vUv.x);
    float writing = 1.0 - step(0.999, uReveal);
    float pen = exp(-pow((vUv.x - front - 0.05) * 22.0, 2.0)) * writing;

    float glow = t.g * uGlowStrength;
    vec3 color = mix(uGlow, uInk, smoothstep(0.05, 0.9, t.r));
    color += uGlow * pen * (t.r + t.g) * 1.6;
    float alpha = max(t.r, glow * 0.85) * shown;

    gl_FragColor = vec4(color, alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

export interface GlassLabelProps {
  text: string;
  /** ۰..۱ — بازی از روی حالتِ فعلی می‌دهد؛ گذارش نرم است. */
  opacity: number;
  highlight?: "correct" | "wrong" | null;
  /** ۰..۱، هر فریم از کاشی خوانده می‌شود. */
  hoverRef?: RefObject<number>;
  palette: ScenePalette;
}

export function GlassLabel({ text, opacity, highlight = null, hoverRef, palette }: GlassLabelProps) {
  /* بافت معمولاً از پیش در کَش است (`prewarmLabels` حینِ شمارش پخته‌اش).
     اگر نبود — مثلاً قلم دیر رسید — همین‌جا منتظر می‌مانیم و متن با نوشته‌شدن
     ظاهر می‌شود؛ بازی منتظرِ متن نمی‌ماند. */
  const [loaded, setLoaded] = useState<{ text: string; texture: THREE.Texture } | null>(null);
  const cached = peekLabelTexture(text);
  const texture = cached ?? (loaded?.text === text ? loaded.texture : null);

  useEffect(() => {
    if (peekLabelTexture(text)) return;
    let alive = true;
    void loadLabelTexture(text).then((t) => {
      if (alive && t) setLoaded({ text, texture: t });
    });
    return () => {
      alive = false;
    };
  }, [text]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uInk: { value: new THREE.Color() },
          uGlow: { value: new THREE.Color() },
          uOpacity: { value: 0 },
          uReveal: { value: 0 },
          uGlowStrength: { value: 0.7 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const shown = useRef(0);
  const reveal = useRef(0);

  // متنِ تازه یعنی نوشتنِ تازه
  useEffect(() => {
    reveal.current = 0;
  }, [text]);

  useFrame((_, delta) => {
    const u = material.uniforms;
    u.uMap.value = texture;
    const dt = Math.min(delta, 0.05);

    shown.current += (opacity - shown.current) * Math.min(1, dt * 10);
    u.uOpacity.value = texture ? shown.current : 0;
    if (opacity > 0.01 && texture) reveal.current = Math.min(1, reveal.current + dt / WRITE_SECONDS);
    u.uReveal.value = reveal.current;

    const hover = hoverRef?.current ?? 0;
    const glowColor =
      highlight === "correct" ? palette.success : highlight === "wrong" ? palette.danger : palette.inkGlow;
    (u.uGlow.value as THREE.Color).copy(glowColor);
    /* حروف همیشه رنگِ جوهرِ تم را دارند و «درست/غلط» فقط در هاله است؛ روی
       شیشهٔ سبزِ فرودِ درست، حروفِ سبز گم می‌شدند. */
    (u.uInk.value as THREE.Color).copy(palette.ink);
    u.uGlowStrength.value = highlight ? 1 : (0.55 + hover * 0.45) * (palette.dark ? 1 : 0.9);
  });

  return (
    <mesh
      geometry={PLANE}
      material={material}
      /* درست بالای سطحِ شیشه؛ فاصلهٔ ۳ میلی‌متری فقط ضدِ z-fighting است. */
      position={[0, TILE_THICKNESS / 2 + 0.003, 0]}
      /* خواباندنِ صفحه رو به بالا، با بالای متن به سمتِ دورِ صحنه. */
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={4}
      raycast={NO_RAYCAST}
    />
  );
}
