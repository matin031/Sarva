"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { SELECTABLE_NINJA_CATEGORIES } from "@/lib/ninja-data";

export type NinjaDifficulty = "easy" | "medium" | "hard";

export type NinjaSettings = {
  wordCount: number;
  difficulty: NinjaDifficulty;
};

const DIFFICULTY_OPTIONS: { value: NinjaDifficulty; label: string }[] = [
  { value: "easy", label: "آسان" },
  { value: "medium", label: "متوسط" },
  { value: "hard", label: "دشوار" },
];

function NinjaSettingsModal({
  maxWords,
  onStart,
}: {
  maxWords: number;
  onStart: (settings: NinjaSettings) => void;
}) {
  const countOptions = Array.from(
    new Set([8, 10, maxWords].filter((n) => n > 0 && n <= maxWords)),
  );
  const [wordCount, setWordCount] = useState(countOptions[0] ?? maxWords);
  const [difficulty, setDifficulty] = useState<NinjaDifficulty>("easy");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass relative z-20 rounded-2xl p-6 sm:p-10 text-center"
    >
      <h2 className="text-xl sm:text-3xl font-bold mb-8">تنظیمات بازی</h2>

      <div className="mb-8">
        <p className="text-sm sm:text-base text-muted-foreground mb-3">
          چند کلمه رو باید برش بزنی؟
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {countOptions.map((n) => (
            <button
              key={n}
              onClick={() => setWordCount(n)}
              className={`min-w-16 rounded-xl px-4 py-2 text-sm sm:text-base font-bold transition-all active:scale-95 ${
                wordCount === n
                  ? "bg-primary text-primary-foreground scale-95"
                  : "glass hover:brightness-110"
              }`}
            >
              {n === maxWords ? `همه (${n})` : n}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm sm:text-base text-muted-foreground mb-3">
          سطح سختی
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`min-w-20 rounded-xl px-4 py-2 text-sm sm:text-base font-bold transition-all active:scale-95 ${
                difficulty === d.value
                  ? "bg-primary text-primary-foreground scale-95"
                  : "glass hover:brightness-110"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm sm:text-base text-muted-foreground mb-3">
          نوع کلمات
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SELECTABLE_NINJA_CATEGORIES.map((c) => (
            <button
              key={c.label}
              disabled={!c.enabled}
              className={`min-w-24 rounded-xl px-4 py-2 text-sm sm:text-base font-bold transition-all inline-flex items-center gap-x-2 ${
                c.enabled
                  ? "bg-primary text-primary-foreground scale-95"
                  : "glass opacity-50 cursor-not-allowed"
              }`}
            >
              {c.label}
              {!c.enabled && (
                <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted-foreground/20">
                  به‌زودی
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart({ wordCount, difficulty })}
        className="inline-flex items-center justify-center font-medium text-primary-foreground
          bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
      >
        شروع بازی
      </button>
    </motion.div>
  );
}

export default NinjaSettingsModal;
