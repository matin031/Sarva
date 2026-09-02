"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type RootState,
} from "@react-three/fiber";
// AdaptiveDpr و PerformanceMonitor هر دو عمداً حذف شده‌اند: هر دو همان یک
// دستگیرهٔ dpr را می‌چرخانند و هر چرخش یعنی three.js بافرِ ترسیمِ GPU را
// دوباره تخصیص می‌دهد. پروفایلِ واقعی نشان داد این وسطِ اسکرولِ موبایل اتفاق
// می‌افتد — دقیقاً بدترین لحظه. جایشان را ./quality گرفته که یک بار تصمیم
// می‌گیرد و بعد قفل می‌شود.
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { planetSlots, type Slot } from "./planetSlots";
import type { PlanetKind } from "./planetKind";
import { galaxyClock } from "./scheduler";
import type { QualityProfile } from "./quality";

/** ONE canvas, ONE scene, ZERO DOM reads per frame.
 *
 *  This replaces drei's <View>. <View> is lovely to use, but internally it calls
 *  `track.current.getBoundingClientRect()` inside useFrame — once per view, on
 *  every single frame. Because other work on the page dirties style during
 *  scrolling, that read lands on an invalidated layout and the browser has to
 *  recompute it synchronously; DevTools reports exactly that as "Forced reflow",
 *  and the call it blames is R3F's `loop`.
 *
 *  Here the planets live in a single orthographic scene where one world unit is
 *  one CSS pixel. Their positions come from two cached numbers — the slot's
 *  document coordinates, measured once per layout change, and the page's scroll
 *  offset, captured by a passive scroll listener. The frame loop is pure
 *  arithmetic. */

// ---- geometry shared by every planet: uploaded to the GPU exactly once ----
//
// دو مجموعه، نه هفت‌تا در هفت‌تا: هندسه بینِ همهٔ سیاره‌ها مشترک است و فقط
// سطحِ کیفیت تعیین می‌کند کدام مجموعه استفاده شود. روی GPU ضعیف، کرهٔ ۳۲×۳۲
// و حلقهٔ ۶۴ ضلعی هزینهٔ رأسیِ بی‌دلیل‌اند برای چیزی که قطرش روی صفحه ۳۰۰
// پیکسل است.
const GEO = {
  high: {
    sphere: new THREE.SphereGeometry(1, 32, 32),
    atmosphere: new THREE.SphereGeometry(1, 16, 16),
    ring: new THREE.TorusGeometry(1.75, 0.045, 8, 64),
    moon: new THREE.SphereGeometry(0.17, 12, 12),
  },
  low: {
    sphere: new THREE.SphereGeometry(1, 20, 16),
    atmosphere: new THREE.SphereGeometry(1, 12, 10),
    ring: new THREE.TorusGeometry(1.75, 0.045, 6, 36),
    moon: new THREE.SphereGeometry(0.17, 8, 8),
  },
} as const;

/** The old perspective camera (fov 45 at z 4.6) showed 3.81 world units across
 *  the slot, so this is how many pixels one unit is worth. Keeping the number
 *  means the planets render at exactly the size they always did. */
const UNITS_ACROSS_SLOT = 3.81;

type Measured = { cx: number; cyDoc: number; size: number };

