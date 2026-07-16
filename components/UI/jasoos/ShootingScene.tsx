"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import Suspect, { SuspectVisualState } from "./Suspect";
import Reticle from "./Reticle";

function ShootingScene({
  level,
  onResult,
}: {
  level: JasoosLevel;
  onResult: (correct: boolean, spy: SuspectType, chosen: SuspectType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0, visible: false });
  const [shotIndex, setShotIndex] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const dingRef = useRef<HTMLAudioElement | null>(null);

  const spy = level.suspects.find((s) => s.isSpy)!;
  const chosen =
    shotIndex !== null ? level.suspects[shotIndex] : spy;

  const handleMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    });
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
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setPointer((p) => ({ ...p, visible: false }))}
        className={`relative z-20 w-full rounded-2xl overflow-hidden glass bg-popover! shadow-sm select-none ${
          result ? "" : "sm:cursor-none"
        }`}
      >
        {/* verse card */}
        <div className="w-[98%] xs:w-[90%] mt-6 mx-auto bg-secondary z-20 rounded-xl">
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

        {/* suspects lineup */}
        <div
          className="mt-6 py-12 inset-x-0 z-30
       flex items-end justify-center gap-x-3 xs:gap-x-6 sm:gap-x-12 px-2"
        >
          {level.suspects.map((s, i) => (
            <Suspect
              key={i}
              role={s.role}
              state={stateFor(i)}
              wordInVerse={s.wordInVerse}
              onShoot={() => handleShoot(s, i)}
            />
          ))}
        </div>

        <Reticle
          x={pointer.x}
          y={pointer.y}
          visible={pointer.visible && !result}
        />

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
                  {result === "correct" ? "زدیش! جاسوس همین بود" : "!اشتباه زدی"}
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
  );
}

export default ShootingScene;
