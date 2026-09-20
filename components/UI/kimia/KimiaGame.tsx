"use client";

import "./kimia.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GuestLimitModal from "@/components/UI/GuestLimitModal";
import Dispensers, { dispenserHomeFor, dispenserRectFor } from "./Dispensers";
import FootRack from "./FootRack";
import GameBar from "./GameBar";
import KimiaIntro from "./KimiaIntro";
import KimiaResult from "./KimiaResult";
import VerseVessel, { type VesselMode } from "./VerseVessel";
import PourOverlay from "./PourOverlay";
import StatusLine, { type StatusKind } from "./StatusLine";
import { usePourTimeline } from "./use-pour-timeline";
import { useGuestRounds } from "@/lib/guest/use-guest-rounds";
import { immersiveMode } from "@/lib/immersive-mode";
import { GeometricPattern } from "@/components/persian-patterns";
import { useRoundGuard } from "@/lib/games/round-guard";
import { useReducedMotion } from "@/lib/perf/use-perf";
import { useSetReportTarget } from "@/lib/reports/target";
import { setRhythmSource, stopRhythm } from "@/lib/kimia/audio";
import { disposeSfx, playKimiaSfx } from "@/lib/kimia/sfx";
import { KIMIA_CONFIG, type SessionLength } from "@/lib/kimia/config";
import { KIMIA_COPY } from "@/lib/kimia/copy";
import { muddyMix, resultantMix } from "@/lib/kimia/mix";
import {
  canUndo,
  completedSelection,
  emptyTank,
  filledCount,
  isFull,
  pour as pourInto,
  clearSlot,
  reset as resetTank,
  selectSlot,
  targetSlot,
  undo as undoTank,
  type TankState,
} from "@/lib/kimia/selections";
import { KimiaSourceError, liveKimiaSource, type KimiaSource } from "@/lib/kimia/source";
import { sequenceColors } from "@/lib/kimia/visuals";
import type { FootKey, KimiaPhase, KimiaRound, KimiaVerdict } from "@/lib/kimia/types";

/* ═══════════════════════════════════════════════════════════════════════════
   «کیمیای وزن» — گردانندهٔ صحنه.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ سه قاعده‌ای که کلِ این فایل رویشان ایستاده:

   ۱) **منطق هیچ‌وقت منتظرِ انیمیشن نمی‌ماند.** جایگاه در همان لحظهٔ لمس پر
      می‌شود؛ جریانِ رنگی فقط *نشان می‌دهد* که چه اتفاقی افتاده. هیچ
      `animationend`ی وضعیتی را جلو نمی‌برد، پس یک فریمِ گم‌شده، یک تبِ
      پنهان، یا `prefers-reduced-motion` نمی‌تواند بازی را قفل کند.

   ۲) **هیچ پاسخی به دورِ دیگری تعلق نمی‌گیرد.** هر درخواست شناسهٔ دورش را
      با خودش می‌برد و هنگامِ بازگشت با دورِ جاری مقایسه می‌شود. پاسخِ
      کندِ دورِ قبل — که بعد از «آزمایشِ بعدی» می‌رسد — بی‌صدا دور ریخته
      می‌شود.

      ⚠️ `AbortController` اینجا استفاده نشده چون `lib/api/client` سیگنال
      نمی‌گیرد، و عوض کردنِ امضای آن برای همهٔ صفحه‌های سایت، تغییری بیرون
      از دامنهٔ این کار است. نگهبانِ هویت همان تضمین را می‌دهد: درخواست
      ادامه پیدا می‌کند ولی نتیجه‌اش هیچ‌جا نمی‌نشیند.

   ۳) **مرورگر نمی‌داند پاسخ چیست.** هیچ‌جای این کامپوننت درستی را حساب
      نمی‌کند؛ `verdict` فقط از سرور می‌آید و پیش از رسیدنش هیچ پاداش یا
      خطایی روی صفحه نمی‌آید.
   ═══════════════════════════════════════════════════════════════════════════ */

type SessionScore = { solved: number; firstTry: number };

const EMPTY_TANK = emptyTank(0);

