"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import { playKimiaSfx, startPourVoice, stopAllVoices, type PourVoice } from "@/lib/kimia/sfx";
import {
  overlayParts,
  placedTube,
  placedTubeBody,
  vesselParts,
  type OverlayParts,
  type VesselParts,
} from "@/lib/kimia/scene";
import {
  clamp,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  easeTravel,
  lerp,
  lipOffset,
  planPour,
  spillAngleFor,
  spillFill,
  streamPathData,
  streamShape,
  surfaceDepthFor,
  type PourPlan,
  type TubeBox,
} from "@/lib/kimia/pour";

/* ═══════════════════════════════════════════════════════════════════════════
   خطِ زمانیِ ریختن — یک حلقه، یک ساعت، و یک راهِ لغو.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ **چرا همه‌چیز در یک حلقه است و نه چند انیمیشنِ جدا.**
   نسخهٔ نمونه هر مرحله را یک `tween` جدا با `await` می‌کرد. کار می‌کرد،
   ولی سه چیز را نمی‌شد درست کرد: لغو کردنِ وسطِ کار (هر tween باید
   جداگانه می‌فهمید)، تبِ پنهان (چند tween هم‌زمان بیدار می‌شدند و از هم
   جلو می‌زدند)، و تغییرِ اندازهٔ صفحه (مختصاتِ داخلِ closureها کهنه
   می‌شد). با یک ساعت و یک حلقه، «الان کجای کاریم» یک عدد است: لغو یعنی
   ایستاندنِ همان حلقه، و اندازه‌گیریِ دوباره یعنی عوض کردنِ یک شیء.

   ⚠️ **layout در هیچ فریمی خوانده نمی‌شود.** `getBoundingClientRect` فقط
   در شروع و بعد از `resize` صدا زده می‌شود. اسکرولِ وسطِ انیمیشن با یک
   تفاضلِ `scrollY` جبران می‌شود (خواندنش layout نمی‌سازد)، و خودِ
   شیشه‌ها اصلاً جبران نمی‌خواهند: هم شیشه و هم باکسِ بیت با صفحه
   اسکرول می‌شوند، پس فاصلهٔ *نسبیِ* آن‌ها ثابت است. فقط لایهٔ جریان که
   `fixed` است جبران می‌خواهد.

   ⚠️ **ساعت از دلتای فریم‌ها ساخته می‌شود و نه از `now - start`.** تبِ
   پنهان rAF را متوقف می‌کند؛ با ساعتِ مطلق، برگشتن به تب یعنی پریدنِ
   انیمیشن به وسط یا آخر. اینجا هر فریم حداکثر ۵۰ میلی‌ثانیه جلو می‌برد،
   پس تبِ پنهان فقط انیمیشن را *نگه می‌دارد*.

   ⚠️ و مثلِ همیشه در این بازی: **هیچ منطقی به این فایل وابسته نیست.**
   اگر حلقه اصلاً اجرا نشود، دورِ بازی سرِ وقت تمام می‌شود و داوریِ سرور
   سرِ جایش می‌آید؛ فقط صفحه ساکت می‌ماند.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * ساعتِ بیرونیِ خطِ زمانی.
 *
 * ⚠️ نسخهٔ اول این فقط یک `paused: () => boolean` بود و در حالتِ ایست هم
 * `requestAnimationFrame` را دوباره صف می‌کرد — یعنی ۶۰ بار در ثانیه یک
 * callbackِ خالی روی صفحه‌ای که کسی نگاهش نمی‌کند. حالا حلقه **واقعاً
 * لغو می‌شود** و بیدار شدن با خبرِ `onResume` می‌آید.
 *
 * ⚠️ و بیدار شدن *پرشِ زمانی* ندارد: مبدأ دلتا به لحظهٔ بیداری تنظیم
 * می‌شود، پس ساعت از همان‌جا که ایستاده بود ادامه می‌دهد.
 */
export type PourClock = {
  /** الان باید بایستد؟ */
  isPaused: () => boolean;
  /** یک بار خبر بده که دوباره باید راه بیفتد. مقدارِ برگشتی لغوِ اشتراک است. */
  onResume: (wake: () => void) => () => void;
};

