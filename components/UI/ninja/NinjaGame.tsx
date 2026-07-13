"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NINJA_ROUNDS } from "@/lib/ninja-data";
import StudyTable from "./StudyTable";
import SliceField from "./SliceField";

type Screen = "intro" | "study" | "slicing" | "round-result" | "gameover" | "win";

const START_LIVES = 5;
const ROUND_DURATION_MS = 46000;

function NinjaGame() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [roundMistakes, setRoundMistakes] = useState(0);
  const [lastMistake, setLastMistake] = useState<string | null>(null);

  const round = NINJA_ROUNDS[roundIndex];

  const restart = () => {
    setRoundIndex(0);
    setLives(START_LIVES);
    setTotalScore(0);
    setRoundScore(0);
    setRoundMistakes(0);
    setLastMistake(null);
    setScreen("study");
  };

  const startRound = () => {
    setRoundScore(0);
    setRoundMistakes(0);
    setScreen("slicing");
  };

  const loseLife = () => {
    const next = lives - 1;
    setLives(next);
    if (next <= 0) setScreen("gameover");
  };

  const handleSlice = (word: string, isTarget: boolean) => {
    if (isTarget) {
      setRoundScore((s) => s + 1);
      setTotalScore((s) => s + 1);
    } else {
      setRoundMistakes((m) => m + 1);
      setLastMistake(`«${word}» جزوِ «${round.category}» نبود، اما برشش زدی.`);
      loseLife();
    }
  };

  const handleMiss = (word: string) => {
    setRoundMistakes((m) => m + 1);
    setLastMistake(`«${word}» یکی از کلمات «${round.category}» بود و از دستت در رفت.`);
    loseLife();
  };

  const handleRoundComplete = () => {
    setScreen("round-result");
  };

  const nextRound = () => {
    const next = roundIndex + 1;
    if (next >= NINJA_ROUNDS.length) {
      setScreen("win");
    } else {
      setRoundIndex(next);
      setScreen("study");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto my-10 sm:my-16">
      {screen !== "intro" && screen !== "gameover" && screen !== "win" && (
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
            className="glass rounded-2xl p-6 sm:p-12 text-center"
          >
            <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-primary">
              نینجای دستور زبان
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              هر مرحله یک دسته‌ی دستوری دارد (قید، صفت، حرف ربط، ضمیر). اول
              کلماتِ آن دسته را در یک جدول می‌بینی و باید حفظشان کنی. بعد
              کلمات، هم‌رنگ‌جماعت با صدها کلمه‌ی دیگر، توی هوا پرت می‌شوند و تو
              باید با کشیدن موس یا انگشتت فقط همان کلماتِ هدف را برش بزنی.
              برش‌زدنِ کلمه‌ی اشتباه یا از دست‌دادنِ یک کلمه‌ی هدف، یک جان
              می‌گیرد. با {START_LIVES} جان شروع می‌کنی — تمومش نکن!
            </p>
            <button
              onClick={restart}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              شروع بازی
            </button>
          </motion.div>
        )}

        {screen === "study" && (
          <motion.div key={`study-${round.id}`}>
            <StudyTable
              round={round}
              roundNumber={roundIndex + 1}
              totalRounds={NINJA_ROUNDS.length}
              onStart={startRound}
            />
          </motion.div>
        )}

        {screen === "slicing" && (
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
              onSlice={handleSlice}
              onMiss={handleMiss}
              onRoundComplete={handleRoundComplete}
            />
          </motion.div>
        )}

        {screen === "round-result" && (
          <motion.div
            key="round-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-2xl p-6 sm:p-12 text-center border-2 border-primary"
          >
            <h2 className="text-xl sm:text-3xl font-bold mb-3 text-primary">
              مرحله‌ی «{round.category}» تمام شد!
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground mb-2">
              {roundScore} کلمه‌ی درست را برش زدی.
            </p>
            {roundMistakes > 0 && (
              <p className="text-xs sm:text-base text-muted-foreground mb-6">
                {roundMistakes} اشتباه هم داشتی.
              </p>
            )}
            <button
              onClick={nextRound}
              className="inline-flex items-center justify-center font-medium text-primary-foreground
                bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              {roundIndex + 1 >= NINJA_ROUNDS.length ? "پایان بازی" : "مرحله‌ی بعد"}
            </button>
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
              آفرین، نینجای دستور زبان شدی!
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              هر {NINJA_ROUNDS.length} مرحله را رد کردی و {totalScore} کلمه
              برش زدی.
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

export default NinjaGame;
