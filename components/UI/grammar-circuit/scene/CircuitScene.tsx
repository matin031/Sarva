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
import { useStudioEnvironment } from "./useStudioEnvironment";

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

const TRACE_W = 3.5;
const TRACE_D = 7;

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
  void emissive;
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
      {/* بدونِ نورپردازی.
          ظاهرِ سیم را رنگِ خودش تعیین می‌کند نه نوری که به آن می‌خورد، پس
          `meshStandard` فقط هزینه بود: هر فریم، برای هر پیکسل، حسابِ سه
          نور. با `meshBasic` تصویر همان است و شیدر تقریباً هیچ. */}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** چاهکِ سوکت — گودیِ ماشین‌کاری‌شده زیرِ خانهٔ DOM.
 *
 *  نسخهٔ قبلی یک جعبهٔ نیمه‌شفافِ خاکستری بود که پشتِ کادرِ DOM فقط گِل‌آلود
 *  دیده می‌شد. حالا دو قطعه است: کفِ تیرهٔ فرورفته، و یک قابِ نازکِ نورانی
 *  دورِ آن. لبه است که به چشم می‌گوید «اینجا گودی است». */
function SocketWell({
  x,
  y,
  halfWidth,
  height,
  color,
  floor,
  lit,
}: {
  x: number;
  y: number;
  halfWidth: number;
  height: number;
  color: string;
  floor: string;
  lit: boolean;
}) {
  const w = halfWidth * 2 + 6;
  const rimColor = useMemo(
    () => new THREE.Color(color).multiplyScalar(lit ? 1.45 : 0.8),
    [color, lit],
  );
  /* قاب با *چهار میلهٔ* جدا ساخته شده بود: پنج مش برای هر خانه، و با شش
     خانه سی مشِ اضافه فقط برای لبه. حالا یک جعبهٔ بیرونیِ نورانی و یک کفِ
     کمی کوچک‌ترِ رویش همان لبه را می‌دهند — دو مش. */
  return (
    <group position={[x, y, -8]}>
      <mesh>
        <boxGeometry args={[w, height, 5]} />
        {/* «روشن» بودن با خودِ رنگ گفته می‌شود: متریالِ بدونِ نور
            `emissiveIntensity` ندارد، پس خانه‌ای که در حالِ بررسی یا درست
            است رنگِ پررنگ‌تری می‌گیرد. */}
        <meshBasicMaterial color={rimColor} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 1.6]}>
        <boxGeometry args={[w - 4, height - 4, 3]} />
        <meshBasicMaterial color={floor} />
      </mesh>
    </group>
  );
}

function Battery({
  x,
  y,
  theme,
  envMap,
}: {
  x: number;
  y: number;
  theme: SceneTheme;
  envMap: THREE.Texture | null;
}) {
  return (
    <group position={[x, y, 4]} rotation={[0, 0, Math.PI / 2]}>
      {/* بدنه: سلولِ استوانه‌ای. با نقشهٔ محیط، فلز واقعاً فلز دیده می‌شود. */}
      <mesh>
        <cylinderGeometry args={[13, 13, 40, 40]} />
        <meshStandardMaterial
          color={theme.cell}
          roughness={0.34}
          metalness={0.9}
          envMap={envMap}
          envMapIntensity={theme.dark ? 0.55 : 1.1}
        />
      </mesh>
      {/* غلافِ رنگی — نوارِ برچسبِ سلول. */}
      <mesh>
        <cylinderGeometry args={[13.3, 13.3, 24, 40, 1, true]} />
        <meshStandardMaterial
          color={theme.cellBand}
          roughness={0.45}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* درپوش‌های فلزی */}
      {[-20, 20].map((oy) => (
        <mesh key={oy} position={[0, oy, 0]}>
          <cylinderGeometry args={[13.1, 13.1, 1.6, 40]} />
          <meshStandardMaterial
            color="#cbd3d7"
            roughness={0.2}
            metalness={1}
            envMap={envMap}
            envMapIntensity={theme.dark ? 0.6 : 1.15}
          />
        </mesh>
      ))}
      {/* قطبِ مثبت — برجستگیِ کوچکِ سرِ سلول، جهتِ جریان را می‌گوید. */}
      <mesh position={[0, 22.5, 0]}>
        <cylinderGeometry args={[4.6, 4.6, 4, 20]} />
        <meshStandardMaterial
          color="#d8dee1"
          roughness={0.18}
          metalness={1}
          envMap={envMap}
          envMapIntensity={theme.dark ? 0.6 : 1.15}
        />
      </mesh>
    </group>
  );
}