export type PourRunInput = {
  /**
   * ریشهٔ صحنه. همهٔ قطعه‌ها از داخلِ همین پیدا می‌شوند.
   *
   * ⚠️ هیچ handleی رد و بدل نمی‌شود؛ دلیلش در `lib/kimia/scene.ts`.
   */
  scope: HTMLElement | null;
  /** رنگِ پایهٔ هر جایگاه، به همان ترتیب. */
  colors: readonly string[];
  reduced: boolean;
  /**
   * بی‌صدا اجرا شود.
   *
   * ⚠️ پیش‌نمایشِ تزئینیِ صفحهٔ شروع دقیقاً برای همین وجود دارد: یک
   * انیمیشنِ همیشه‌درحال‌اجرا که *صدا هم بدهد*، از یک تبلیغِ خودکار هم
   * آزاردهنده‌تر است (و لاگِ تست را هم آلوده می‌کرد).
   */
  silent?: boolean;
  /**
   * ساعتِ بیرونی — خطِ زمانی را کاملاً می‌خواباند و بیدار می‌کند.
   *
   * ⚠️ فقط پیش‌نمایشِ تزئینیِ صفحهٔ شروع از این استفاده می‌کند.
   */
  clock?: PourClock;
  /** لحظه‌ای که جریانِ یک شیشه واقعاً باز می‌شود — برای صدا. */
  onPourStart?: (index: number) => void;
  onPourEnd?: (index: number) => void;
};

type Droplet = { x: number; y: number; r: number; alpha: number };

/* ── نقاشیِ لایهٔ جریان ────────────────────────────────────────────────
   ⚠️ گره‌ها یک بار در شروع پیدا می‌شوند و بعد فقط `setAttribute` و
   `style` می‌گیرند. هیچ گرهی در فریم ساخته یا حذف نمی‌شود. */
function paintStream(parts: OverlayParts, path: string | null, color: string): void {
  const node = parts.stream;
  if (!node) return;
  if (!path) {
    node.style.opacity = "0";
    return;
  }
  node.setAttribute("d", path);
  node.setAttribute("fill", color);
  node.style.opacity = "1";
}

function paintRipple(
  parts: OverlayParts,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  color: string,
): void {
  const node = parts.ripple;
  if (!node) return;
  if (alpha <= 0.01 || radius <= 0.2) {
    node.style.opacity = "0";
    return;
  }
  node.setAttribute("cx", x.toFixed(1));
  node.setAttribute("cy", y.toFixed(1));
  node.setAttribute("rx", radius.toFixed(1));
  node.setAttribute("ry", Math.max(0.6, radius * 0.32).toFixed(1));
  node.setAttribute("stroke", color);
  node.style.opacity = String(alpha);
}

function paintDroplets(parts: OverlayParts, list: readonly Droplet[], color: string): void {
  for (let i = 0; i < parts.drops.length; i += 1) {
    const node = parts.drops[i];
    const drop = list[i];
    if (!drop) {
      node.style.opacity = "0";
      continue;
    }
    node.setAttribute("cx", drop.x.toFixed(1));
    node.setAttribute("cy", drop.y.toFixed(1));
    node.setAttribute("r", drop.r.toFixed(2));
    node.setAttribute("fill", color);
    node.style.opacity = String(drop.alpha);
  }
}

function clearOverlay(parts: OverlayParts): void {
  if (parts.stream) parts.stream.style.opacity = "0";
  if (parts.ripple) parts.ripple.style.opacity = "0";
  for (const node of parts.drops) node.style.opacity = "0";
}

type Rect = { left: number; top: number; width: number; height: number };

type Measurement = {
  scrollX: number;
  scrollY: number;
  vessel: Rect;
  tubes: (Rect | null)[];
  box: TubeBox;
};

type LiveDroplet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  radius: number;
};

/* ─────────────── شمارندهٔ خطوطِ زمانیِ زنده — فقط توسعه ────────────────
   ⚠️ «چیزی بی‌صاحب نماند» ادعایی است که با چشم دیده نمی‌شود. این شمارنده
   تنها راهِ *اثباتش* است: تست بعد از رفتن از صفحهٔ معرفی به بازی می‌خوانَدش
   و باید صفر باشد. در build نهایی این شاخه اصلاً وجود ندارد. */
const DEV = process.env.NODE_ENV === "development";

function countTimeline(delta: number): void {
  if (!DEV || typeof window === "undefined") return;
  const w = window as unknown as { __kimiaTimelines?: number };
  w.__kimiaTimelines = Math.max(0, (w.__kimiaTimelines ?? 0) + delta);
}

