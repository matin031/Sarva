"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import {
  pauseRhythm,
  playRhythm,
  rhythmCurrentTime,
  rhythmServerSnapshot,
  rhythmSnapshot,
  subscribeRhythm,
} from "@/lib/kimia/audio";

/**
 * پخشِ ریتم — یک کلید زیرِ باکسِ بیت، و بردری که با صدا پر می‌شود.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا پلیرِ قبلی حذف شد
 * ═══════════════════════════════════════════════════════════════════════
 * نسخهٔ قبل یک پلیرِ کامل بود: کلید، نامِ قطعه، موجِ ساختگی، و زمانِ
 * گذشته/کل. مشکلش این بود که مثلِ یک *ابزار* دیده می‌شد که اتفاقی زیرِ
 * شعر افتاده. حالا پیشرفت روی خودِ لبهٔ باکسِ بیت است: چیزی که پر
 * می‌شود، همان چیزی است که بیت در آن ریخته می‌شود.
 *
 * ⚠️ موجِ ساختگی هم با همان حذف شد و جایش چیزی نیامد — و این *بهتر* است:
 * حتی موجِ قطعیِ بی‌ربط هم یک شکلِ دیدنی کنارِ صدا می‌گذاشت، و این بازی
 * دربارهٔ شنیدن است. بردر فقط «کجای قطعه‌ایم» را می‌گوید و هیچ چیزی از
 * ریتم لو نمی‌دهد.
 *
 * ── پیشرفت: زمانِ واقعیِ صدا، با درون‌یابی ─────────────────────────────
 * ⚠️ خودِ `timeupdate` برای کشیدنِ بردر بس نیست: مرورگرها آن را حدودِ
 * چهار بار در ثانیه شلیک می‌کنند (سافاری کمتر و نامنظم‌تر)، و بردری که
 * چهار بار در ثانیه بپرد، بدتر از نبودنش است.
 *
 * پس مبنا همان `currentTime`ِ واقعی است — هیچ شبیه‌سازی‌ای روی صدای
 * موجود نداریم — ولی بینِ دو به‌روزرسانیِ واقعی با `performance.now()`
 * درون‌یابی می‌شود. یعنی: هر وقت `currentTime` عوض شد، ساعت روی همان
 * عدد قفل می‌شود؛ بینِ دو تغییر، زمانِ سپری‌شدهٔ واقعیِ فریم‌ها اضافه
 * می‌شود. نتیجه ۶۰fps است و هیچ‌وقت از زمانِ واقعیِ صدا جلو نمی‌افتد
 * بیشتر از یک بازهٔ به‌روزرسانی.
 *
 * ⚠️ و هیچ‌وقت عقب نمی‌رود: پرشِ رو به عقب روی بردر شبیهِ باگ است، پس
 * ساعت یکنواخت نگه داشته می‌شود مگر با توقف یا شروعِ دوباره.
 *
 * ── وقتی صدایی نیست ────────────────────────────────────────────────────
 * فقط و فقط آن‌وقت یک شبیه‌سازیِ زمانی اجرا می‌شود، تا صفحه در نبودِ فایل
 * «مرده» نباشد. حالتش هم صریح گفته می‌شود (`aria-label`).
 */