function Planet({
  kind,
  quality,
  seed,
}: {
  kind: PlanetKind;
  quality: QualityProfile;
  seed: number;
}) {
  /** پایین‌ترین سطح یعنی «هیچ حرکتِ تزئینی». همان پرچمی که قبلاً
   *  `prefers-reduced-motion` بود، حالا از سطحِ کیفیت می‌آید و
   *  reduced-motion هم مستقیماً به همان سطح نگاشت می‌شود. */
  const reduced = quality.tier === "low";
  const geo = quality.tier === "high" ? GEO.high : GEO.low;
  const spin = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const moonOrbit = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const atmo = useRef<THREE.Mesh>(null);

  const atmosphereMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: kind.color,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [kind.color],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: kind.color,
        transparent: true,
        opacity: 0.55,
      }),
    [kind.color],
  );
  const moonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#cfd6e6",
        roughness: 0.8,
        emissive: new THREE.Color("#8fa0c0"),
        emissiveIntensity: 0.25,
      }),
    [],
  );
  useEffect(
    () => () => {
      atmosphereMat.dispose();
      ringMat.dispose();
      moonMat.dispose();
    },
    [atmosphereMat, ringMat, moonMat],
  );

  /** Minimal idle life: a slow bob, a breathing atmosphere and a lazy axial
   *  wobble. All of it is trigonometry on the clock — no DOM reads, no new
   *  geometry, no material recompiles, so the cost per planet per frame is a
   *  handful of sin/cos calls. `seed` de-syncs the planets from each other. */
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (spin.current) spin.current.rotation.y += d * 0.18;
    if (moonOrbit.current) moonOrbit.current.rotation.y += d * 0.6;

    if (ringRef.current) {
      ringRef.current.rotation.z += d * 0.05;
      if (!reduced) {
        ringRef.current.rotation.x =
          Math.PI / 2.6 + Math.sin(t * 0.4 + seed) * 0.07;
      }
    }

    if (lean.current) {
      // state.pointer comes from R3F's cached pointer state — not a DOM read
      const k = 1 - Math.pow(0.004, d);
      const wobbleX = reduced ? 0 : Math.sin(t * 0.45 + seed) * 0.055;
      const wobbleY = reduced ? 0 : Math.cos(t * 0.33 + seed) * 0.055;
      lean.current.rotation.x +=
        (-state.pointer.y * 0.22 + wobbleX - lean.current.rotation.x) * k;
      lean.current.rotation.y +=
        (state.pointer.x * 0.22 + wobbleY - lean.current.rotation.y) * k;
      // local units, so the drift scales with the planet
      if (!reduced) lean.current.position.y = Math.sin(t * 0.7 + seed) * 0.09;
    }

    if (atmo.current && !reduced) {
      const pulse = Math.sin(t * 1.05 + seed);
      atmo.current.scale.setScalar(1.14 + pulse * 0.035);
      // reached through the mesh rather than the memoised binding, so the frame
      // loop only ever touches scene objects it owns
      const mat = atmo.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + pulse * 0.045;
    }
  });

  return (
    <group ref={lean}>
      <mesh ref={spin} geometry={geo.sphere} dispose={null}>
        {/* ⚠️ MeshDistortMaterial یک شیدرِ رأسی با نویزِ سه‌بعدی است و روی
            GPU ضعیف گران‌ترین چیزِ صحنه. فقط در بالاترین سطح می‌ماند؛
            پایین‌تر همان کره با متریالِ استاندارد کشیده می‌شود و تفاوت در
            حرکتِ آرامِ سطح است، نه در شکل یا رنگ. */}
        {!quality.distort ? (
          <meshStandardMaterial
            color={kind.color}
            roughness={0.55}
            metalness={0.35}
            emissive={kind.color}
            emissiveIntensity={0.18}
          />
        ) : (
          <MeshDistortMaterial
            color={kind.color}
            distort={kind.distort ?? 0.2}
            speed={0.8}
            roughness={0.55}
            metalness={0.35}
            emissive={kind.color}
            emissiveIntensity={0.18}
          />
        )}
      </mesh>

      {/* پوستهٔ جوّ با ترکیبِ افزایشی روی خودِ کره کشیده می‌شود، یعنی همان
          پیکسل‌ها دو بار رنگ می‌شوند. روی پایین‌ترین سطح — که اصلاً تپشی هم
          ندارد — این overdraw هیچ چیزی اضافه نمی‌کند و برداشته می‌شود. */}
      {!reduced && (
        <mesh
          ref={atmo}
          scale={1.14}
          geometry={geo.atmosphere}
          material={atmosphereMat}
          dispose={null}
        />
      )}

      {kind.ring && (
        <mesh
          ref={ringRef}
          rotation={[Math.PI / 2.6, 0, 0.35]}
          geometry={geo.ring}
          material={ringMat}
          dispose={null}
        />
      )}

      {kind.moon && (
        <group ref={moonOrbit} rotation={[0.4, 0, 0.2]}>
          <mesh
            position={[1.95, 0, 0]}
            geometry={geo.moon}
            material={moonMat}
            dispose={null}
          />
        </group>
      )}
    </group>
  );
}

