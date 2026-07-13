"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, AnimatePresence } from "motion/react";
import * as THREE from "three";
import type { JasoosLevel, Suspect as SuspectType, SuspectRole } from "@/lib/jasoos-data";
import PlayerRig, { Bounds } from "./PlayerRig";
import Suspect3D, { Suspect3DState } from "./Suspect3D";
import TouchJoystick from "./TouchJoystick";
import GunHud from "./GunHud";
import Crosshair from "./Crosshair";

const SUSPECT_POSITIONS: [number, number, number][] = [
  [-1.8, 0, -3],
  [-0.6, 0, -3],
  [0.6, 0, -3],
  [1.8, 0, -3],
];

const bounds: Bounds = { minX: -1.6, maxX: 1.6, minZ: -1, maxZ: 2.1 };
const spawn: [number, number, number] = [0, 0, 1.6];

function RoomScene({
  level,
  onResult,
}: {
  level: JasoosLevel;
  onResult: (correct: boolean, spy: SuspectType) => void;
}) {
  const [isTouch, setIsTouch] = useState(false);
  const [locked, setLocked] = useState(false);
  const [shots, setShots] = useState(0);
  const [shotRole, setShotRole] = useState<SuspectRole | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const moveVectorRef = useRef({ x: 0, y: 0 });
  const lookVectorRef = useRef({ x: 0, y: 0 });
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const hitMapRef = useRef<Map<THREE.Object3D, SuspectRole>>(new Map());
  const raycaster = useRef(new THREE.Raycaster());
  const resultRef = useRef<"correct" | "wrong" | null>(null);

  const spy = level.suspects.find((s) => s.isSpy)!;

  useEffect(() => {
    // reading matchMedia requires the browser and can't be computed during
    // the (possibly server) render, so the initial value is set here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(
      () => onResult(result === "correct", spy),
      result === "correct" ? 1500 : 2600,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const registerHit = useCallback((object: THREE.Object3D, role: SuspectRole) => {
    hitMapRef.current.set(object, role);
  }, []);

  const handleShoot = useCallback(() => {
    if (resultRef.current) return;
    const camera = cameraRef.current;
    if (!camera) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    raycaster.current.set(camera.position, dir);
    const objects = Array.from(hitMapRef.current.keys());
    const hits = raycaster.current.intersectObjects(objects, true);
    if (!hits.length) return;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && obj.userData.role === undefined) obj = obj.parent;
    if (!obj) return;
    const role = obj.userData.role as SuspectRole;
    const suspect = level.suspects.find((s) => s.role === role);
    if (!suspect) return;
    setShots((s) => s + 1);
    setShotRole(role);
    setResult(suspect.isSpy ? "correct" : "wrong");
  }, [level.suspects]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleShoot]);

  const onCanvasCapture = useCallback(() => {
    if (!isTouch && !locked) {
      canvasElRef.current?.requestPointerLock();
      return;
    }
    handleShoot();
  }, [isTouch, locked, handleShoot]);

  const stateFor = (suspect: SuspectType): Suspect3DState => {
    if (!result) return "idle";
    if (suspect.role !== shotRole) return "dimmed";
    return result === "correct" ? "shot-correct" : "shot-wrong";
  };

  const positions = useMemo(() => SUSPECT_POSITIONS.slice(0, level.suspects.length), [level]);

  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden glass select-none">
      <Canvas
        shadows
        camera={{ fov: 68, near: 0.1, far: 40 }}
        onCreated={(state) => {
          cameraRef.current = state.camera;
          canvasElRef.current = state.gl.domElement;
        }}
      >
        <fog attach="fog" args={["#05060a", 4, 14]} />
        <color attach="background" args={["#05060a"]} />
        <ambientLight intensity={0.22} />
        <spotLight
          position={[0, 4.2, -1.5]}
          angle={0.65}
          penumbra={0.6}
          intensity={55}
          color="#ecd9a0"
          castShadow
        />
        <pointLight position={[0, 1.8, 2]} intensity={4} distance={6} color="#3a4a6b" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#0d0f16" />
        </mesh>
        <mesh position={[0, 1.3, -3.6]}>
          <boxGeometry args={[6, 2.6, 0.2]} />
          <meshStandardMaterial color="#12141d" />
        </mesh>
        <mesh position={[0, 1.3, 2.2]}>
          <boxGeometry args={[6, 2.6, 0.2]} />
          <meshStandardMaterial color="#0f1119" />
        </mesh>

        {level.suspects.map((s, i) => (
          <Suspect3D
            key={s.role}
            role={s.role}
            isSpy={s.isSpy}
            position={positions[i]}
            state={stateFor(s)}
            registerHit={registerHit}
          />
        ))}

        <PlayerRig
          bounds={bounds}
          spawn={spawn}
          spawnYaw={0}
          moveVectorRef={moveVectorRef}
          lookVectorRef={lookVectorRef}
          onLockChange={setLocked}
        />
      </Canvas>

      {/* verse card */}
      <div className="pointer-events-none absolute top-3 sm:top-6 inset-x-3 sm:inset-x-10 z-20">
        <div className="glass rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center">
          <span className="inline-block mb-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
            {level.category === "دستوری" ? "نقش دستوری" : "آرایه‌ی ادبی"}
          </span>
          <p className="text-sm sm:text-lg font-semibold leading-loose">{level.verseLines[0]}</p>
          <p className="text-sm sm:text-lg font-semibold leading-loose">{level.verseLines[1]}</p>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-1">
            جاسوس کدام است؟ نشانه بگیر و شلیک کن.
          </p>
        </div>
      </div>

      <Crosshair />
      <GunHud shots={shots} />

      {/* click-to-look / shoot capture (desktop) */}
      {!isTouch && (
        <button
          type="button"
          onClick={onCanvasCapture}
          className="absolute inset-0 z-10"
          aria-label={locked ? "شلیک" : "فعال‌سازی نگاه با موس"}
        />
      )}
      {!isTouch && !locked && (
        <div className="pointer-events-none absolute bottom-24 sm:bottom-28 inset-x-0 z-20 flex justify-center">
          <span className="glass rounded-full px-4 py-2 text-xs sm:text-sm font-medium">
            کلیک کن تا نگاه با موس فعال بشه، بعد دوباره کلیک کن یا Space بزن تا شلیک کنی
          </span>
        </div>
      )}

      {/* mobile controls */}
      {isTouch && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-between px-4 sm:px-8">
            <TouchJoystick vectorRef={moveVectorRef} label="حرکت" />
            <TouchJoystick vectorRef={lookVectorRef} label="نگاه" />
          </div>
          <button
            type="button"
            onClick={handleShoot}
            className="absolute bottom-24 right-6 z-20 size-16 rounded-full bg-destructive/85 text-white
              font-bold text-sm shadow-lg active:scale-90 transition-all"
          >
            شلیک
          </button>
        </>
      )}

      {/* feedback overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className={`glass rounded-2xl px-5 py-4 sm:px-8 sm:py-6 max-w-md text-center border-2 ${
                result === "correct" ? "border-primary" : "border-destructive"
              }`}
            >
              <p
                className={`text-lg sm:text-2xl font-bold mb-2 ${
                  result === "correct" ? "text-primary" : "text-destructive"
                }`}
              >
                {result === "correct" ? "زدیش! جاسوس همین بود." : "اشتباه زدی!"}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {result === "correct"
                  ? spy.evidence
                  : `این یکی بی‌گناه بود. جاسوسِ واقعی «${spy.role}» بود: ${spy.evidence}`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoomScene;
