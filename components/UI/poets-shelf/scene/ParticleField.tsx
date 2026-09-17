"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WALL_HEIGHT, WALL_WIDTH } from "@/lib/poets-shelf/layout";
import { NO_RAYCAST } from "./raycast";

/* ═══════════════════════════════════════════════════════════════════════════
   ذراتِ معلق.
   ═══════════════════════════════════════════════════════════════════════════

   ── چقدر، و چرا این‌قدر کم ────────────────────────────────────────────────

   کارِ این ذرات *فقط* یک چیز است: نشان‌دادنِ اینکه بینِ دوربین و دیوار
   فضایی هست. همین. هر ذره‌ای بیشتر از آنچه این را می‌رساند، به تزئین تبدیل
   می‌شود و دقیقاً روی همان چیزی می‌نشیند که باید خوانده شود — عنوانِ
   کتاب‌ها و سیلوئتِ شخصیت.

   پس بیشینه ۴۶ ذره است و نه چندصدتا، شفافیتشان پایین است، و همه *جلوتر از*
   کتاب‌ها شناورند تا هیچ‌وقت روی عنوان نیفتند.

   ── چرا به‌روزرسانی روی CPU ───────────────────────────────────────────────

   با این تعداد، نوشتنِ ۴۶ موقعیت در هر فریم چند میکروثانیه است. شیدرِ
   اختصاصی همان نتیجه را می‌داد ولی یک برنامهٔ GPU، چند یونیفرم و کدِ
   بیشتری می‌خواست که نگه‌داری شود — و صورت‌مسئله صریح بود: پیچیدگیِ شیدر
   فقط وقتی که واقعاً توجیه داشته باشد.
   ═══════════════════════════════════════════════════════════════════════════ */

/** بافتِ ذره: یک لکهٔ نرم. بدونِ آن، ذرات مربع‌های تیزِ بدنما می‌شوند. */
function makeSpriteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export interface ParticleFieldProps {
  count: number;
  color: string;
  reducedMotion: boolean;
}

export function ParticleField({ count, color, reducedMotion }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  /* هر ذره یک خانهٔ پایه، یک دامنه و یک فاز دارد. قطعی‌اند، پس صحنه در هر
     بار باز شدن یکسان است و ذرات با تغییرِ تم نمی‌پرند. */
  const seeds = useMemo(() => {
    const out = new Float32Array(count * 6);
    let s = 0x2f6e2b;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      out[i * 6] = (rand() - 0.5) * WALL_WIDTH * 0.82; // x
      out[i * 6 + 1] = 0.25 + rand() * (WALL_HEIGHT * 0.78); // y
      /* ⚠️ عمق عمداً *جلوتر از* کتاب‌ها شروع می‌شود (z از ۰٫۷ به بالا):
         ذره‌ای که پشتِ کتاب‌ها یا داخلِ دیوار باشد دیده نمی‌شود، و ذره‌ای
         که هم‌عمقِ عنوان‌ها باشد رویشان می‌افتد. */
      out[i * 6 + 2] = 0.7 + rand() * 4.4; // z
      out[i * 6 + 3] = 0.09 + rand() * 0.2; // دامنهٔ شناوری
      out[i * 6 + 4] = rand() * Math.PI * 2; // فاز
      out[i * 6 + 5] = 0.1 + rand() * 0.24; // سرعت
    }
    return out;
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    let s = 0x77c1a3;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      positions[i * 3] = seeds[i * 6];
      positions[i * 3 + 1] = seeds[i * 6 + 1];
      positions[i * 3 + 2] = seeds[i * 6 + 2];
      /* تنوعِ اندازه همان چیزی است که میدان را «عمیق» نشان می‌دهد؛ ذراتِ
         هم‌اندازه به یک الگوی تخت تبدیل می‌شوند. */
      scales[i] = 0.4 + rand() * 0.85;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, WALL_HEIGHT / 2, 2), 12);
    return geo;
  }, [count, seeds]);

  const sprite = useMemo(() => makeSpriteTexture(), []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(color),
        map: sprite,
        size: 0.075,
        sizeAttenuation: true,
        transparent: true,
        /* ⚠️ شفافیتِ پایین عمدی است. در تمِ روشن هر چیزی بالاتر از این،
           ذرات را به «خال» روی صفحه تبدیل می‌کرد. */
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [color, sprite],
  );

  useEffect(() => {
    material.color.set(color);
  }, [material, color]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      sprite.dispose();
    },
    [geometry, material, sprite],
  );

  useFrame((state) => {
    if (reducedMotion) return;
    const points = pointsRef.current;
    if (!points) return;

    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const baseY = seeds[i * 6 + 1];
      const amplitude = seeds[i * 6 + 3];
      const phase = seeds[i * 6 + 4];
      const speed = seeds[i * 6 + 5];
      /* بالا و پایینِ آرام، به‌علاوهٔ یک تابِ افقیِ کندتر. دو بسامدِ
         نامرتبط یعنی الگو هیچ‌وقت خودش را تکرار نمی‌کند و چشم ریتمی
         در آن پیدا نمی‌کند. */
      array[i * 3 + 1] = baseY + Math.sin(time * speed + phase) * amplitude;
      array[i * 3] = seeds[i * 6] + Math.cos(time * speed * 0.55 + phase) * amplitude * 0.5;
    }
    attribute.needsUpdate = true;
  });

  if (count <= 0) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} raycast={NO_RAYCAST} frustumCulled={false} />;
}
