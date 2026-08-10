"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import Suspect, { SuspectVisualState } from "./Suspect";
import { PointerProvider } from "@/components/UI/jasoos/pointer";
import Reticle from "./Reticle";

function ShootingScene({
  level,
  onResult,
}: {
  level: JasoosLevel;
  onResult: (correct: boolean, spy: SuspectType, chosen: SuspectType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shotIndex, setShotIndex] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const dingRef = useRef<HTMLAudioElement | null>(null);


  /* The crosshair's position is a pair of MotionValues, so moving the mouse
     writes a transform instead of re-rendering the scene and all four
     suspects. `visible` stays state — it flips twice a session, not per pixel. */
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const [aiming, setAiming] = useState(false);

  const spy = level.suspects.find((s) => s.isSpy)!;
  const chosen = shotIndex !== null ? level.suspects[shotIndex] : spy;

  const handleMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    rx.set(e.clientX - rect.left);
    ry.set(e.clientY - rect.top);
    if (!aiming) setAiming(true);
  };

  const handleShoot = (suspect: SuspectType, index: number) => {
    if (result) return;
    setShotIndex(index);
    setResult(suspect.isSpy ? "correct" : "wrong");
    setModalOpen(true);
    if (suspect.isSpy && dingRef.current) {
      dingRef.current.currentTime = 0;
      dingRef.current.play().catch(() => {});
    }
  };

  const stateFor = (index: number): SuspectVisualState => {
    if (!result) return "idle";
    if (index !== shotIndex) return "dimmed";
    return result === "correct" ? "shot-correct" : "shot-wrong";
  };

  return (
    <PointerProvider>
    <div className="flex flex-col items-center">
      <div
        dir="rtl"
        ref={containerRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setAiming(false)}
        className={`jasoos-room relative z-20 w-full select-none overflow-hidden rounded-2xl shadow-sm ${
          result ? "" : "sm:cursor-none"
        }`}
      >
        {/* ---------- اتاق بازجویی ----------
            قبلاً مظنون‌ها روی یک پنلِ تخت می‌ایستادند و هیچ‌جا نبودند. سه لایه
            کافی است تا اتاق ساخته شود و هیچ‌کدام تصویر نیستند: دیوار، نورِ
            چراغِ سقفی که مخروطی روی کف می‌افتد، و کفی که در افق محو می‌شود. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0c111b_0%,#141c2b_74%,#0a0e16_75%,#070a10_100%)]" />
          {/* مخروط نور از سقف */}
          <div
            className="absolute left-1/2 top-0 h-[72%] w-[85%] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklch, var(--color-gold) 16%, transparent), transparent 78%)",
              clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)",
            }}
          />
          {/* لکهٔ نور روی کف، دقیقاً زیر صف مظنون‌ها */}
          <div
            className="absolute bottom-[12%] left-1/2 h-24 w-[80%] -translate-x-1/2 rounded-[100%] opacity-50"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 26%, transparent), transparent)",
            }}
          />
          <div className="jasoos-dust absolute inset-0 opacity-[0.05]" />
          <div
            className="absolute inset-0"
            style={{ boxShadow: "inset 0 0 120px 30px rgba(0,0,0,0.6)" }}
          />
        </div>

        {/* verse card */}
        <div className="xs:w-[90%] relative z-20 mx-auto mt-6 w-[98%] rounded-xl border border-white/10 bg-black/35 backdrop-blur-sm">
          <div className="sm:w-[70%] mx-auto rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center">
            <span className="inline-block mb-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {level.category === "دستوری" ? "نقش دستوری" : "آرایه‌ی ادبی"}
            </span>
            {level.contentType === "poem" ? (
              <>
                <p className="text-sm w-full sm:text-lg font-semibold leading-loose">
                  {level.verseLines[0]}
                </p>
                <p className="text-sm w-full sm:text-lg font-semibold leading-loose">
                  {level.verseLines[1]}
                </p>
              </>
            ) : (
              <p className="text-sm w-full sm:text-lg font-semibold leading-relaxed text-justify">
                {level.verseLines.join(" ")}
              </p>
            )}
            <p className="text-[11px] sm:text-sm text-muted-foreground mt-1">
              جاسوس کدام است؟ نقشی را که در این{" "}
              {level.contentType === "poem" ? "بیت" : "جمله"} وجود ندارد نشانه
              بگیر
            </p>
          </div>
        </div>

        {/* suspects lineup — a shallow 3D stage. Each suspect sits at its own
            translateZ, so the tilt separates the line-up into depth instead of
            sliding it as one flat sheet. */}
        <div className="relative inset-x-0 z-30 mt-6 px-2 py-12">
        {/* No pointer-driven tilt here. Rotating the whole line-up with the
            mouse moved every suspect — including the fixed hit layer inside
            each one — so the figure under the crosshair slid out from under it
            and the enter/leave pair fired forever. A stable hit target is
            worthless if its container is the thing that moves. */}
        <motion.div
          className=" flex items-end justify-center gap-x-3 xs:gap-x-6 sm:gap-x-12"
          animate={
            result === "wrong"
              ? { x: [0, -10, 10, -6, 6, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.45 }}
        >
          {level.suspects.map((s, i) => (
            <Suspect
              key={i}
              index={i}
              role={s.role}
              state={stateFor(i)}
              wordInVerse={s.wordInVerse}
              isSpy={s.isSpy}
              /* the spy only lets the mask slip once someone else has been
                 shot — before that, giving them a smirk would give the game
                 away */
              gloat={result === "wrong"}
              onShoot={() => handleShoot(s, i)}
            />
          ))}
        </motion.div>
        </div>

        <Reticle x={rx} y={ry} visible={aiming && !result} />

        {/* feedback overlay — user must close it themselves */}
        <AnimatePresence>
          {result && modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 bg-black/40"
            >
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative glass rounded-2xl px-5 py-4 sm:px-8 sm:py-6 max-w-md text-center border-2 ${
                  result === "correct" ? "border-primary" : "border-destructive"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="بستن"
                  className="absolute top-3 left-3 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <p
                  className={`text-lg sm:text-2xl font-bold mb-2 ${
                    result === "correct" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {result === "correct"
                    ? "زدیش! جاسوس همین بود"
                    : "!اشتباه زدی"}
                </p>
                <p
                  dir="rtl"
                  className="text-sm sm:text-base text-muted-foreground leading-relaxed"
                >
                  {result === "correct"
                    ? spy.evidence
                    : `این یکی بی‌گناه بود. جاسوسِ واقعی «${spy.role}» بود: ${spy.evidence}`}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <audio ref={dingRef} src="/currectsound.mp3" preload="auto" />
      </div>

      {/* only shown once the user has closed the feedback modal and can see everyone's role */}
      <AnimatePresence>
        {result && !modalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex justify-center"
          >
            <button
              type="button"
              onClick={() => onResult(result === "correct", spy, chosen)}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base"
            >
              {result === "correct" ? "پرونده‌ی بعد" : "ادامه"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PointerProvider>
  );
}

export default ShootingScene;
