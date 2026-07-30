"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Figure3D, { type FigureMood } from "@/components/UI/jasoos/Figure3D";
import type { SuspectRole } from "@/lib/jasoos-data";

export type LineupSuspect = {
  role: SuspectRole;
  isSpy: boolean;
  wordInVerse?: string;
};

/** Where the crosshair meets the floor of the scene.
 *
 *  The pointer is already in normalised device coordinates on `state.pointer`,
 *  so one unproject per frame gives the world point the heads should look at —
 *  no DOM measuring, no listeners of our own. */
function AimTracker({ target }: { target: THREE.Vector3 }) {
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.6),
    [],
  );
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    ray.setFromCamera(state.pointer, state.camera);
    if (ray.ray.intersectPlane(plane, hit)) target.lerp(hit, 0.25);
  });
  return null;
}

/** Camera shake, fired by bumping `kick`. */
function Shake({ kick }: { kick: number }) {
  const { camera } = useThree();
  const base = useRef(new THREE.Vector3());
  const life = useRef(0);
  const seen = useRef(kick);

  useFrame((_, dt) => {
    if (kick !== seen.current) {
      seen.current = kick;
      base.current.copy(camera.position);
      life.current = 0.42;
    }
    if (life.current <= 0) return;
    life.current -= dt;
    const k = Math.max(0, life.current) / 0.42;
    const a = k * k * 0.16;
    camera.position.set(
      base.current.x + (Math.random() - 0.5) * a,
      base.current.y + (Math.random() - 0.5) * a,
      base.current.z + (Math.random() - 0.5) * a * 0.4,
    );
    if (life.current <= 0) camera.position.copy(base.current);
  });
  return null;
}

/** The muzzle flash: a light that blooms for a few frames and dies. */
function MuzzleFlash({ kick }: { kick: number }) {
  const light = useRef<THREE.PointLight>(null);
  const life = useRef(0);
  const seen = useRef(kick);

  useFrame((_, dt) => {
    if (kick !== seen.current) {
      seen.current = kick;
      life.current = 0.16;
    }
    const l = light.current;
    if (!l) return;
    if (life.current > 0) life.current -= dt;
    const k = Math.max(0, life.current) / 0.16;
    l.intensity = k * 26;
  });

  return <pointLight ref={light} position={[0, 1.2, 5.2]} color="#ffd9a0" intensity={0} distance={14} />;
}

