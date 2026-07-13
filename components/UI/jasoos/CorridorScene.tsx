"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { JasoosLevel } from "@/lib/jasoos-data";
import PlayerRig, { Bounds } from "./PlayerRig";
import Door3D, { DoorStatus } from "./Door3D";
import TouchJoystick from "./TouchJoystick";

const SPACING = 4;
const DOOR_Z = -2.35;

function ProximityWatcher({
  doorPositions,
  activeIndex,
  onNear,
}: {
  doorPositions: [number, number, number][];
  activeIndex: number;
  onNear: (near: boolean) => void;
}) {
  const { camera } = useThree();
  const wasNear = useRef(false);

  useFrame(() => {
    const doorPos = doorPositions[activeIndex];
    if (!doorPos) return;
    const dist = Math.hypot(camera.position.x - doorPos[0], camera.position.z - doorPos[2]);
    const near = dist < 2.3;
    if (near !== wasNear.current) {
      wasNear.current = near;
      onNear(near);
    }
  });

  return null;
}

function CorridorScene({
  levels,
  clearedCount,
  onEnter,
}: {
  levels: JasoosLevel[];
  clearedCount: number;
  onEnter: () => void;
}) {
  const [isTouch, setIsTouch] = useState(false);
  const [locked, setLocked] = useState(false);
  const [nearDoor, setNearDoor] = useState(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const moveVectorRef = useRef({ x: 0, y: 0 });
  const lookVectorRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // reading matchMedia requires the browser and can't be computed during
    // the (possibly server) render, so the initial value is set here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const doorPositions = useMemo<[number, number, number][]>(
    () => levels.map((_, i) => [i * SPACING, 0, DOOR_Z]),
    [levels],
  );

  const bounds = useMemo<Bounds>(
    () => ({
      minX: -1.6,
      maxX: (levels.length - 1) * SPACING + 1.6,
      minZ: -1.6,
      maxZ: 1.9,
    }),
    [levels.length],
  );

  const spawn = useMemo<[number, number, number]>(
    () => [Math.max(0, clearedCount - 1) * SPACING, 0, 1.4],
    [clearedCount],
  );

  const requestLock = useCallback(() => {
    if (isTouch) return;
    canvasElRef.current?.requestPointerLock();
  }, [isTouch]);

  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden glass select-none">
      <Canvas
        shadows
        camera={{ fov: 72, near: 0.1, far: 60 }}
        onCreated={(state) => {
          canvasElRef.current = state.gl.domElement;
        }}
      >
        <fog attach="fog" args={["#080b14", 6, 24]} />
        <color attach="background" args={["#080b14"]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={["#3a4a6b", "#0a0a10", 0.5]} />
        {levels.map((_, i) => (
          <pointLight
            key={i}
            position={[i * SPACING, 2.4, 0.4]}
            intensity={6}
            distance={6}
            color="#e0b23c"
          />
        ))}

        {/* floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.maxX / 2 - 0.8, 0, 0]}>
          <planeGeometry args={[bounds.maxX + 6, 6]} />
          <meshStandardMaterial color="#12151f" />
        </mesh>
        {/* back wall (doors) */}
        <mesh position={[bounds.maxX / 2 - 0.8, 1.3, -2.45]}>
          <boxGeometry args={[bounds.maxX + 6, 2.6, 0.2]} />
          <meshStandardMaterial color="#1a1e2b" />
        </mesh>
        {/* front wall */}
        <mesh position={[bounds.maxX / 2 - 0.8, 1.3, 2.45]}>
          <boxGeometry args={[bounds.maxX + 6, 2.6, 0.2]} />
          <meshStandardMaterial color="#161925" />
        </mesh>

        {levels.map((level, i) => {
          const status: DoorStatus =
            i < clearedCount ? "cleared" : i === clearedCount ? "active" : "locked";
          return <Door3D key={level.id} level={level} position={doorPositions[i]} status={status} />;
        })}

        <PlayerRig
          bounds={bounds}
          spawn={spawn}
          spawnYaw={0}
          moveVectorRef={moveVectorRef}
          lookVectorRef={lookVectorRef}
          onLockChange={setLocked}
        />
        <ProximityWatcher doorPositions={doorPositions} activeIndex={clearedCount} onNear={setNearDoor} />
      </Canvas>

      {/* instructions */}
      <div className="pointer-events-none absolute top-3 sm:top-6 inset-x-3 sm:inset-x-10 z-20 text-center">
        <div className="glass inline-block rounded-xl px-4 py-2 text-xs sm:text-sm">
          در راهرو جلو برو و به درِ درخشان نزدیک شو تا وارد بشی.
        </div>
      </div>

      {/* click-to-look capture (desktop only, until locked) */}
      {!isTouch && !locked && (
        <button
          type="button"
          onClick={requestLock}
          className="absolute inset-0 z-10 flex items-end justify-center pb-24 sm:pb-28 bg-black/10"
        >
          <span className="glass rounded-full px-4 py-2 text-xs sm:text-sm font-medium">
            برای نگاه‌کردن با موس، اینجا کلیک کن (WASD برای حرکت)
          </span>
        </button>
      )}

      {/* enter door button */}
      {nearDoor && (
        <div className="absolute bottom-6 sm:bottom-10 inset-x-0 z-20 flex justify-center">
          <button
            type="button"
            onClick={onEnter}
            className="rounded-xl bg-primary text-primary-foreground font-bold px-6 py-3 text-sm sm:text-base
              shadow-lg shadow-primary/30 active:scale-95 transition-all animate-pulse"
          >
            ورود به اتاق
          </button>
        </div>
      )}

      {/* mobile joysticks */}
      {isTouch && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-between px-4 sm:px-8">
          <TouchJoystick vectorRef={moveVectorRef} label="حرکت" />
          <TouchJoystick vectorRef={lookVectorRef} label="نگاه" />
        </div>
      )}
    </div>
  );
}

export default CorridorScene;
