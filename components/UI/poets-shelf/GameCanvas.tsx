"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { GameScene, type GameSceneProps } from "./scene/GameScene";
import { SceneReady } from "./scene/SceneReady";

/* ═══════════════════════════════════════════════════════════════════════════
   مرزِ WebGL.
   ═══════════════════════════════════════════════════════════════════════════

   هرچه three را وارد می‌کند از این فایل پایین‌تر است، پس تنها همین ماژول
   (و آنچه وارد می‌کند) در chunkـِ تنبل می‌نشیند. `PoetsShelfGame` این را با
   `dynamic(... , { ssr: false })` می‌آورد، یعنی نه three در بستهٔ اصلی
   می‌آید و نه در رندرِ سمتِ سرور اجرا می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface GameCanvasProps extends GameSceneProps {
  /** یک بار، وقتی مدل‌ها حل شدند و اولین فریم کشیده شد. */
  onSceneReady?: () => void;
}

export default function GameCanvas({ onSceneReady, ...sceneProps }: GameCanvasProps) {
  const { quality, palette } = sceneProps;

  const glSettings = useMemo(
    () => ({
      antialias: quality.antialias,
      /* ⚠️ `alpha: false` عمدی است: بومِ مات یعنی مرورگر لازم نیست هر فریم
         بوم را با صفحهٔ زیرش ترکیب کند. زمینهٔ صحنه خودش رنگِ تمِ سروا را
         می‌گیرد، پس شفافیتی لازم نیست. */
      alpha: false,
      powerPreference: "high-performance" as const,
      preserveDrawingBuffer: false,
    }),
    [quality.antialias],
  );

  return (
    <Canvas
      dpr={quality.dpr}
      gl={glSettings}
      /* «percentage» یعنی PCFShadowMap. مقدارِ بولیِ `true` در three به
         PCFSoftShadowMap نگاشته می‌شود که منسوخ است و در کنسول هشدار
         می‌دهد — همان درسی که در پلِ وزن گرفته شد. */
      shadows={quality.shadows ? "percentage" : false}
      /* دوربینِ اولیه؛ `GameCamera` بلافاصله ترکیب‌بندیِ درست را می‌نشاند. */
      camera={{ fov: 40, near: 0.1, far: 60, position: [0, 2, 6.5] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
        scene.background = new THREE.Color(palette.fog);

        /* ⚠️ بوم برای فناوریِ کمکی پنهان می‌شود، و این عمدی است.

           هرچه این بوم می‌گوید جای دیگری هم هست: پرسش در HUD، و *هر پنج
           گزینه* به‌صورتِ `<button>`‌های واقعیِ قابلِ Tab در همان برچسب‌های
           روی کتاب‌ها. یک `<canvas>` بی‌نام فقط یک گرهِ بی‌معنا به درختِ
           دسترس‌پذیری اضافه می‌کرد.

           چرا اینجا و نه به‌صورتِ prop روی `<Canvas>`: آن به عنصرِ واقعی
           نمی‌رسد. */
        gl.domElement.setAttribute("aria-hidden", "true");
      }}
      className="absolute inset-0"
    >
      {/* ⚠️ `SceneReady` عمداً *داخلِ* این مرز است: سوارشدنش یعنی هرچه این
          Suspense منتظرش بود حل شده. بیرونِ مرز بی‌معنی می‌شد. */}
      <Suspense fallback={null}>
        <GameScene {...sceneProps} />
        {onSceneReady && <SceneReady onReady={onSceneReady} />}
      </Suspense>
    </Canvas>
  );
}