export default function RhythmRing({
  /** برای ساختنِ مسیرِ بردر: هر تغییرِ اندازهٔ باکس دوباره اندازه می‌گیرد. */
  vesselRef,
  disabled,
  /**
   * پیشرفتِ تحمیلی، فقط برای پیش‌نمایشِ تزئینیِ صفحهٔ شروع.
   *
   * ⚠️ در بازیِ واقعی همیشه `undefined` است و بردر *فقط* از زمانِ صدا
   * می‌آید. این دریچه وجود دارد تا صفحهٔ شروع مجبور نباشد یک بردرِ
   * دومِ کپی‌شده داشته باشد.
   */
  demoProgress,
}: {
  vesselRef: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  demoProgress?: number | null;
}) {
  const state = useSyncExternalStore(subscribeRhythm, rhythmSnapshot, rhythmServerSnapshot);
  const svgRef = useRef<SVGSVGElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  /** حلقهٔ داوری — یک دورِ کاملِ *یک‌باره*، جدا از پیشرفتِ ریتم. */
  const verdictRef = useRef<SVGPathElement>(null);
  const frame = useRef<number | null>(null);
  /** ساعتِ شبیه‌سازی‌شده — فقط وقتی فایلِ صوتی نداریم. */
  const simulated = useRef({ started: 0, running: false });
  /** آخرین منبعی که دیده‌ایم — تنها چیزی که بردر را صفر می‌کند. */
  const lastSrc = useRef<string | null>(null);
  const fadeTimer = useRef<number | null>(null);

  const hasAudio = Boolean(state.src) && !state.failed;
  const simulatedMs = KIMIA_CONFIG.motion.rhythm.simulatedMs;

  /* ── مسیرِ بردر ────────────────────────────────────────────────────────
     ⚠️ از وسطِ ضلعِ پایین شروع می‌شود (درست زیرِ دکمهٔ پخش) و در جهتِ
     خواندن — راست‌به‌چپ — دورِ باکس می‌چرخد.

     ⚠️ `pathLength="1"` یعنی درصدِ پیشرفت بی‌واسطه می‌شود `strokeDashoffset`،
     بدونِ اینکه کسی طولِ واقعیِ مسیر را حساب کند. و چون اندازه فقط با
     `ResizeObserver` خوانده می‌شود، در هیچ فریمی layout خوانده نمی‌شود. */
  const layout = useCallback(() => {
    const host = vesselRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!host || !track || !progress) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w < 2 || h < 2) return;
    const radius = Number.parseFloat(getComputedStyle(host).borderTopLeftRadius) || 20;
    const o = 1.5;
    const q = Math.max(1, radius - o);
    const d =
      `M ${w / 2} ${h - o} L ${w - radius} ${h - o} A ${q} ${q} 0 0 0 ${w - o} ${h - radius} ` +
      `L ${w - o} ${radius} A ${q} ${q} 0 0 0 ${w - radius} ${o} ` +
      `L ${radius} ${o} A ${q} ${q} 0 0 0 ${o} ${radius} ` +
      `L ${o} ${h - radius} A ${q} ${q} 0 0 0 ${radius} ${h - o} L ${w / 2} ${h - o}`;
    track.setAttribute("d", d);
    progress.setAttribute("d", d);
    verdictRef.current?.setAttribute("d", d);
  }, [vesselRef]);

  useEffect(() => {
    const host = vesselRef.current;
    if (!host) return;
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(host);
    return () => observer.disconnect();
  }, [layout, vesselRef]);

  /* ── کشیدنِ پیشرفت ────────────────────────────────────────────────────
     ⚠️ بدونِ setState در هر فریم: عدد مستقیم روی همان گرهٔ SVG می‌نشیند و
     React اصلاً خبردار نمی‌شود. */
  const paint = useCallback((ratio: number) => {
    const progress = progressRef.current;
    if (!progress) return;
    const clamped = ratio <= 0 ? 0 : ratio >= 1 ? 1 : ratio;
    progress.style.opacity = clamped > 0 ? "1" : "0";
    progress.style.strokeDashoffset = String(1 - clamped);
  }, []);

  /* ⚠️ **تنها** چیزی که بردر را صفر می‌کند، عوض شدنِ خودِ ریتم است (بیتِ
     تازه). نسخهٔ اول با هر `playing: false` صفر می‌کرد و نتیجه‌اش این بود
     که «توقف» بردر را پاک می‌کرد — یعنی کسی که وسطِ قطعه مکث می‌کرد، جای
     خودش را گم می‌کرد. تستِ مرورگری همین را گرفت. */
  /* حالتِ نمایشی: بردر از بیرون هدایت می‌شود و هیچ‌کدام از منطقِ صدا
     اجرا نمی‌شود. */
  useEffect(() => {
    if (demoProgress === undefined || demoProgress === null) return;
    paint(demoProgress);
  }, [demoProgress, paint]);

  useEffect(() => {
    if (demoProgress !== undefined && demoProgress !== null) return;
    if (lastSrc.current === state.src) return;
    lastSrc.current = state.src;
    paint(0);
  }, [demoProgress, paint, state.src]);

  useEffect(() => {
    const stop = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
    if (demoProgress !== undefined && demoProgress !== null) return stop;

    if (!state.playing) {
      stop();
      simulated.current.running = false;
      /* پایان: بردر پر می‌ماند و بعد از یک مکثِ کوتاه آرام خالی می‌شود —
         صفر کردنِ فوری یعنی بازیکن نفهمد قطعه تمام شد. مکث با *توقفِ
         دستی* فرق دارد: آنجا هیچ‌چیز عوض نمی‌شود. */
      if (state.played) {
        paint(1);
        if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
        fadeTimer.current = window.setTimeout(() => {
          const progress = progressRef.current;
          if (!progress) return;
          progress.style.transition = "stroke-dashoffset .7s ease, opacity .3s";
          paint(0);
          window.setTimeout(() => {
            if (progressRef.current) progressRef.current.style.transition = "";
          }, 800);
        }, KIMIA_CONFIG.motion.rhythm.resetDelayMs);
      }
      return stop;
    }

    /* شروعِ دوباره: اگر اثرِ محوشدن در راه بود، لغو شود. */
    if (fadeTimer.current !== null) {
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
    if (progressRef.current) progressRef.current.style.transition = "";

    /* ساعتِ درون‌یابی‌شده. */
    let lastRaw = -1;
    let lastRawAt = performance.now();
    let shown = 0;

    if (!hasAudio) {
      simulated.current = { started: performance.now(), running: true };
    }

    const tick = (now: number) => {
      let ratio: number;
      if (hasAudio) {
        const raw = rhythmCurrentTime();
        if (raw !== lastRaw) {
          lastRaw = raw;
          lastRawAt = now;
        }
        const duration = state.duration > 0 ? state.duration : 0;
        const estimate = lastRaw + (now - lastRawAt) / 1000;
        /* ⚠️ سقفِ درون‌یابی: اگر مرورگر چند فریم `currentTime` را
           به‌روز نکند (تبِ کم‌اولویت)، ساعت نباید از صدا جلو بزند. */
        const capped = Math.min(estimate, lastRaw + 0.4);
        shown = Math.max(shown, capped);
        ratio = duration > 0 ? shown / duration : 0;
      } else {
        const elapsed = now - simulated.current.started;
        ratio = elapsed / simulatedMs;
        if (ratio >= 1) {
          paint(1);
          /* شبیه‌سازی تمام شد: همان‌جا می‌ایستد و کلید به «دوباره»
             برمی‌گردد. توقفِ واقعیِ صدا را خودِ استور می‌دهد. */
          pauseRhythm();
          simulated.current.running = false;
          return;
        }
      }
      paint(ratio);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      stop();
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
    };
  }, [demoProgress, hasAudio, paint, simulatedMs, state.duration, state.playing, state.played]);

  /* ⚠️ تیکِ «درست» هیچ stateی در React ندارد: هر دو آیکن همیشه در DOM
     هستند و CSS با `data-mode="correct"`ِ کارت، ۹۰۰ میلی‌ثانیه یکی را
     جای دیگری نشان می‌دهد. با state، هم یک `setState` داخلِ effect لازم
     می‌شد (که قاعدهٔ react-hooks درست ردش می‌کند) و هم ریست شدنش با
     بیتِ بعدی یک حالتِ اضافه می‌خواست. */

  const finished = !state.playing && state.played;
  /* ⚠️ برچسبِ حالتِ بی‌صدا نه دروغ می‌گوید و نه دکمه را «خراب» نشان
     می‌دهد: نشانگر پخش می‌شود، ولی صریح گفته می‌شود که صدایی نیست. */
  const label = state.playing
    ? "توقفِ ریتم"
    : finished
      ? "شنیدنِ دوبارهٔ ریتم"
      : hasAudio
        ? "شنیدنِ ریتمِ این بیت"
        : "پخشِ نشانگرِ ریتم — صدای این بیت در دسترس نیست";

  return (
    <>
      <svg ref={svgRef} className="km-ring" aria-hidden focusable="false">
        <path ref={trackRef} className="km-ring-track" pathLength={1} />
        <path ref={progressRef} className="km-ring-progress" pathLength={1} />
        {/* یک دورِ کامل، فقط در لحظهٔ داوری. `data-mode`ِ کارت رنگ و
            اجرایش را تعیین می‌کند (CSS). */}
        <path ref={verdictRef} className="km-ring-verdict" pathLength={1} />
      </svg>

      <button
        type="button"
        className="km-play"
        data-playing={state.playing || undefined}
        data-silent={!hasAudio || undefined}
        onClick={() => {
          if (disabled) return;
          if (state.playing) pauseRhythm();
          else void playRhythm();
        }}
        aria-disabled={disabled || undefined}
        aria-label={label}
        title={label}
      >
        {/* تیکِ کوتاهِ «درست» — نمایشش کارِ CSS است. */}
        <span className="km-play-check" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
        </span>

        <span className="km-play-face" aria-hidden>
          {state.playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4.2" height="14" rx="1.4" />
              <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" />
            </svg>
          ) : finished ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M20 12a8 8 0 1 1-2.6-5.9" />
              <path d="M20.4 4.2v4.2h-4.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z" />
            </svg>
          )}
        </span>
      </button>

      {/* ⚠️ حالتِ صدا برای صفحه‌خوان — بردر یک تصویرِ صرف است و چیزی
          نمی‌گوید. */}
      <span className="sr-only" aria-live="polite">
        {state.failed ? "صدای این وزن در دسترس نیست." : state.playing ? "ریتم در حالِ پخش است." : ""}
      </span>
    </>
  );
}
