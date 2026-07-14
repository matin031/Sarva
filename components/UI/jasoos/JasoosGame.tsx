"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { JASOOS_LEVELS, pickJasoosLevels } from "@/lib/jasoos-data";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import SchoolMap from "./SchoolMap";
import ShootingScene from "./ShootingScene";
import JasoosSettingsModal, { JasoosSettings } from "./JasoosSettingsModal";

type Screen = "intro" | "settings" | "map" | "scene" | "gameover" | "win";
type GameOverReason = "lives" | "time";

const START_LIVES = 3;

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function JasoosGame() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [settings, setSettings] = useState<JasoosSettings | null>(null);
  const [runLevels, setRunLevels] = useState<JasoosLevel[]>([]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [attemptId, setAttemptId] = useState(0);
  const [missedSpy, setMissedSpy] = useState<SuspectType | null>(null);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>("lives");
  const [timeLeftDisplay, setTimeLeftDisplay] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const timeLeftRef = useRef<number | null>(null);

  const level = runLevels[levelIndex];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const goToGameOver = (reason: GameOverReason, spy: SuspectType | null) => {
    setGameOverReason(reason);
    setMissedSpy(spy);
    timeLeftRef.current = null;
    setScreen("gameover");
  };

  // countdown timer: only active while a run is actually being played
  useEffect(() => {
    if (!settings?.timeLimitMinutes) return;
    if (screen !== "map" && screen !== "scene") return;

    const id = window.setInterval(() => {
      if (timeLeftRef.current === null) return;
      const next = Math.max(0, timeLeftRef.current - 1000);
      timeLeftRef.current = next;
      setTimeLeftDisplay(next);
      if (next <= 0) {
        window.clearInterval(id);
        goToGameOver("time", null);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [screen, settings]);

  const beginRun = (chosen: JasoosSettings) => {
    setSettings(chosen);
    setRunLevels(pickJasoosLevels(chosen.questionCount));
    setLevelIndex(0);
    setClearedCount(0);
    setLives(START_LIVES);
    setAttemptId(0);
    setMissedSpy(null);
    if (chosen.timeLimitMinutes) {
      const ms = chosen.timeLimitMinutes * 60000;
      timeLeftRef.current = ms;
      setTimeLeftDisplay(ms);
    } else {
      timeLeftRef.current = null;
      setTimeLeftDisplay(null);
    }
    setScreen("map");
  };

  const restart = () => {
    if (!settings) {
      setScreen("settings");
      return;
    }
    beginRun(settings);
  };

  const logAttempt = (
    lvl: JasoosLevel,
    chosenRole: string,
    correctRole: string,
    isCorrect: boolean,
  ) => {
    if (!user) return;
    supabase
      .from("jasoos_answers")
      .insert({
        user_id: user.id,
        level_id: lvl.id,
        category: lvl.category,
        verse_line_1: lvl.verseLines[0],
        verse_line_2: lvl.verseLines[1],
        chosen_role: chosenRole,
        correct_role: correctRole,
        is_correct: isCorrect,
      })
      .then(({ error }) => {
        if (error) console.error("jasoos_answers insert failed:", error);
      });
  };

  const handleResult = (correct: boolean, spy: SuspectType, chosen: SuspectType) => {
    logAttempt(level, chosen.role, spy.role, correct);

    if (correct) {
      const nextCleared = clearedCount + 1;
      setClearedCount(nextCleared);
      if (nextCleared >= runLevels.length) {
        timeLeftRef.current = null;
        setScreen("win");
      } else {
        setScreen("map");
      }
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    if (nextLives <= 0) {
      goToGameOver("lives", spy);
    } else {
      // retry the same case: bump the key so ShootingScene remounts fresh
      setAttemptId((a) => a + 1);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto my-10 sm:my-16">
      {(screen === "map" || screen === "scene") && (
        <div className="flex items-center justify-between mb-4 px-1 flex-wrap gap-y-2">
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
            پرونده {clearedCount + 1} از {runLevels.length}
          </div>
          {settings?.timeLimitMinutes && timeLeftDisplay !== null && (
            <div
              className={`glass rounded-full px-4 py-1 text-sm sm:text-base font-bold tabular-nums ${
                timeLeftDisplay < 30000 ? "text-destructive" : ""
              }`}
            >
              {formatTime(timeLeftDisplay)}
            </div>
          )}
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
              جاسوسِ نقش‌ها
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              وارد مدرسه شو. پشتِ هر در، یک بیت و چهار نفر منتظرت هستند؛ هرکدام
              مدعیِ یک نقشِ دستوری یا آرایه‌ی ادبی‌اند. سه نفرشان راست می‌گویند،
              اما یکی‌شان جاسوس است: نقشی را ادعا می‌کند که در آن بیت اصلاً
              وجود ندارد. با دقت به بیت نگاه کن، جاسوس را نشانه بگیر و شلیک
              کن. {START_LIVES} جان داری؛ هر اشتباه یک جان می‌گیرد اما همان
              پرونده را دوباره امتحان می‌کنی. اگر جان‌هایت تمام شود، از اولِ
              همین دور شروع می‌کنی.
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
          <JasoosSettingsModal maxQuestions={JASOOS_LEVELS.length} onStart={beginRun} />
        )}

        {screen === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SchoolMap
              levels={runLevels}
              clearedCount={clearedCount}
              onEnter={(i) => {
                setLevelIndex(i);
                setScreen("scene");
              }}
            />
          </motion.div>
        )}

        {screen === "scene" && level && (
          <motion.div
            key={`scene-${level.id}-${attemptId}`}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <ShootingScene level={level} onResult={handleResult} />
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
              {gameOverReason === "time" ? "زمان تمام شد!" : "جان‌هایت تمام شد!"}
            </h2>
            {missedSpy && (
              <>
                <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-2">
                  جاسوسِ واقعی «{missedSpy.role}» بود.
                </p>
                <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed mb-6">
                  {missedSpy.evidence}
                </p>
              </>
            )}
            <p className="text-sm sm:text-base mb-6">
              تا اینجا {clearedCount} پرونده را با موفقیت رد کردی.
            </p>
            <div className="flex items-center justify-center gap-x-3">
              <button
                onClick={restart}
                className="inline-flex items-center justify-center font-medium text-primary-foreground
                  bg-primary hover:brightness-90 active:scale-95 transition-all rounded-xl px-8 py-3 sm:py-4 text-base sm:text-lg"
              >
                شروع دوباره از اول
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
            className="glass rounded-2xl p-6 sm:p-12 text-center border-2 border-primary"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-primary">
              آفرین، جاسوس‌یاب!
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
              تو همه‌ی {runLevels.length} جاسوس را با {lives} جانِ باقی‌مانده
              پیدا کردی.
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

export default JasoosGame;
