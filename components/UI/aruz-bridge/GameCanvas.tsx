"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { MachineState } from "@/lib/aruz-bridge/machine";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import type { Side } from "@/lib/aruz-bridge/types";
import { GameScene } from "./scene/GameScene";

/* مرزِ WebGL. هرچه three را وارد می‌کند از این پایین است، پس تنها همین فایل
   (و آنچه وارد می‌کند) در chunkـِ تنبل می‌نشیند. */

export interface GameCanvasProps {
  machine: MachineState;
  config: AruzBridgeConfig;
  quality: QualitySettings;
  reducedMotion: boolean;
  usePlayerModel: boolean;
  inputLocked: boolean;
  onChoose: (side: Side) => void;
}

export default function GameCanvas(props: GameCanvasProps) {
  const { quality } = props;

  const glSettings = useMemo(
    () => ({
      antialias: quality.antialias,
      alpha: false,
      powerPreference: "high-performance" as const,
      // برای شیشهٔ transmission لازم است؛ بدونِ آن پاسِ عبورِ نور خالی می‌شود.
      preserveDrawingBuffer: false,
    }),
    [quality.antialias],
  );

  return (
    <Canvas
      // dpr سقف‌دار است: روی نمایشگرِ ۳x بدونِ سقف، نُه برابرِ پیکسلِ لازم
      // رندر می‌شد و همان‌جا نرخِ فریم نصف می‌شد.
      dpr={quality.dpr}
      gl={glSettings}
      /* «percentage» یعنی PCFShadowMap. مقدارِ بولیِ `true` در three به
         PCFSoftShadowMap نگاشته می‌شد که منسوخ شده و در کنسول هشدار می‌داد. */
      shadows={quality.shadows ? "percentage" : false}
      camera={{ fov: 50, near: 0.1, far: 220, position: [0, 3.05, 5.2] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        // هزینهٔ عبورِ نور اینجا کوک می‌شود — این تنظیم روی رندرر است، نه ماده.
        gl.transmissionResolutionScale = quality.tier === "high" ? 0.5 : 0.25;
      }}
      className="absolute inset-0"
    >
      <Suspense fallback={null}>
        <GameScene {...props} />
      </Suspense>
    </Canvas>
  );
}
