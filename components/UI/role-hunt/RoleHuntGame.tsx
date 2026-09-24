"use client";

// شیوه‌نامهٔ همین بازی، کنارِ خودش. دلیلش بالای همان فایل نوشته شده.
import "./role-hunt.css";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import GuestLimitModal from "@/components/UI/GuestLimitModal";
import { Volume2, VolumeX, Check, Flame } from "lucide-react";
import { useGuestRounds } from "@/lib/guest/use-guest-rounds";
import { useRoundGuard } from "@/lib/games/round-guard";
import { useReducedMotion } from "@/lib/perf/use-perf";
import { useSetReportTarget } from "@/lib/reports/target";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";
import {
  isMotionForced,
  motionServerSnapshot,
  setMotionForced,
  subscribeMotion,
  isSoundEnabled,
  playRoleHuntSound,
  setSoundEnabled,
  soundServerSnapshot,
  subscribeSound,
  unlockSound,
} from "@/lib/role-hunt/audio";
import { summarizeRoleHuntSession, verseTextOfRound } from "@/lib/role-hunt/round";
import { fetchRoleHuntRounds, RoleHuntSourceError, submitRoleHuntAnswer } from "@/lib/role-hunt/source";
import type { RoleHuntRound } from "@/lib/role-hunt/types";
import { immersiveMode } from "@/lib/immersive-mode";
import { useRoleHuntOrientation } from "@/lib/role-hunt/use-orientation";
import Link from "next/link";
import OrbitStage from "./OrbitStage";
import OrientationGate from "./OrientationGate";
import RoleDecoder from "./RoleDecoder";
import RoleHuntIntro from "./RoleHuntIntro";
import RoleHuntResults from "./RoleHuntResults";

/**
 * شکار نقش‌ها — حلقهٔ بازی.
 *
 * ⚠️ سه تصمیمِ ساختاری که بقیهٔ فایل رویشان ایستاده:
 *
 * ۱) **حرکت اصلاً از React رد نمی‌شود.** موقعیتِ واژه‌ها با دو `animation`ِ
 *    CSS ساخته می‌شود (`OrbitStage`)، پس هر `setState` ای که اینجا بزنیم —
 *    hover، بازخورد، شمارنده — حرکت را نه کند می‌کند و نه می‌پراند. تنها
 *    چیزی که مدار را از نو می‌چیند، عوض شدنِ خودِ دور است.
 *
 * ۲) **درستی دو بار سنجیده می‌شود و هر بار برای کارِ متفاوتی.** اینجا برای
 *    اینکه بازخورد بدونِ رفت‌وبرگشتِ شبکه فوری باشد؛ روی سرور برای اینکه
 *    چیزی که در تحلیل می‌نشیند از مرورگر نیامده باشد. اگر روزی این دو
 *    اختلاف پیدا کنند، حرفِ سرور ثبت می‌شود و حرفِ اینجا فقط یک انیمیشن
 *    بوده.
 *
 * ۳) **ثبت، مسیرِ بازی را بند نمی‌آورد.** پاسخ بی‌انتظار فرستاده می‌شود و
 *    شکستش بازی را متوقف نمی‌کند: دانش‌آموزی که اینترنتش لرزیده باید بتواند
 *    تمرینش را تمام کند. چیزی که از دست می‌رود یک ردیفِ تحلیل است، نه
 *    نشستِ او.
 */

type Phase = "intro" | "loading" | "playing" | "results" | "error";

/** ⚠️ `tokenId: null` یعنی «وقت تمام شد» — بازیکن هیچ ستاره‌ای نزد. */
type Answered = { tokenId: string | null; isCorrect: boolean };

type SessionAnswer = { roleKey: string; roleLabel: string; isCorrect: boolean };

/** `crypto.randomUUID` در بافتِ ناامن (http روی شبکهٔ محلی) نیست. */
function roundId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

