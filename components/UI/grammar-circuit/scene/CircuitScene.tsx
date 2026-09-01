"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { SlotValidation } from "@/lib/grammar-circuit/reducer";
import {
  buildCircuitChain,
  type CircuitPoint,
} from "@/lib/grammar-circuit/circuit-path";
import type { CircuitGeometry } from "../hooks/useCircuitLayout";
import type { CurrentPhase } from "../CircuitSvgLayer";
import type { LampState } from "../Lamp";
import { useSceneTheme, type SceneTheme } from "./useSceneTheme";
import Glow from "./Glow";

/** صحنهٔ سه‌بعدیِ مدار.
 *
 *  ── قاعدهٔ اول: این لایه چیدمان را *نمی‌سازد* ─────────────────────────────
 *  همان قاعده‌ای که لایهٔ SVG دارد. اندازه‌اش از `geometry` می‌آید که از DOM
 *  خوانده شده؛ هیچ‌وقت والدش را بزرگ نمی‌کند و هیچ‌وقت ورودی نمی‌گیرد.
 *
 *  ── قاعدهٔ دوم: یک پیکسل = یک واحد ────────────────────────────────────────
 *  دوربینِ پرسپکتیو طوری نشانده شده که صفحهٔ z=0 دقیقاً به اندازهٔ محتوا
 *  دیده شود. یعنی مختصاتِ DOM بی‌هیچ تبدیلی مستقیم مصرف می‌شود و اجسام
 *  دقیقاً روی سوکت‌های واقعی می‌نشینند — ولی چون دوربین پرسپکتیو است، هرچه
 *  از z=0 فاصله بگیریم عمقِ واقعی دیده می‌شود.
 *
 *  ── قاعدهٔ سوم: هیچ رندرِ دوبارهٔ React در فریم ────────────────────────────
 *  همه‌چیزِ متحرک داخل `useFrame` و مستقیم روی شیء three نوشته می‌شود. تخته
 *  از تپشِ نور دوباره رندر نمی‌شود. */

export interface CircuitSceneProps {
  geometry: CircuitGeometry;
  circuitTokenIds: readonly string[];
  placements: Readonly<Record<string, string>>;
  validation: Readonly<Record<string, SlotValidation>>;
  phase: CurrentPhase;
  lampState: LampState;
}

/** ماسکِ لبه‌محو برای اسلب.
 *
 *  اسلب یک مستطیلِ تیز بود و مثلِ یک تابلوی جدا وسطِ کارتِ تخته دیده می‌شد.
 *  یک نقشهٔ آلفای گرد لبه‌ها را حل می‌کند: وسط کامل، کناره‌ها هیچ. یک‌بار
 *  ساخته و بینِ همهٔ نمونه‌ها به اشتراک گذاشته می‌شود. */
let slabMask: THREE.CanvasTexture | null = null;

function getSlabMask(): THREE.CanvasTexture | null {
  if (slabMask) return slabMask;
  if (typeof document === "undefined") return null;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.62, "#bdbdbd");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  slabMask = new THREE.CanvasTexture(canvas);
  return slabMask;
}

const TRACE_W = 3.5;
const TRACE_D = 7;
const SLAB_Z = -46;

/** رنگِ شکافِ سوکت — همان منطقِ لایهٔ SVG، تا دو لایه هیچ‌وقت اختلاف نگویند. */
function gapColor(
  theme: SceneTheme,
  state: SlotValidation | undefined,
  seated: boolean,
): string {
  if (state === "correct") return theme.ok;
  if (state === "wrong") return theme.bad;
  if (state === "checking") return theme.scan;
  return seated ? theme.seated : theme.open;
}

/** طولِ تجمعیِ مسیر، برای حرکتِ جریان روی آن. */
function measurePolyline(points: readonly CircuitPoint[]) {
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(total);
  }
  return { lengths, total };
}

function pointAt(
  points: readonly CircuitPoint[],
  lengths: readonly number[],
  distance: number,
): CircuitPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  const total = lengths[lengths.length - 1];
  const d = Math.max(0, Math.min(distance, total));
  let i = 1;
  while (i < lengths.length && lengths[i] < d) i++;
  if (i >= points.length) return points[points.length - 1];
  const span = lengths[i] - lengths[i - 1];
  const t = span <= 0 ? 0 : (d - lengths[i - 1]) / span;
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
  };
}

