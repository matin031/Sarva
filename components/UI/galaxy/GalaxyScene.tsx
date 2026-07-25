"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type RootState,
} from "@react-three/fiber";
// AdaptiveDpr is deliberately not used: it drives the same dpr knob as the
// PerformanceMonitor ladder below, and two controllers fighting over one
// setting produced a stream of GPU buffer reallocations.
import { MeshDistortMaterial, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { planetSlots, type Slot } from "./planetSlots";
import type { PlanetKind } from "./planetKind";

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
const SPHERE_GEO = new THREE.SphereGeometry(1, 32, 32);
const ATMOSPHERE_GEO = new THREE.SphereGeometry(1, 16, 16);
const RING_GEO = new THREE.TorusGeometry(1.75, 0.045, 8, 64);
const MOON_GEO = new THREE.SphereGeometry(0.17, 12, 12);

/** The old perspective camera (fov 45 at z 4.6) showed 3.81 world units across
 *  the slot, so this is how many pixels one unit is worth. Keeping the number
 *  means the planets render at exactly the size they always did. */
const UNITS_ACROSS_SLOT = 3.81;

type Measured = { cx: number; cyDoc: number; size: number };

function Planet({
  kind,
  reduced,
  seed,
}: {
  kind: PlanetKind;
  reduced: boolean;
  seed: number;
}) {
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
      <mesh ref={spin} geometry={SPHERE_GEO} dispose={null}>
        {reduced ? (
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

      <mesh
        ref={atmo}
        scale={1.14}
        geometry={ATMOSPHERE_GEO}
        material={atmosphereMat}
        dispose={null}
      />

      {kind.ring && (
        <mesh
          ref={ringRef}
          rotation={[Math.PI / 2.6, 0, 0.35]}
          geometry={RING_GEO}
          material={ringMat}
          dispose={null}
        />
      )}

      {kind.moon && (
        <group ref={moonOrbit} rotation={[0.4, 0, 0.2]}>
          <mesh
            position={[1.95, 0, 0]}
            geometry={MOON_GEO}
            material={moonMat}
            dispose={null}
          />
        </group>
      )}
    </group>
  );
}

/** Places every planet each frame from cached numbers only. */
function Planets({ slots, reduced }: { slots: Slot[]; reduced: boolean }) {
  const { size } = useThree();
  const groups = useRef<(THREE.Group | null)[]>([]);
  const measured = useRef<Measured[]>([]);
  const scrollY = useRef(0);

  // ---- the ONLY DOM reads: a single batch, on mount / layout change ----
  useEffect(() => {
    const measure = () => {
      const sy = window.scrollY;
      scrollY.current = sy;
      measured.current = slots.map(({ el }) => {
        const r = el.getBoundingClientRect();
        return {
          cx: r.left + r.width / 2,
          cyDoc: r.top + sy + r.height / 2,
          size: Math.min(r.width, r.height) || 1,
        };
      });
    };
    // wait a frame so reveal animations have settled into their final layout
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

  // scroll position is captured once per scroll event, never inside the loop
  useEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame(() => {
    const sy = scrollY.current;
    const halfW = size.width / 2;
    const halfH = size.height / 2;
    for (let i = 0; i < groups.current.length; i++) {
      const g = groups.current[i];
      const m = measured.current[i];
      if (!g || !m) continue;
      const viewportY = m.cyDoc - sy;
      const scale = m.size / UNITS_ACROSS_SLOT;
      // cheap cull: skip planets the reader cannot see
      const visible = viewportY > -m.size && viewportY < size.height + m.size;
      g.visible = visible;
      if (!visible) continue;
      g.position.set(m.cx - halfW, halfH - viewportY, 0);
      g.scale.setScalar(scale);
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
          <Planet kind={s.kind} reduced={reduced} seed={i * 1.73} />
        </group>
      ))}
    </>
  );
}

export default function GalaxyScene({
  eventSource,
  reduced = false,
}: {
  eventSource: RefObject<HTMLElement | null>;
  reduced?: boolean;
}) {
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  /** Every dpr change makes three.js reallocate the GPU drawing buffer. The
   *  previous code nudged dpr by 0.15/0.25 on each PerformanceMonitor signal,
   *  which meant a steady stream of reallocations on exactly the weak GPUs the
   *  monitor is meant to protect. Snapping to a short ladder means at most a
   *  handful of distinct buffer sizes, and repeated signals in the same
   *  direction become no-ops once an end of the ladder is reached. */
  const LADDER = coarse ? [0.6, 0.75, 0.9, 1] : [0.75, 1, 1.25, 1.5];
  const [dprStep, setDprStep] = useState(coarse ? 1 : 1);
  const dpr = LADDER[dprStep];
  const stepDown = () => setDprStep((s) => Math.max(0, s - 1));
  const stepUp = () => setDprStep((s) => Math.min(LADDER.length - 1, s + 1));

  // Re-read the registry only when a planet actually mounts or unmounts. The
  // list must be memoised on the version: PerformanceMonitor changes dpr, which
  // re-renders this component, and a fresh array identity would otherwise
  // re-trigger the measuring effect and read the DOM again for nothing.
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
      dpr={dpr}
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
        // a lost context is recoverable, but only if we never assumed otherwise
        preserveDrawingBuffer: false,
      }}
      onCreated={onCreated}
      performance={{ min: 0.5 }}
      // R3F tracks its container with react-use-measure, which by default
      // re-reads getBoundingClientRect on every scroll (debounced). This canvas
      // is position:fixed and fills the viewport, so its box cannot change when
      // the page scrolls — turning scroll tracking off removes the last
      // layout read that happened while scrolling.
      resize={{ scroll: false, debounce: { scroll: 0, resize: 50 } }}
      frameloop={reduced ? "demand" : "always"}
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
      <PerformanceMonitor
        // a longer sampling window than the default settles instead of
        // oscillating, which matters now that each change costs a reallocation
        ms={400}
        iterations={7}
        onDecline={stepDown}
        onIncline={stepUp}
        onFallback={() => setDprStep(0)}
      />
      <ambientLight intensity={0.55} />
      <directionalLight position={[-300, 300, 500]} intensity={2.8} />
      <Planets slots={slots} reduced={reduced} />
    </Canvas>
  );
}