/** لامپ — تنها جسمی که واقعاً نور می‌دهد.
 *
 *  نسخهٔ قبلی یک صفحهٔ درخشانِ پهن پشتِ حباب داشت. آن «نور» نبود، یک لکهٔ
 *  محوِ بژ بود که روی همه‌چیز می‌افتاد و کلِ تخته را کدر می‌کرد. حالا نور
 *  فقط از سه جای درست می‌آید: خودِ رشته که می‌درخشد، شیشه‌ای که آن را پخش
 *  می‌کند، و `pointLight` ای که واقعاً روی سطحِ تخته می‌نشیند. */
function Bulb({
  x,
  y,
  state,
  theme,
  envMap,
  animating,
}: {
  x: number;
  y: number;
  state: LampState;
  theme: SceneTheme;
  envMap: THREE.Texture | null;
  /** وقتی حلقهٔ رندر خوابیده، میل‌کردنِ نرم معنا ندارد: تنها فریمی که
   *  می‌گیریم باید *مقدارِ نهایی* را نشان بدهد، وگرنه لامپ نیمه‌روشن یخ
   *  می‌زند و خاموش‌شدنش هیچ‌وقت دیده نمی‌شود. */
  animating: boolean;
}) {
  const pool = useRef<THREE.Mesh>(null);
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  const filament = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const target = useRef(0);
  const value = useRef(0);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    if (state === "on") {
      target.current = 1 + Math.sin(t * 2.1) * 0.05;
    } else if (state === "flicker") {
      // چشمکِ نامنظم: دو موجِ ناهم‌دوره، نه یک تصادفیِ عصبی.
      const f = Math.sin(t * 27) * 0.5 + Math.sin(t * 41.3) * 0.5;
      target.current = Math.max(0, 0.3 + f * 0.5);
    } else {
      target.current = 0;
    }

    if (animating) {
      const k = state === "flicker" ? 26 : 8;
      value.current += (target.current - value.current) * Math.min(1, delta * k);
    } else {
      value.current = target.current;
    }

    const v = value.current;
    if (pool.current) {
      const mat = pool.current.material as THREE.ShaderMaterial;
      mat.uniforms.uOpacity.value = v * 0.42;
      const k = 0.9 + v * 0.18;
      pool.current.scale.set(k, k, 1);
    }
    /* شیشه با `transmission` بیشترِ نورِ خودش را رد می‌کند، پس شدتِ کمِ
       emissive عملاً دیده نمی‌شد و لامپِ روشن یک گویِ خاکستری می‌ماند.
       `toneMapped=false` روی رشته هم لازم است وگرنه ACES داغیِ آن را
       برمی‌گرداند. */
    if (glass.current) glass.current.emissiveIntensity = v * 2.6;
    if (core.current) {
      const mat = core.current.material as THREE.MeshBasicMaterial;
      mat.opacity = v * 0.8;
    }
    if (filament.current) {
      const mat = filament.current.material as THREE.MeshBasicMaterial;
      // رشته از نارنجیِ کم‌جان تا سفیدِ داغ — رفتارِ یک رشتهٔ واقعی.
      mat.color.setRGB(0.16 + v * 0.84, 0.09 + v * 0.85, 0.05 + v * 0.8);
    }
  });

  return (
    <group position={[x, y, 4]}>
      {/* حباب.
          `transmission` عمداً استفاده *نشده*: شیشهٔ شکست‌دار در یک پاسِ
          جداگانه رندر می‌شود و اجسامِ شفافِ داخلش — یعنی همان مغزِ نورانی —
          از آن پاس جا می‌مانند. نتیجه یک گویِ خاکستری بود. شیشهٔ آلفایی
          هم درست دیده می‌شود و هم آن پاسِ گران را ندارد. */}
      <mesh>
        <sphereGeometry args={[16, 32, 24]} />
        {/* `meshPhysical` بود؛ بعد از برداشتنِ clearcoat هیچ ویژگیِ آن
            استفاده نمی‌شد و فقط شیدرِ سنگین‌ترش می‌ماند. */}
        <meshStandardMaterial
          ref={glass}
          color={theme.dark ? "#8fa6b2" : "#e8eef0"}
          emissive={theme.lamp}
          emissiveIntensity={0}
          roughness={0.06}
          metalness={0}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* مغزِ نورانی — داخلِ حباب. چون حباب `depthWrite` ندارد، این از
          پشتش درست دیده می‌شود. */}
      <mesh ref={core}>
        <sphereGeometry args={[13.6, 24, 18]} />
        <meshBasicMaterial
          color={theme.lamp}
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* رشته — چیزی که واقعاً روشن می‌شود. */}
      <mesh ref={filament} position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.6, 1, 8, 26]} />
        <meshBasicMaterial color="#2a1708" toneMapped={false} />
      </mesh>

      {/* سرپیچِ رزوه‌دار: سه حلقهٔ نازک، همان چیزی که یک لامپِ واقعی دارد و
          نبودنش جسم را به یک گلولهٔ روی میله تبدیل می‌کند. */}
      <group position={[0, -18, 0]}>
        <mesh>
          <cylinderGeometry args={[6.4, 6.4, 9, 24]} />
          <meshStandardMaterial
          color="#b9c2c6"
          roughness={0.28}
          metalness={1}
          envMap={envMap}
          envMapIntensity={theme.dark ? 0.6 : 1.15}
        />
        </mesh>
        <mesh position={[0, -6, 0]}>
          <cylinderGeometry args={[2.6, 3.4, 3.6, 16]} />
          <meshStandardMaterial color="#3c464b" roughness={0.5} metalness={0.9} />
        </mesh>
      </group>

      {/* حوضچهٔ نور.
          قبلاً یک `pointLight` واقعی بود. زیبا، ولی گران: هر متریالِ
          نورخوری در هر فریم بهایش را می‌داد و نرخِ فریمِ حالتِ روشن را
          نصف می‌کرد. این حوضچه *کشیده* می‌شود — یک چهارضلعیِ افزایشی با
          افتِ شعاعی — و همان تصویر را تقریباً رایگان می‌دهد.

          این همان «هالهٔ» قبلی نیست: آن یک لکهٔ پهنِ همیشگی با لبهٔ مربعی
          بود، این فقط وقتی مدار بسته می‌شود ظاهر می‌شود و افتِ نرم دارد. */}
      <Glow ref={pool} color={theme.lamp} size={330} opacity={0} position={[0, -4, -14]} />
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
  const start = useRef<number | null>(null);
  const { lengths, total } = useMemo(() => measurePolyline(points), [points]);

  useFrame(() => {
    const node = mesh.current;
    if (!node) return;

    if (phase === "idle" || total <= 0) {
      node.visible = false;
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

  });

  return (
    <>
      <group ref={mesh} visible={false}>
        <mesh>
          <sphereGeometry args={[4.5, 16, 12]} />
          <meshBasicMaterial color={theme.energy} toneMapped={false} />
        </mesh>
        {/* هالهٔ جریان کوچک و جمع است — تنها جای صحنه که هنوز درخشش دارد،
            چون یک نقطهٔ نورِ متحرک بدونِ آن مصنوعی به نظر می‌رسد. */}
        <Glow color={theme.energy} size={44} opacity={0.8} position={[0, 0, 1]} />
      </group>

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
  /* بازتاب فقط روی فلزها — باتری و سرپیچِ لامپ. دلیلش در خودِ hook است. */
  const envMap = useStudioEnvironment();
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
      {/* نورِ محیط بیشترِ کار را می‌کند؛ این یکی فقط لبه‌ها را تعریف می‌کند
          تا اجسام حجم پیدا کنند. */}
      <directionalLight
        position={[w * 0.25, h * 2.2, 520]}
        intensity={theme.dark ? 0.9 : 2.4}
        color="#ffffff"
      />

      {/* پسِ تخته: جسمی که نورِ لامپ روی آن دیده شود. بدونِ آن، روشن‌شدنِ
          لامپ فقط یک دایرهٔ روشن است، نه «مدار روشن شد». */}
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
                /* گودی هم‌قدِ خودِ خانه: ارتفاعِ ثابت روی گوشی که خانه‌ها
                   بلندتر شدند، یک نوارِ کوتاه وسطِ کادر می‌ساخت. */
                height={slot.halfHeight * 2}
                color={gapColor(theme, state, seated)}
                floor={theme.wellFloor}
                lit={state === "correct" || state === "checking"}
              />
            );
          })}

          <Energy points={chain.points} phase={phase} theme={theme} />
        </>
      )}

      {power && <Battery x={power.x} y={h - power.y} theme={theme} envMap={envMap} />}
      {lamp && (
        <Bulb
          x={lamp.x}
          y={h - lamp.y}
          state={lampState}
          theme={theme}
          envMap={envMap}
          animating={animating}
        />
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
        /* بدونِ تُن‌مپینگ، رشتهٔ داغ و لبه‌های نورانی صاف به سفیدِ سوخته
           می‌زنند و همان ظاهرِ «هالهٔ بژ» برمی‌گردد. ACES نگهشان می‌دارد. */
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <CameraRig />
        <SceneBody {...props} animating={animating} />
      </Canvas>
    </div>
  );
}
