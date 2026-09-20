"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FootRack from "./FootRack";
import PourOverlay from "./PourOverlay";
import TestTube from "./TestTube";
import VerseVessel from "./VerseVessel";
import { usePourTimeline } from "./use-pour-timeline";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import { resultantMix } from "@/lib/kimia/mix";
import { sequenceColors } from "@/lib/kimia/visuals";
import { useReducedMotion } from "@/lib/perf/use-perf";
import type { FootKey } from "@/lib/kimia/types";

/**
 * پیش‌نمایشِ زندهٔ بازی، کنارِ متنِ صفحهٔ شروع.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا با خودِ قطعه‌های بازی و نه یک تصویر یا یک کپیِ ساده‌شده
 * ═══════════════════════════════════════════════════════════════════════
 * نسخهٔ قبل یک تصویرِ رندرشدهٔ بشر بود: زیبا، ولی چیزی دربارهٔ *بازی*
 * نمی‌گفت. یک ویدیو یا یک کپیِ ساده‌شده هم همان مشکل را با هزینهٔ
 * نگه‌داریِ دوبرابر داشت — هر تغییری در بازی، یک نسخهٔ دوم را کهنه
 * می‌کرد.
 *
 * اینجا دقیقاً `VerseVessel`، `FootRack`، `TestTube` و همان
 * `usePourTimeline` اجرا می‌شوند. یعنی چیزی که تازه‌وارد می‌بیند، همان
 * چیزی است که با زدنِ «شروع» خواهد دید، و هیچ‌وقت نمی‌تواند از بازی عقب
 * بماند.
 *
 * ── و کاملاً تزئینی است ─────────────────────────────────────────────────
 * ⚠️ `aria-hidden` و `pointer-events: none`: برای صفحه‌خوان تکرارِ همان
 * چیزی است که تیتر و لید می‌گویند، و لمسش نباید کاری کند — دکمهٔ واقعیِ
 * شروع کنارش است.
 *
 * ── و هیچ‌وقت بی‌دلیل کار نمی‌کند ──────────────────────────────────────
 * ⚠️ حلقه با `IntersectionObserver` و `visibilitychange` دروازه دارد: از
 * دید که خارج شد یا تب که پنهان شد، همان‌جا می‌ایستد. یک انیمیشنِ
 * همیشه‌درحال‌اجرا روی صفحه‌ای که کسی نگاهش نمی‌کند، فقط باتری مصرف
 * می‌کند.
 *
 * ⚠️ و با `prefers-reduced-motion` اصلاً حلقه‌ای نیست: یک قابِ ثابتِ
 * تمام‌شده نشان داده می‌شود، تا همان اطلاعات بدونِ حرکت منتقل شود.
 */

/** ارکانِ نمایشی — یک وزنِ واقعی، تا آنچه دیده می‌شود دروغ نباشد. */
const DEMO_FEET: readonly FootKey[] = ["فاعلاتن", "فاعلاتن", "فاعلن"];
/** پخش‌کننده‌های نمایشی: ارکانِ خودِ همین وزن، به‌اضافهٔ چند رنگِ دیگر. */
const DEMO_POOL: readonly FootKey[] = [
  "فاعلاتن",
  "فاعلن",
  "مفاعیلن",
  "مستفعلن",
  "فعولن",
  "مفتعلن",
];
const DEMO_VERSE = ["بشنو این نی چون شکایت می‌کند", "از جدایی‌ها حکایت می‌کند"];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/* ⚠️ شمارندهٔ حلقه‌های *در حالِ چرخش* — فقط توسعه.
   با چشم دیده نمی‌شود، و دو ادعا را اثبات می‌کند که هر دو نامرئی‌اند:
   «بیرونِ دید هیچ حلقه‌ای نمی‌چرخد» و «بعد از رفتن به بازی چیزی
   بی‌صاحب نمی‌ماند». در build نهایی این شاخه اصلاً وجود ندارد. */
function countLoop(delta: number): void {
  if (process.env.NODE_ENV !== "development") return;
  const w = window as unknown as { __kimiaPreviewLoops?: number };
  w.__kimiaPreviewLoops = Math.max(0, (w.__kimiaPreviewLoops ?? 0) + delta);
}

