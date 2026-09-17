"use client";

// شیوه‌نامهٔ همین بازی، کنارِ خودش. دلیلش بالای همان فایل نوشته شده.
import "./role-hunt.css";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import GuestLimitModal from "@/components/UI/GuestLimitModal";
import { Particles } from "@/components/UI/kit/particles";
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
import OrbitStage, { StarShape } from "./OrbitStage";
import OrientationGate from "./OrientationGate";
import RoleDecoder from "./RoleDecoder";
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
  useEffect(() => {
    if (phase !== "playing") return;
    // حرکتِ کمتر: رمزگشایی‌ای در کار نیست، نقش از همان لحظه کامل است.
    if (reduced) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const id = window.setTimeout(() => setRevealed(true), ROLE_HUNT_CONFIG.decoderMs);
    return () => window.clearTimeout(id);
  }, [phase, index, reduced]);

  /* ⚠️ «قفل» فقط یک پوششِ دیداری نیست: مدار می‌ایستد، رمزگشا یخ می‌زند،
     ستاره‌ها غیرفعال می‌شوند و تایمرِ دورِ بعد نصب نمی‌شود. */
  const paused = blocked;

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
          snapshot: `${verseTextOfRound(round)}\nنقشِ هدف: ${round.roleLabel}`,
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

  const select = useCallback(
    (tokenId: string) => {
      const current = rounds[index];
      /* ⚠️ نگهبانِ ثبتِ دوباره. بدونِ آن، دو کلیکِ سریع روی دو ستاره — یا
         یک کلیک و یک Enter — دو درخواست می‌فرستاد و دورِ بعد را هم رد
         می‌کرد. `disabled` روی دکمه‌ها همین را می‌گوید، ولی تکیه بر DOM برای
         یک قاعدهٔ منطقی کافی نیست. */
      // ⚠️ قفلِ ورودی حتی اگر لمسی از زیرِ پوشش رد شود.
      if (!current || answered !== null || paused) return;

      const isCorrect = tokenId === current.correctTokenId;
      playRoleHuntSound(isCorrect ? "correct" : "wrong");
      setAnswered({ tokenId, isCorrect });
      setAnswers((prev) => [
        ...prev,
        { roleKey: current.roleKey, roleLabel: current.roleLabel, isCorrect },
      ]);

      /* بی‌انتظار و بی‌سروصدا: سرور خودش دوباره می‌سنجد و نتیجه‌اش برای
         نمایش لازم نیست. */
      void submitRoleHuntAnswer({
        roundId: roundIds.current[index] ?? roundId(),
        questionId: current.questionId,
        selectedTokenId: tokenId,
      }).catch(() => {});

    },
    [answered, paused, index, rounds],
  );

  /* ⚠️ پیشرویِ دور یک *افکت* است و نه یک `setTimeout` داخلِ کلیک — و این
     تفاوت تمامِ رفتارِ چرخشِ گوشی را می‌سازد.

     با `setTimeout` داخلِ `select`، اگر کاربر وسطِ بازخورد گوشی را عمودی
     می‌کرد، تایمر سرِ وقتش می‌سوخت و دورِ بعد *پشتِ پوشش* می‌آمد: بازیکن
     برمی‌گشت و می‌دید یک مصراع را از دست داده.

     حالا شرطِ زنده بودنِ تایمر خودِ `paused` است. با قفل شدن، پاکسازیِ
     افکت تایمر را برمی‌دارد؛ با باز شدن، دوباره نصب می‌شود. هیچ‌چیزِ دیگری
     عوض نمی‌شود: نه پاسخ دوباره فرستاده می‌شود (آن در `select` است و یک
     بار)، نه امتیاز پاک می‌شود، نه دور جلو می‌رود. */
  /* ⚠️ مهلتِ پاسخ.

     شمارش فقط وقتی شروع می‌شود که نقش کامل رو شده باشد (`revealed`)،
     وگرنه بخشی از چهار ثانیه صرفِ خواندنِ رمزگشا می‌شد و بازیکن برای
     چیزی جریمه می‌شد که هنوز ندیده بود.

     و مثلِ تایمرِ دورِ بعد، با قفلِ گوشیِ عمودی برداشته می‌شود — پس
     چرخاندنِ گوشی هیچ‌وقت باعثِ «وقت تمام» نمی‌شود. */
  useEffect(() => {
    if (phase !== "playing" || answered !== null || paused || !revealed) return;
    const id = window.setTimeout(() => {
      playRoleHuntSound("wrong");
      setAnswered({ tokenId: null, isCorrect: false });
      setAnswers((prev) => [
        ...prev,
        {
          roleKey: rounds[index]?.roleKey ?? "",
          roleLabel: rounds[index]?.roleLabel ?? "",
          isCorrect: false,
        },
      ]);
    }, ROLE_HUNT_CONFIG.answerSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [phase, answered, paused, revealed, index, rounds]);

  useEffect(() => {
    if (answered === null || paused) return;
    const id = window.setTimeout(() => {
      setAnswered(null);
      setHovered(null);
      if (index + 1 >= rounds.length) {
        playRoleHuntSound("sessionEnd");
        setPhase("results");
      } else {
        setIndex(index + 1);
      }
    }, ROLE_HUNT_CONFIG.feedbackMs);
    return () => window.clearTimeout(id);
  }, [answered, paused, index, rounds.length]);

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
      className="rh-root container mx-auto max-w-3xl px-4 py-8 sm:py-10"
      data-phone={phone ? "true" : undefined}
      data-paused={paused ? "true" : undefined}
    >
      {/* ⚠️ پس‌زمینه زیرِ همه‌چیز و بیرون از درختِ تعاملی است.
          `pointer-events` ندارد و `aria-hidden` است، پس نه جلوی کلیکِ
          ستاره‌ها را می‌گیرد و نه برای صفحه‌خوان وجود دارد. تعدادِ ذره‌ها
          عمداً کم است: این صفحه روی خوانا بودنِ یک مصراع ایستاده. */}
      <div className="rh-backdrop" aria-hidden="true">
        <Particles
          className="absolute inset-0"
          quantity={reduced ? 26 : 60}
          size={0.35}
          staticity={60}
          color="var(--color-primary)"
        />
      </div>

      {guestPrompt && (
        <GuestLimitModal section="role-hunt" onDismiss={() => setGuestPrompt(false)} />
      )}

      {paused && <OrientationGate reduced={reduced} />}

      {/* ⚠️ `inert` کلِ بازی را از دسترسِ صفحه‌کلید و صفحه‌خوان بیرون می‌برد —
          نه فقط با `pointer-events` که فقط ماوس و لمس را می‌گیرد. بدونش،
          کاربری که با Tab کار می‌کند می‌توانست پشتِ پوشش به ستاره‌ها برسد و
          پاسخی ثبت کند که اصلاً ندیده است. */}
      <div className="rh-play" inert={paused || undefined}>
      {phase === "intro" && <Intro onStart={start} />}

      {phase === "loading" && (
        <p className="py-24 text-center text-sm text-muted-foreground">
          در حالِ آماده کردنِ مصراع‌ها…
        </p>
      )}

      {phase === "error" && (
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={start}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition-all hover:border-primary hover:text-primary"
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {phase === "playing" && round && (
        <>
          <div className="rh-hud">
            <span className="rh-hud-chip">
              دور
              <b className="game-num">
                {(index + 1).toLocaleString("fa-IR")}/{rounds.length.toLocaleString("fa-IR")}
              </b>
            </span>
            <span className="rh-hud-chip">
              درست
              <b className="game-num">{correctSoFar.toLocaleString("fa-IR")}</b>
            </span>
            <span className="rh-hud-chip">
              زنجیره
              <b className="game-num">{streak.toLocaleString("fa-IR")}</b>
            </span>
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
              className="rh-hud-chip"
              aria-pressed={sound}
              onClick={() => setSoundEnabled(!isSoundEnabled())}
            >
              {sound ? "صدا روشن" : "صدا خاموش"}
            </button>
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
            locked={paused}
          />

          <div className="mt-6 flex justify-center">
            {/* ⚠️ کلید روی دور: رمزگشا با هر دور از نو mount می‌شود و از
                `٭٭٭` شروع می‌کند. بدونِ آن، React همان گره را نگه می‌داشت و
                نقشِ تازه بی‌هیچ انیمیشنی جای نقشِ قبلی می‌نشست. */}
            <div className="rh-decoder-wrap">
              <RoleDecoder
                key={round.questionId}
                roleLabel={round.roleLabel}
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
          </div>

          {/* نتیجهٔ هر پاسخ، برای کسی که صفحه را نمی‌بیند. */}
          <p className="sr-only" aria-live="polite">
            {answered === null
              ? ""
              : answered.isCorrect
                ? "درست بود."
                : "نادرست بود؛ پاسخِ درست روی مصراع نشان داده شد."}
          </p>
        </>
      )}

      {phase === "results" && <RoleHuntResults summary={summary} onRestart={start} />}
      </div>
    </div>
  );
}

/**
 * معرفیِ کوتاه — یک جمله، یک دکمه.
 *
 * ⚠️ عمداً آموزشِ چندمرحله‌ای نیست و قاعدهٔ بازی *فقط* همین‌جا گفته می‌شود.
 * داخلِ خودِ دور هیچ‌وقت «قید را پیدا کن» نوشته نمی‌شود؛ آنجا تنها چیزی که
 * دیده می‌شود خودِ نقش است. دلیلش سنجشی است: اگر هر دور دستورالعمل را تکرار
 * کند، آنچه اندازه می‌گیریم خواندنِ دستورالعمل است و نه شناختِ نقش.
 */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="rh-intro">
      {/* مدارِ ساکن — همان چیزی که پشتِ دکمه انتظارش را دارد. */}
      <div className="rh-intro-orbit" aria-hidden="true">
        {[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((a) => (
          <StarShape
            key={a}
            className="rh-intro-star"
            style={{ "--rh-a": `${a}turn` } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="rh-intro-content">
        <h1 className="game-display text-3xl font-bold sm:text-4xl">شکار نقش‌ها</h1>
        <p className="mt-5 text-base leading-relaxed sm:text-lg">
          هر نقشی که نمایش داده شد، واژهٔ درست را از میان کلمه‌های در حالِ چرخش انتخاب
          کن.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          با پاسخ‌های درست، سرعت و دقتت را در شناختِ نقش‌های دستوری بهتر کن.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="game-display mt-8 inline-flex min-h-12 items-center rounded-xl bg-primary px-9 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-95 active:scale-95 sm:text-lg"
        >
          شروع بازی
        </button>
      </div>
    </div>
  );
}