/**
 * ستاره‌ها — حالا داخلِ همین صحنه، نه یک canvas دوم.
 *
 * ⚠️ چرا جابه‌جا شد: صفحه دو canvas تمام‌صفحه داشت که هرکدام حلقهٔ خودش را
 * داشت و مستقلاً repaint می‌شد. حتی وقتی هزینهٔ خودِ ستاره‌ها کم بود، دو
 * لایهٔ ترکیبِ هم‌اندازهٔ viewport روی هم هزینهٔ ثابتِ هر فریمِ اسکرول بودند.
 *
 * اینجا یک `THREE.Points` است با هندسه‌ای که *یک بار* ساخته می‌شود. حرکت،
 * نوشتنِ مستقیم روی همان بافر است — بدونِ ساختِ آرایه یا شیء در حلقه.
 */
/**
 * مولدِ عددِ شبه‌تصادفیِ قطعی (mulberry32).
 *
 * ⚠️ چرا `Math.random()` نه: چیدنِ ستاره‌ها داخلِ `useMemo` انجام می‌شود،
 * یعنی حینِ رندر. `Math.random()` یک تابعِ ناخالص است و کامپایلرِ ری‌اکت
 * درست به همین دلیل به آن ایراد می‌گیرد — رندر باید برای ورودیِ یکسان
 * خروجیِ یکسان بدهد، وگرنه یک رندرِ دوباره (که ری‌اکت هر وقت بخواهد انجام
 * می‌دهد) کلِ آسمان را جابه‌جا می‌کند.
 *
 * با یک دانهٔ ثابت، آسمان هر بار دقیقاً همان است.
 */
function makeRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Stars({ quality }: { quality: QualityProfile }) {
  const { size } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  // چگالی با مساحت بالا می‌رود ولی سقف دارد، تا گوشی ارزان نشود.
  const count = useMemo(() => {
    const target = Math.round((size.width * size.height) / 14000);
    return Math.max(40, Math.min(quality.tier === "low" ? 70 : 150, target));
  }, [size.width, size.height, quality.tier]);

  const { geometry, material, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const rnd = makeRandom(0x5a2fa1);

    for (let i = 0; i < count; i++) {
      const depth = 0.3 + rnd() * 0.7;
      positions[i * 3] = (rnd() - 0.5) * size.width;
      positions[i * 3 + 1] = (rnd() - 0.5) * size.height;
      positions[i * 3 + 2] = -400;
      // رنگ به‌جای شفافیت: PointsMaterial شفافیتِ هر رأس را ندارد، ولی با
      // ترکیبِ افزایشی، رنگِ تیره‌تر دقیقاً یعنی ستارهٔ کم‌نورتر.
      const b = 0.25 + depth * 0.6;
      colors[i * 3] = b * 0.78;
      colors[i * 3 + 1] = b;
      colors[i * 3 + 2] = b * 0.96;
      spd[i] = depth;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.1,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat, speeds: spd };
  }, [count, size.width, size.height]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const halfH = size.height / 2;

  useFrame(() => {
    // در پایین‌ترین سطح ستاره‌ها ثابت‌اند: یک بار کشیده می‌شوند و تمام.
    if (quality.starFps <= 0) return;
    const points = pointsRef.current;
    if (!points) return;
    const attr = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < speeds.length; i++) {
      const y = arr[i * 3 + 1] - speeds[i] * 0.28;
      arr[i * 3 + 1] = y < -halfH ? halfH : y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-1}
    />
  );
}

