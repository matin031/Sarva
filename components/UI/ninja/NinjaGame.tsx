"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { buildNinjaRound } from "@/lib/ninja-data";
import type { NinjaRound } from "@/lib/ninja-data";
import StudyTable from "./StudyTable";
import SliceField from "./SliceField";
import NinjaSettingsModal, { NinjaSettings, type NinjaDifficulty } from "./NinjaSettingsModal";
import GameIntro from "@/components/UI/games/GameIntro";
import { NinjaPreview } from "@/components/UI/games/GamePreviews";
import { useSetReportTarget } from "@/lib/reports/target";
import { useRoundGuard } from "@/lib/games/round-guard";

type Screen = "intro" | "settings" | "study" | "slicing" | "gameover" | "win";

const START_LIVES = 3;
const ROUND_DURATION_MS = 46000;
const STORAGE_KEY = "ninja-progress";

type StoredState = {
  screen: Screen;
  round: NinjaRound | null;
  lives: number;
  totalScore: number;
  lastMistake: string | null;
  difficulty?: NinjaDifficulty;
  /** نقشی که این دور از آن چیده شده — برای «شروع دوباره» با کلماتِ تازه.
   *  اختیاری است چون بازیِ ذخیره‌شدهٔ قبل از این تغییر آن را ندارد. */
  baseRoundId?: number;
};

/** rounds از سرور می‌آید: نقش‌هایی که مدیر ساخته، و اگر هنوز نساخته باشد
 *  نقش‌های پیش‌فرضِ lib/ninja-data.ts. */
function NinjaGame({ rounds }: { rounds: NinjaRound[] }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [round, setRound] = useState<NinjaRound | null>(null);
  const [lives, setLives] = useState(START_LIVES);
  const [totalScore, setTotalScore] = useState(0);
  const [lastMistake, setLastMistake] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<NinjaDifficulty>("easy");
  const [baseRoundId, setBaseRoundId] = useState<number | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  /* گزارش روی *نقش* است نه روی یک واژه: اگر واژه‌ای در دستهٔ اشتباه نشسته
     باشد، مدیر باید همان نقش را باز کند. خودِ واژه در یادداشتِ کاربر می‌آید. */
  /* دورِ زنده: از وقتی نقشِ دور کارت خورده تا پیش از صفحهٔ نتیجه.
     «معرفی» و «تنظیمات» چیزی برای از دست دادن ندارند. */
  useRoundGuard(screen === "study" || screen === "slicing");

  useSetReportTarget(
    (screen === "study" || screen === "slicing") && round
      ? {
          area: "ninja",
          // شناسهٔ نقش در پایگاه‌داده، نه جایش در فهرست — وگرنه لینکِ پنل
          // دفعهٔ بعد به نقشِ دیگری می‌رسد.
          targetId: round.categoryId ?? null,
          snapshot: `${round.category} — ${round.hint}`,
          targetRef: { category: round.category, difficulty },
        }
      : null,
  );

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
          setBaseRoundId(parsed.baseRoundId ?? null);
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
    const data: StoredState = {
      screen,
      round,
      lives,
      totalScore,
      lastMistake,
      difficulty,
      baseRoundId: baseRoundId ?? undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [
    restoredFromStorage,
    screen,
    round,
    lives,
    totalScore,
    lastMistake,
    difficulty,
    baseRoundId,
  ]);

  const beginRound = (settings: NinjaSettings) => {
    const base = rounds.find((r) => r.id === settings.roundId);
    if (!base) return;
    setRound(buildNinjaRound(base, settings.wordCount));
    setBaseRoundId(base.id);
    setDifficulty(settings.difficulty);
    setLives(START_LIVES);
    setTotalScore(0);
    setLastMistake(null);
    setScreen("study");
  };

  const restart = () => {
    if (round) {
      // کلماتِ تازه از همان نقش. اگر آن نقش دیگر وجود ندارد (مدیر حذفش کرده
      // و بازیِ ذخیره‌شده مانده)، همان راندِ در دست دوباره چیده می‌شود.
      const base = rounds.find((r) => r.id === baseRoundId) ?? round;
      setRound(buildNinjaRound(base, round.targetWords.length));
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
        <div className="mb-4 flex items-center justify-between px-1">
          {/* جان‌ها. هر قلبِ ازدست‌رفته یک بار می‌تپد و بعد خاکستری می‌ماند —
              `key` روی وضعیتِ پر/خالی است تا انیمیشن دقیقاً در لحظهٔ از دست
              رفتن اجرا شود، نه در هر رندر. */}
          <div className="flex items-center gap-x-1.5">
            {Array.from({ length: START_LIVES }).map((_, i) => {
              const alive = i < lives;
              return (
                <span
                  key={`${i}-${alive}`}
                  className={`ninja-heart text-lg sm:text-xl ${
                    alive ? "" : "ninja-heart-lost grayscale"
                  }`}
                >
                  ❤️
                </span>
              );
            })}
          </div>
          {/* عدد با هر امتیاز یک تکان می‌خورد؛ بدون آن، تنها بازخوردِ برشِ
              درست یک عددِ بی‌صدا بود که عوض می‌شد. */}
          <div className="glass flex items-center gap-2 rounded-full px-4 py-1 text-sm font-bold sm:text-base">
            <span className="text-muted-foreground">امتیاز</span>
            <span key={totalScore} className="ninja-score text-primary">
              {totalScore.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <GameIntro
            title="نینجای دستور زبان"
            tagline="فقط کلمه‌های درست را برش بزن."
            steps={[
              // دسته‌ها از پنل می‌آیند، پس شمردنشان اینجا در کد یعنی متنی که
              // با اولین نقشِ تازه دروغ می‌شود.
              rounds.length > 0
                ? `اول کلماتِ یک دستهٔ دستوری (${rounds
                    .slice(0, 4)
                    .map((r) => r.category)
                    .join("، ")}${rounds.length > 4 ? " و…" : ""}) را حفظ می‌کنی.`
                : "اول کلماتِ یک دستهٔ دستوری را حفظ می‌کنی.",
              "بعد ده‌ها کلمه توی هوا پرت می‌شوند و با کشیدن انگشت یا موس برش می‌زنی.",
              "فقط کلماتِ هدف را ببُر؛ برشِ اشتباه یا از دست‌دادنِ کلمهٔ هدف یک جان می‌گیرد.",
            ]}
            lives={START_LIVES}
            accent="text-primary"
            chipBg="bg-primary/15 text-foreground"
            Preview={NinjaPreview}
            onStart={() => setScreen("settings")}
          />
        )}

        {screen === "settings" && (
          <NinjaSettingsModal rounds={rounds} onStart={beginRound} />
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
