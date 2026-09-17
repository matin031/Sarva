"use client";

// شیوه‌نامهٔ همین بازی، کنارِ خودش. دلیلش بالای همان فایل نوشته شده.
import "./role-hunt.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GuestLimitModal from "@/components/UI/GuestLimitModal";
import { Particles } from "@/components/UI/kit/particles";
import { useGuestRounds } from "@/lib/guest/use-guest-rounds";
import { useRoundGuard } from "@/lib/games/round-guard";
import { useReducedMotion } from "@/lib/perf/use-perf";
import { useSetReportTarget } from "@/lib/reports/target";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";
import { summarizeRoleHuntSession, verseTextOfRound } from "@/lib/role-hunt/round";
import { fetchRoleHuntRounds, RoleHuntSourceError, submitRoleHuntAnswer } from "@/lib/role-hunt/source";
import type { RoleHuntRound } from "@/lib/role-hunt/types";
import OrbitStage from "./OrbitStage";
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

type Answered = { tokenId: string; isCorrect: boolean };

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
  const reduced = useReducedMotion();
  const guest = useGuestRounds("role-hunt");

  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [guestPrompt, setGuestPrompt] = useState(false);

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
  const timer = useRef<number | null>(null);

  const round = rounds[index] ?? null;

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

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const start = useCallback(async () => {
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

  const select = useCallback(
    (tokenId: string) => {
      const current = rounds[index];
      /* ⚠️ نگهبانِ ثبتِ دوباره. بدونِ آن، دو کلیکِ سریع روی دو ستاره — یا
         یک کلیک و یک Enter — دو درخواست می‌فرستاد و دورِ بعد را هم رد
         می‌کرد. `disabled` روی دکمه‌ها همین را می‌گوید، ولی تکیه بر DOM برای
         یک قاعدهٔ منطقی کافی نیست. */
      if (!current || answered !== null) return;

      const isCorrect = tokenId === current.correctTokenId;
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

      timer.current = window.setTimeout(() => {
        setAnswered(null);
        setHovered(null);
        if (index + 1 >= rounds.length) setPhase("results");
        else setIndex(index + 1);
      }, ROLE_HUNT_CONFIG.feedbackMs);
    },
    [answered, index, rounds],
  );

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
    <div dir="rtl" className="rh-root container mx-auto max-w-3xl px-4 py-8 sm:py-10">
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
          />

          <div className="mt-6 flex justify-center">
            {/* ⚠️ کلید روی دور: رمزگشا با هر دور از نو mount می‌شود و از
                `٭٭٭` شروع می‌کند. بدونِ آن، React همان گره را نگه می‌داشت و
                نقشِ تازه بی‌هیچ انیمیشنی جای نقشِ قبلی می‌نشست. */}
            <RoleDecoder key={round.questionId} roleLabel={round.roleLabel} reduced={reduced} />
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
    <div className="mx-auto max-w-md py-14 text-center sm:py-20">
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
  );
}
