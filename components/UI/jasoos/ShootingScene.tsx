"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import Suspect, { SuspectVisualState } from "./Suspect";
import Reticle from "./Reticle";
import GunHud from "./GunHud";

function ShootingScene({
  level,
  onResult,
}: {
  level: JasoosLevel;
  onResult: (correct: boolean, spy: SuspectType, chosen: SuspectType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0, visible: false });
  const [shots, setShots] = useState(0);
  const [shotRole, setShotRole] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const dingRef = useRef<HTMLAudioElement | null>(null);

  const spy = level.suspects.find((s) => s.isSpy)!;
  const chosen = level.suspects.find((s) => s.role === shotRole) ?? spy;

  const handleMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });
  };

  const handleShoot = (suspect: SuspectType) => {
    if (result) return;
    setShots((s) => s + 1);
    setShotRole(suspect.role);
    setResult(suspect.isSpy ? "correct" : "wrong");
    setModalOpen(true);
    if (suspect.isSpy && dingRef.current) {
      dingRef.current.currentTime = 0;
      dingRef.current.play().catch(() => {});
    }
  };

  const stateFor = (suspect: SuspectType): SuspectVisualState => {
    if (!result) return "idle";
    if (suspect.role !== shotRole) return "dimmed";
    return result === "correct" ? "shot-correct" : "shot-wrong";
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setPointer((p) => ({ ...p, visible: false }))}
      className="relative w-full aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden glass select-none sm:cursor-none"
    >
      {/* dim room backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,oklch(0.3_0.03_260),oklch(0.08_0.02_260))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,transparent_20%,rgba(0,0,0,0.75)_75%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gold/60 to-transparent" />

      {/* verse card */}
      <div className="absolute top-3 sm:top-6 inset-x-3 sm:inset-x-10 z-20">
        <div className="glass rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center">
          <span className="inline-block mb-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
            {level.category === "دستوری" ? "نقش دستوری" : "آرایه‌ی ادبی"}
          </span>
          <p className="text-sm sm:text-lg font-semibold leading-loose">
            {level.verseLines[0]}
          </p>
          <p className="text-sm sm:text-lg font-semibold leading-loose">
            {level.verseLines[1]}
          </p>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-1">
            جاسوس کدام است؟ نقشی را که در این بیت وجود ندارد نشانه بگیر.
          </p>
        </div>
      </div>

      {/* suspects lineup */}
      <div className="absolute bottom-16 sm:bottom-24 inset-x-0 flex items-end justify-center gap-x-3 xs:gap-x-6 sm:gap-x-12 px-2 z-10">
        {level.suspects.map((s) => (
          <Suspect
            key={s.role}
            role={s.role}
            state={stateFor(s)}
            wordInVerse={s.wordInVerse}
            onShoot={() => handleShoot(s)}
          />
        ))}
      </div>

      <GunHud shots={shots} />
      <Reticle x={pointer.x} y={pointer.y} visible={pointer.visible && !result} />

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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
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

      {/* only shown once the user has closed the feedback modal and can see everyone's role */}
      <AnimatePresence>
        {result && !modalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 sm:bottom-6 inset-x-0 z-30 flex justify-center"
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

      <audio ref={dingRef} src="/currectsound.mp3" preload="auto" />
    </div>
  );
}

export default ShootingScene;