/** Places every planet each frame from cached numbers only. */
function Planets({
  slots,
  quality,
}: {
  slots: Slot[];
  quality: QualityProfile;
}) {
  const { size } = useThree();
  const groups = useRef<(THREE.Group | null)[]>([]);
  const measured = useRef<Measured[]>([]);
  /** پیشرفتِ ظاهر شدنِ هر سیاره، ۰ تا ۱. */
  const reveal = useRef<number[]>([]);
  const reduced = quality.tier === "low";

  // ---- the ONLY DOM reads: a single batch, on mount / layout change ----
  useEffect(() => {
    const measure = () => {
      const sy = window.scrollY;
      measured.current = slots.map(({ el }) => {
        const r = el.getBoundingClientRect();
        return {
          cx: r.left + r.width / 2,
          cyDoc: r.top + sy + r.height / 2,
          size: Math.min(r.width, r.height) || 1,
        };
      });
      reveal.current = slots.map((_, i) => reveal.current[i] ?? 0);
      galaxyClock.requestFrame();
    };
    // ⚠️ دیگر لازم نیست منتظرِ «نشستنِ انیمیشنِ ظاهر شدن» بمانیم و آن انتظار
    // اصلاً درست هم نبود: جعبهٔ اسلات داخلِ یک `transform: scale(0.7)` بود و
    // سیاره‌های پایینِ صفحه — که هنوز به دیدرس نرسیده بودند — با اندازهٔ ۷۰٪
    // اندازه‌گیری می‌شدند و برای همیشه کوچک می‌ماندند. حالا اسلات هیچ
    // transform ای ندارد (PlanetStop) و ظاهر شدن داخلِ خودِ صحنه انجام
    // می‌شود، پس اندازه از لحظهٔ اول درست است.
    let id = requestAnimationFrame(measure);

    // Re-measure only when the layout could actually have moved the slots, i.e.
    // when the viewport width changes. The document's height also changes as
    // sections reveal, but those animations are transform/opacity only and never
    // shift a planet, so reacting to height would re-measure for nothing.
    let lastWidth = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w === lastWidth) return;
      lastWidth = w;
      cancelAnimationFrame(id);
      id = requestAnimationFrame(measure);
    });
    ro.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [slots]);

  useFrame((_, delta) => {
    const sy = galaxyClock.scrollY;
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    const d = Math.min(delta, 0.05);

    for (let i = 0; i < groups.current.length; i++) {
      const g = groups.current[i];
      const m = measured.current[i];
      if (!g || !m) continue;

      const viewportY = m.cyDoc - sy;
      // cheap cull: skip planets the reader cannot see
      const visible = viewportY > -m.size && viewportY < size.height + m.size;
      g.visible = visible;
      if (!visible) continue;

      // ظاهر شدن، داخلِ صحنه: از ۷۰٪ به ۱۰۰٪، یک بار، وقتی سیاره واقعاً
      // دیده می‌شود. همان جلوهٔ قبلی، بدونِ دست زدن به جعبه‌ای که
      // اندازه‌گیری می‌شود.
      const r = reveal.current[i] ?? 0;
      const next = reduced ? 1 : Math.min(1, r + d * 2.4);
      reveal.current[i] = next;
      const eased = 1 - Math.pow(1 - next, 3);

      g.position.set(m.cx - halfW, halfH - viewportY, 0);
      g.scale.setScalar((m.size / UNITS_ACROSS_SLOT) * (0.7 + eased * 0.3));
    }
  });

  return (
    <>
      {slots.map((s, i) => (
        <group
          key={s.id}
          ref={(node) => {
            groups.current[i] = node;
          }}
          visible={false}
        >
          <Planet kind={s.kind} quality={quality} seed={i * 1.73} />
        </group>
      ))}
    </>
  );
}

