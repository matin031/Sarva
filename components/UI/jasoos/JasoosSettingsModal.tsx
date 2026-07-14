"use client";
import { useState } from "react";
import { motion } from "motion/react";

export type JasoosSettings = {
  questionCount: number;
  timeLimitMinutes: number | null;
};

function JasoosSettingsModal({
  maxQuestions,
  onStart,
}: {
  maxQuestions: number;
  onStart: (settings: JasoosSettings) => void;
}) {
  const countOptions = Array.from(
    new Set([5, 7, 10, maxQuestions].filter((n) => n > 0 && n <= maxQuestions)),
  );

  const [questionCount, setQuestionCount] = useState(countOptions[0] ?? maxQuestions);
  const [timeMode, setTimeMode] = useState<"unlimited" | "custom">("unlimited");
  const [minutes, setMinutes] = useState(5);

  const validMinutes = Number.isFinite(minutes) && minutes > 0 && minutes <= 180;
  const canStart = questionCount > 0 && (timeMode === "unlimited" || validMinutes);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass rounded-2xl p-6 sm:p-10 text-center"
    >
      <h2 className="text-xl sm:text-3xl font-bold mb-8">تنظیمات بازی</h2>

      <div className="mb-8">
        <p className="text-sm sm:text-base text-muted-foreground mb-3">
          چند پرونده حل کنی؟
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {countOptions.map((n) => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className={`min-w-16 rounded-xl px-4 py-2 text-sm sm:text-base font-bold transition-all active:scale-95 ${
                questionCount === n
                  ? "bg-primary text-primary-foreground scale-95"
                  : "glass hover:brightness-110"
              }`}
            >
              {n === maxQuestions ? `همه (${n})` : n}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm sm:text-base text-muted-foreground mb-3">زمان</p>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
          <button
            onClick={() => setTimeMode("unlimited")}
            className={`min-w-24 rounded-xl px-4 py-2 text-sm sm:text-base font-bold transition-all active:scale-95 ${
              timeMode === "unlimited"
                ? "bg-primary text-primary-foreground scale-95"
                : "glass hover:brightness-110"
            }`}
          >
            نامحدود
          </button>
          <button
            onClick={() => setTimeMode("custom")}
            className={`min-w-24 rounded-xl px-4 py-2 text-sm sm:text-base font-bold transition-all active:scale-95 ${
              timeMode === "custom"
                ? "bg-primary text-primary-foreground scale-95"
                : "glass hover:brightness-110"
            }`}
          >
            زمان‌دار
          </button>
        </div>
        {timeMode === "custom" && (
          <div className="flex items-center justify-center gap-x-2">
            <input
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20 rounded-lg glass px-3 py-2 text-center text-sm sm:text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm sm:text-base text-muted-foreground">
              دقیقه برای کل بازی
            </span>
          </div>
        )}
        {timeMode === "custom" && !validMinutes && (
          <p className="text-xs text-destructive mt-2">
            یک عدد بین ۱ تا ۱۸۰ وارد کن.
          </p>
        )}
      </div>

      <button
        disabled={!canStart}
        onClick={() =>
          canStart &&
          onStart({
            questionCount,
            timeLimitMinutes: timeMode === "custom" ? minutes : null,
          })
        }
        className={`inline-flex items-center justify-center font-medium text-primary-foreground
          transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg ${
            canStart
              ? "bg-primary hover:brightness-90 active:scale-95"
              : "bg-primary/40 cursor-not-allowed"
          }`}
      >
        شروع بازی
      </button>
    </motion.div>
  );
}

export default JasoosSettingsModal;