export default function RoleHuntGame() {
  const systemReduced = useReducedMotion();
  /* ⚠️ پیش‌فرض حرفِ سیستم‌عامل است؛ این فقط درِ خروجی است که خودِ کاربر
     بازش می‌کند. دلیلِ کاملش پایینِ `lib/role-hunt/audio.ts`. */
  const motionForced = useSyncExternalStore(
    subscribeMotion,
    isMotionForced,
    motionServerSnapshot,
  );
  const reduced = systemReduced && !motionForced;
  const guest = useGuestRounds("role-hunt");
  /* گوشیِ عمودی = بازی قفل. دلیلِ هندسی‌اش بالای `use-orientation.ts`. */
  const { phone, blocked } = useRoleHuntOrientation();

  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [guestPrompt, setGuestPrompt] = useState(false);
  /* ترجیحِ صدا یک حالتِ بیرونی است (localStorage) و نه حالتِ این کامپوننت —
     پس از همان‌جا خوانده می‌شود و نه با یک `setState` در افکت. */
  const sound = useSyncExternalStore(subscribeSound, isSoundEnabled, soundServerSnapshot);

  const [rounds, setRounds] = useState<RoleHuntRound[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);

  /* ⚠️ شناسهٔ ثبت به‌ازای هر دور، *یک بار* ساخته می‌شود و در ref می‌ماند.
     اگر در رندر ساخته می‌شد، هر رندرِ دوباره شناسهٔ تازه‌ای می‌داد و کلیدِ
     یکتاییِ سرور دیگر هیچ تکراری را نمی‌گرفت — یعنی دقیقاً همان چیزی که
     برایش ساخته شده بود از کار می‌افتاد. */
  const roundIds = useRef<string[]>([]);

  const round = rounds[index] ?? null;

  /* ⚠️ «نقش رو شد؟» — شرطِ شروعِ شمارشِ مهلت.

     به‌جای اینکه رمزگشا خبر بدهد، همان مدتی شمرده می‌شود که خودش طول
     می‌کشد. دلیلش سادگیِ جریانِ داده است: رمزگشا با `key` در هر دور از نو
     mount می‌شود و هیچ حالتی به بیرون نمی‌دهد؛ یک callback از آن به بالا،
     یک وابستگیِ دوطرفه می‌ساخت برای عددی که همین‌جا هم معلوم است. */
  const [revealed, setRevealed] = useState(false);

  /* ⚠️ «قفل» فقط یک پوششِ دیداری نیست: مدار می‌ایستد، رمزگشا یخ می‌زند،
     ستاره‌ها غیرفعال می‌شوند و تایمرِ دورِ بعد نصب نمی‌شود. */
  /* ⚠️ فقط *وسطِ دور*. صفحهٔ معرفی و نتیجه روی گوشیِ عمودی هم خوانا هستند
     و پوشاندنشان یعنی دانش‌آموز پیش از چرخاندنِ گوشی نمی‌فهمد بازی چیست. */
  const paused = blocked && phase === "playing";

  /* رمزگشا در `decoderMs` کامل می‌شود؛ از همان لحظه مهلتِ پاسخ شروع است. */
  useEffect(() => {
    if (phase !== "playing" || revealed || paused) return;
    const id = window.setTimeout(() => setRevealed(true), ROLE_HUNT_CONFIG.decoderMs);
    return () => window.clearTimeout(id);
  }, [phase, revealed, paused]);

  /* پوسته فقط وقتی باید سرِ خروج هشدار بدهد که واقعاً دوری در جریان است. */
  useRoundGuard(phase === "playing");

  /* دکمهٔ «گزارشِ اشکال» باید بداند همین حالا چه چیزی روی صفحه است.

     ⚠️ ناحیه عمداً `grammar_circuit` است و نه یک ناحیهٔ تازه برای این بازی.
     دورِ «شکار نقش‌ها» یک بازنماییِ دیگر از *همان* ردیفِ
     `grammar_circuit_questions` است؛ اگر نقشِ یک واژه غلط باشد، غلط بودنش
     به بازی ربطی ندارد و اصلاحش هم در همان یک جا انجام می‌شود. ناحیهٔ
     جداگانه فقط صندوقِ گزارشِ مدیر را دو تکه می‌کرد، بی آنکه دو تکه بودن
     معنایی داشته باشد. */
  useSetReportTarget(
    round && phase === "playing"
      ? {
          area: "grammar_circuit",
          targetId: round.questionId,
          snapshot: `${verseTextOfRound(round)}\nنقش‌ها: ${round.asks.map((a) => a.roleLabel).join("، ")}`,
          targetRef: { game: "role-hunt", grade: round.grade, lesson: round.lesson },
        }
      : null,
  );

  const start = useCallback(async () => {
    /* ⚠️ قفلِ صدا فقط از دلِ یک ژستِ واقعیِ کاربر باز می‌شود، و «شروع بازی»
       اولین و مطمئن‌ترینِ آن‌هاست. */
    unlockSound();
    if (guest.blocked) {
      setGuestPrompt(true);
      return;
    }

    setPhase("loading");
    setError(null);
    try {
      const fetched = await fetchRoleHuntRounds(ROLE_HUNT_CONFIG.roundsPerSession);
      roundIds.current = fetched.map(() => roundId());
      setRounds(fetched);
      setIndex(0);
      setAnswers([]);
      setAnswered(null);
      setHovered(null);
      playRoleHuntSound("start");
      setPhase("playing");
    } catch (err) {
      setError(
        err instanceof RoleHuntSourceError
          ? err.message
          : "دریافتِ دورها ممکن نشد. لحظه‌ای بعد دوباره تلاش کن.",
      );
      setPhase("error");
    }
  }, [guest.blocked]);

  /* ⚠️ شروعِ خودکار *فقط* بعد از یک چرخشِ واقعی.

     خواسته این بود که با افقی کردنِ گوشی بازی راه بیفتد. ولی «هر وقت
     افقی بود شروع کن» غلط است: کسی که مستقیم در حالتِ افقی وارد می‌شود،
     هیچ‌وقت قاعدهٔ بازی را نمی‌بیند. پس شرط این است که کاربر *قبلاً* پوشش
     را دیده باشد — یعنی گذار از قفل به باز.

     `wasBlocked` یک ref است و نه state: خواندنش نباید رندر بسازد، و
     نوشتنش نباید حلقه درست کند. و چون فقط روی گذار عمل می‌کند، چرخاندنِ
     پیاپیِ گوشی هیچ درخواستِ تازه‌ای نمی‌سازد. */
  const wasBlocked = useRef(false);

  /* ⚠️ اندیسِ *پرسش* داخلِ همین مصراع.

     یک بیت چند نقش دارد و بازیکن آن را یک بار می‌خواند و بعد پشتِ هم به
     همه جواب می‌دهد. پس دو شمارنده لازم است و نه یکی: `index` می‌گوید
     کدام مصراع، `ask` می‌گوید کدام نقشِ همان مصراع. */
  const [ask, setAsk] = useState(0);
  const currentAsk = round?.asks[ask] ?? null;

  const select = useCallback(
    (tokenId: string) => {
      const current = rounds[index];
      const currentQ = current?.asks[ask];
      /* ⚠️ نگهبانِ ثبتِ دوباره. بدونِ آن، دو کلیکِ سریع روی دو ستاره — یا
         یک کلیک و یک Enter — دو درخواست می‌فرستاد و پرسشِ بعد را هم رد
         می‌کرد. `disabled` روی دکمه‌ها همین را می‌گوید، ولی تکیه بر DOM برای
         یک قاعدهٔ منطقی کافی نیست.

         ⚠️ و قفلِ ورودی حتی اگر لمسی از زیرِ پوششِ «گوشی را بچرخان» رد شود. */
      if (!current || !currentQ || answered !== null || paused) return;

      const isCorrect = tokenId === currentQ.correctTokenId;
      /* زنجیره پیش از همین پاسخ؛ صدای درست با هر پاسخِ پیاپی کمی زیرتر می‌شود. */
      let run = 0;
      for (let i = answers.length - 1; i >= 0 && answers[i]!.isCorrect; i--) run += 1;
      playRoleHuntSound(isCorrect ? "correct" : "wrong", { streak: run });
      setAnswered({ tokenId, isCorrect });
      setAnswers((prev) => [
        ...prev,
        { roleKey: currentQ.roleKey, roleLabel: currentQ.roleLabel, isCorrect },
      ]);

      /* بی‌انتظار و بی‌سروصدا: سرور خودش دوباره می‌سنجد و نتیجه‌اش برای
         نمایش لازم نیست.

         ⚠️ `roundId` به‌ازای هر *پرسش* یکتا می‌شود و نه هر مصراع — کلیدِ
         یکتاییِ جدول روی `(user_id, round_id)` است و اگر چهار پرسشِ یک
         بیت یک شناسه می‌گرفتند، فقط اولی ثبت می‌شد. */
      void submitRoleHuntAnswer({
        roundId: `${roundIds.current[index] ?? roundId()}`.slice(0, 34) + `-${ask}`,
        questionId: current.questionId,
        askIndex: ask,
        selectedTokenId: tokenId,
      }).catch(() => {});
    },
    [answered, paused, index, ask, rounds, answers],
  );

  /* ═══════════════════════════════════════════════════════════════════
     سه فاز، و هر کدام تایمرِ خودش
     ═══════════════════════════════════════════════════════════════════

     خواندن (یک بار در هر مصراع) → پرسش (به‌ازای هر نقش) → بازخورد

     ⚠️ هر سه تایمر *افکت*اند و نه `setTimeout` داخلِ کلیک، و همگی
     `paused` را در وابستگی‌هایشان دارند. یعنی چرخاندنِ گوشی به عمودی هر
     سه را برمی‌دارد و با برگشت دوباره نصبشان می‌کند — هیچ‌وقت چیزی پشتِ
     پوشش نمی‌سوزد. */

  /** فازِ خواندن تمام شده؟ */
  const [reading, setReading] = useState(true);

  /* ⚠️ ریست هنگامِ *رندر* و نه در یک افکت.

     سه حالت با عوض شدنِ مصراع یا پرسش باید از نو شروع شوند: فازِ خواندن،
     شمارندهٔ پرسش، و «نقش رو شد؟». نسخهٔ اول این‌ها را در `useEffect`
     می‌نوشت و هم ESLint درست ایراد می‌گرفت و هم رفتارش بد بود: یک رندرِ
     اضافه با حالتِ *قبلی* روی صفحه می‌نشست و بعد پاک می‌شد — یعنی نقشِ
     مصراعِ قبلی برای یک فریم دیده می‌شد.

     این همان الگوی رسمیِ React برای «تنظیم حالت وقتی چیزی عوض شد» است:
     مقایسه با مقدارِ قبلی و `setState` در بدنهٔ رندر. React بلافاصله
     دوباره رندر می‌کند، پیش از آنکه چیزی به DOM برسد. */
  const [prevRound, setPrevRound] = useState(index);
  if (prevRound !== index) {
    setPrevRound(index);
    setReading(true);
    setAsk(0);
    setRevealed(reduced);
  }

  const [prevAsk, setPrevAsk] = useState(ask);
  if (prevAsk !== ask) {
    setPrevAsk(ask);
    // پرسشِ تازه یعنی رمزگشایی تازه — مگر در حالتِ حرکتِ کمتر.
    setRevealed(reduced);
  }

  useEffect(() => {
    if (phase !== "playing" || !reading || paused) return;
    const id = window.setTimeout(
      () => setReading(false),
      ROLE_HUNT_CONFIG.readSeconds * 1000,
    );
    return () => window.clearTimeout(id);
  }, [phase, reading, paused, index]);

  /* ⚠️ تیکِ سه ثانیهٔ آخرِ خواندن.

     با `setInterval` روی کلِ مدت نوشته نشد: آن‌وقت تیک از ثانیهٔ اول
     می‌آمد و دیگر «هشدار» نبود، بافت بود. اینجا یک تأخیر تا لحظهٔ هشدار
     و بعد سه تیکِ ثانیه‌ای. */
  useEffect(() => {
    if (phase !== "playing" || !reading || paused || reduced) return;
    const lead = (ROLE_HUNT_CONFIG.readSeconds - ROLE_HUNT_CONFIG.readTickSeconds) * 1000;
    let interval = 0;
    const start = window.setTimeout(() => {
      playRoleHuntSound("clock");
      interval = window.setInterval(() => playRoleHuntSound("clock"), 1000);
    }, lead);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [phase, reading, paused, reduced, index]);

  /* ⚠️ مهلتِ پاسخ — فقط بعد از اینکه نقش کامل رو شده باشد.

     وگرنه بخشی از چهار ثانیه صرفِ خواندنِ رمزگشا می‌شد و بازیکن برای
     چیزی جریمه می‌شد که هنوز ندیده بود. */
  useEffect(() => {
    if (phase !== "playing" || reading || answered !== null || paused || !revealed) return;
    const id = window.setTimeout(() => {
      playRoleHuntSound("timeout");
      setAnswered({ tokenId: null, isCorrect: false });
      setAnswers((prev) => [
        ...prev,
        {
          roleKey: currentAsk?.roleKey ?? "",
          roleLabel: currentAsk?.roleLabel ?? "",
          isCorrect: false,
        },
      ]);
    }, ROLE_HUNT_CONFIG.answerSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [phase, reading, answered, paused, revealed, currentAsk]);

  /* پیشروی: پرسشِ بعدیِ همین مصراع، یا مصراعِ بعدی. */
  useEffect(() => {
    if (answered === null || paused) return;
    const id = window.setTimeout(() => {
      setAnswered(null);
      setHovered(null);
      const total = rounds[index]?.asks.length ?? 0;
      if (ask + 1 < total) {
        setAsk(ask + 1);
      } else if (index + 1 >= rounds.length) {
        playRoleHuntSound("sessionEnd");
        setPhase("results");
      } else {
        setIndex(index + 1);
      }
    }, ROLE_HUNT_CONFIG.feedbackMs);
    return () => window.clearTimeout(id);
  }, [answered, paused, index, ask, rounds]);

  /* یک نشستِ کامل = یک «دورِ» مهمان. در همان گذار به صفحهٔ نتیجه، و فقط
     یک بار. */
  const recorded = useRef(false);
  useEffect(() => {
    if (phase !== "results") {
      recorded.current = false;
      return;
    }
    if (recorded.current) return;
    recorded.current = true;
    guest.recordRound();
  }, [phase, guest]);

  /* ⚠️ روی گوشیِ افقی، هدر و پاورقیِ سایت برداشته می‌شوند.

     ارتفاعِ کلِ صفحه آنجا ۳۹۰ پیکسل است و هدرِ سایت ۸۰ تای آن را می‌خورد —
     یعنی یک‌پنجمِ بازی. اندازه‌گیری‌شده: با هدر، پایینِ مدار از صفحه بیرون
     می‌زد. `immersiveMode` از قبل برای همین هست و پوسته خودش به آن گوش
     می‌دهد؛ چیزِ تازه‌ای ساخته نشد.

     پاکسازی حتماً لازم است: بدونش، رفتن به هر صفحهٔ دیگری سایت را
     بی‌هدر رها می‌کرد. */
  useEffect(() => {
    const immersive = phone && !blocked;
    immersiveMode.set(immersive ? "fullscreen" : "off");
    return () => immersiveMode.set("off");
  }, [phone, blocked]);

  useEffect(() => {
    const justRotated = wasBlocked.current && !blocked;
    wasBlocked.current = blocked;
    if (justRotated && phone && phase === "intro") void start();
  }, [blocked, phone, phase, start]);

  const summary = useMemo(() => summarizeRoleHuntSession(answers), [answers]);

  const correctSoFar = answers.filter((a) => a.isCorrect).length;
  const streak = useMemo(() => {
    let n = 0;
    for (let i = answers.length - 1; i >= 0; i--) {
      if (!answers[i]!.isCorrect) break;
      n += 1;
    }
    return n;
  }, [answers]);

  return (
    <div
      dir="rtl"
      className="rh-root container mx-auto max-w-5xl px-4 py-8 sm:py-10"
      data-phase={phase}
      data-phone={phone ? "true" : undefined}
      data-paused={paused ? "true" : undefined}
    >
      <div className="rh-backdrop" aria-hidden="true" />

      {guestPrompt && (
        <GuestLimitModal section="role-hunt" onDismiss={() => setGuestPrompt(false)} />
      )}

      {paused && <OrientationGate reduced={reduced} />}

      {/* ⚠️ `inert` کلِ بازی را از دسترسِ صفحه‌کلید و صفحه‌خوان بیرون می‌برد —
          نه فقط با `pointer-events` که فقط ماوس و لمس را می‌گیرد. بدونش،
          کاربری که با Tab کار می‌کند می‌توانست پشتِ پوشش به ستاره‌ها برسد و
          پاسخی ثبت کند که اصلاً ندیده است. */}
      <div className="rh-play" inert={paused || undefined}>
      {(phase === "intro" || phase === "loading") && (
        <RoleHuntIntro
          onStart={start}
          busy={phase === "loading"}
          reduced={reduced}
          immersive={phone && !blocked}
          portraitPhone={blocked}
        />
      )}

      {phase === "error" && (
        <div className="rh-error" role="alert">
          <p className="rh-error-text">{error}</p>
          <div className="rh-result-cta">
            <button type="button" onClick={start} className="rh-btn rh-btn-primary">
              تلاش دوباره
            </button>
            <Link href="/game" className="rh-btn rh-btn-ghost">
              بازی‌ها
            </Link>
          </div>
        </div>
      )}

      {phase === "playing" && round && (
        <div className="rh-enter">
          <div className="rh-hud">
            <div className="rh-hud-group">
              {phone && !blocked && <ExitChip />}
              <span className="rh-hud-chip">
                دور
                <b className="game-num">
                  {(index + 1).toLocaleString("fa-IR")}/{rounds.length.toLocaleString("fa-IR")}
                </b>
              </span>
              <span className="rh-hud-chip">
                نقش
                <b className="game-num">
                  {(ask + 1).toLocaleString("fa-IR")}/{round.asks.length.toLocaleString("fa-IR")}
                </b>
              </span>
            </div>
            <div className="rh-hud-group rh-hud-score">
              <span className="rh-hud-chip">
                <Check size={14} aria-hidden="true" />
                درست
                {/* کلید روی عدد: با هر پاسخِ درست از نو mount می‌شود و یک بار می‌پرد. */}
                <b key={correctSoFar} className="game-num rh-bump">
                  {correctSoFar.toLocaleString("fa-IR")}
                </b>
              </span>
              <span className="rh-hud-chip" data-hot={streak >= 3 ? "true" : undefined}>
                <Flame size={14} aria-hidden="true" />
                زنجیره
                <b className="game-num">{streak.toLocaleString("fa-IR")}</b>
              </span>
            </div>
            <div className="rh-hud-group rh-hud-actions">
              {/* ⚠️ خاموش‌کردنِ صدا باید *روی خودِ بازی* باشد و نه در تنظیماتِ
                  جایی دیگر: کسی که در کلاس یا کنارِ بقیه بازی می‌کند، همان
                  ثانیهٔ اول لازمش دارد. */}
              {/* ⚠️ فقط وقتی دیده می‌شود که سیستم‌عامل حرکت را بسته باشد.
                  برای بقیه یک دکمهٔ بی‌معنی است و نوار را شلوغ می‌کند. */}
              {systemReduced && (
                <button
                  type="button"
                  className="rh-hud-chip"
                  aria-pressed={motionForced}
                  onClick={() => setMotionForced(!isMotionForced())}
                >
                  {motionForced ? "حرکت روشن" : "حرکت خاموش"}
                </button>
              )}
              <button
                type="button"
                className="rh-hud-chip rh-hud-sound"
                aria-pressed={sound}
                aria-label={sound ? "صدا روشن" : "صدا خاموش"}
                title={sound ? "صدا روشن" : "صدا خاموش"}
                onClick={() => setSoundEnabled(!isSoundEnabled())}
              >
                {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
            </div>
          </div>
          <div className="rh-round-progress" aria-hidden="true">
            {rounds.map((r, i) => <span key={r.questionId} data-state={i < index ? "done" : i === index ? "current" : undefined} />)}
          </div>

          <OrbitStage
            /* ⚠️ کلید روی خودِ دور است: با عوض شدنِ دور، ستاره‌ها از نو
               ساخته می‌شوند و انیمیشن‌ها از فازِ درستِ خودشان شروع می‌کنند.
               بدونِ آن، React همان گره‌ها را نگه می‌داشت و واژهٔ تازه روی
               زاویهٔ واژهٔ قبلی می‌نشست. */
            key={round.questionId}
            round={round}
            answered={answered}
            hoveredTokenId={hovered}
            onHover={setHovered}
            onSelect={select}
            correctTokenId={currentAsk?.correctTokenId ?? ""}
            locked={paused || reading}
            reading={reading}
            readSeconds={ROLE_HUNT_CONFIG.readSeconds}
            center={
              <div className="rh-center-slot">
                {/* ⚠️ کلید روی دور: رمزگشا با هر دور از نو mount می‌شود و از
                    `٭٭٭` شروع می‌کند. بدونِ آن، React همان گره را نگه می‌داشت و
                    نقشِ تازه بی‌هیچ انیمیشنی جای نقشِ قبلی می‌نشست. */}
                {/* ⚠️ نقش تا پایانِ فازِ خواندن اصلاً *ساخته* نمی‌شود و فقط
                    پنهان نیست. اگر پنهان می‌بود، رمزگشا پشتِ صحنه کار می‌کرد و
                    صدای تیکش با ثانیه‌شمارِ خواندن قاطی می‌شد — و بدتر، مهلتِ
                    چهار ثانیه پیش از دیده شدنِ نقش شروع می‌شد. */}
                {!reading && (
                <div className="rh-decoder-wrap">
                  <RoleDecoder
                    key={`${round.questionId}-${ask}`}
                    roleLabel={currentAsk?.roleLabel ?? ""}
                    reduced={reduced}
                    paused={paused}
                  />
                  {/* ⚠️ نوارِ مهلت. `key` روی خودِ دور است تا با هر نقشِ تازه از
                      اول پر شود؛ بدونِ آن، انیمیشن از جایی که بود ادامه می‌داد. */}
                  {revealed && answered === null && (
                    <span
                      key={`t-${index}`}
                      className="rh-timer"
                      data-paused={paused ? "true" : undefined}
                      style={
                        { "--rh-answer": `${ROLE_HUNT_CONFIG.answerSeconds}s` } as React.CSSProperties
                      }
                      aria-hidden="true"
                    />
                  )}
                </div>
                )}

                {reading && (
                  <p className="rh-read-hint">
                    بیت را بخوان
                    <span className="game-num">
                      {" "}
                      ({round.asks.length.toLocaleString("fa-IR")} نقش در راه است)
                    </span>
                  </p>
                )}
              </div>
            }
          />


          {/* نتیجهٔ هر پاسخ، برای کسی که صفحه را نمی‌بیند. */}
          <p className="sr-only" aria-live="polite">
            {answered === null
              ? ""
              : answered.isCorrect
                ? "درست بود."
                : "نادرست بود؛ پاسخِ درست روی مصراع نشان داده شد."}
          </p>
        </div>
      )}

      {phase === "results" && <RoleHuntResults summary={summary} onRestart={start} />}
      </div>
    </div>
  );
}

/**
 * خروج روی گوشیِ افقی، جایی که نوارِ پوسته برداشته شده.
 *
 * ⚠️ دو ضربه و نه یک: یک لمسِ اتفاقی کنارِ مدار نباید نشست را از بین ببرد،
 * و یک پنجرهٔ تأییدِ کامل روی صفحهٔ ۳۹۰ پیکسلی کلِ بازی را می‌پوشاند.
 */
function ExitChip() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 2500);
    return () => window.clearTimeout(id);
  }, [armed]);

  if (armed) {
    return (
      <Link href="/game" className="rh-hud-chip rh-hud-exit" data-armed="true">
        خروج؟ دوباره بزن
      </Link>
    );
  }
  return (
    <button type="button" className="rh-hud-chip rh-hud-exit" onClick={() => setArmed(true)} aria-label="خروج از بازی">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
    </button>
  );
}
