"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LANE_OFFSET, STEP_DEPTH, TILE_THICKNESS } from "@/lib/aruz-bridge/layout";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import { makeRng } from "@/lib/aruz-bridge/fracture";
import { NO_RAYCAST } from "./AnswerHitTarget";
import { useProceduralEnvironment } from "./useProceduralEnv";
import { useTokenRgb } from "@/lib/theme/use-primary-rgb";
import { sceneColor } from "./sceneColor";

/* محیط: ارتفاع، خطر، تعلیق و عمق — ولی نه ترس.
 *
 * چند چیز با هم این حس را می‌سازند:
 *   • مه، که ادامهٔ مسیر را می‌بلعد. بازیکن هیچ‌وقت کلِ پل را نمی‌بیند، پس
 *     نمی‌داند چقدر مانده و هر جفت شیشه که از مه بیرون می‌آید یک اتفاق است.
 *   • تیرهای کناری، که پل را به یک *سازه* تبدیل می‌کنند نه چند شیشهٔ معلق.
 *   • ذراتِ معلق، که بدونشان فضای خالی مقیاس ندارد.
 *   • نقشهٔ محیطی، که تنها دلیلِ دیده‌شدنِ شیشه است. */

function SuspendedParticles({ count, tint }: { count: number; tint: string }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    // بذرِ ثابت: چیدمانِ ذرات باید بینِ رندرها یکی بماند، وگرنه هر بار که
    // React این کامپوننت را دوباره می‌سازد کلِ ابر جابه‌جا می‌شود.
    const rng = makeRng(20260827);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (rng() - 0.5) * 26;
      positions[i * 3 + 1] = (rng() - 0.5) * 16 - 2;
      positions[i * 3 + 2] = -rng() * 70 + 6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: sceneColor(tint, 1.5, 0.2),
        size: 0.045,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [tint],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    // شناوری بسیار آرام؛ کلِ ابر می‌چرخد، نه تک‌تکِ ذره‌ها (هزینهٔ صفر در JS)
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });

  if (count === 0) return null;
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} raycast={NO_RAYCAST} />;
}

/** تیرهای کناری و بست‌ها — سازه‌ای که شیشه‌ها را نگه داشته. */
function BridgeStructure({ steps, tint, gold }: { steps: number; tint: string; gold: string }) {
  const beamMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        /* تیرها فلزِ تیره‌اند، ولی فلزی که *ته‌رنگِ همین پالت* را دارد — وگرنه
           در پالتِ رز یک سازهٔ سرمه‌ایِ بی‌ربط وسطِ صحنه می‌ماند. */
        color: sceneColor(tint, 0.42, 0.62),
        roughness: 0.42,
        metalness: 0.82,
      }),
    [tint],
  );
  const accentMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: sceneColor(gold),
        roughness: 0.35,
        metalness: 0.6,
        emissive: sceneColor(gold, 0.45),
        emissiveIntensity: 0.8,
      }),
    [gold],
  );

  useEffect(
    () => () => {
      beamMaterial.dispose();
      accentMaterial.dispose();
    },
    [beamMaterial, accentMaterial],
  );

  const length = (steps + 2) * STEP_DEPTH;
  const railX = LANE_OFFSET + 1.15;

  const posts = useMemo(
    () => Array.from({ length: steps + 2 }, (_, i) => -i * STEP_DEPTH),
    [steps],
  );

  return (
    <group>
      {/* دو تیرِ اصلیِ طولی، در دو طرف */}
      {[-railX, railX].map((x) => (
        <group key={x}>
          <mesh position={[x, TILE_THICKNESS / 2 - 0.06, -length / 2 + STEP_DEPTH]} material={beamMaterial} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.16, 0.16, length]} />
          </mesh>
          {/* نردهٔ بالایی — ارتفاع را خوانا می‌کند */}
          <mesh position={[x, 1.5, -length / 2 + STEP_DEPTH]} material={beamMaterial} raycast={NO_RAYCAST}>
            <boxGeometry args={[0.07, 0.07, length]} />
          </mesh>
        </group>
      ))}

      {/* پایه‌های عمودی و تیرِ عرضیِ زیرِ هر مرحله */}
      {posts.map((z, i) => (
        <group key={z} position={[0, 0, z]}>
          {[-railX, railX].map((x) => (
            <mesh key={x} position={[x, 0.78, 0]} material={beamMaterial} raycast={NO_RAYCAST}>
              <boxGeometry args={[0.075, 1.5, 0.075]} />
            </mesh>
          ))}
          <mesh position={[0, -0.16, 0]} material={beamMaterial} raycast={NO_RAYCAST}>
            <boxGeometry args={[railX * 2, 0.09, 0.11]} />
          </mesh>
          {/* چراغِ ظریفِ طلایی روی هر پایه، یکی‌درمیان */}
          {i % 2 === 0 &&
            [-railX, railX].map((x) => (
              <mesh key={x} position={[x, 1.56, 0]} material={accentMaterial} raycast={NO_RAYCAST}>
                <sphereGeometry args={[0.045, 8, 8]} />
              </mesh>
            ))}
        </group>
      ))}
    </group>
  );
}

