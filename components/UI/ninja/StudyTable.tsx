"use client";
import { motion } from "motion/react";
import { staggerContainer, fadeUpSmall } from "@/lib/motion";
import type { NinjaRound } from "@/lib/ninja-data";

function StudyTable({
  round,
  roundNumber,
  totalRounds,
  onStart,
}: {
  round: NinjaRound;
  roundNumber: number;
  totalRounds: number;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass rounded-2xl p-6 sm:p-10 text-center"
    >
      <span className="inline-block mb-3 text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-primary/20 text-primary">
        مرحله {roundNumber} از {totalRounds}
      </span>
      <h2 className="text-xl sm:text-3xl font-bold mb-2">
        این‌ها را بشناس: «{round.category}»
      </h2>
      <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
        {round.hint} این کلمات را خوب نگاه کن، چون الان بین صدها کلمه‌ی دیگر
        پرت می‌شوند و باید فقط همین‌ها را با کشیدن انگشت یا موس برش بزنی.
      </p>

      <motion.div
        variants={staggerContainer(0.04)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3 mb-8"
      >
        {round.targetWords.map((w) => (
          <motion.div
            key={w}
            variants={fadeUpSmall}
            className="glass rounded-xl py-2.5 px-2 text-sm sm:text-base font-bold text-primary"
          >
            {w}
          </motion.div>
        ))}
      </motion.div>

      <button
        onClick={onStart}
        className="inline-flex items-center justify-center font-medium text-primary-foreground
          bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
      >
        شروع برش‌زنی
      </button>
    </motion.div>
  );
}

export default StudyTable;
