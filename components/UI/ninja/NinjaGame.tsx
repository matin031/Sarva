"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { buildNinjaRound } from "@/lib/ninja-data";
import type { NinjaRound } from "@/lib/ninja-data";
import StudyTable from "./StudyTable";
import SliceField from "./SliceField";
import NinjaSettingsModal, { NinjaSettings, type NinjaDifficulty } from "./NinjaSettingsModal";

type Screen = "intro" | "settings" | "study" | "slicing" | "gameover" | "win";

const START_LIVES = 3;
const ROUND_DURATION_MS = 46000;
const MAX_WORDS = 15;
const STORAGE_KEY = "ninja-progress";

type StoredState = {
  screen: Screen;
  round: NinjaRound | null;
  lives: number;
  totalScore: number;
  lastMistake: string | null;
  difficulty?: NinjaDifficulty;
};

function NinjaGame() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [round, setRound] = useState<NinjaRound | null>(null);
  const [lives, setLives] = useState(START_LIVES);
  const [totalScore, setTotalScore] = useState(0);
  const [lastMistake, setLastMistake] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<NinjaDifficulty>("easy");
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  // resume a saved run so a mid-game refresh doesn't lose progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StoredState = JSON.parse(saved);
        if (
          parsed.screen &&
          parsed.screen !== "intro" &&
          parsed.screen !== "settings" &&
          parsed.round
        ) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setScreen(parsed.screen);
          setRound(parsed.round);
          setLives(parsed.lives ?? START_LIVES);
          setTotalScore(parsed.totalScore ?? 0);
          setLastMistake(parsed.lastMistake ?? null);
          setDifficulty(parsed.difficulty ?? "easy");
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setRestoredFromStorage(true);
  }, []);

  useEffect(() => {
    if (!restoredFromStorage) return;
    if (screen === "intro" || screen === "settings") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const data: StoredState = { screen, round, lives, totalScore, lastMistake, difficulty };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [restoredFromStorage, screen, round, lives, totalScore, lastMistake, difficulty]);

  const beginRound = (settings: NinjaSettings) => {
    setRound(buildNinjaRound(settings.wordCount));
    setDifficulty(settings.difficulty);
    setLives(START_LIVES);
    setTotalScore(0);
    setLastMistake(null);
    setScreen("study");
  };

  const restart = () => {
    if (round) {
      setRound(buildNinjaRound(round.targetWords.length));
    }
    setLives(START_LIVES);
    setTotalScore(0);
    setLastMistake(null);
    setScreen("study");
  };

  const loseLife = () => {
    const next = lives - 1;
    setLives(next);
    if (next <= 0) setScreen("gameover");
  };

  const handleSlice = (word: string, isTarget: boolean) => {
    if (!round) return;
    if (isTarget) {
      setTotalScore((s) => s + 1);
    } else {
      setLastMistake(`«${word}» جزوِ «${round.category}» نبود، اما برشش زدی.`);
      loseLife();
    }
  };

  const handleMiss = (word: string) => {
    if (!round) return;
    setLastMistake(
      `«${word}» یکی از کلمات «${round.category}» بود و از دستت در رفت.`,
    );
    loseLife();
  };

  const handleRoundComplete = () => {
    setScreen("win");
  };

  if (!restoredFromStorage) {
    return (
      <div className="container max-w-4xl mx-auto my-10 sm:my-16 text-center text-muted-foreground">
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto my-10 sm:my-16">
      {(screen === "study" || screen === "slicing") && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-x-1.5">
            {Array.from({ length: START_LIVES }).map((_, i) => (
              <span
                key={i}
                className={`text-lg sm:text-xl ${i < lives ? "opacity-100" : "opacity-20"}`}
              >
                ❤️
              </span>
            ))}
          </div>
          <div className="glass rounded-full px-4 py-1 text-sm sm:text-base font-bold">
            امتیاز: {totalScore}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass relative z-20 rounded-2xl p-6 sm:p-12 text-center"
          >
            <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-primary">
              نینجای دستور زبان
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              اول کلماتِ دسته‌ی انتخابی را در یک جدول می‌بینی و باید حفظشان کنی.
              بعد کلمات، هم‌رنگ‌جماعت با صدها کلمه‌ی دیگر، توی هوا پرت می‌شوند و
              تو باید با کشیدن موس یا انگشتت فقط همان کلماتِ هدف را برش بزنی.
              برش‌زدنِ کلمه‌ی اشتباه یا از دست‌دادنِ یک کلمه‌ی هدف، یک جان
              می‌گیرد. با {START_LIVES} جان شروع می‌کنی — تمومش نکن!
            </p>
            <button
              onClick={() => setScreen("settings")}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              ادامه
            </button>
          </motion.div>
        )}

        {screen === "settings" && (
          <NinjaSettingsModal maxWords={MAX_WORDS} onStart={beginRound} />
        )}

        {screen === "study" && round && (
          <motion.div key={`study-${round.id}`}>
            <StudyTable
              round={round}
              roundNumber={1}
              totalRounds={1}
              onStart={() => setScreen("slicing")}
            />
          </motion.div>
        )}

        {screen === "slicing" && round && (
          <motion.div
            key={`slice-${round.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.4 }}
          >
            <SliceField
              round={round}
              durationMs={ROUND_DURATION_MS}
              difficulty={difficulty}
              onSlice={handleSlice}
              onMiss={handleMiss}
              onRoundComplete={handleRoundComplete}
            />
          </motion.div>
        )}

        {screen === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass relative z-20 rounded-2xl p-6 sm:p-12 text-center border-2 border-destructive"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-destructive">
              جان‌هایت تمام شد!
            </h2>
            {lastMistake && (
              <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-4">
                {lastMistake}
              </p>
            )}
            <p className="text-sm sm:text-base mb-6">
              امتیاز نهایی‌ات: {totalScore}
            </p>
            <div className="flex items-center justify-center gap-x-3">
              <button
                onClick={restart}
                className="inline-flex items-center justify-center font-medium text-primary-foreground
                  bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
              >
                شروع دوباره
              </button>
              <button
                onClick={() => setScreen("settings")}
                className="inline-flex items-center justify-center font-medium
                  glass hover:brightness-110 active:scale-95 transition-all rounded-xl px-6 py-3 sm:py-4 text-sm sm:text-base"
              >
                تغییر تنظیمات
              </button>
            </div>
          </motion.div>
        )}

        {screen === "win" && (
          <motion.div
            key="win"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass relative z-20 rounded-2xl p-6 sm:p-12 text-center border-2 border-primary"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-primary">
              آفرین، نینجای دستور زبان شدی!
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              {totalScore} کلمه‌ی درست را برش زدی.
            </p>
            <div className="flex items-center justify-center gap-x-3">
              <button
                onClick={restart}
                className="inline-flex items-center justify-center font-medium text-primary-foreground
                  bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
              >
                بازی دوباره
              </button>
              <button
                onClick={() => setScreen("settings")}
                className="inline-flex items-center justify-center font-medium
                  glass hover:brightness-110 active:scale-95 transition-all rounded-xl px-6 py-3 sm:py-4 text-sm sm:text-base"
              >
                تغییر تنظیمات
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NinjaGame;
