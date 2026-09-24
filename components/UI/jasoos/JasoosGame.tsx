"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Clock3, Fingerprint, Heart, RotateCcw, SlidersHorizontal, Trophy, SearchX } from "lucide-react";
import { pickJasoosLevels } from "@/lib/jasoos-data";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useGuestRounds } from "@/lib/guest/use-guest-rounds";
import GuestLimitModal from "@/components/UI/GuestLimitModal";
import { apiPost } from "@/lib/api/client";
import SchoolMap from "./SchoolMap";
import ShootingScene from "./ShootingScene";
import JasoosSettingsModal, { JasoosSettings } from "./JasoosSettingsModal";
import JasoosIntro from "./JasoosIntro";
import styles from "./jasoos.module.css";
import { useSetReportTarget } from "@/lib/reports/target";
import { useRoundGuard } from "@/lib/games/round-guard";

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

/** levels از سرور می‌آید: پرونده‌های منتشرشدهٔ پنل مدیریت، و اگر هنوز
 *  پرونده‌ای ساخته نشده باشد، هشت پروندهٔ پیش‌فرضِ lib/jasoos-data.ts. */
function JasoosGame({ levels: allLevels }: { levels: JasoosLevel[] }) {
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
  // undefined یعنی «هنوز نمی‌دانیم» و پایین‌تر از null (مهمان) تفکیک می‌شود —
  // بازیِ ذخیره‌شده تا وقتی معلوم نشده صاحبش کیست بازیابی نمی‌شود.
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  // مهمان یک دور بازی می‌کند؛ دورِ دوم مدالِ ورود می‌آید.
  const guest = useGuestRounds("jasoos");
  const [guestPrompt, setGuestPrompt] = useState(false);
  const user = userLoading ? undefined : currentUser;
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  // who the restored (localStorage) session belongs to: "guest" | user id | null
  const restoredOwnerRef = useRef<string | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const focusScreen = () => {
    const node = screenRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    if (node.getBoundingClientRect().top < 0) {
      node.scrollIntoView({ block: "start", behavior: "instant" });
    }
  };

  const level = runLevels[levelIndex];

  /* دورِ زنده: روی نقشه یا داخلِ صحنه. «معرفی»، «تنظیمات» و صفحه‌های
     پایان بیرون‌اند. */
  useRoundGuard(screen === "map" || screen === "scene");

  useSetReportTarget(
    level
      ? {
          area: "jasoos",
          targetId: String(level.id),
          snapshot: [level.title, ...(level.verseLines ?? [])]
            .filter(Boolean)
            .join("\n"),
          targetRef: { category: level.category ?? null },
        }
      : null,
  );

  // try to resume a saved session first, before we even know the user
  useEffect(() => {
    // یک بار و فقط یک بار. allLevels در وابستگی‌ها هست چون داخل استفاده
    // می‌شود، و همین گارد جلوی اجرای دوباره را می‌گیرد.
    if (restoredFromStorage) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StoredState = JSON.parse(saved);
        if (
          parsed.screen &&
          parsed.screen !== "intro" &&
          typeof parsed.ownerId === "string"
        ) {
          // پرونده‌ای که مدیر بین دو نشست حذف یا پنهانش کرده، دیگر در
          // allLevels نیست و از بازیِ بازیابی‌شده هم می‌افتد.
          const levels = parsed.runLevelIds
            .map((id) => allLevels.find((l) => l.id === id))
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
  }, [allLevels, restoredFromStorage]);


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
    // باخت هم یک دورِ کامل است؛ وگرنه مهمان با باختنِ عمدی بی‌نهایت بازی
    // می‌کرد و سیاست بی‌اثر می‌شد.
    guest.recordRound();
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
    // همهٔ مسیرهای شروع از اینجا رد می‌شوند — دکمهٔ intro، صفحهٔ تنظیمات، و
    // restart. گذاشتنِ دروازه فقط روی restart یک راهِ باز جا می‌گذاشت.
    if (guest.blocked) {
      setGuestPrompt(true);
      return;
    }
    restoredOwnerRef.current = user ? user.id : "guest";
    setSettings(chosen);
    setRunLevels(pickJasoosLevels(allLevels, chosen.questionCount));
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
    if (guest.blocked) {
      setGuestPrompt(true);
      return;
    }
    if (!settings) {
      setScreen("settings");
      return;
    }
    beginRun(settings);
  };

  /** فقط «کدام پرونده» و «چه کسی را زدی».
   *
   *  بیت، دسته و نقشِ درست عمداً فرستاده نمی‌شوند: سرور همه را از `levelId` و
   *  از روی همان مرجعی که خودِ بازی از آن ساخته شده درمی‌آورد. تا دیروز
   *  `correctRole` هم از اینجا می‌رفت، یعنی هر دو طرفِ مقایسه دستِ کلاینت
   *  بود و «همیشه درست» یک درخواست فاصله داشت. */
  const logAttempt = (lvl: JasoosLevel, chosenRole: string) => {
    if (!user) return;

    void apiPost("/api/v1/jasoos/answer", {
      levelId: lvl.id,
      chosenRole,
    }).then((result) => {
      if (!result.ok) console.error("jasoos answer save failed:", result.errors.join(" "));
    });
  };

  const handleResult = (correct: boolean, spy: SuspectType, chosen: SuspectType) => {
    logAttempt(level, chosen.role);

    if (correct) {
      const nextCleared = clearedCount + 1;
      setClearedCount(nextCleared);
      if (nextCleared >= runLevels.length) {
        setTimerEndsAt(null);
        guest.recordRound();
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
    return <div className={styles.game} role="status">در حال آماده‌سازی پرونده‌ها…</div>;
  }

  return (
    <MotionConfig reducedMotion="user">
    <div ref={screenRef} tabIndex={-1} className={styles.game} dir="rtl" aria-label="بازی جاسوس نقش‌ها">
      {guestPrompt && <GuestLimitModal section="jasoos" onDismiss={() => setGuestPrompt(false)} />}
      {(screen === "map" || screen === "scene") && (
        <div className={styles.hud} aria-label="وضعیت مأموریت">
          <div className={styles.hudTitle}><Fingerprint /><span>جاسوسِ نقش‌ها</span></div>
          <div className={styles.hudProgress}>
            <span>پرونده {(clearedCount + 1).toLocaleString("fa-IR")} از {runLevels.length.toLocaleString("fa-IR")}</span>
            <div className={styles.progressTrack} role="progressbar" aria-label="پرونده‌های حل‌شده" aria-valuenow={clearedCount} aria-valuemin={0} aria-valuemax={runLevels.length}>
              <span style={{ width: (clearedCount / Math.max(1, runLevels.length)) * 100 + "%" }} />
            </div>
          </div>
          <div className={styles.hudStats}>
            {settings?.timeLimitMinutes && timeLeftDisplay !== null && (
              <div className={styles.timer} data-urgent={timeLeftDisplay < 30000} aria-label="زمان باقی‌مانده">
                <Clock3 size={16} /><span dir="ltr">{formatTime(timeLeftDisplay)}</span>
              </div>
            )}
            <div className={styles.lives} role="img" aria-label={lives.toLocaleString("fa-IR") + " جان باقی‌مانده"}>
              {Array.from({ length: START_LIVES }).map((_, i) => <Heart key={i} aria-hidden="true" fill={i < lives ? "currentColor" : "none"} className={i < lives ? undefined : styles.lostLife} />)}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.div onAnimationComplete={focusScreen} key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <JasoosIntro onStart={() => {
              if (guest.blocked) { setGuestPrompt(true); return; }
              setScreen("settings");
            }} />
          </motion.div>
        )}
        {screen === "settings" && (
          <motion.div onAnimationComplete={focusScreen} key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <JasoosSettingsModal maxQuestions={allLevels.length} onStart={beginRun} onBack={() => setScreen("intro")} />
          </motion.div>
        )}
        {screen === "map" && (
          <motion.div onAnimationComplete={focusScreen} key="map" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SchoolMap levels={runLevels} clearedCount={clearedCount} onEnter={(i) => { setLevelIndex(i); setScreen("scene"); }} />
          </motion.div>
        )}
        {screen === "scene" && level && (
          <motion.div onAnimationComplete={focusScreen} key={"scene-" + level.id + "-" + attemptId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ShootingScene level={level} onResult={handleResult} />
          </motion.div>
        )}
        {(screen === "gameover" || screen === "win") && (
          <motion.section onAnimationComplete={focusScreen} key={screen} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={styles.panel + " " + styles.result} aria-labelledby="jasoos-result-title">
            <div className={styles.resultIcon}>{screen === "win" ? <Trophy /> : gameOverReason === "time" ? <Clock3 /> : <SearchX />}</div>
            <h2 id="jasoos-result-title" className="game-display">{screen === "win" ? "آفرین، کارآگاه!" : gameOverReason === "time" ? "زمان مأموریت تمام شد" : "این دور به پایان رسید"}</h2>
            <p>{screen === "win" ? "هیچ جاسوسی از نگاهت پنهان نماند. همهٔ پرونده‌ها حل شدند!" : "هر پرونده یک نکتهٔ تازه دارد؛ دور بعد با تجربه‌تر برمی‌گردی."}</p>
            <div className={styles.resultStats}>
              <div><strong>{clearedCount.toLocaleString("fa-IR")} از {runLevels.length.toLocaleString("fa-IR")}</strong><span>پروندهٔ حل‌شده</span></div>
              <div><strong>{lives.toLocaleString("fa-IR")}</strong><span>جان باقی‌مانده</span></div>
            </div>
            {screen === "gameover" && missedSpy && <div className={styles.resultEvidence}><strong>جاسوس واقعی «{missedSpy.role}» بود.</strong><p>{missedSpy.evidence}</p></div>}
            <div className={styles.resultActions}>
              <button type="button" onClick={restart} className={styles.primaryButton}><RotateCcw size={17} />{screen === "win" ? "یک مأموریت تازه" : "دوباره تلاش می‌کنم"}</button>
              <button type="button" onClick={() => setScreen("settings")} className={styles.secondaryButton}><SlidersHorizontal size={17} /> تغییر تنظیمات</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}

export default JasoosGame;
