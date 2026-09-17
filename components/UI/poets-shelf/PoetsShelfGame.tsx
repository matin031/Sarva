"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { defaultPoetsShelfConfig } from "@/lib/poets-shelf/config";
import {
  acceptsInput,
  initialMachineState,
  reduce,
  roundInProgress,
  type MachineState,
} from "@/lib/poets-shelf/machine";
import { buildRound } from "@/lib/poets-shelf/questions";
import { detectQualityTier, isWebGLAvailable, qualityFor } from "@/lib/poets-shelf/quality";
import { emitSound } from "@/lib/poets-shelf/sound";
import { useScenePalette } from "@/lib/poets-shelf/theme";
import { useRoundGuard } from "@/lib/games/round-guard";
import { Hud } from "./Hud";
import { LoadingVeil } from "./LoadingVeil";
import "./poets-shelf.css";

/* ═══════════════════════════════════════════════════════════════════════════
   «قفسهٔ شاعران» — لایهٔ هماهنگی.
   ═══════════════════════════════════════════════════════════════════════════

   ── تقسیمِ کار در این بازی ────────────────────────────────────────────────

       machine.ts   چه گذارهایی مجازند       (خالص، بدونِ زمان)
       اینجا        چه‌وقت آن گذارها بیفتند  (تایمرها، ورودی، بارگذاری)
       GameScene    هر حالت چه شکلی است      (بدونِ تصمیم)

   هیچ‌کدام کارِ آن دوتای دیگر را نمی‌کنند. همین است که اجازه می‌دهد
   «کلیکِ سریع بازی را نشکند» یک *ویژگیِ ساختاری* باشد و نه مجموعه‌ای از
   نگهبان‌های موردی.

   ── چرا همهٔ تایمرها با `[state, epoch]` کلید می‌خورند ─────────────────────

   `epoch` با هر گذار یکی بالا می‌رود. پس effectِ تایمر با هر گذار دوباره
   اجرا می‌شود و تابعِ تمیزکاری‌اش تایمرِ قبلی را لغو می‌کند. نتیجه: هیچ
   تایمرِ جامانده‌ای از یک حالتِ قدیمی نمی‌تواند در حالتِ تازه شلیک کند —
   بدونِ آنکه لازم باشد جایی دستی حساب کنیم کدام تایمر هنوز زنده است.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ `ssr: false` اجباری است. سرور نه `window` دارد، نه `WebGLRenderingContext`
   و نه `document.createElement("canvas")`ی که رنگ‌های تم را حل کند. */
const GameCanvas = dynamic(() => import("./runtime").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => null,
});

/* پشتیبانیِ WebGL در طولِ عمرِ صفحه عوض نمی‌شود، پس یک بار سنجیده و نگه
   داشته می‌شود. `getSnapshot` را React مکرر صدا می‌زند و ساختنِ یک بومِ
   تازه در هر بار، هزینهٔ بی‌دلیلی بود. */
let webglSupport: boolean | null = null;
function readWebglSupport(): boolean {
  if (webglSupport === null) webglSupport = isWebGLAvailable();
  return webglSupport;
}
/** هیچ‌وقت عوض نمی‌شود، پس اشتراکی هم لازم نیست. */
const subscribeNever = () => () => {};

