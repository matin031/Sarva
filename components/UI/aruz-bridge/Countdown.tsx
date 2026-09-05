"use client";

import { useEffect, useRef, useState } from "react";

/**
 * شمارشِ معکوسِ پیش از شروع — از یک خطِ زمانیِ واحد.
 *
 * ⚠️ نسخهٔ پیشین دو ساعتِ جدا داشت که به هم خبر نمی‌دادند:
 *
 *   • سه `motion.span` مستقل، هرکدام با `delay` خودش.
 *   • یک `setTimeout` جدا در `useAruzBridgeGame` که پس از
 *     `countdownDuration` بازی را شروع می‌کرد.
 *
 * چون هیچ‌کدام دیگری را نمی‌شناخت، «۱» دقیقاً وقتی محو می‌شد که بازی شروع
 * می‌شد — و در هر وقفه‌ای (بارگذاریِ سنگین، تبِ مخفی) این دو از هم دور
 * می‌افتادند. حالا یک خطِ زمانی هست: همین کامپوننت هم عدد را انتخاب می‌کند
 * و هم پایان را اعلام می‌کند، پس نمی‌توانند از هم جدا شوند.
 *
 * ── تبِ مخفی ──────────────────────────────────────────────────────────────
 * سیاست صریح: **مکث**. وقتی تب مخفی می‌شود ساعت متوقف می‌شود و با برگشت از
 * همان‌جا ادامه می‌یابد.
 *
 * چرا نه «رد کردن با محاسبهٔ زمان»: کاربری که برگشته، مرحله‌های ندیده را
 * ندیده. اگر با گذشتِ زمان از رویشان بپریم، بازی از نظرِ او بدونِ شمارش
 * شروع شده. و چرا نه «شروعِ دوباره»: برای کسی که فقط یک لحظه تب عوض کرده،
 * دوباره از سه شمردن آزاردهنده است.
 */

/** فاصلهٔ هر عدد، بر حسب کسری از کلِ شمارش. */
const BEATS = [3, 2, 1] as const;

export default function Countdown({
  duration,
  onDone,
  reducedMotion = false,
}: {
  duration: number;
  onDone: () => void;
  reducedMotion?: boolean;
}) {
  const [beat, setBeat] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    doneRef.current = false;
    setBeat(0);

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();

    const each = duration / BEATS.length;

    const tick = (now: number) => {
      // ⚠️ فقط وقتی تب دیده می‌شود زمان جلو می‌رود. `document.hidden` را
      // همین‌جا می‌خوانیم و نه در یک شنونده، چون مرورگر در تبِ مخفی
      // rAF را هم کُند یا متوقف می‌کند و تکیه بر رویداد شکننده است.
      const dt = now - last;
      last = now;
      if (!document.hidden) elapsed += dt;

      const index = Math.min(BEATS.length - 1, Math.floor(elapsed / each));
      setBeat(index);

      if (elapsed >= duration) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    /* با برگشت به تب، `last` را تازه می‌کنیم. بدونِ این، اولین فریمِ پس از
       برگشت یک `dt` غول‌پیکر می‌داد و کلِ شمارش را یکجا می‌بلعید — همان
       «رد کردنِ مرحله‌های ندیده» که نمی‌خواستیم. */
    const onVisible = () => {
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [duration]);

  const fa = new Intl.NumberFormat("fa-IR");

  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      /* ⚠️ برای فناوریِ کمکی یک ناحیهٔ زنده، ولی `polite` و نه `assertive`:
         سه عدد در سه ثانیه نباید حرفِ چیزِ دیگری را قطع کند. */
      role="status"
      aria-live="polite"
      aria-label={`شروع بازی تا ${BEATS[beat]}`}
    >
      <span
        key={BEATS[beat]}
        className={`font-sans text-7xl font-black text-[#ffe9bd] drop-shadow-[0_0_24px_rgba(217,164,65,0.5)] sm:text-8xl ${
          reducedMotion ? "" : "gc-countdown-beat"
        }`}
      >
        {fa.format(BEATS[beat])}
      </span>
    </div>
  );
}