/** یک ردِ صاف. همهٔ قطعه‌ها محورموازی‌اند (زانو فقط افقی/عمودی می‌سازد)، پس
 *  یک جعبه با چرخشِ صفر یا ۹۰ درجه کافی است — نه چرخشِ دلخواه. */
function Trace({
  from,
  to,
  color,
  emissive,
  z = 0,
  width = TRACE_W,
}: {
  from: CircuitPoint;
  to: CircuitPoint;
  color: string;
  emissive: number;
  z?: number;
  width?: number;
}) {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const horizontal = dx >= dy;
  const length = Math.max(horizontal ? dx : dy, 1) + width;
  return (
    <mesh
      position={[(from.x + to.x) / 2, (from.y + to.y) / 2, z]}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry
        args={horizontal ? [length, width, TRACE_D] : [width, length, TRACE_D]}
      />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissive}
        roughness={0.45}
        metalness={0.35}
      />
    </mesh>
  );
}

/** چاهکِ سوکت — گودیِ واقعی زیرِ خانهٔ DOM. */
function SocketWell({
  x,
  y,
  halfWidth,
  color,
  lit,
}: {
  x: number;
  y: number;
  halfWidth: number;
  color: string;
  lit: boolean;
}) {
  return (
    <group position={[x, y, -10]}>
      <mesh>
        <boxGeometry args={[halfWidth * 2 + 10, 40, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={lit ? 0.85 : 0.16}
          roughness={0.6}
          metalness={0.2}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

function Battery({ x, y, theme }: { x: number; y: number; theme: SceneTheme }) {
  return (
    <group position={[x, y, 6]}>
      {/* بدنه — جعبهٔ کشیده، نه استوانه: باتریِ کتابیِ مدار این شکلی است و
          از روبه‌رو هم مبهم دیده نمی‌شود. */}
      <mesh>
        <boxGeometry args={[34, 30, 16]} />
        <meshStandardMaterial
          color={theme.slabEdge}
          emissive={theme.slabEdge}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      {/* نوارِ رنگیِ وسط، تا از یک جعبهٔ خاکستری تشخیص داده شود. */}
      <mesh position={[0, 0, 8.6]}>
        <planeGeometry args={[26, 12]} />
        <meshStandardMaterial
          color={theme.seated}
          emissive={theme.seated}
          emissiveIntensity={0.35}
          roughness={0.5}
        />
      </mesh>
      {/* قطبِ مثبت — جهتِ جریان را می‌گوید. */}
      <mesh position={[19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[5, 5, 6, 16]} />
        <meshStandardMaterial
          color={theme.energy}
          emissive={theme.energy}
          emissiveIntensity={0.55}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

/** لامپ — تنها جسمی که واقعاً نور می‌دهد. */
function Bulb({
  x,
  y,
  state,
  theme,
  animating,
}: {
  x: number;
  y: number;
  state: LampState;
  theme: SceneTheme;
  /** وقتی حلقهٔ رندر خوابیده، میل‌کردنِ نرم معنا ندارد: تنها فریمی که
   *  می‌گیریم باید *مقدارِ نهایی* را نشان بدهد، وگرنه لامپ نیمه‌روشن یخ
   *  می‌زند و خاموش‌شدنش هیچ‌وقت دیده نمی‌شود. */
  animating: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  const filament = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const target = useRef(0);
  const value = useRef(0);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    if (state === "on") {
      // تنفسِ آرام، تا روشنی مرده به نظر نرسد.
      target.current = 1 + Math.sin(t * 2.1) * 0.06;
    } else if (state === "flicker") {
      // چشمکِ نامنظم: دو موجِ ناهم‌دوره، نه یک تصادفیِ عصبی.
      const f = Math.sin(t * 27) * 0.5 + Math.sin(t * 41.3) * 0.5;
      target.current = Math.max(0, 0.32 + f * 0.5);
    } else {
      target.current = 0;
    }
    if (animating) {
      // میل‌کردن به مقصد، تا قطع‌ووصلِ ناگهانی نداشته باشیم.
      const k = state === "flicker" ? 26 : 7;
      value.current += (target.current - value.current) * Math.min(1, delta * k);
    } else {
      value.current = target.current;
    }

    const v = value.current;
    if (light.current) light.current.intensity = v * 210000;
    if (glass.current) glass.current.emissiveIntensity = 0.04 + v * 1.9;
    if (filament.current) {
      const mat = filament.current.material as THREE.MeshBasicMaterial;
      // رشته از قرمزِ کم‌جان تا سفیدِ داغ — همان رفتارِ یک رشتهٔ واقعی.
      mat.color.setRGB(0.35 + v * 0.65, 0.2 + v * 0.72, 0.12 + v * 0.6);
    }
    if (halo.current) {
      const mat = halo.current.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = Math.min(0.95, v * 0.9);
      const k = 0.8 + v * 0.3;
      halo.current.scale.set(k, k, 1);
    }
  });

  return (
    <group position={[x, y, 8]}>
      {/* درخشش — وقتی لامپ خاموش است کاملاً محو می‌شود. */}
      <Glow ref={halo} color={theme.lamp} size={210} opacity={0} position={[0, 0, -6]} />

      {/* حباب */}
      <mesh>
        <sphereGeometry args={[14, 30, 22]} />
        {/* `transmission` بدونِ نقشهٔ محیط سیاه درمی‌آید و حباب مثلِ یک
            گلولهٔ تیره دیده می‌شود — همان چیزی که در نسخهٔ اول شد. یک
            متریالِ نیمه‌شفافِ ساده هم درست‌تر دیده می‌شود و هم ارزان‌تر. */}
        <meshStandardMaterial
          ref={glass}
          color={theme.lamp}
          emissive={theme.lamp}
          emissiveIntensity={0.04}
          roughness={0.12}
          metalness={0}
          transparent
          opacity={0.72}
        />
      </mesh>

      {/* رشته — همان چیزی که واقعاً روشن می‌شود. */}
      <mesh ref={filament} position={[0, 1, 0]}>
        <torusGeometry args={[6.5, 1.4, 8, 24]} />
        <meshBasicMaterial color={theme.lamp} />
      </mesh>

      {/* سرپیچ */}
      <mesh position={[0, -17, 0]}>
        <cylinderGeometry args={[7, 8.5, 11, 20]} />
        <meshStandardMaterial
          color={theme.slabEdge}
          emissive={theme.slabEdge}
          emissiveIntensity={0.45}
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>

      <pointLight ref={light} color={theme.lamp} intensity={0} distance={700} decay={2} />
    </group>
  );
}

/** جریان — یک لکهٔ نورانی که مسیر را از باتری تا لامپ طی می‌کند. */
function Energy({
  points,
  phase,
  theme,
}: {
  points: readonly CircuitPoint[];
  phase: CurrentPhase;
  theme: SceneTheme;
}) {
  const mesh = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const start = useRef<number | null>(null);
  const { lengths, total } = useMemo(() => measurePolyline(points), [points]);

  useFrame(() => {
    const node = mesh.current;
    if (!node) return;

    if (phase === "idle" || total <= 0) {
      node.visible = false;
      if (light.current) light.current.intensity = 0;
      start.current = null;
      return;
    }

    const now = performance.now();
    if (start.current === null) start.current = now;
    // سرعتِ ثابت بر حسبِ پیکسل بر ثانیه: روی جملهٔ بلند کندتر دیده نمی‌شود.
    const travelled = ((now - start.current) / 1000) * 620;
    const loop = phase === "live";
    const d = loop ? travelled % total : Math.min(travelled, total);

    const p = pointAt(points, lengths, d);
    node.visible = true;
    node.position.set(p.x, p.y, 12);
    if (light.current) {
      light.current.position.set(p.x, p.y, 26);
      light.current.intensity = 26000;
    }
  });

  return (
    <>
      <group ref={mesh} visible={false}>
        <mesh>
          <sphereGeometry args={[6, 16, 12]} />
          <meshBasicMaterial color={theme.energy} />
        </mesh>
        <Glow color={theme.energy} size={92} opacity={0.85} position={[0, 0, 1]} />
      </group>
      <pointLight ref={light} color={theme.energy} intensity={0} distance={260} decay={2} />
    </>
  );
}

/** یک پیکسلِ CSS = یک واحدِ صحنه.
 *
 *  ارتفاعِ دیده‌شده در z=0 برابرِ 2·d·tan(fov/2) است؛ d را طوری می‌گیریم که
 *  این دقیقاً ارتفاعِ بوم شود. آن‌وقت مختصاتِ DOM بدونِ تبدیل درست می‌نشیند
 *  و چون دوربین پرسپکتیو است، فاصله‌گرفتن از z=0 عمقِ واقعی می‌دهد.
 *
 *  مبنا اندازهٔ *بوم* است نه `geometry`: بوم کلِ کادرِ محتوا را می‌پوشاند و
 *  مختصاتِ DOM هم از گوشهٔ همان کادر شروع می‌شود، پس هر دو یک مبدأ دارند. */
const FOV = 30;

function CameraRig() {
  const size = useThree((s) => s.size);
  const distance = size.height / (2 * Math.tan((FOV * Math.PI) / 360));
  /* هیچ `lookAt` ای لازم نیست: دوربین دقیقاً روبه‌روی مرکزِ محتوا می‌نشیند و
     جهتِ پیش‌فرضِ دوربین در three هم همان -Z است. اعلانی نوشتنش یعنی هیچ
     شیءِ برگشتی از hook دستکاری نمی‌شود و در حالتِ `demand` هم فریمِ درست
     همان اولین بار کشیده می‌شود. */
  return (
    <PerspectiveCamera
      makeDefault
      fov={FOV}
      near={1}
      far={distance + 1200}
      position={[size.width / 2, size.height / 2, distance]}
    />
  );
}

function SceneBody({
  geometry,
  circuitTokenIds,
  placements,
  validation,
  phase,
  lampState,
  animating,
}: CircuitSceneProps & { animating: boolean }) {
  const theme = useSceneTheme();
  const size = useThree((st) => st.size);
  const w = size.width;
  const h = size.height;
  const { power, lamp } = geometry;

  /* محورِ y در DOM به پایین است و در three به بالا.
     با `scale={[1,-1,1]}` هم می‌شد برگرداند، ولی مقیاسِ منفی جهتِ وجه‌ها را
     وارونه می‌کند و نورپردازی را خراب — پس مختصات صریح تبدیل می‌شود. */
  const chain = useMemo(() => {
    if (!power || !lamp) return null;
    const fy = (p: CircuitPoint) => ({ x: p.x, y: h - p.y });
    return buildCircuitChain(
      fy(power),
      fy(lamp),
      geometry.slots.map((s) => ({ ...s, centerY: h - s.centerY })),
      circuitTokenIds,
    );
  }, [power, lamp, geometry.slots, circuitTokenIds, h]);

  /* هر تغییری در چیدمان، نتیجهٔ تشخیص یا تم باید یک فریمِ تازه بخواهد؛ در
     حالتِ `demand` رندر خودبه‌خود اتفاق نمی‌افتد. */
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, geometry, placements, validation, phase, lampState, theme, w, h]);

  if (w <= 0 || h <= 0) return null;

  return (
    <>
      {/* در تمِ تیره صحنه عمداً کم‌نور است: چیزی که باید دیده شود خودِ
          مدارِ درخشان و لامپ است، نه یک تختهٔ روشن. در تمِ روشن برعکس. */}
      <ambientLight color={theme.ambient} intensity={theme.dark ? 0.22 : 1.9} />
      <directionalLight
        position={[w * 0.3, h * 1.6, 420]}
        intensity={theme.dark ? 0.35 : 1.7}
        color="#ffffff"
      />

      {/* پسِ تخته: جسمی که نورِ لامپ روی آن دیده شود. بدونِ آن، روشن‌شدنِ
          لامپ فقط یک دایرهٔ روشن است، نه «مدار روشن شد». */}
      {/* سطحی که نور روی آن می‌نشیند.
          دقیقاً هم‌اندازهٔ بوم است — بزرگ‌ترش کردیم و از کارتِ تخته زد بیرون
          و به‌شکلِ یک نوارِ روشن دیده شد. کم‌رنگ هم هست: تا لامپ روشن نشده
          تقریباً نامرئی است و تمامِ کارش نشان‌دادنِ همان روشنی است. */}
      <mesh position={[w / 2, h / 2, SLAB_Z]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={theme.slab}
          roughness={1}
          metalness={0}
          transparent
          alphaMap={getSlabMask() ?? undefined}
          opacity={theme.dark ? 0.75 : 0.5}
          depthWrite={false}
        />
      </mesh>

      {chain && (
        <>
          {chain.segments.map((seg) => {
            if (seg.kind === "wire") {
              const pts = [seg.from, ...seg.via, seg.to];
              return pts.slice(1).map((p, i) => (
                <Trace
                  key={`${seg.key}-${i}`}
                  from={pts[i]}
                  to={p}
                  color={theme.trace}
                  emissive={phase === "idle" ? 0.12 : 0.55}
                />
              ));
            }
            const state = seg.tokenId ? validation[seg.tokenId] : undefined;
            const seated = Boolean(seg.tokenId && placements[seg.tokenId]);
            const color = gapColor(theme, state, seated);
            return (
              <Trace
                key={seg.key}
                from={seg.from}
                to={seg.to}
                color={color}
                emissive={state === "correct" ? 1.1 : state ? 0.7 : 0.2}
                z={2}
                width={TRACE_W + 1.5}
              />
            );
          })}

          {geometry.slots.map((slot) => {
            const state = validation[slot.tokenId];
            const seated = Boolean(placements[slot.tokenId]);
            return (
              <SocketWell
                key={slot.tokenId}
                x={slot.centerX}
                y={h - slot.centerY}
                halfWidth={slot.halfWidth}
                color={gapColor(theme, state, seated)}
                lit={state === "correct" || state === "checking"}
              />
            );
          })}

          <Energy points={chain.points} phase={phase} theme={theme} />
        </>
      )}

      {power && <Battery x={power.x} y={h - power.y} theme={theme} />}
      {lamp && (
        <Bulb x={lamp.x} y={h - lamp.y} state={lampState} theme={theme} animating={animating} />
      )}
    </>
  );
}

export default function CircuitScene(props: CircuitSceneProps) {
  const { contentWidth: w, contentHeight: h } = props.geometry;

  /* بیشترِ عمرِ بازی هیچ‌چیز در صحنه حرکت نمی‌کند: کاربر دارد فکر می‌کند و
     قطعه می‌چیند. رندرِ ۶۰ فریم در ثانیه از یک تصویرِ ثابت، فقط باتری و
     GPU را می‌خورد. پس حلقه در حالتِ ایستا می‌خوابد و r3f با هر تغییرِ
     prop یک فریمِ تازه می‌کشد. */
  const animating = props.phase !== "idle" || props.lampState !== "off";

  if (w <= 0 || h <= 0) return null;

  return (
    <div
      className="gc-scene"
      aria-hidden
      style={{
        position: "absolute",
        // کلِ کادرِ محتوا، نه فقط نوارِ اندازه‌گیری‌شده: اگر صحنه هم‌قدِ
        // `contentHeight` باشد، به‌صورتِ یک نوارِ تیره وسطِ تخته دیده می‌شود.
        inset: 0,
        pointerEvents: "none",
        contain: "strict",
      }}
    >
      <Canvas
        frameloop={animating ? "always" : "demand"}
        /* سقفِ ۱٫۵ عمداً پایین‌تر از چگالیِ واقعیِ صفحه‌های رتیناست: این
           صحنه چند جسمِ درشت دارد و تفاوتِ ۲x و ۱٫۵x دیده نمی‌شود، ولی
           هزینه‌اش با مربعِ ضریب بالا می‌رود. */
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ width: "100%", height: "100%" }}
      >
        <CameraRig />
        <SceneBody {...props} animating={animating} />
      </Canvas>
    </div>
  );
}
