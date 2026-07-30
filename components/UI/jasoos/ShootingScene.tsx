"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import dynamic from "next/dynamic";

/** three.js is ~500kB of parse work; the line-up is the only thing that needs
 *  it, so it loads with the round rather than with the page. */
const Lineup3D = dynamic(() => import("@/components/UI/jasoos/Lineup3D"), {
  ssr: false,
  loading: () => (
    <div className=" flex h-[340px] w-full items-center justify-center rounded-2xl bg-[#0b1620] sm:h-[420px]">
      <span className=" size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
    </div>
  ),
});

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

  const spy = level.suspects.find((s) => s.isSpy)!;
  const chosen = shotIndex !== null ? level.suspects[shotIndex] : spy;

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

  return (
    <div className="flex flex-col items-center">
      <div
        dir="rtl"
        ref={containerRef}
        className={`relative z-20 w-full rounded-2xl overflow-hidden glass bg-popover! shadow-sm select-none`}
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

        {/* the line-up, in three dimensions: real geometry, a spotlight, dust
            in the beam, and aiming by raycast — so no figure can be blocked by
            a neighbour's box the way the flat version could be */}
        <div className=" mt-6 px-2 pb-4">
          <Lineup3D
            suspects={level.suspects.map((s) => ({
              role: s.role,
              isSpy: s.isSpy,
              wordInVerse: s.wordInVerse,
            }))}
            shotIndex={shotIndex}
            result={result}
            onShoot={(i) => handleShoot(level.suspects[i], i)}
          />
        </div>


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
  );
}

export default ShootingScene;
