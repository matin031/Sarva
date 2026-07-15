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
const STORAGE_KEY = "jasoos-progress";

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type StoredState = {
  ownerId: string;
  screen: Screen;
  settings: JasoosSettings | null;
  runLevelIds: number[];
  levelIndex: number;
  clearedCount: number;
  lives: number;
  attemptId: number;
  missedSpy: SuspectType | null;
  gameOverReason: GameOverReason;
  timerEndsAt: number | null;
};

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
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [timeLeftDisplay, setTimeLeftDisplay] = useState<number | null>(null);
  // undefined = still checking auth, null = guest, object = logged in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  // who the restored (localStorage) session belongs to: "guest" | user id | null
  const restoredOwnerRef = useRef<string | null>(null);

  const level = runLevels[levelIndex];

  // try to resume a saved session first, before we even know the user
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StoredState = JSON.parse(saved);
        if (
          parsed.screen &&
          parsed.screen !== "intro" &&
          typeof parsed.ownerId === "string"
        ) {
          const levels = parsed.runLevelIds
            .map((id) => JASOOS_LEVELS.find((l) => l.id === id))
            .filter((l): l is JasoosLevel => !!l);
          if (levels.length) {
            restoredOwnerRef.current = parsed.ownerId;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setScreen(parsed.screen);
            setSettings(parsed.settings);
            setRunLevels(levels);
            setLevelIndex(parsed.levelIndex ?? 0);
            setClearedCount(parsed.clearedCount ?? 0);
            setLives(parsed.lives ?? START_LIVES);
            setAttemptId(parsed.attemptId ?? 0);
            setMissedSpy(parsed.missedSpy ?? null);
            setGameOverReason(parsed.gameOverReason ?? "lives");
            setTimerEndsAt(parsed.timerEndsAt ?? null);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
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
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // if the restored session belongs to a different user than the one now
  // signed in, don't trust it — reset to a clean intro screen
  useEffect(() => {
    if (!restoredFromStorage || user === undefined) return;
    if (restoredOwnerRef.current === null) return;

    const currentOwner = user ? user.id : "guest";
    if (currentOwner !== restoredOwnerRef.current) {
      restoredOwnerRef.current = null;
      localStorage.removeItem(STORAGE_KEY);
      setScreen("intro");
      setSettings(null);
      setRunLevels([]);
      setLevelIndex(0);
      setClearedCount(0);
      setLives(START_LIVES);
      setAttemptId(0);
      setMissedSpy(null);
      setTimerEndsAt(null);
    }
  }, [user, restoredFromStorage]);

  // persist on every relevant change so a refresh mid-game resumes exactly
  // where the player left off (including the timer, via an absolute
  // end-timestamp rather than a countdown that would reset to nothing)
  useEffect(() => {
    if (!restoredFromStorage) return;
    if (screen === "intro" || screen === "settings") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const ownerId = restoredOwnerRef.current ?? (user ? user.id : "guest");
    const data: StoredState = {
      ownerId,
      screen,
      settings,
      runLevelIds: runLevels.map((l) => l.id),
      levelIndex,
      clearedCount,
      lives,
      attemptId,
      missedSpy,
      gameOverReason,
      timerEndsAt,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [
    restoredFromStorage,
    screen,
    settings,
    runLevels,
    levelIndex,
    clearedCount,
    lives,
    attemptId,
    missedSpy,
    gameOverReason,
    timerEndsAt,
    user,
  ]);

  const goToGameOver = (reason: GameOverReason, spy: SuspectType | null) => {
    setGameOverReason(reason);
    setMissedSpy(spy);
    setTimerEndsAt(null);
    setScreen("gameover");
  };

  // countdown timer — computed from an absolute end-timestamp (not a
  // decrementing counter) so it survives a page refresh with the correct
  // remaining time instead of resetting
  useEffect(() => {
    if (!timerEndsAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeftDisplay(null);
      return;
    }
    if (screen !== "map" && screen !== "scene") return;

    const tick = () => {
      const remaining = timerEndsAt - Date.now();
      if (remaining <= 0) {
        setTimeLeftDisplay(0);
        goToGameOver("time", null);
        return true;
      }
      setTimeLeftDisplay(remaining);
      return false;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      if (tick()) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen, timerEndsAt]);

  const beginRun = (chosen: JasoosSettings) => {
    restoredOwnerRef.current = user ? user.id : "guest";
    setSettings(chosen);
    setRunLevels(pickJasoosLevels(chosen.questionCount));
    setLevelIndex(0);
    setClearedCount(0);
    setLives(START_LIVES);
    setAttemptId(0);
    setMissedSpy(null);
    setTimerEndsAt(
      chosen.timeLimitMinutes ? Date.now() + chosen.timeLimitMinutes * 60000 : null,
    );
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
    Promise.resolve(
      supabase.from("jasoos_answers").insert({
        user_id: user.id,
        level_id: lvl.id,
        category: lvl.category,
        verse_line_1: lvl.verseLines[0],
        verse_line_2: lvl.verseLines[1],
        chosen_role: chosenRole,
        correct_role: correctRole,
        is_correct: isCorrect,
      }),
    )
      .then(({ error }) => {
        if (error) {
          // most likely cause: the jasoos_answers table/migration hasn't
          // been created yet in this Supabase project — see
          // supabase/migrations/20260714_jasoos_answers.sql
          console.error(
            "jasoos_answers insert failed:",
            error.message || error.code || error.details || error.hint || error,
          );
        }
      })
      .catch((err: unknown) => console.error("jasoos_answers insert threw:", err));
  };

  const handleResult = (correct: boolean, spy: SuspectType, chosen: SuspectType) => {
    logAttempt(level, chosen.role, spy.role, correct);

    if (correct) {
      const nextCleared = clearedCount + 1;
      setClearedCount(nextCleared);
      if (nextCleared >= runLevels.length) {
        setTimerEndsAt(null);
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

  if (!restoredFromStorage) {
    return (
      <div className="container max-w-4xl mx-auto my-10 sm:my-16 text-center text-muted-foreground">
        در حال بارگذاری...
      </div>
    );
  }

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
              وارد مدرسه شو. پشتِ هر در، یک بیت یا جمله و چهار نفر منتظرت
              هستند؛ هرکدام مدعیِ یک نقشِ دستوری یا آرایه‌ی ادبی‌اند. سه نفرشان
              راست می‌گویند، اما یکی‌شان جاسوس است: نقشی را ادعا می‌کند که در
              آن متن اصلاً وجود ندارد. با دقت نگاه کن، جاسوس را نشانه بگیر و
              شلیک کن. {START_LIVES} جان داری؛ هر اشتباه یک جان می‌گیرد اما همان
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