/** Dust hanging in the spotlight. Points, one draw call, drifting upward. */
function Dust({ count = 90 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 9;
      a[i * 3 + 1] = Math.random() * 3.4;
      a[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
    }
    return a;
  }, [count]);

  useFrame((_, dt) => {
    const p = points.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] += dt * 0.14;
      if (arr[i] > 3.4) arr[i] = 0;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#cfe9ff"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Scene({
  suspects,
  shotIndex,
  result,
  onShoot,
  kick,
}: {
  suspects: LineupSuspect[];
  shotIndex: number | null;
  result: "correct" | "wrong" | null;
  onShoot: (i: number) => void;
  kick: number;
}) {
  const [aimed, setAimed] = useState<number | null>(null);
  const aimTarget = useMemo(() => new THREE.Vector3(0, 1.4, 0.6), []);

  const n = suspects.length;
  const spread = n > 4 ? 1.55 : 1.75;

  const moodFor = (i: number, s: LineupSuspect): FigureMood => {
    if (result && i === shotIndex) return result === "correct" ? "dead" : "calm";
    // the spy only drops the mask once an innocent has been shot
    if (result === "wrong" && s.isSpy) return "smug";
    if (!result && aimed === i) return "scared";
    return "calm";
  };

  return (
    <>
      <AimTracker target={aimTarget} />
      <Shake kick={kick} />
      <MuzzleFlash kick={kick} />

      {/* interrogation lighting: one hard key from above, a cool fill */}
      <ambientLight intensity={0.7} />
      <spotLight
        position={[0, 6.2, 2.4]}
        angle={0.75}
        penumbra={0.85}
        intensity={120}
        distance={22}
        color="#dff6ff"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0012}
      />
      <directionalLight position={[-4, 3, 4]} intensity={0.5} color="#8fd6d2" />
      {result === "wrong" && (
        <pointLight position={[0, 1.8, 3]} color="#ef4444" intensity={7} distance={12} />
      )}

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial color="#0e1b26" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* back wall, just enough to catch the light and give the room a bottom */}
      <mesh position={[0, 3.4, -3.2]} receiveShadow>
        <planeGeometry args={[26, 9]} />
        <meshStandardMaterial color="#0b1620" roughness={1} />
      </mesh>

      <Dust />

      {suspects.map((s, i) => {
        const x = (i - (n - 1) / 2) * spread;
        const mood = moodFor(i, s);
        return (
          <group key={i} position={[x, 0, 0]}>
            <Figure3D
              seed={i}
              mood={mood}
              aimTarget={aimTarget}
              accent="#00b3ad"
              bodyColor={
                result && i === shotIndex
                  ? result === "correct"
                    ? "#7f1d1d"
                    : "#a16207"
                  : mood === "smug"
                    ? "#7f2230"
                    : result
                      ? "#2b4152"
                      : "#3d5a6c"
              }
              onPointerOver={() => !result && setAimed(i)}
              onPointerOut={() => setAimed((v) => (v === i ? null : v))}
              onClick={() => !result && onShoot(i)}
            />

            {/* the role, as real DOM inside the scene — Persian type stays
                Persian, and it scales with distance like part of the world */}
            <Html position={[0, -0.3, 0.2]} center distanceFactor={12}>
              <div className=" pointer-events-none flex flex-col items-center gap-1">
                <span className=" whitespace-nowrap rounded-full bg-black/55 px-3 py-1 text-[13px] font-bold text-white backdrop-blur-sm">
                  {s.role}
                </span>
                {result && (
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      s.wordInVerse
                        ? "bg-primary/85 text-white"
                        : "bg-destructive/85 text-white"
                    }`}
                  >
                    {s.wordInVerse ?? "در بیت نیست"}
                  </span>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/** The 3D line-up.
 *
 *  A real scene: a floor, a back wall, a hard spotlight from above, dust in the
 *  beam, solid figures that cast shadows and turn their heads to follow the
 *  crosshair. Aiming is a raycast against each figure's hull, which is why a
 *  suspect can never be un-clickable — there are no overlapping boxes to steal
 *  the hit, only geometry.
 *
 *  Cost control follows the galaxy's rules: a capped dpr, `powerPreference:
 *  "high-performance"` left off, and the loop stopped whenever the canvas is
 *  scrolled out of view. */
export default function Lineup3D({
  suspects,
  shotIndex,
  result,
  onShoot,
}: {
  suspects: LineupSuspect[];
  shotIndex: number | null;
  result: "correct" | "wrong" | null;
  onShoot: (i: number) => void;
}) {
  const [kick, setKick] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  const shoot = useCallback(
    (i: number) => {
      setKick((k) => k + 1);
      onShoot(i);
    },
    [onShoot],
  );

  const onCreated = useCallback(({ gl }: RootState) => {
    const canvas = gl.domElement;
    // preventDefault is required, or the browser never fires the restore event
    const onLost = (e: Event) => e.preventDefault();
    const onRestored = () => gl.resetState();
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
  }, []);

  const attach = useCallback((node: HTMLDivElement | null) => {
    wrapper.current = node;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(node);
  }, []);

  return (
    <div
      ref={attach}
      className=" relative h-[340px] w-full overflow-hidden rounded-2xl bg-[#0b1620] sm:h-[420px]"
    >
      <Canvas
        shadows
        dpr={[1, 1.6]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 2.1, 6.4], fov: 42, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={onCreated}
      >
        <color attach="background" args={["#0b1620"]} />
        <fog attach="fog" args={["#0b1620", 7, 16]} />
        <Scene
          suspects={suspects}
          shotIndex={shotIndex}
          result={result}
          onShoot={shoot}
          kick={kick}
        />
      </Canvas>

      {/* vignette, so the eye is pulled to the middle of the room */}
      <div
        aria-hidden
        className=" pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