const FLUID = KIMIA_CONFIG.motion.fluid;
const POUR = KIMIA_CONFIG.motion.pour;
const REDUCED = KIMIA_CONFIG.motion.reduced;

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export function usePourTimeline() {
  const frame = useRef<number | null>(null);
  const cancelled = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    cleanup.current?.();
    cleanup.current = null;
  }, []);

  /** لغوِ فوری — هر جا که بازی از حالتِ ترکیب بیرون می‌رود. */
  /**
   * لغوِ فوری — هر جا که بازی از حالتِ ترکیب بیرون می‌رود.
   *
   * ⚠️ صدا هم با همین می‌رود: هر گرهٔ صوتیِ زنده با ramp بسته می‌شود تا
   * نه کلیکی بماند و نه گرهٔ بی‌صاحبی.
   */
  const cancel = useCallback(() => {
    cancelled.current = true;
    stopAllVoices();
    stop();
  }, [stop]);

  useEffect(() => cancel, [cancel]);

  /**
   * ریختنِ رنگِ همهٔ شیشه‌ها در باکسِ بیت.
   *
   * وعده وقتی حل می‌شود که *تصویر* تمام شده باشد. منطقِ بازی می‌تواند
   * منتظرش بماند یا نماند — پاسخِ سرور مستقل می‌آید.
   */
  const run = useCallback(
    (input: PourRunInput): Promise<"done" | "cancelled"> => {
      cancel();
      cancelled.current = false;

      const { scope, colors, reduced, silent, clock } = input;
      const vessel = vesselParts(scope);
      const overlay = overlayParts(scope);
      const tubeFor = (index: number) => placedTube(scope, index);
      const root = vessel.root;
      const bandsHost = vessel.bands;
      const waveEl = vessel.wave;
      const count = colors.length;

      if (!root || !bandsHost || count === 0) return Promise.resolve("cancelled");

      /* ── لایه‌های رنگ ───────────────────────────────────────────────
         ⚠️ هر لایه *مطلق* است و فقط `transform` می‌گیرد؛ دلیلش در
         `VerseVessel.tsx`. ساختنشان یک بار است و نه در هر فریم. */
      bandsHost.replaceChildren();
      bandsHost.style.removeProperty("filter");
      bandsHost.style.removeProperty("opacity");
      const bands = colors.map((color, index) => {
        const band = document.createElement("div");
        band.className = "km-verse-band";
        band.style.setProperty("--km-band", color);
        /* شمارهٔ لایه — انیمیشنِ «در حالِ سنجش» از آن فازِ جدا می‌سازد. */
        band.style.setProperty("--i", String(index));
        band.style.transform = "translateY(0px) scaleY(0)";
        bandsHost.appendChild(band);
        return band;
      });

      const vesselHeight = root.clientHeight;
      const totalPx = vesselHeight * KIMIA_CONFIG.motion.fluid.vesselFillRatio;
      const perPx = totalPx / count;

      /**
       * سطحِ مایع.
       *
       * ⚠️ دامنهٔ موج با نزدیک شدنِ سطح به لبهٔ بالای ظرف به صفر می‌رسد.
       * بدونِ این، ظرفِ تقریباً پر یک نوارِ روشن کنارِ لبهٔ بالایی نشان
       * می‌داد: موج تا لبه بالا می‌آمد و برشِ گوشهٔ گرد، فقط قلهٔ آن را
       * باقی می‌گذاشت (در فریمِ `correct-dark/3-poured` دیده شد).
       */
      const setLevel = (levelPx: number, color: string) => {
        if (!waveEl) return;
        const ratio = vesselHeight > 0 ? levelPx / vesselHeight : 0;
        const amp = clamp01((FLUID.waveFadeAt - ratio) / FLUID.waveFadeSpan);
        waveEl.style.opacity = levelPx > 1 ? (0.85 * amp).toFixed(3) : "0";
        waveEl.style.transform = `translateY(${-levelPx.toFixed(2)}px) scaleY(${amp.toFixed(3)})`;
        waveEl.style.color = color;
      };

      const paintBand = (index: number, grownPx: number) => {
        const band = bands[index];
        if (!band) return;
        const k = vesselHeight > 0 ? grownPx / vesselHeight : 0;
        band.style.transform = `translateY(${-(index * perPx).toFixed(2)}px) scaleY(${k.toFixed(4)})`;
      };

      /* ── حالتِ کم‌حرکت: بدونِ پرواز، بدونِ جریان ───────────────────── */
      if (reduced) {
        bands.forEach((_, i) => paintBand(i, perPx));
        setLevel(totalPx, colors[count - 1]);
        /* بدونِ جریان و بدونِ حباب — فقط همان whooshِ حل شدن. */
        if (!silent) playKimiaSfx("blend", { timelineMs: 0 });
        return new Promise((resolve) => {
          const id = window.setTimeout(
            () => resolve(cancelled.current ? "cancelled" : "done"),
            REDUCED.pourMs,
          );
          cleanup.current = () => window.clearTimeout(id);
        });
      }

      const plan: PourPlan = planPour(count, POUR);

      /* ── اندازه‌گیری: یک بار، و بعد فقط با تغییرِ اندازه ─────────────── */
      let measurement: Measurement | null = null;
      const measure = (): Measurement | null => {
        const body = placedTubeBody(scope, 0);
        if (!body) return null;
        const bodyRect = rectOf(body);
        return {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          vessel: rectOf(root),
          tubes: Array.from({ length: count }, (_, i) => {
            const el = tubeFor(i);
            return el ? rectOf(el) : null;
          }),
          box: { width: bodyRect.width, height: bodyRect.height },
        };
      };

      measurement = measure();
      if (!measurement) return Promise.resolve("cancelled");

      let dirty = false;
      const markDirty = () => {
        dirty = true;
      };
      window.addEventListener("resize", markDirty);
      window.addEventListener("orientationchange", markDirty);

      /* زاویه‌هایی که از هندسه می‌آیند و نه از عدد‌های دستی. */
      const box = measurement.box;
      const spillStart = spillAngleFor(box, FLUID.restFill);
      const spillEnd = spillAngleFor(box, FLUID.drainFill);

      /* ── صدا، روی همین خطِ زمانی ───────────────────────────────────
         ⚠️ صدای ریختن با `setTimeout` جدا زمان‌بندی نمی‌شود: همین‌جا
         زنده می‌شود، هر ~۴۰ms (۲۵Hz) به‌روز می‌شود و با لغوِ خطِ زمانی
         قطع. هر زمان‌بندیِ موازی، دیر یا زود از انیمیشن جدا می‌افتد. */
      let voice: PourVoice | null = null;
      let lastVoiceAt = 0;
      let pouringNow = false;
      let blendFired = false;

      const droplets: LiveDroplet[] = [];
      const dropletBuffer: Droplet[] = [];
      let lastDropAt = 0;
      let ripple = { x: 0, y: 0, radius: 0, alpha: 0 };
      let elapsed = 0;
      let last = performance.now();
      const started = colors.map(() => false);
      const ended = colors.map(() => false);

      const refillTimers: number[] = [];
      /* ⚠️ «برگرداندنِ شیشه» دقیقاً *یک بار* اتفاق می‌افتد. نسخهٔ اول در
         هر فریمِ بعد از پایانِ شیشه صدا زده می‌شد و هر بار دوباره
         خالی‌اش می‌کرد — یعنی شیشه تا ابد خالی می‌ماند و پر شدنِ دوباره
         هیچ‌وقت نمی‌رسید (در اسکرین‌شات دیده شد). */
      const wasReset = colors.map(() => false);
      const resetTube = (index: number) => {
        const tube = tubeFor(index);
        if (!tube) return;
        if (wasReset[index]) return;
        wasReset[index] = true;
        tube.style.transform = "";
        tube.removeAttribute("data-pouring");
        tube.style.removeProperty("--km-tilt");
        const liquid = tube.querySelector<HTMLElement>(".km-tube-liquid");
        if (!liquid) return;
        if (!liquid.style.transform) return;
        /* ⚠️ شیشه *خالی* برمی‌گردد و بعد آرام پر می‌شود. پرِ فوری یعنی
           «انگار اصلاً نریخت»، و خالی ماندنش یعنی آزمایشِ دوم با
           شیشه‌های خالی — که هر دو دروغ‌اند. پخش‌کنندهٔ پایین بی‌پایان
           است، پس پر شدنِ دوباره همان چیزی است که داستان می‌گوید. */
        liquid.style.transform = `rotate(0deg) translateY(${surfaceDepthFor(
          box,
          0,
          FLUID.drainFill,
        ).toFixed(2)}px)`;
        liquid.classList.add("km-tube-refilling");
        refillTimers.push(
          window.setTimeout(() => {
            liquid.style.transform = "";
          }, 40),
          window.setTimeout(() => {
            liquid.classList.remove("km-tube-refilling");
          }, 700),
        );
      };

      let counted = false;
      /* ⚠️ اگر خطِ زمانی *وسطِ خواب* لغو شود، این اشتراک باید برود؛
         وگرنه یک callback روی صحنه‌ای که دیگر وجود ندارد می‌ماند. */
      let unsubscribeResume: (() => void) | null = null;
      const finishCleanup = () => {
        unsubscribeResume?.();
        unsubscribeResume = null;
        if (counted) {
          counted = false;
          countTimeline(-1);
        }
        voice?.stop();
        voice = null;
        window.removeEventListener("resize", markDirty);
        window.removeEventListener("orientationchange", markDirty);
        for (const id of refillTimers) window.clearTimeout(id);
        for (let i = 0; i < count; i += 1) resetTube(i);
        clearOverlay(overlay);
      };

      return new Promise<"done" | "cancelled">((resolve) => {
        cleanup.current = () => {
          finishCleanup();
          resolve("cancelled");
        };

        const tick = (now: number) => {
          if (cancelled.current) return;
          /* ⚠️ سقفِ دلتا: تبِ پنهان یا یک فریمِ گم‌شده نباید انیمیشن را
             جلو بپراند. */
          const delta = Math.min(now - last, 50);
          last = now;
          /* ⚠️ ایست یعنی *لغوِ* حلقه و نه یک فریمِ خالی: هیچ rAFی صف
             نمی‌شود تا وقتی ساعت بیدارمان کند. `elapsed` دست‌نخورده
             می‌ماند و `last` هنگامِ بیداری از نو تنظیم می‌شود، پس هیچ
             پرشی در انیمیشن نیست. */
          if (clock?.isPaused()) {
            frame.current = null;
            unsubscribeResume?.();
            unsubscribeResume = clock.onResume(() => {
              unsubscribeResume?.();
              unsubscribeResume = null;
              if (cancelled.current) return;
              last = performance.now();
              frame.current = requestAnimationFrame(tick);
            });
            return;
          }
          elapsed += delta;

          if (dirty) {
            const fresh = measure();
            if (fresh) measurement = fresh;
            dirty = false;
          }
          const m = measurement!;
          const scrollDx = window.scrollX - m.scrollX;
          const scrollDy = window.scrollY - m.scrollY;

          let level = 0;
          let levelColor = colors[0];
          let streamPath: string | null = null;
          let streamColor = colors[0];
          let streamHalf = 0;

          for (let i = 0; i < count; i += 1) {
            const step = plan.steps[i];
            const tube = tubeFor(i);
            const home = m.tubes[i];
            const t = elapsed - step.startMs;

            /* لایه‌های شیشه‌هایی که کارشان تمام شده. */
            if (elapsed >= step.pourEndMs) {
              paintBand(i, perPx);
              level = Math.max(level, (i + 1) * perPx);
              levelColor = colors[i];
              if (!ended[i]) {
                ended[i] = true;
                input.onPourEnd?.(i);
              }
            }

            if (!tube || !home || t < 0) continue;
            if (t > step.endMs - step.startMs) {
              resetTube(i);
              continue;
            }

            /* ── ژستِ این شیشه در این لحظه ─────────────────────────── */
            /* ⚠️ محورِ چرخش وسطِ دهانه است، پس «کمی بالاتر از لبهٔ باکس»
               یعنی بدنهٔ شیشه هنگامِ کج شدن درست *روی* لبه می‌خوابد.
               (اندازه‌گیریِ اول نصفِ ارتفاعِ لوله بالاتر بود و شیشه روی
               نوارِ بازی می‌افتاد.)

               ⚠️ و به قابِ دید بسته می‌شود: روی گوشی، اگر صفحه پایین
               اسکرول شده باشد، باکسِ بیت نزدیکِ لبهٔ بالاست و شیشه از
               کادر بیرون می‌زد (در اسکرین‌شاتِ گوشی دیده شد). */
            const target = {
              x: clamp(
                m.vessel.left +
                  m.vessel.width * 0.5 +
                  m.vessel.width * 0.17 +
                  (i - (count - 1) / 2) * 6,
                box.height * 0.5,
                window.innerWidth - box.height * 0.75,
              ),
              /* ⚠️ حاشیهٔ بالا از *چرخش* می‌آید و نه از سلیقه: لوله حولِ
                 وسطِ دهانه می‌چرخد، پس گوشهٔ دهانه تا حدودِ نصفِ عرضِ
                 لوله بالاتر از محور می‌رود. کمتر از این، سرِ شیشه از
                 بالای کادر بیرون می‌زند. */
              y: Math.max(m.vessel.top - 24, box.width * 0.8 + 10),
            };
            const pivotHome = { x: home.left + home.width / 2, y: home.top };
            const dx = target.x - pivotHome.x;
            const dy = target.y - pivotHome.y;

            /* ⚠️ ترتیبِ مرحله‌ها: پیش‌حرکت → پرواز → **انتظارِ ایستاده** →
               کج شدن → ریختن → برگشت.

               نسخهٔ اول انتظار را *بعد* از کج شدن گذاشته بود و نتیجه‌اش
               این بود که دو شیشهٔ کج هم‌زمان بالای بیت معلق می‌ماندند و
               روی هم می‌افتادند. حالا شیشهٔ منتظر **ایستاده** کمی
               بالاتر صف می‌بندد و کج شدنش دقیقاً وقتی تمام می‌شود که
               ریختنِ قبلی تمام شده — همان هم‌پوشانیِ خواسته‌شده، بدونِ
               دو جریانِ هم‌زمان. */
            const tTravelStart = step.anticipationMs;
            const tTravelEnd = tTravelStart + step.travelMs;
            const tPourStart = step.pourStartMs - step.startMs;
            const tPourEnd = step.pourEndMs - step.startMs;
            const tTiltStart = Math.max(tTravelEnd, tPourStart - step.tiltMs);
            /* جای انتظار: کمی بالاتر و کمی کنارتر، تا صف دیده شود. */
            const queueX = dx + (count - 1 - i) * 26;
            const queueY = dy - 18;

            let px = 0;
            let py = 0;
            let tilt = 0;
            let fill: number = FLUID.restFill;

            if (t < tTravelStart) {
              /* پیش‌حرکت: کمی می‌نشیند و کمی خلافِ جهت می‌چرخد. */
              const e = clamp01(t / Math.max(1, step.anticipationMs));
              py = 4 * Math.sin(Math.PI * e);
              tilt = -3.5 * Math.sin(Math.PI * e);
            } else if (t < tTravelEnd) {
              /* پرواز تا صفِ بالای بیت. */
              const e = clamp01((t - tTravelStart) / Math.max(1, step.travelMs));
              px = queueX * easeOutCubic(e);
              py = queueY * easeTravel(e) - 22 * Math.sin(Math.PI * e);
              tilt = lerp(-3.5, POUR.approachTiltDeg * 0.35, easeInOutCubic(e));
            } else if (t < tTiltStart) {
              /* ایستاده در صف، منتظرِ تمام شدنِ شیشهٔ قبلی. */
              px = queueX;
              py = queueY;
              tilt = POUR.approachTiltDeg * 0.35;
            } else if (t < tPourStart) {
              /* کج شدن تا لبه — هنوز هیچ قطره‌ای بیرون نمی‌آید. */
              const e = clamp01((t - tTiltStart) / Math.max(1, tPourStart - tTiltStart));
              const eased = easeInOutCubic(e);
              px = lerp(queueX, dx, eased);
              py = lerp(queueY, dy, eased);
              tilt = lerp(POUR.approachTiltDeg * 0.35, spillStart, eased);
            } else if (t < tPourEnd) {
              /* ── ریختن ──────────────────────────────────────────────
                 ⚠️ *حجم* برنامه‌ریزی می‌شود و زاویه از هندسه در می‌آید و
                 نه برعکس. یعنی سطحِ مایع همیشه دقیقاً لبِ لبه است: نه
                 زودتر می‌ریزد، نه با زاویهٔ ثابت بی‌دلیل ادامه می‌دهد. و
                 سرعتِ چرخش خودبه‌خود با سرعتِ جریان هماهنگ می‌شود. */
              const p = clamp01((t - tPourStart) / Math.max(1, step.pourMs));
              const shaped = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              fill = lerp(FLUID.restFill, FLUID.drainFill, shaped);
              tilt = spillAngleFor(box, fill);
              px = dx;
              py = dy;

              if (!started[i]) {
                started[i] = true;
                input.onPourStart?.(i);
                /* ⚠️ صدا دقیقاً در همان فریمی شروع می‌شود که جریان
                   کشیده می‌شود، نه یک تایمرِ جدا. */
                if (!voice && !silent) voice = startPourVoice();
              }
              pouringNow = true;

              /* نرخِ خروج: مشتقِ حجم، همان‌جا و بدونِ حافظه. */
              const dShaped =
                p < 0.5 ? 4 * p : 4 * (1 - p);
              const dFillPerMs =
                ((FLUID.restFill - FLUID.drainFill) * dShaped) / Math.max(1, step.pourMs);
              const flux = dFillPerMs * 1000 * box.width * box.height; // px²/s

              /* سطحِ مایعِ داخلِ ظرف، همین حالا. */
              const grown = perPx * p;
              paintBand(i, grown);
              level = Math.max(level, i * perPx + grown);
              levelColor = colors[i];

              const surfaceY = m.vessel.top - scrollDy + (m.vessel.height - level);
              const pivotX = pivotHome.x - scrollDx + px;
              const pivotY = pivotHome.y - scrollDy + py;
              const lip = lipOffset(box, tilt);
              const origin = { x: pivotX + lip.x, y: pivotY + lip.y };

              const speed = FLUID.exitSpeedPx * (0.55 + 0.75 * clamp01(flux / 6000));
              const half = clamp(
                (flux / Math.max(1, speed)) * 0.5 * FLUID.streamScale,
                0.7,
                box.width * 0.4,
              );

              if (surfaceY - origin.y > 4 && half > 0.72) {
                const shape = streamShape({
                  origin,
                  directionDeg: tilt,
                  speed,
                  gravity: FLUID.gravityPx,
                  targetY: surfaceY,
                  half,
                });
                streamPath = streamPathData(shape);
                streamColor = colors[i];
                streamHalf = half;

                /* برخورد: ریپل و چند قطرهٔ ریز. */
                ripple = {
                  x: shape.hit.x,
                  y: shape.hit.y,
                  radius: Math.max(ripple.radius, half * 2.6 + 3),
                  alpha: 0.5,
                };
                if (
                  now - lastDropAt > 42 &&
                  droplets.length < FLUID.maxDroplets &&
                  half > 1.1
                ) {
                  lastDropAt = now;
                  /* حبابِ برخورد — شدتش از خودِ جریان می‌آید. */
                  voice?.bubble(clamp01(half / (box.width * 0.3)));
                  const spread = shape.impactSpeed * 0.16;
                  droplets.push({
                    x: shape.hit.x,
                    y: shape.hit.y,
                    vx: (Math.random() - 0.5) * spread,
                    vy: -Math.random() * spread * 0.9 - 20,
                    born: now,
                    radius: clamp(half * 0.32, 0.8, 2.6),
                  });
                }
              }
            } else {
              /* برگشت به جایگاه — با شیشهٔ بعدی هم‌پوشانی دارد. */
              const e = clamp01((t - tPourEnd) / Math.max(1, step.returnMs));
              const back = easeInOutCubic(e);
              px = dx * (1 - back);
              py = dy * (1 - back);
              tilt = lerp(spillEnd, 0, back);
              fill = FLUID.drainFill;
            }

            /* اعمال — فقط transform، هیچ خواندنِ layoutی. */
            /* ⚠️ «در حالِ ریختن» از *شروعِ پرواز* روشن می‌شود و نه از
               لحظهٔ ریختن: نامِ فارسیِ وارونه روی شیشهٔ در حالِ چرخش،
               تنها چیزی بود که در اسکرین‌شات به چشم می‌آمد. */
            /* برچسب تا نشستنِ کاملِ شیشه پنهان می‌ماند: یک نامِ کج در
               نیمهٔ راهِ برگشت، از نبودنش بدتر است. */
            const pouring = t >= tTravelStart && t < tPourEnd + step.returnMs * 0.92;
            if (pouring) tube.setAttribute("data-pouring", "true");
            else tube.removeAttribute("data-pouring");

            tube.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
            const liquid = tube.querySelector<HTMLElement>(".km-tube-liquid");
            if (liquid) {
              const shownFill = Math.min(fill, spillFill(box, tilt));
              const depth = surfaceDepthFor(box, tilt, shownFill);
              liquid.style.transform = `rotate(${(-tilt).toFixed(2)}deg) translateY(${depth.toFixed(2)}px)`;
            }
          }

          /* ── صدا: نمونه‌برداریِ ~۲۵ هرتز، نه هر فریم ─────────────────── */
          if (voice && now - lastVoiceAt > 40) {
            lastVoiceAt = now;
            const levelRatio = totalPx > 0 ? level / totalPx : 0;
            voice.set(pouringNow ? clamp01(streamHalf / (box.width * 0.34)) : 0, levelRatio);
          }
          pouringNow = false;

          /* پایانِ همهٔ ریختن‌ها: صدا خاموش و whooshِ حل شدن. */
          if (!blendFired && elapsed >= plan.pourEndMs) {
            blendFired = true;
            voice?.stop();
            voice = null;
            if (!silent) playKimiaSfx("blend", { timelineMs: elapsed });
          }

          /* ── لایهٔ جریان ─────────────────────────────────────────────── */
          paintStream(overlay, streamPath, streamColor);

          ripple.radius = streamPath ? ripple.radius : ripple.radius * 0.9;
          ripple.alpha = streamPath ? Math.min(0.55, ripple.alpha + 0.05) : ripple.alpha * 0.88;
          paintRipple(overlay, ripple.x, ripple.y, ripple.radius, ripple.alpha, streamColor);
          if (!streamPath) ripple.radius *= 0.92;

          dropletBuffer.length = 0;
          for (let d = droplets.length - 1; d >= 0; d -= 1) {
            const drop = droplets[d];
            const age = now - drop.born;
            if (age > FLUID.dropletLifeMs) {
              droplets.splice(d, 1);
              continue;
            }
            const seconds = age / 1000;
            dropletBuffer.push({
              x: drop.x + drop.vx * seconds,
              y: drop.y + drop.vy * seconds + 0.5 * FLUID.gravityPx * seconds * seconds,
              r: drop.radius * (1 - age / FLUID.dropletLifeMs) + 0.3,
              alpha: 0.75 * (1 - age / FLUID.dropletLifeMs),
            });
          }
          paintDroplets(overlay, dropletBuffer, streamColor);

          setLevel(level, levelColor);

          if (elapsed >= plan.totalMs) {
            finishCleanup();
            cleanup.current = null;
            resolve("done");
            return;
          }
          frame.current = requestAnimationFrame(tick);
        };

        last = performance.now();
        counted = true;
        countTimeline(1);
        frame.current = requestAnimationFrame(tick);
      });
    },
    [cancel],
  );

  /**
   * حل شدنِ لایه‌ها در یک رنگ.
   *
   * ⚠️ جدا از `run` است چون *بعد از داوریِ سرور* اجرا می‌شود: رنگِ نهایی
   * درست یا گل‌آلود، هر دو از `lib/kimia/mix.ts` می‌آیند و مرورگر پیش از
   * پاسخ نمی‌داند کدام است. خودِ حرکت — چرخش و در هم رفتن — برای هر دو
   * یکی است و فقط رنگ فرق می‌کند.
   */
  const blend = useCallback((scope: HTMLElement | null, color: string) => {
    const vessel: VesselParts = vesselParts(scope);
    const bandsHost = vessel.bands;
    if (!bandsHost) return;
    bandsHost.style.setProperty("--km-blend", color);
    bandsHost.dataset.blended = "true";
    if (vessel.wave) vessel.wave.style.color = color;
  }, []);

  /** خالی کردنِ ظرف — «از نو»، پاسخِ غلط، یا بیتِ تازه. */
  const drain = useCallback(
    (scope: HTMLElement | null) => {
      cancel();
      const vessel = vesselParts(scope);
      const bandsHost = vessel.bands;
      if (bandsHost) {
        delete bandsHost.dataset.blended;
        bandsHost.style.opacity = "0";
        const host = bandsHost;
        window.setTimeout(() => {
          /* ⚠️ محتویات فقط *بعد از* محو شدن پاک می‌شود، وگرنه رنگ‌ها
             به‌جای پایین رفتن، ناگهان ناپدید می‌شدند. */
          host.replaceChildren();
          host.style.removeProperty("opacity");
          host.style.removeProperty("filter");
          host.style.removeProperty("--km-blend");
        }, 620);
      }
      if (vessel.wave) {
        vessel.wave.style.opacity = "0";
        vessel.wave.style.transform = "translateY(0px)";
      }
    },
    [cancel],
  );

  /**
   * ⚠️ شیءِ خروجی **باید** memo شود.
   *
   * نسخهٔ اول یک شیءِ تازه در هر رندر برمی‌گرداند. هر کامپوننتی که آن را
   * در وابستگیِ یک `useEffect` می‌گذاشت (پیش‌نمایشِ صفحهٔ شروع)، با هر
   * `setState` کلِ effect را از نو می‌ساخت — یعنی حلقه بعد از گذاشتنِ
   * اولین شیشه خودش را می‌کشت و از نو شروع می‌کرد، تا ابد. از بیرون
   * فقط دیده می‌شد که «پیش‌نمایش گیر کرده».
   */
  return useMemo(() => ({ run, cancel, blend, drain }), [blend, cancel, drain, run]);
}
