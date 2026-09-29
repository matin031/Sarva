"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import SceneReady from "./scene/SceneReady";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { MachineState } from "@/lib/aruz-bridge/machine";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import type { Side } from "@/lib/aruz-bridge/types";
import { GameScene } from "./scene/GameScene";

/* مرزِ WebGL. هرچه three را وارد می‌کند از این پایین است، پس تنها همین فایل
   (و آنچه وارد می‌کند) در chunkـِ تنبل می‌نشیند. */

export interface GameCanvasProps {
  /** یک بار، وقتی مدل‌ها حل شدند و اولین فریم کشیده شد. */
  onSceneReady?: () => void;
  machine: MachineState;
  config: AruzBridgeConfig;
  quality: QualitySettings;
  reducedMotion: boolean;
  usePlayerModel: boolean;
  inputLocked: boolean;
  onChoose: (side: Side) => void;
  /** حالتِ توسعه: جعبه‌های برخورد را دیدنی می‌کند (‎?debugHits=1‎). */
  debugHitTargets?: boolean;
}

export default function GameCanvas(props: GameCanvasProps) {
  /* ⚠️ `onSceneReady` جدا برداشته می‌شود و به `GameScene` پاس داده نمی‌شود:
     مصرف‌کننده‌اش `SceneReady` است، نه صحنه. */
  const { onSceneReady, ...sceneProps } = props;
  const { quality } = props;
  const [minDpr, maxDpr] = quality.dpr;

  /* ── وضوحِ تطبیقی ─────────────────────────────────────────────────────
     حدسِ پله از روی سخت‌افزار فقط یک شروع است. `PerformanceMonitor` نرخِ
     فریمِ واقعی را می‌پاید و اگر دستگاه کم آورد، وضوح را پله‌پله تا کفِ بازه
     پایین می‌آورد (و اگر جا داشت، بالا می‌برد). یعنی به‌جای لگِ دائمی روی
     یک گوشیِ متوسط، تصویری کمی نرم‌تر ولی روان. */
  const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const [factor, setFactor] = useState(1);
  const dpr = useMemo(
    () => Math.max(minDpr, Math.min(maxDpr, deviceDpr) * (0.55 + 0.45 * factor)),
    [minDpr, maxDpr, deviceDpr, factor],
  );
  const onPerf = useCallback(({ factor: f }: { factor: number }) => {
    // گرد به یک‌دهم، تا نوسانِ ریز هر ثانیه بوم را از نو اندازه نگیرد
    setFactor(Math.round(f * 10) / 10);
  }, []);

  const glSettings = useMemo(
    () => ({
      antialias: quality.antialias,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance" as const,
      preserveDrawingBuffer: false,
    }),
    [quality.antialias],
  );

  return (
    <Canvas
      dpr={dpr}
      gl={glSettings}
      shadows={false}
      camera={{ fov: 50, near: 0.1, far: 220, position: [0, 3.05, 5.2] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;

        /* ⚠️ بوم برای فناوریِ کمکی پنهان می‌شود، و این عمدی است.

           هرچه این بوم می‌گوید، جای دیگری به HTML هم هست: واژهٔ پرسش در
           HUD، دو وزن در `AccessibleOptions`، و شمارش و بارگذاری در
           ناحیه‌های `aria-live`. یک `<canvas>` بی‌نام در میانِ این‌ها فقط
           یک گرهِ بی‌معنا به درختِ دسترس‌پذیری اضافه می‌کند.

           ⚠️ چرا اینجا و نه به‌صورتِ prop روی `<Canvas>`: آن را به عنصرِ
           واقعی نمی‌رساند — بررسیِ صفت‌های `<canvas>` نشان داد فقط
           `style`، `data-engine`، `width` و `height` روی آن می‌نشینند.

           ⚠️ اگر روزی چیزی *فقط* داخلِ بوم گفته شد، این باید برداشته شود. */
        gl.domElement.setAttribute("aria-hidden", "true");
      }}
      className="absolute inset-0"
    >
      <PerformanceMonitor
        factor={1}
        bounds={(refresh) => (refresh > 90 ? [60, 100] : [42, 56])}
        flipflops={4}
        onChange={onPerf}
        onFallback={() => setFactor(0)}
      />
      {/* ⚠️ `SceneReady` عمداً *داخلِ* همین مرز است: mount شدنش یعنی هرچه
          این Suspense منتظرش بود حل شده. بیرونِ مرز، بی‌معنی می‌شد. */}
      <Suspense fallback={null}>
        <GameScene {...sceneProps} />
        {onSceneReady && <SceneReady onReady={onSceneReady} />}
      </Suspense>
    </Canvas>
  );
}