/**
 * پلِ میانِ زمان‌بندِ مرکزی و R3F.
 *
 * Canvas روی `frameloop="demand"` است، یعنی خودش هیچ فریمی نمی‌کشد. هر فریم
 * از اینجا و فقط با یک `invalidate()` درخواست می‌شود. نتیجه: وقتی کاربر
 * متنی را می‌خواند و اسکرول نمی‌کند، WebGL به‌جای ۶۰ بار در ثانیه، در
 * بالاترین سطح ۳۰ بار و در پایین‌ترین سطح *اصلاً* رندر نمی‌شود.
 */
function FrameDriver({ quality }: { quality: QualityProfile }) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    galaxyClock.setIdleFps(quality.idleFps);
    const unsubscribe = galaxyClock.subscribe(() => invalidate());
    return () => {
      unsubscribe();
    };
  }, [invalidate, quality.idleFps]);

  return null;
}

export default function GalaxyScene({
  eventSource,
  quality,
}: {
  eventSource: RefObject<HTMLElement | null>;
  quality: QualityProfile;
}) {
  // Re-read the registry only when a planet actually mounts or unmounts.
  const version = useSyncExternalStore(
    planetSlots.subscribe,
    planetSlots.getVersion,
    () => 0,
  );
  const slots = useMemo(() => planetSlots.list(), [version]);

  /** A WebGL context can be taken away at any time — the GPU process restarts,
   *  the driver resets, a laptop switches adapters, or the browser reclaims
   *  memory. By default the canvas then goes permanently black.
   *
   *  Calling preventDefault() on `webglcontextlost` is what tells the browser we
   *  intend to recover; without it no `webglcontextrestored` is ever dispatched.
   *  On restore we force a frame so the scene reappears instead of staying
   *  blank. Both paths log, so if it happens again there is a breadcrumb. */
  const onCreated = useCallback(({ gl, invalidate }: RootState) => {
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      console.warn(
        "[galaxy] WebGL context lost — recovery requested, scene will restore.",
      );
    };
    const onRestored = () => {
      console.info("[galaxy] WebGL context restored.");
      gl.resetState();
      invalidate();
      galaxyClock.requestFrame();
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    cleanupRef.current = () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, []);

  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 500], zoom: 1, near: 1, far: 2000 }}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      // ⚠️ یک عددِ ثابت، نه یک بازه. دادنِ `[min, max]` به R3F اجازه می‌دهد
      // در زمانِ اجرا جابه‌جا شود، و هر جابه‌جایی یک reallocation است.
      dpr={quality.dpr}
      gl={{
        antialias: false,
        alpha: true,
        // Deliberately NOT "high-performance". That hint asks the browser for
        // the discrete GPU, and on hybrid-graphics laptops the resulting GPU
        // switch is a documented cause of "THREE.WebGLRenderer: Context Lost".
        // This is a decorative background scene; the default adapter is the
        // right one to ask for, and it keeps us off a contended GPU.
        powerPreference: "default",
        stencil: false,
        depth: true,
        // a lost context is recoverable, but only if we never assumed otherwise
        preserveDrawingBuffer: false,
      }}
      onCreated={onCreated}
      // R3F tracks its container with react-use-measure, which by default
      // re-reads getBoundingClientRect on every scroll (debounced). This canvas
      // is position:fixed and fills the viewport, so its box cannot change when
      // the page scrolls — turning scroll tracking off removes the last
      // layout read that happened while scrolling.
      resize={{ scroll: false, debounce: { scroll: 0, resize: 50 } }}
      /** هیچ فریمی خودبه‌خود کشیده نمی‌شود؛ همه از FrameDriver می‌آیند. */
      frameloop="demand"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
      // above the cable (z-0) so the wire passes behind the planets, and below
      // the briefing panels (z-20). scene-fade-in keeps the deferred mount from
      // popping in.
      className="z-10 scene-fade-in"
    >
      <FrameDriver quality={quality} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[-300, 300, 500]} intensity={2.8} />
      <Stars quality={quality} />
      <Planets slots={slots} quality={quality} />
    </Canvas>
  );
}
