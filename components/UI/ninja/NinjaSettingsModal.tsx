"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { NinjaRound } from "@/lib/ninja-data";

export type NinjaDifficulty = "easy" | "medium" | "hard";

export type NinjaSettings = {
  roundId: number;
  wordCount: number;
  difficulty: NinjaDifficulty;
};

const DIFFICULTY_OPTIONS: { value: NinjaDifficulty; label: string }[] = [
  { value: "easy", label: "آسان" },
  { value: "medium", label: "متوسط" },
  { value: "hard", label: "دشوار" },
];

function NinjaSettingsModal({
  rounds,
  onStart,
}: {
  rounds: NinjaRound[];
  onStart: (settings: NinjaSettings) => void;
}) {
  // «نوع کلمات» قبلاً یک ردیف دکمهٔ خاموش با برچسبِ «به‌زودی» بود، چون فقط
  // «قید» در کد وجود داشت. حالا نقش‌ها از پنل مدیریت می‌آیند، پس هر چه اینجا
  // دیده می‌شود واقعاً قابل انتخاب است.
  const [roundId, setRoundId] = useState(rounds[0]?.id ?? 0);
  const [difficulty, setDifficulty] = useState<NinjaDifficulty>("easy");

  const selected = useMemo(
    () => rounds.find((r) => r.id === roundId) ?? rounds[0],
    [rounds, roundId],
  );

  const maxWords = selected?.targetWords.length ?? 0;
  const countOptions = useMemo(
    () => Array.from(new Set([8, 10, maxWords].filter((n) => n > 0 && n <= maxWords))),
    [maxWords],
  );

  const [wordCount, setWordCount] = useState<number | null>(null);
  // تعداد انتخاب‌شده به نقشِ فعلی وابسته است: نقشی با ۶ کلمه گزینهٔ «۱۰» ندارد.
  const effectiveCount =
    wordCount !== null && countOptions.includes(wordCount)
      ? wordCount
      : (countOptions[0] ?? maxWords);

  if (!selected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative z-20 rounded-2xl p-6 text-center sm:p-10"
      >
        <h2 className="mb-2 text-xl font-bold sm:text-2xl">هنوز آماده نیست</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          برای این بازی هنوز هیچ نقشی با کلمه ثبت نشده.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass relative z-20 rounded-2xl p-6 text-center sm:p-10"
    >
      <h2 className="mb-8 text-xl font-bold sm:text-3xl">تنظیمات بازی</h2>

      <div className="mb-8">
        <p className="mb-3 text-sm text-muted-foreground sm:text-base">نوع کلمات</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoundId(r.id)}
              className={`inline-flex min-w-24 items-center gap-x-2 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 sm:text-base ${
                roundId === r.id
                  ? "scale-95 bg-primary text-primary-foreground"
                  : "glass hover:brightness-110"
              }`}
            >
              {r.category}
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px]">
                {r.targetWords.length.toLocaleString("fa-IR")}
              </span>
            </button>
          ))}
        </div>
        {selected.hint && (
          <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground sm:text-sm">
            {selected.hint}
          </p>
        )}
      </div>

      <div className="mb-8">
        <p className="mb-3 text-sm text-muted-foreground sm:text-base">
          چند کلمه رو باید برش بزنی؟
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {countOptions.map((n) => (
            <button
              key={n}
              onClick={() => setWordCount(n)}
              className={`min-w-16 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 sm:text-base ${
                effectiveCount === n
                  ? "scale-95 bg-primary text-primary-foreground"
                  : "glass hover:brightness-110"
              }`}
            >
              {n === maxWords ? `همه (${n})` : n}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="mb-3 text-sm text-muted-foreground sm:text-base">سطح سختی</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`min-w-20 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 sm:text-base ${
                difficulty === d.value
                  ? "scale-95 bg-primary text-primary-foreground"
                  : "glass hover:brightness-110"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          onStart({ roundId: selected.id, wordCount: effectiveCount, difficulty })
        }
        className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-base
          font-medium text-primary-foreground transition-all hover:brightness-90 active:scale-95 sm:py-4 sm:text-lg"
      >
        شروع بازی
      </button>
    </motion.div>
  );
}

export default NinjaSettingsModal;