export default function KimiaGame({
  /**
   * منبعِ دورها و داوری.
   *
   * ⚠️ پیش‌فرض همیشه سرورِ واقعی است و صفحهٔ بازی هیچ‌وقت چیزِ دیگری
   * نمی‌دهد. تنها جایی که این prop پر می‌شود، پیش‌نمایشِ توسعه است —
   * توضیحش در `lib/kimia/source.ts`.
   */
  source = liveKimiaSource,
}: { source?: KimiaSource } = {}) {
  const reduced = useReducedMotion();
  const guest = useGuestRounds("kimia");
  const router = useRouter();

  const [phase, setPhase] = useState<KimiaPhase>("intro");
  const [round, setRound] = useState<KimiaRound | null>(null);
  const [tank, setTank] = useState<TankState>(EMPTY_TANK);
  const [verdict, setVerdict] = useState<KimiaVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);

  /**
   * چیدمانی که سرور همین حالا ردش کرد.
   *
   * ⚠️ تا وقتی بازیکن *چیزی* را عوض نکرده، «آزمایش ترکیب» غیرفعال است.
   * بدونِ این، زدنِ دوبارهٔ همان دکمه با همان چیدمان یک تلاشِ تازه در
   * کارنامه ثبت می‌کرد و همان جوابِ قبلی را می‌گرفت — یعنی هم آمار
   * خراب می‌شد و هم بازیکن فکر می‌کرد دکمه کار نمی‌کند.
   */
  const [rejected, setRejected] = useState<readonly (FootKey | null)[] | null>(null);

  const [roundIndex, setRoundIndex] = useState(0);
  /**
   * ⚠️ طولِ نشست *state* است و نه ثابت، ولی در `startSession` قفل می‌شود:
   * عوض شدنش وسطِ نشست یعنی «بیت ۷ از ۵»، و بدتر، صفحهٔ نتیجه با مخرجی
   * که هیچ‌وقت بازی نشده. صفحهٔ معرفی تنها جایی است که می‌تواند عوضش کند.
   */
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    KIMIA_CONFIG.defaultSessionLength,
  );
  const [score, setScore] = useState<SessionScore>({ solved: 0, firstTry: 0 });
  const [seen, setSeen] = useState<string[]>([]);

  /* ── صحنه و شیشه‌ها ───────────────────────────────────────────────────── */
  const stageRef = useRef<HTMLDivElement>(null);
  /** آخرین ماده‌ای که ریخته شده — فقط یک تأکیدِ ظریف روی پخش‌کننده‌ها. */
  const [recentFoot, setRecentFoot] = useState<FootKey | null>(null);
  /** تپشِ پخش‌کننده‌ای که همین حالا کپی داده. */
  const [pulse, setPulse] = useState<{ foot: FootKey; seq: number } | null>(null);
  /**
   * ⚠️ این دو نقشه تنها راهِ رسیدنِ *انیمیشن* به DOM اند و هیچ‌کدام state
   * نیستند: عوض شدنشان نباید رندر بسازد، و خطِ زمانیِ ریختن در همان
   * لحظهٔ شروع از رویشان اندازه می‌گیرد — نه در mount، چون رَک اسکرول
   * می‌شود و صفحه عوضِ اندازه.
   */
  const pour = usePourTimeline();
  const pourTimer = useRef<number | null>(null);
  /**
   * ⚠️ نگهبانِ «یک تزریق در هر لحظه» — یک ref و نه state، به همان دلیلِ
   * نگهبانِ ارسال.
   *
   * اندازه‌گیریِ واقعی روی مرورگر: هشت کلیکِ پیاپی روی یک ویال، هشت بار
   * صدای تزریق را هم‌زمان پخش می‌کرد (۵۶ گرهٔ صوتی به‌جای ۷). *داده*
   * سالم می‌ماند — هر هشت کلیک همان `tank`ِ کهنه را می‌بینند و همان یک
   * جایگاه را پر می‌کنند — ولی گوش هشت‌تا می‌شنود. `phase` اینجا کافی
   * نیست چون به‌روزرسانی‌اش ناهم‌زمان است.
   */
  const pouring = useRef(false);
  const pourSeq = useRef(0);

  /* ── هویتِ درخواست‌ها ─────────────────────────────────────────────────── */
  const mounted = useRef(true);
  const currentRoundId = useRef<string | null>(null);
  const fetchSeq = useRef(0);
  const inFlight = useRef(false);
  /** شناسهٔ تلاشِ *جاری*. تلاشِ دوبارهٔ شبکه همین را می‌فرستد. */
  const attemptId = useRef<string | null>(null);
  /**
   * ⚠️ نگهبانِ «یک آزمایش در هر لحظه» — و عمداً یک ref است و نه state.
   *
   * نسخهٔ اول به `phase === "validating"` تکیه می‌کرد و *غلط* بود: سه کلیکِ
   * پشتِ‌هم در یک tick هر سه همان `phase`ِ کهنه را می‌بینند، چون
   * به‌روزرسانیِ state در React ناهم‌زمان است. اندازه‌گیری‌شده با سه کلیکِ
   * پیاپی: سه درخواست با سه شناسهٔ تلاشِ *متفاوت* رفت، یعنی یک فشردنِ
   * دکمه در کارنامه سه تلاش ثبت می‌کرد.
   *
   * یک ref همان‌جا و هم‌زمان ست می‌شود، پس کلیکِ دوم دیگر رد نمی‌شود.
   */
  const submitting = useRef(false);
  /** از لحظه‌ای که دور قابلِ‌بازی شد. مبنای `firstResponseMs`. */
  const actionableAt = useRef<number | null>(null);
  const firstAttemptDone = useRef(false);
  const revealTimer = useRef<number | null>(null);
  const analyzeTimer = useRef<number | null>(null);

  /** طولِ قفلِ «یک شیشه در هر لحظه» — همان طولِ پروازِ کپی. */
  const placeMs = reduced
    ? KIMIA_CONFIG.motion.reduced.placeMs
    : KIMIA_CONFIG.motion.place.flightMs;

  const playing = phase === "playing" || phase === "pouring" || phase === "readyToCheck";
  const editable = phase === "playing" || phase === "readyToCheck" || phase === "wrongReveal";
  const locked = phase === "pouring" || phase === "validating" || phase === "correctReveal";

  /* پوستهٔ بازی فقط وقتی هشدارِ «خروج» می‌دهد که واقعاً چیزی برای از دست
     دادن باشد — یعنی وسطِ یک دور، نه در معرفی و نه در صفحهٔ نتیجه. */
  useRoundGuard(playing || phase === "validating" || phase === "wrongReveal");

  /* ── پاکسازیِ سراسری ──────────────────────────────────────────────────── */
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopRhythm();
      setRhythmSource(null);
      /* ⚠️ بدونِ این، هر بار که کسی وارد و خارج می‌شود یک AudioContextِ
         زنده جا می‌ماند — «صدای شبح» که با هر ناوبری یکی به آن اضافه
         می‌شود و بعضی مرورگرها بعد از شش‌تا اصلاً context تازه نمی‌دهند. */
      disposeSfx();
      /* ⚠️ اینجا عمداً `ref.current` در *پاکسازی* خوانده می‌شود و نه یک
         کپیِ زمانِ mount. قاعدهٔ `exhaustive-deps` معمولاً درست می‌گوید،
         ولی این تایمرها *بعد از* mount ساخته می‌شوند: کپیِ زمانِ mount
         همیشه `null` است و هیچ تایمری را پاک نمی‌کند. */
      /* eslint-disable react-hooks/exhaustive-deps */
      if (pourTimer.current !== null) window.clearTimeout(pourTimer.current);
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
      if (analyzeTimer.current !== null) window.clearTimeout(analyzeTimer.current);
      /* eslint-enable react-hooks/exhaustive-deps */
    };
  }, []);

  /* ── پوستهٔ سایت ───────────────────────────────────────────────────────
     ⚠️ پاورقیِ بزرگِ سایت نباید وسطِ آزمایشگاه باشد. `immersiveMode` از
     قبل برای همین وجود دارد و `SiteChrome` خودش به آن گوش می‌دهد — پس
     هیچ CSSِ سراسری‌ای hack نمی‌شود و هیچ صفحهٔ دیگری تحتِ تأثیر نیست.

       معرفی/نتیجه → `compact`  : سربرگِ جمع‌شده می‌ماند (راهِ بازگشت و
                                  هویتِ سروا)، پاورقی می‌رود.
       حینِ بازی    → `fullscreen`: نه سربرگ، نه پاورقی، نه نقشِ سراسری.
                                  نوارِ خودِ بازی راهِ خروج را دارد، و نقشِ
                                  هندسی را خودِ صحنه با شدتِ کمتر می‌کشد.

     ⚠️ پاکسازی حتماً به `off` برمی‌گرداند، وگرنه رفتن به هر صفحهٔ دیگری
     سایت را بدونِ سربرگ رها می‌کرد. */
  const immersive = phase !== "intro" && phase !== "result";
  useEffect(() => {
    immersiveMode.set(immersive ? "fullscreen" : "compact");
    return () => immersiveMode.set("off");
  }, [immersive]);

  /* تبِ پنهان → صدا قطع. همان قراردادِ بقیهٔ بازی‌های سروا. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopRhythm();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ── گزارشِ اشکال ─────────────────────────────────────────────────────── */
  useSetReportTarget(
    round && phase !== "intro" && phase !== "result"
      ? {
          /* ⚠️ ناحیه «کوییز» است چون منبعِ واقعیِ این بیت همان بانکِ عروضِ
             سماعی است؛ گزارش باید به همان ردیفی برسد که مدیر ویرایشش
             می‌کند و نه به یک ناحیهٔ خیالیِ تازه. */
          area: "quiz" as const,
          targetId: round.questionId,
          snapshot: round.verse.join(" / "),
          /* ⚠️ هیچ‌چیزی از پاسخ اینجا نمی‌آید — نه نامِ وزن و نه ارکان.
             `targetRef` در بدنهٔ درخواستِ گزارش می‌نشیند و همان‌جا دیدنی
             است. */
          targetRef: { game: "kimia", slotCount: round.slotCount },
        }
      : null,
  );

  /* ─────────────────────────── چرخهٔ دورها ───────────────────────────── */

  const loadRound = useCallback(
    async (nextIndex: number, exclude: readonly string[]) => {
      if (inFlight.current) return; // دو بار زدنِ «شروع»/«بعدی» = یک دور
      inFlight.current = true;
      const seq = ++fetchSeq.current;

      setPhase("loading");
      setError(null);
      setVerdict(null);
      setRecentFoot(null);
      setPulse(null);
      setRejected(null);
      pouring.current = false;
      /* ⚠️ بیتِ تازه یعنی هر انیمیشنِ در جریانی بی‌معنا شده: لغو، و ظرف
         خالی. بدونِ این، رنگِ بیتِ قبلی روی بیتِ بعدی می‌ماند. */
      pour.cancel();
      pour.drain(stageRef.current);
      stopRhythm();

      try {
        const next = await source.startRound(exclude);
        if (!mounted.current || seq !== fetchSeq.current) return;

        currentRoundId.current = next.roundId;
        attemptId.current = null;
        firstAttemptDone.current = false;
        actionableAt.current = Date.now();

        setRound(next);
        setRoundIndex(nextIndex);
        setSeen((prev) => [...prev, next.questionId]);
        setTank(emptyTank(next.slotCount));
        setRhythmSource(next.rhythmUrl);
        setPhase("playing");
      } catch (err) {
        if (!mounted.current || seq !== fetchSeq.current) return;
        setError(
          err instanceof KimiaSourceError ? err.message : "شروعِ آزمایش ممکن نشد.",
        );
        setPhase("error");
      } finally {
        if (seq === fetchSeq.current) inFlight.current = false;
      }
    },
    [pour, source],
  );

  const startSession = useCallback(
    (length: SessionLength) => {
      if (inFlight.current) return;
      if (guest.blocked) {
        setGuestPrompt(true);
        return;
      }
      setSessionLength(length);
      setScore({ solved: 0, firstTry: 0 });
      setSeen([]);
      void loadRound(1, []);
    },
    [guest.blocked, loadRound],
  );

  const nextRound = useCallback(() => {
    if (roundIndex >= sessionLength) {
      /* پایانِ نشست. سهمیهٔ مهمان به‌ازای *نشست* شمرده می‌شود و نه دور —
         همان سیاستِ «شکار نقش‌ها»، تا مهمان وسطِ کار بریده نشود. */
      guest.recordRound();
      stopRhythm();
      setRhythmSource(null);
      setPhase("result");
      return;
    }
    void loadRound(roundIndex + 1, seen);
  }, [guest, loadRound, roundIndex, seen, sessionLength]);

  /* ─────────────────────────── تعاملِ مخزن ───────────────────────────── */

  /* ⚠️ اندازه‌گیری *در لحظهٔ پرواز* و نه زودتر: رَک با هر بیت عرضش عوض
     می‌شود، پخش‌کننده‌ها با تغییرِ اندازهٔ صفحه جابه‌جا می‌شوند، و قلم که
     دیر برسد همه‌چیز یک بار دیگر می‌چیند. (چرا از DOM پرسیده می‌شود و نه
     از یک ref: توضیحش در `Dispensers.tsx`.) */
  const dispenserRect = useCallback((foot: FootKey) => dispenserRectFor(foot), []);
  const dispenserHome = useCallback((foot: FootKey) => dispenserHomeFor(foot), []);

  const [cue, setCue] = useState<string | null>(null);
  useEffect(() => {
    if (!cue) return;
    const id = window.setTimeout(() => setCue(null), 2600);
    return () => window.clearTimeout(id);
  }, [cue]);

  const handlePick = useCallback(
    (foot: FootKey) => {
      if (!editable || locked) return;
      if (pouring.current) return;

      const index = targetSlot(tank);
      if (index === null) {
        /* مخزن پر است و هدفِ صریحی نیست. هیچ جایی تصادفی عوض نمی‌شود؛
           فقط گفته می‌شود چطور می‌شود عوضش کرد. */
        /* ⚠️ متن با رفتارِ تازه عوض شد: حالا زدنِ یک بخشِ پر، خودش آن را
           برمی‌دارد. پیامِ قبلی («انتخاب کن») کاری را می‌گفت که دیگر
           قدمِ اولِ درست نیست. */
        setCue("مخزن پر است — روی بخشی که می‌خواهی عوض کنی بزن تا برداشته شود.");
        return;
      }

      const result = pourInto(tank, foot);
      if (!result.mutation) {
        setTank(result.tank);
        return;
      }

      // ── داده، همین حالا ───────────────────────────────────────────────
      setTank(result.tank);
      setVerdict(null);
      setRejected(null);

      // ── تصویر، بعداً و بی‌اهمیت برای منطق ─────────────────────────────
      /* ⚠️ هیچ اندازه‌گیری‌ای اینجا نیست. کپیِ شیشه در همان رندرِ بعدی
         داخلِ سوکت می‌نشیند و `FootRack` خودش با FLIP از پخش‌کننده تا
         آنجا می‌بردش — یعنی مقصد همیشه «همان‌جایی است که مرورگر گذاشته»
         و نه یک مختصاتِ حدسی. اینجا فقط تپشِ خودِ پخش‌کننده ثبت می‌شود. */
      setPulse({ foot, seq: ++pourSeq.current });

      /* ── صدا، هم‌زمان با تصویر ──────────────────────────────────────
         ⚠️ زمان‌بندی از همان اعدادِ `KIMIA_CONFIG.motion` می‌آید و نه از
         عددهای دستی، وگرنه با اولین تغییرِ انیمیشن از هم می‌پاشند:

           T=0                    شیر باز می‌شود
           T=۱۵٪ پرواز            جریان راه می‌افتد
           T=پایانِ پرواز          شیشه در سوکت می‌نشیند

         در حالتِ کم‌حرکت هر سه در ابتدا جمع می‌شوند، چون تصویری هم که
         باید با آن هم‌زمان باشند کوتاه شده. */
      /* ⚠️ اینجا فقط تیکِ لمس زده می‌شود. تُقِ نشستن را خودِ `FootRack`
         روی رویدادِ پایانِ پرواز می‌زند تا صدا و تصویر از هم جدا نیفتند. */
      pouring.current = true;
      playKimiaSfx("valve");
      setRecentFoot(foot);
      setPhase("pouring");

      /* ⚠️ تنها چیزی که قفلِ تزریق را باز می‌کند همین تایمر است — نه
         `animationend`. اگر انیمیشن اصلاً اجرا نشود، بازی دقیقاً سرِ وقت
         آزاد می‌شود. */
      if (pourTimer.current !== null) window.clearTimeout(pourTimer.current);
      pourTimer.current = window.setTimeout(() => {
        pouring.current = false;
        if (!mounted.current) return;
        setPhase(isFull(result.tank) ? "readyToCheck" : "playing");
      }, placeMs);
    },
    [editable, locked, placeMs, tank],
  );

  const handleSelectSlot = useCallback(
    (index: number) => {
      if (!editable || locked) return;
      setTank((prev) => selectSlot(prev, index));
      setCue(null);
    },
    [editable, locked],
  );

  /**
   * برداشتنِ یک رکن با کلیک روی خودِ همان جایگاهِ پر.
   *
   * ⚠️ این *غیرِ* «واگرد» است و عمداً هم غیرِ آن می‌ماند: واگرد آخرین
   * تغییر را برمی‌گرداند (هرچه بوده)، این یکی یک جایگاهِ مشخص را خالی
   * می‌کند. هر دو در تاریخچه ثبت می‌شوند، پس واگرد می‌تواند خودِ این
   * برداشتن را هم پس بگیرد.
   *
   * ⚠️ صدای «drain» همان صدای واگرد است — از دیدِ گوشِ بازیکن هر دو یک
   * چیزند: مایع از مخزن بیرون می‌رود.
   */
  const handleClearSlot = useCallback(
    (index: number) => {
      if (!editable || locked) return;
      setTank((prev) => {
        const { tank: next, mutation } = clearSlot(prev, index);
        if (!mutation) return prev;
        playKimiaSfx("drain");
        setPhase("playing");
        return next;
      });
      setVerdict(null);
      setRejected(null);
      setCue(null);
    },
    [editable, locked],
  );

  const handleUndo = useCallback(() => {
    if (!editable || locked) return;
    playKimiaSfx("drain");
    setTank((prev) => {
      const next = undoTank(prev);
      setPhase(isFull(next) ? "readyToCheck" : "playing");
      return next;
    });
    setVerdict(null);
    setRejected(null);
  }, [editable, locked]);

  const handleReset = useCallback(() => {
    if (!editable || locked) return;
    /* ⚠️ «از نو» فقط مخزن را خالی می‌کند. دور همان دور می‌ماند، پرسش همان
       پرسش، و زمان‌سنجِ تلاشِ اول هم همان — چون هیچ‌کدامِ این‌ها یک تلاش
       نیستند. تلاش فقط زدنِ «آزمایش ترکیب» است. */
    playKimiaSfx("drain");
    setTank((prev) => resetTank(prev));
    setVerdict(null);
    setRejected(null);
    setRecentFoot(null);
    pour.drain(stageRef.current);
    setPhase("playing");
  }, [editable, locked, pour]);

  /**
   * لرزشِ کوتاهِ گوشی.
   *
   * ⚠️ با feature-detect و نه با فرض: `navigator.vibrate` روی iOS اصلاً
   * وجود ندارد و روی دسکتاپ بی‌اثر است. و داخلِ `try` چون بعضی
   * مرورگرها بیرون از ژستِ کاربر استثنا می‌دهند.
   */
  const buzz = useCallback((correct: boolean) => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(
        correct
          ? KIMIA_CONFIG.motion.verdict.vibrateCorrect
          : [...KIMIA_CONFIG.motion.verdict.vibrateWrong],
      );
    } catch {
      /* مرورگر اجازه نداد — بی‌اهمیت. */
    }
  }, []);

  /* ─────────────────────────── آزمایشِ ترکیب ─────────────────────────── */

  const runAttempt = useCallback(
    async (retry: boolean) => {
      if (!round) return;
      if (submitting.current) return;
      if (phase === "pouring" || phase === "correctReveal") return;

      const selected = completedSelection(tank);
      if (!selected) return;

      submitting.current = true;

      /* ⚠️ تلاشِ *کاربر* شناسهٔ تازه می‌گیرد؛ تلاشِ دوبارهٔ *شبکه* همان
         شناسهٔ قبلی را نگه می‌دارد. کلِ تفاوتِ «سه بار تلاش کردم» و «شبکه
         لرزید» همین یک خط است. */
      if (!retry || attemptId.current === null) attemptId.current = crypto.randomUUID();
      const thisAttempt = attemptId.current;
      const thisRound = round.roundId;

      const responseMs =
        firstAttemptDone.current || actionableAt.current === null
          ? null
          : Math.min(Date.now() - actionableAt.current, 600_000);

      /* ⚠️ ریتم با شروعِ ترکیب متوقف می‌شود: دو لایهٔ صوتیِ هم‌زمان،
         هیچ‌کدام شنیده نمی‌شوند. */
      stopRhythm();
      setPhase("validating");
      setError(null);
      setVerdict(null);

      /* ══════════════════════════════════════════════════════════════
         ⚠️ درخواست و انیمیشن **هم‌زمان** راه می‌افتند و نه پشتِ سرِ هم.
         ══════════════════════════════════════════════════════════════
         ریختنِ چهار شیشه ~۴ ثانیه است. اگر اول انیمیشن اجرا می‌شد و بعد
         درخواست می‌رفت، هر آزمایش ۴ ثانیه + زمانِ شبکه طول می‌کشید — در
         نشستِ ده‌بیتی یعنی یک دقیقه انتظارِ اضافه. حالا شبکه زیرِ
         انیمیشن کار می‌کند و در حالتِ معمول، پاسخ پیش از پایانِ ریختن
         رسیده است.

         ⚠️ و هیچ‌چیزِ پاسخ پیش از پایانِ انیمیشن روی صفحه نمی‌آید: رنگِ
         نهایی، لبهٔ سبز و متنِ نتیجه همه بعد از `await` می‌آیند — پس
         بازیکن نمی‌تواند از روی زود آمدنِ چیزی حدس بزند. */
      const selectedColors = sequenceColors(selected);
      const animation = pour.run({
        scope: stageRef.current,
        colors: selectedColors,
        reduced,
        /* صدای ریختن را خودِ خطِ زمانی می‌زند (پیوسته و هم‌ساعت با
           انیمیشن)؛ اینجا فقط تُقِ نشستنِ هر شیشه می‌ماند. */
        onPourEnd: () => playKimiaSfx("settle"),
      });

      /* ⚠️ خطای درخواست همین‌جا مهار می‌شود و نه در `await`ِ بعدی: بینِ
         این دو یک `await animation` هست و یک rejectionِ بی‌صاحب در آن
         فاصله، در کنسول به‌صورتِ unhandled ظاهر می‌شد. */
      const request = source
        .submitAttempt({
          roundId: thisRound,
          questionId: round.questionId,
          attemptId: thisAttempt,
          selected,
          responseMs,
        })
        .then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        );

      let landed = false;
      void request.then(() => {
        landed = true;
      });

      try {
        await animation;
        if (!mounted.current || currentRoundId.current !== thisRound) return;

        /* نبضِ «در حالِ سنجش» فقط وقتی دیده می‌شود که شبکه از انیمیشن هم
           کندتر بوده باشد — یعنی واقعاً منتظریم. */
        if (!landed) {
          await new Promise((r) => window.setTimeout(r, KIMIA_CONFIG.analyzingAfterMs));
          if (!mounted.current || currentRoundId.current !== thisRound) return;
          if (!landed) setAnalyzing(true);
        }

        const settled = await request;
        // ⚠️ پاسخِ دورِ قبل، بعد از «آزمایشِ بعدی»: بی‌صدا دور ریخته می‌شود.
        if (!mounted.current || currentRoundId.current !== thisRound) return;
        setAnalyzing(false);
        if (!settled.ok) throw settled.error;
        const result = settled.value;

        const wasFirst = !firstAttemptDone.current;
        firstAttemptDone.current = true;

        /* ⚠️ رنگِ نهایی *اینجا* ساخته می‌شود و نه زودتر: پیش از پاسخِ
           سرور، مرورگر نمی‌داند ترکیب پایدار است یا گل‌آلود. حرکت برای
           هر دو یکی است و فقط همین رنگ فرق می‌کند. */
        pour.blend(
          stageRef.current,
          result.isCorrect ? resultantMix(selectedColors) : muddyMix(selectedColors),
        );

        setVerdict(result);
        setRejected(result.isCorrect ? null : tank.slots);
        buzz(result.isCorrect);
        setPhase(result.isCorrect ? "correctReveal" : "wrongReveal");
        /* ⚠️ صدا با *شروعِ* رقص هم‌زمان است و نه با پایانش: لایهٔ ترکیب
           در ۵۲۰ms محو می‌شود و حلِّ هارمونیک ~۹۰۰ms طول می‌کشد، پس صدا
           زیرِ هاله ادامه پیدا می‌کند و با نشستنِ رنگ تمام می‌شود. */
        playKimiaSfx(result.isCorrect ? "correct" : "wrong");

        if (result.isCorrect) {
          setScore((prev) => ({
            solved: prev.solved + 1,
            firstTry: prev.firstTry + (wasFirst ? 1 : 0),
          }));
        }

        if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
        revealTimer.current = window.setTimeout(
          () => {
            if (!mounted.current || currentRoundId.current !== thisRound) return;
            /* پاسخِ درست تا زدنِ «آزمایشِ بعدی» روی صفحه می‌ماند؛ پاسخِ
               غلط بعد از نمایشِ کوتاه، مخزن را دوباره قابلِ ویرایش
               می‌کند — با همان انتخابِ قبلی، نه خالی. */
            if (!result.isCorrect) {
              /* ترکیبِ ناپایدار تخلیه می‌شود تا آزمایشِ بعدی روی ظرفِ
                 خالی باشد؛ چیدمانِ بازیکن دست‌نخورده می‌ماند. */
              pour.drain(stageRef.current);
              setPhase("readyToCheck");
            }
          },
          result.isCorrect ? KIMIA_CONFIG.correctRevealMs : KIMIA_CONFIG.wrongRevealMs,
        );
      } catch (err) {
        if (!mounted.current || currentRoundId.current !== thisRound) return;
        /* ⚠️ شکستِ شبکه هیچ بازخوردِ درست/غلطی نمی‌سازد. انتخابِ کاربر
           دست‌نخورده می‌ماند و همان شناسهٔ تلاش برای فرستادنِ دوباره
           نگه داشته می‌شود — پس تلاشِ دوباره در آمار دو بار شمرده
           نمی‌شود. */
        setError(
          err instanceof KimiaSourceError ? err.message : "نتیجه ثبت نشد؛ دوباره امتحان کن.",
        );
        pour.drain(stageRef.current);
        setPhase("readyToCheck");
      } finally {
        submitting.current = false;
        if (analyzeTimer.current !== null) window.clearTimeout(analyzeTimer.current);
        if (mounted.current) setAnalyzing(false);
      }
    },
    [buzz, phase, pour, reduced, round, source, tank],
  );

  /** حالتِ دیداریِ ظرفِ بیت — یک منبع، تا رنگ و بردر و لرزش با هم بخوانند. */
  const vesselMode: VesselMode = analyzing
    ? "analyzing"
    : phase === "correctReveal"
      ? "correct"
      : phase === "wrongReveal"
        ? "wrong"
        : "edit";

  /* ─────────────────────────── صفحه‌کلید ─────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key !== "Enter" || e.repeat) return;
      // ⚠️ Enter روی یک دکمه کارِ خودش را می‌کند؛ اینجا فقط میان‌بُرِ صفحه است.
      if (target?.closest("button")) return;
      if (phase === "readyToCheck") {
        e.preventDefault();
        void runAttempt(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, runAttempt]);

  /* ─────────────────────────────── نما ───────────────────────────────── */

  if (phase === "intro") {
    return (
      <>
        <KimiaIntro
          length={sessionLength}
          onLengthChange={setSessionLength}
          onStart={startSession}
        />
        {guestPrompt && (
          <GuestLimitModal section="kimia" onDismiss={() => setGuestPrompt(false)} />
        )}
      </>
    );
  }

  if (phase === "result") {
    return (
      <KimiaResult
        total={sessionLength}
        solved={score.solved}
        firstTry={score.firstTry}
        onRestart={() => startSession(sessionLength)}
      />
    );
  }

  const filled = filledCount(tank);
  const remaining = tank.slots.length - filled;
  /* چیدمان هنوز همان چیزی است که سرور ردش کرد؟ */
  const unchangedAfterWrong =
    rejected !== null &&
    rejected.length === tank.slots.length &&
    rejected.every((foot, i) => foot === tank.slots[i]);
  const ready =
    (phase === "readyToCheck" || (isFull(tank) && phase === "wrongReveal")) &&
    !unchangedAfterWrong;
  const ctaBusy = phase === "validating";

  /* ⚠️ یک منبع برای «سطحِ نتیجه چه می‌گوید»، تا حالت‌ها روی هم نیفتند:
     خطای شبکه بر هر چیزِ دیگری مقدم است، بعد داوریِ سرور، بعد اشارهٔ
     کوتاهِ رابط، و در سکوت میکروکپیِ «چند جایگاه مانده». */
  const statusKind: StatusKind = error
    ? "error"
    : /* ⚠️ تا بیت نیامده، رَک هنوز جایگاهی ندارد و «ترکیب آماده است»
         دروغ است (با شبکهٔ کند دیده شد). */
      !round || phase === "loading"
      ? "loading"
    : verdict && phase === "correctReveal"
      ? "correct"
      : verdict && !verdict.isCorrect && phase === "wrongReveal"
        ? "wrong"
        : /* ⚠️ بعد از نمایشِ کوتاهِ «غلط»، جمله عوض می‌شود به «یک جایگاه
             را عوض کن»: تا وقتی چیدمان دست‌نخورده است دکمه هم خاموش
             است، و صفحه باید *بگوید* چرا. */
          unchangedAfterWrong && phase === "readyToCheck"
          ? "wrongIdle"
          : phase === "validating"
            ? analyzing
              ? "analyzing"
              : "mixing"
            : cue
              ? "cue"
              : "idle";

  return (
    <div className="km-root" dir="rtl">
      {/* ⚠️ نقشِ هندسیِ سروا اینجا و نه از پوستهٔ سایت: در حالتِ تمام‌صفحه
          لایهٔ سراسری رندر نمی‌شود، و مهم‌تر اینکه شدتش باید کمتر باشد تا
          با شعر و مایع‌ها رقابت نکند. */}
      <div className="km-backdrop" aria-hidden>
        <GeometricPattern className="km-backdrop-pattern" opacity={0.03} />
        <span className="km-backdrop-vignette" />
        <span className="km-backdrop-beam" />
      </div>

      <GameBar
        round={roundIndex}
        total={sessionLength}
        onLeave={() => router.push("/game")}
      />

      <div ref={stageRef} className="km-stage">
        {phase === "error" ? (
          <div className="km-offline" role="alert">
            <span className="km-offline-mark" aria-hidden />
            <p className="km-offline-title game-title">دستگاه روشن نشد</p>
            <p className="km-offline-note">{error}</p>
            <button
              type="button"
              className="km-cta"
              onClick={() => void loadRound(roundIndex || 1, seen)}
            >
              دوباره تلاش کن
            </button>
          </div>
        ) : (
          <>
            <VerseVessel
              lines={round?.verse ?? []}
              loading={!round || phase === "loading"}
              mode={vesselMode}
              playDisabled={locked}
            />

            <FootRack
              slots={tank.slots}
              activeSlot={tank.activeSlot}
              interactive={editable && !locked}
              reduced={reduced}
              dispenserRect={dispenserRect}
              returnRect={dispenserHome}
              onSelectSlot={handleSelectSlot}
              onClearSlot={handleClearSlot}
            />

            {/* ⚠️ نوارِ اقدام: یک ردیف، ارتفاعِ ثابت، راست وضعیت و چپ
                دکمه‌ها. کارتِ نتیجه حذف شد — توضیحش در `StatusLine`. */}
            <div className="km-actions">
              <StatusLine
                kind={statusKind}
                verdict={verdict}
                message={error ?? cue}
                remaining={remaining}
              />

              <div className="km-actions-main">
                <button
                  type="button"
                  className="km-ghost-btn"
                  onClick={handleUndo}
                  disabled={!editable || locked || !canUndo(tank)}
                >
                  واگرد
                </button>
                <button
                  type="button"
                  className="km-ghost-btn"
                  onClick={handleReset}
                  disabled={!editable || locked || filled === 0}
                >
                  از نو
                </button>

              {phase === "correctReveal" ? (
                <button type="button" className="km-cta km-cta-next" onClick={nextRound}>
                  {roundIndex >= sessionLength ? KIMIA_COPY.cta.finish : KIMIA_COPY.cta.next}
                </button>
              ) : (
                <button
                  /* ⚠️ `key` با عوض شدنِ متن، دکمه را *جایگزین* می‌کند و
                     نه ویرایش: گرهٔ متنِ وسط‌چین با تغییرِ طولِ متن جابه‌جا
                     می‌شد و همان چند میلیونمِ CLS از اینجا می‌آمد. گرهٔ
                     تازه «جابه‌جایی» حساب نمی‌شود. */
                  key={error ? "retry" : "mix"}
                  type="button"
                  className="km-cta"
                  onClick={() => void runAttempt(Boolean(error))}
                  disabled={!ready || ctaBusy || locked}
                  aria-busy={ctaBusy}
                >
                  <span className="km-cta-label" data-busy={ctaBusy || undefined}>
                    {error ? KIMIA_COPY.cta.retry : KIMIA_COPY.cta.mix}
                  </span>
                  {/* ⚠️ همیشه رندر می‌شود و فقط *دیده* نمی‌شود: با
                      آمدن و رفتنِ گره، عرضِ دکمه عوض می‌شد و همان چند
                      صدمِ CLS را می‌ساخت (اندازه‌گیری‌شده). */}
                  <span className="km-cta-spin" data-on={ctaBusy || undefined} aria-hidden />
                </button>
              )}

              </div>
            </div>

            <Dispensers
              recentFoot={recentFoot}
              pulse={pulse}
              disabled={!editable || locked}
              onPick={handlePick}
            />

            {/* لایهٔ جریان — ثابت روی صفحه، بیرون از جریانِ چیدمان. */}
            <PourOverlay />

          </>
        )}
      </div>

      {guestPrompt && (
        <GuestLimitModal section="kimia" onDismiss={() => setGuestPrompt(false)} />
      )}
    </div>
  );
}