export default function KimiaIntroPreview() {
  const reduced = useReducedMotion();
  const pour = usePourTimeline();
  const stageRef = useRef<HTMLDivElement>(null);
  const poolRefs = useRef(new Map<FootKey, HTMLElement>());
  /**
   * ⚠️ شناسهٔ اجرا و نه یک پرچمِ ساده.
   *
   * در حالتِ توسعه، React هر effect را دو بار سوار می‌کند. با یک پرچمِ
   * `alive`، اجرای دوم همان پرچم را دوباره `true` می‌کرد و آن‌وقت *دو*
   * حلقه هم‌زمان می‌چرخیدند و خطِ زمانیِ همدیگر را لغو می‌کردند — نتیجه
   * یک پیش‌نمایشِ قفل‌شده روی رَکِ پر بود (در اسکرین‌شات دیده شد). با
   * شناسه، فقط جدیدترین اجرا خودش را زنده می‌داند.
   */
  const runId = useRef(0);
  /**
   * دروازهٔ «الان دیده می‌شود؟».
   *
   * ⚠️ یک ref و نه state: هم حلقه در هر گام و هم خطِ زمانی در *هر فریم*
   * از آن می‌خوانند، و هیچ‌کدام نباید باعثِ رندرِ React شود.
   *
   * ⚠️ پیش‌فرضش `false` است و نه `true`: تا وقتی `IntersectionObserver`
   * اولین بار جواب نداده نمی‌دانیم پیش‌نمایش در دید هست یا نه، و شروعِ
   * خوش‌بینانه یعنی یک حلقهٔ کامل روی صفحه‌ای که پایینِ scroll است.
   */
  const visible = useRef(false);
  /**
   * کسانی که منتظرِ برگشتنِ دید نشسته‌اند.
   *
   * ⚠️ رویداد و نه polling. نسخهٔ قبل هر ۲۸۰ms بیدار می‌شد و `visible` را
   * می‌پرسید — یعنی حلقه هیچ‌وقت واقعاً نمی‌ایستاد. حالا هم گام‌های حلقه
   * و هم ساعتِ خطِ زمانی در همین مجموعه می‌خوابند و `sync` بیدارشان
   * می‌کند.
   */
  const waiters = useRef(new Set<() => void>());
  /** حلقه ساخته شده و لغو نشده. */
  const loopAlive = useRef(false);
  /** همین نمونه الان در شمارنده حساب شده یا نه. */
  const counted = useRef(false);

  /**
   * شمارنده = «حلقه زنده است **و** در دید است».
   *
   * ⚠️ مطلق نوشته می‌شود و نه افزایشی: چند مسیر (خوابِ گام، خوابِ ساعت،
   * پایانِ حلقه) می‌توانند حالت را عوض کنند و شمارشِ دستی در هرکدام، دیر
   * یا زود یکی را جا می‌انداخت.
   */
  const publish = useCallback(() => {
    const on = loopAlive.current && visible.current;
    if (on === counted.current) return;
    counted.current = on;
    countLoop(on ? 1 : -1);
  }, []);

  const [slots, setSlots] = useState<(FootKey | null)[]>(() => DEMO_FEET.map(() => null));
  const [ringProgress, setRingProgress] = useState<number | null>(0);

  const dispenserRect = useCallback(
    (foot: FootKey) => poolRefs.current.get(foot)?.getBoundingClientRect() ?? null,
    [],
  );
  /* دروازه: از دید خارج یا تبِ پنهان → همین‌جا بایست. */
  useEffect(() => {
    const host = stageRef.current;
    if (!host) return;
    /* ⚠️ دو شرط و *هر دو* لازم‌اند: «در دید» از ناظر می‌آید و «تبِ باز»
       از `visibilitychange`. تبِ پنهان خودش rAF را می‌خواباند، ولی
       تایمرهای حلقه را نه؛ و بیرونِ دید، rAF اصلاً نمی‌ایستد. */
    let inView = false;
    const sync = () => {
      const next = inView && document.visibilityState !== "hidden";
      if (next === visible.current) return;
      visible.current = next;
      publish();
      if (!next) return;
      /* ⚠️ کپی پیش از صدا زدن: خودِ `wake` می‌تواند دوباره در همین
         مجموعه بخوابد و پیمایشِ همزمان را بشکند. */
      const woken = [...waiters.current];
      waiters.current.clear();
      for (const wake of woken) wake();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    observer.observe(host);
    const onVisibility = sync;
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [publish]);

  useEffect(() => {
    const id = runId.current + 1;
    runId.current = id;
    const active = () => runId.current === id;
    const colors = sequenceColors([...DEMO_FEET]);

    /* ── کم‌حرکت: یک قابِ ثابتِ تمام‌شده ──────────────────────────────── */
    if (reduced) {
      /* ⚠️ حتی این دو مقدارِ ثابت هم در یک تایمر ست می‌شوند و نه در بدنهٔ
         effect: setStateِ هم‌زمان با effect یک رندرِ آبشاری می‌سازد (و
         قاعدهٔ `react-hooks/set-state-in-effect` درست می‌گوید). */
      const seed = window.setTimeout(() => {
        if (!active()) return;
        setSlots([...DEMO_FEET]);
        setRingProgress(1);
      }, 0);
      const timer = window.setTimeout(() => {
        if (!active()) return;
        void pour
          .run({ scope: stageRef.current, colors, reduced: true, silent: true })
          .then(() => {
            if (active()) pour.blend(stageRef.current, resultantMix(colors));
          });
      }, 420);
      return () => {
        runId.current += 1;
        window.clearTimeout(seed);
        window.clearTimeout(timer);
      };
    }

    /* ── حلقهٔ زنده ───────────────────────────────────────────────────── */
    /* ⚠️ کپیِ محلی: قاعدهٔ lint درست می‌گوید که `ref.current` در پاکسازی
       می‌تواند عوض شده باشد. اینجا یک `Set`ِ ساخته‌شده در اولین رندر
       است و هیچ‌وقت جایگزین نمی‌شود، ولی کپی کردنش هم درست‌تر است و هم
       هشدار را می‌برد. */
    const sleepers = waiters.current;

    /** تا برگشتنِ دید می‌خوابد — بدونِ هیچ تایمر و هیچ فریمی. */
    const gate = () =>
      visible.current
        ? Promise.resolve()
        : new Promise<void>((resolve) => sleepers.add(resolve));

    /** همان دروازه، برای ساعتِ خطِ زمانی. */
    const clock = {
      isPaused: () => !visible.current,
      onResume: (wake: () => void) => {
        sleepers.add(wake);
        return () => sleepers.delete(wake);
      },
    };

    const loop = async () => {
      while (active()) {
        await gate();
        if (!active()) return;

        /* بردرِ ریتم پر می‌شود — همان کاری که پخشِ صدا در بازی می‌کند. */
        const ringStart = performance.now();
        const ringSpan = KIMIA_CONFIG.motion.rhythm.simulatedMs * 0.55;
        let ringFrame = 0;
        const paintRing = (now: number) => {
          if (!active()) return;
          const p = Math.min(1, (now - ringStart) / ringSpan);
          setRingProgress(p);
          if (p < 1) ringFrame = requestAnimationFrame(paintRing);
        };
        ringFrame = requestAnimationFrame(paintRing);

        for (let i = 0; i < DEMO_FEET.length; i += 1) {
          await gate();
          if (!active()) return;
          setSlots((prev) => {
            const next = [...prev];
            next[i] = DEMO_FEET[i];
            return next;
          });
          await sleep(620);
        }
        cancelAnimationFrame(ringFrame);

        await sleep(520);
        await gate();
        if (!active()) return;

        const result = await pour.run({
          scope: stageRef.current,
          colors,
          reduced: false,
          /* ⚠️ تزئین است و باید ساکت بماند. */
          silent: true,
          /* ⚠️ و وسطِ ریختن هم باید بایستد. دروازهٔ حلقه فقط بینِ گام‌ها
             کار می‌کند؛ یک ریختنِ دو ثانیه‌ای بدونِ این، تمامش را بیرونِ
             دید اجرا می‌کرد. حلقهٔ rAF *لغو* می‌شود و ساعت سرِ جایش
             می‌ماند، پس با برگشتن از همان‌جا ادامه می‌دهد. */
          clock,
        });
        if (!active()) return;

        /* ⚠️ لغو، *پایانِ* حلقه نیست: ممکن است فقط اندازهٔ پنجره عوض شده
           باشد. حلقه از سرِ خط شروع می‌کند. */
        if (result === "done") {
          pour.blend(stageRef.current, resultantMix(colors));
          await sleep(2400);
          if (!active()) return;
        }

        /* ⚠️ خالی کردنِ ظرف هم یک تغییرِ *دیداری* است و نباید بیرونِ دید
           رخ دهد: تایمرهای بینِ گام‌ها با پنهان شدنِ تب نمی‌ایستند، پس
           بدونِ این، بیننده با برگشتن یک ظرفِ ناگهان‌خالی می‌دید. */
        await gate();
        if (!active()) return;

        pour.drain(stageRef.current);
        setRingProgress(0);
        setSlots(DEMO_FEET.map(() => null));
        await sleep(1400);
      }
    };

    loopAlive.current = true;
    publish();
    void loop().finally(() => {
      /**
       * ⚠️ فقط اگر هنوز *همین* اجرا مالک باشد.
       *
       * باگِ واقعی و دیده‌شده: این effect دو بار اجرا می‌شود و
       * `loop()`ِ اجرای اول چند میلی‌ثانیه *بعد* از شروعِ اجرای دوم تمام
       * می‌شد. `finally`ِ مرده آن‌وقت پرچمِ اجرای زنده را پایین می‌آورد،
       * و از آن لحظه شمارنده هیچ‌وقت روشن نمی‌شد — یعنی «حلقه‌ای در کار
       * نیست» گزارش می‌شد در حالی که انیمیشن جلوی چشم می‌چرخید.
       */
      if (!active()) return;
      loopAlive.current = false;
      publish();
    });
    return () => {
      runId.current += 1;
      loopAlive.current = false;
      publish();
      /* هر کسی که خوابیده بود بیدار می‌شود تا `active()` را ببیند و
         تمام کند — وگرنه یک Promise تا ابد معلق می‌ماند. */
      const woken = [...sleepers];
      sleepers.clear();
      for (const wake of woken) wake();
      pour.cancel();
    };
  }, [pour, publish, reduced]);

  return (
    /* ⚠️ `inert` کنارِ `aria-hidden` و نه به‌جایش.
       axe این را «جدی» علامت زد و حق داشت: `aria-hidden` عنصر را از
       درختِ دسترسی برمی‌دارد ولی دکمه‌های داخلش هنوز focus می‌گیرند —
       یعنی کاربرِ صفحه‌کلید با Tab داخلِ یک تزئینِ نامرئی گم می‌شد.
       `pointer-events: none` هم فقط ماوس را می‌گرفت. `inert` هر دو را
       با هم می‌بندد. */
    <div ref={stageRef} className="km-preview" aria-hidden inert>
      <VerseVessel
        lines={DEMO_VERSE}
        loading={false}
        mode="edit"
        demoProgress={ringProgress}
      />

      <FootRack
        slots={slots}
        activeSlot={null}
        interactive={false}
        reduced={reduced}
        silent
        dispenserRect={dispenserRect}
        onSelectSlot={() => {}}
        onClearSlot={() => {}}
      />

      <ul className="km-preview-pool">
        {DEMO_POOL.map((foot) => (
          <li key={foot}>
            <TestTube
              ref={(el) => {
                if (el) poolRefs.current.set(foot, el);
                else poolRefs.current.delete(foot);
              }}
              foot={foot}
              role="dispenser"
              label="none"
              disabled
              ariaLabel=""
            />
          </li>
        ))}
      </ul>

      <PourOverlay />
    </div>
  );
}
