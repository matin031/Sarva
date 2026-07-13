"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { JASOOS_LEVELS } from "@/lib/jasoos-data";
import type { Suspect as SuspectType } from "@/lib/jasoos-data";
import CorridorScene from "./CorridorScene";
import RoomScene from "./RoomScene";

type Screen = "intro" | "map" | "scene" | "gameover" | "win";

function JasoosGame() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [levelIndex, setLevelIndex] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [missedSpy, setMissedSpy] = useState<SuspectType | null>(null);

  const level = JASOOS_LEVELS[levelIndex];

  const restart = () => {
    setClearedCount(0);
    setLevelIndex(0);
    setMissedSpy(null);
    setScreen("map");
  };

  const handleResult = (correct: boolean, spy: SuspectType) => {
    if (correct) {
      const nextCleared = clearedCount + 1;
      setClearedCount(nextCleared);
      if (nextCleared >= JASOOS_LEVELS.length) {
        setScreen("win");
      } else {
        setScreen("map");
      }
    } else {
      setMissedSpy(spy);
      setScreen("gameover");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto my-10 sm:my-16">
      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl p-6 sm:p-12 text-center"
          >
            <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-primary">
              جاسوسِ نقش‌ها
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-4">
              وارد مدرسه شو و توی راهرو راه برو. پشتِ هر در، یک بیت و چهار نفر
              منتظرت هستند؛ هرکدام مدعیِ یک نقشِ دستوری یا آرایه‌ی ادبی‌اند. سه
              نفرشان راست می‌گویند، اما یکی‌شان جاسوس است: نقشی را ادعا می‌کند
              که در آن بیت اصلاً وجود ندارد. با دقت به بیت نگاه کن، جاسوس را
              نشانه بگیر و شلیک کن. یک اشتباه، یعنی باخت!
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground/80 max-w-xl mx-auto leading-relaxed mb-8">
              کنترل روی دسکتاپ: حرکت با W A S D، نگاه با موس (اول کلیک کن تا
              فعال بشه)، شلیک با کلیک یا Space. روی موبایل: دو جوی‌استیک لمسی
              برای حرکت و نگاه، و دکمه‌ی شلیک.
            </p>
            <button
              onClick={() => setScreen("map")}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              شروع بازی
            </button>
          </motion.div>
        )}

        {screen === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CorridorScene
              levels={JASOOS_LEVELS}
              clearedCount={clearedCount}
              onEnter={() => {
                setLevelIndex(clearedCount);
                setScreen("scene");
              }}
            />
          </motion.div>
        )}

        {screen === "scene" && (
          <motion.div
            key={`scene-${level.id}`}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <RoomScene level={level} onResult={handleResult} />
          </motion.div>
        )}

        {screen === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl p-6 sm:p-12 text-center border-2 border-destructive"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-destructive">
              باختی!
            </h2>
            {missedSpy && (
              <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-2">
                جاسوسِ واقعی «{missedSpy.role}» بود.
              </p>
            )}
            <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              {missedSpy?.evidence}
            </p>
            <p className="text-sm sm:text-base mb-6">
              تا اینجا {clearedCount} در را با موفقیت رد کردی.
            </p>
            <button
              onClick={restart}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              شروع دوباره
            </button>
          </motion.div>
        )}

        {screen === "win" && (
          <motion.div
            key="win"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl p-6 sm:p-12 text-center border-2 border-primary"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-primary">
              آفرین، جاسوس‌یاب!
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              تو همه‌ی {JASOOS_LEVELS.length} جاسوس را بدون هیچ اشتباهی پیدا
              کردی.
            </p>
            <button
              onClick={restart}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              بازی دوباره
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default JasoosGame;