export function BridgeEnvironment({
  quality,
  steps,
  fogNear,
  fogFar,
}: {
  quality: QualitySettings;
  steps: number;
  fogNear: number;
  fogFar: number;
}) {
  /* ⚠️ همهٔ رنگ‌های زیر از توکن‌های سایت خوانده می‌شوند و نه از هگزِ ثابت.
     پیش از این، «پلِ وزن» تنها جای سایت بود که به `data-palette` جواب نمی‌داد:
     کاربر کلِ سروا را زعفرانی می‌کرد و نوارِ بالای بازی زعفرانی می‌شد، ولی
     خودِ پل فیروزه‌ایِ دست‌نخورده می‌ماند — دو دنیای بی‌ربط، پشتِ سرِ هم.
     `useTokenRgb` همان هوکی است که WaveCanvas هم استفاده می‌کند. */
  const primary = useTokenRgb("--primary");
  const gold = useTokenRgb("--gold", "217,164,65");
  const envMap = useProceduralEnvironment(quality.envMapSize, primary, gold);

  return (
    <>
      {/* مه و پس‌زمینه به‌صورتِ اعلانی وصل می‌شوند، نه با نوشتن روی `scene`:
          این‌طوری R3F خودش هنگامِ برچیده‌شدنِ صحنه آن‌ها را برمی‌دارد و هیچ
          حالتِ سراسری‌ای دستی بازگردانده نمی‌شود.
          مه ادامهٔ مسیر را می‌بلعد — هم برای تعلیق، هم چون چیزی که دیده
          نمی‌شود لازم نیست رندر شود. */}
      <fog attach="fog" args={[sceneColor(primary, 0.15, 0.3), fogNear, fogFar]} />
      <color attach="background" args={[sceneColor(primary, 0.09, 0.3)]} />
      {envMap && <primitive object={envMap} attach="environment" />}

      {/* نورِ محیطیِ کم — بیشترِ روشناییِ صحنه از نقشهٔ محیطی می‌آید */}
      <ambientLight intensity={0.35} color={sceneColor(primary, 1.45, 0.45)} />
      {/* نورِ اصلی از بالا و کمی جلو، تا لبهٔ شیشه‌ها برق بیفتد */}
      <directionalLight
        position={[4, 9, 3]}
        intensity={1.35}
        color={sceneColor(primary, 1.85, 0.5)}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadows ? 1024 : 0}
        shadow-mapSize-height={quality.shadows ? 1024 : 0}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* نورِ پرکنندهٔ فیروزه‌ای از پایین — تهی را کاملاً سیاه نمی‌گذارد */}
      <pointLight position={[0, -4, -6]} intensity={9} distance={26} color={sceneColor(primary, 0.8)} />
      {/* لبهٔ طلاییِ پشتِ سر، برای جداکردنِ کاراکتر از پس‌زمینه */}
      <directionalLight position={[-5, 3, -8]} intensity={0.6} color={sceneColor(gold)} />

      <BridgeStructure steps={steps} tint={primary} gold={gold} />
      <SuspendedParticles count={quality.particleCount} tint={primary} />
    </>
  );
}