export default function PoetsShelfGame() {
  const config = defaultPoetsShelfConfig;
  const palette = useScenePalette();

  const [machine, dispatch] = useReducer(reduce, config, initialMachineState);

  /* ⚠️ آینه‌ای از حالت، برای callbackهایی که از بیرونِ React می‌آیند
     (`onArrive` از حلقهٔ رندرِ three). بدونِ آن، آن callback حالتِ لحظهٔ
     ساخته‌شدنش را می‌دید — همان «بستارِ کهنه»ای که باید از آن پرهیز شود.

     ⚠️ نوشتنش در یک effect است و نه در بدنهٔ رندر: نوشتن در ref هنگامِ رندر،
     رندرِ ناخالص است و با رندرِ همزمانِ React (که می‌تواند رها و دوباره
     شروع شود) ناسازگار. effect فقط پس از *تثبیتِ* رندر اجرا می‌شود.

     بدونِ آرایهٔ وابستگی، یعنی پس از هر رندر. و چون پیش از هر effectِ
     دیگری در این کامپوننت اعلام شده، بقیه همیشه مقدارِ تازه را می‌بینند. */
  const machineRef = useRef<MachineState>(machine);
  useEffect(() => {
    machineRef.current = machine;
  });

  const [sceneReady, setSceneReady] = useState(false);
  const [returningHome, setReturningHome] = useState(false);

  /* ⚠️ زمانِ جلوه‌ها در ref است و نه در state. شروعِ یک پاشش یا تکانِ
     دوربین نباید کلِ درختِ صحنه را دوباره رندر کند — کاری که با یک
     `setState` در هر برخورد لازم می‌شد. */
  const impactAt = useRef(0);
  const successAt = useRef(0);

  /* ⚠️ WebGL با `useSyncExternalStore` خوانده می‌شود و نه با effect.
     در سرور `true` برمی‌گردد (خوش‌بینانه) و در مرورگر مقدارِ واقعی — و
     React خودش این اختلاف را بدونِ هشدارِ هیدراسیون مدیریت می‌کند. با
     `useState` + effect یا هشدارِ هیدراسیون می‌گرفتیم یا یک رندرِ آبشاری. */
  const webglOk = useSyncExternalStore(subscribeNever, readWebglSupport, () => true);

  /* پلهٔ کیفیت و ترجیحِ حرکت یک بار سنجیده می‌شوند. سنجشِ دوباره در هر رندر
     یعنی `matchMedia` و `hardwareConcurrency` در مسیرِ داغ. */
  const [tier] = useState(() => (typeof window === "undefined" ? "medium" : detectQualityTier()));
  const quality = useMemo(() => qualityFor(tier), [tier]);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* نگهبانِ خروج: فقط وقتی واقعاً دوری در جریان است. */
  useRoundGuard(roundInProgress(machine));

  /* ── ساختِ دور ─────────────────────────────────────────────────────────── */
  const nextRound = useCallback(
    () =>
      buildRound({
        optionCount: config.optionCount,
        avoidAuthorIds: machineRef.current.recentAuthorIds,
      }),
    [config.optionCount],
  );

  /* بازی تازه وقتی شروع می‌شود که صحنه واقعاً چیزی کشیده باشد — وگرنه اولین
     دور روی یک صفحهٔ خالی می‌گذشت. */
  useEffect(() => {
    if (!sceneReady || machineRef.current.state !== "intro") return;
    dispatch({ type: "start", round: nextRound() });
    emitSound("roundStart");
  }, [sceneReady, nextRound]);

  /* ── تایمرهای گذار ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const { state, outcome } = machine;
    let timer: number | undefined;

    switch (state) {
      case "arrived":
        /* مکثِ کوتاه پیش از واکنشِ کتاب. بدونِ آن، کتاب در همان فریمی که
           شخصیت می‌ایستد شروع به افتادن می‌کرد و رابطهٔ علت و معلول گم
           می‌شد. */
        timer = window.setTimeout(() => dispatch({ type: "resolve" }), config.settleMs);
        break;

      case "resolving":
        /* ⚠️ این دو عدد باید با انیمیشنِ کتاب یکی باشند: برای پاسخِ نادرست،
           `slamMs` همان `SLAM_FALL` در `bookChoreography.ts` است — یعنی
           لحظه‌ای که کتاب واقعاً به سر می‌رسد. هر ناهماهنگی یعنی شخصیت
           پیش از رسیدنِ کتاب زمین می‌خورد. */
        timer = window.setTimeout(
          () => dispatch({ type: "impact" }),
          outcome === "correct" ? config.cheerLeadMs : config.slamMs,
        );
        break;

      case "success":
        timer = window.setTimeout(() => dispatch({ type: "recover" }), config.successMs);
        break;

      case "failure":
        /* طولِ کلیپِ زمین‌خوردن، به‌علاوهٔ مکثِ کمدی. آن مکث همان چیزی است
           که صحنه را از «افتاد» به «افتاد… و یک لحظه همان‌جا ماند» می‌برد. */
        timer = window.setTimeout(
          () => dispatch({ type: "recover" }),
          config.fallMs + config.comedyPauseMs,
        );
        break;

      default:
        break;
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    /* ⚠️ `epoch` در وابستگی‌ها هست تا هر گذار — حتی گذار به همان حالت —
       تایمر را از نو بچیند و قبلی را لغو کند. */
  }, [machine.state, machine.epoch, machine.outcome, config, machine]);

  /* ── برخاستن و برگشتن ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (machine.state !== "resetting") return;

    /* ⚠️ فقط پاسخِ نادرست به مهلتِ برخاستن نیاز دارد؛ پس از جشن، شخصیت
       همین حالا ایستاده است و مکثِ اضافه فقط دور را کُند می‌کرد. */
    const delay = machine.outcome === "wrong" ? config.standUpMs : 140;
    const timer = window.setTimeout(() => setReturningHome(true), delay);

    /* ⚠️ صفر کردن در *تمیزکاری* انجام می‌شود و نه در شاخهٔ دیگرِ همین
       effect. هر دو نتیجهٔ یکسانی دارند، ولی این یکی هنگامِ خروج از
       `resetting` اجرا می‌شود و نه در بدنهٔ رندرِ حالت‌های دیگر — یعنی
       رندرِ آبشاری راه نمی‌اندازد. */
    return () => {
      window.clearTimeout(timer);
      setReturningHome(false);
    };
  }, [machine.state, machine.epoch, machine.outcome, config.standUpMs]);

  /* ── نشانه‌های لحظه‌ای ───────────────────────────────────────────────────
     فقط نوشتن در ref و شلیکِ رویدادِ صدا. هیچ‌کدام رندر لازم ندارند. */
  useEffect(() => {
    if (machine.state === "failure") {
      impactAt.current = performance.now();
      emitSound("slam", 1);
      emitSound("dizzy");
    } else if (machine.state === "success") {
      successAt.current = performance.now();
      emitSound("success");
    } else if (machine.state === "resolving") {
      emitSound("bookLift");
    }
  }, [machine.state, machine.epoch]);

  /* ── ورودی ─────────────────────────────────────────────────────────────── */
  const handleSelect = useCallback((index: number) => {
    /* ⚠️ اینجا هیچ نگهبانی لازم نیست. `reduce` رویدادِ `select` را فقط در
       حالتِ `ready` می‌پذیرد و در بقیهٔ حالت‌ها بی‌صدا رد می‌کند. یک
       نگهبانِ دومِ `if (busy) return` اینجا، فقط یک منبعِ حقیقتِ دوم
       می‌ساخت که می‌توانست با ماشین اختلاف پیدا کند. */
    if (!acceptsInput(machineRef.current)) return;
    emitSound("select");
    dispatch({ type: "select", index });
  }, []);

  const handleArrive = useCallback(() => {
    const current = machineRef.current;
    if (current.state === "moving") {
      dispatch({ type: "arrive" });
    } else if (current.state === "resetting") {
      dispatch({ type: "next", round: nextRound() });
      emitSound("roundStart");
    }
  }, [nextRound]);

  /* حالتِ اشکال‌زدایی: `?debugHits=1` جعبه‌های لمس را دیدنی می‌کند. */
  const debugHits = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debugHits") === "1";
  }, []);

  if (!webglOk) {
    return (
      <div className="ps-fallback" dir="rtl">
        <p>
          این بازی به WebGL نیاز دارد و مرورگرِ شما آن را در دسترس نگذاشته است. لطفاً شتاب‌دهندهٔ
          سخت‌افزاری را روشن کنید یا از مرورگرِ دیگری استفاده کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="ps-root" dir="rtl">
      <Hud machine={machine} />

      <div className="ps-stage">
        <GameCanvas
          machine={machine}
          config={config}
          quality={quality}
          palette={palette}
          reducedMotion={reducedMotion}
          returningHome={returningHome && machine.state === "resetting"}
          onSelect={handleSelect}
          onArrive={handleArrive}
          impactAt={impactAt}
          successAt={successAt}
          debugHits={debugHits}
          onSceneReady={() => setSceneReady(true)}
        />

        {/* پرده تا اولین فریمِ واقعی سرِ جایش می‌ماند. */}
        <LoadingVeil visible={!sceneReady} />
      </div>
    </div>
  );
}
