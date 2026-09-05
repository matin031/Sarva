"use client";

import { useEffect } from "react";

/** کشیدنِ خودِ تخته با انگشت، بدون تکیه بر اسکرولِ بومیِ مرورگر.
 *
 *  ⚠️ چرا لازم شد: کاربر روی «آیفون — سافاری» گزارش داد که تختهٔ مدار را
 *  نمی‌تواند کنار بکشد تا ادامهٔ مدار و جریانِ برق را ببیند. در شبیه‌سازِ
 *  کرومیوم اسکرولِ بومی کار می‌کرد و ایراد بازتولید نشد — یعنی چیزی است که
 *  فقط موتورِ سافاری دارد.
 *
 *  الگویی که اینجا بود دقیقاً همان الگویی است که iOS Safari سرش مشکل دارد:
 *  یک ظرفِ `overflow-x: auto` با `overflow-y: hidden` که عرضش
 *  `width: fit-content` است و داخلِ یک والدِ `position: fixed` نشسته. سافاری
 *  در این ترکیب گاهی اصلاً سرریز را حساب نمی‌کند، و ظرفی که از نظرِ مرورگر
 *  سرریز ندارد اسکرول هم نمی‌شود.
 *
 *  به‌جای دنبال کردنِ رفتارِ یک موتورِ خاص، وابستگی حذف می‌شود: کشیدن با
 *  رویدادهای pointer خوانده می‌شود و `scrollLeft` را خودمان می‌نویسیم. این
 *  کد در هر موتوری یکسان اجرا می‌شود و در کرومیوم هم قابل آزمودن است.
 *  اسکرولِ بومی سرِ جایش می‌ماند؛ این یک راهِ دوم است، نه جایگزین.
 *
 *  دو چیز که عمداً رعایت شده:
 *
 *    • قطعه‌ها دست‌نخورده‌اند. اگر کشیدن از روی یک `.gc-module` شروع شود،
 *      این هوک کنار می‌کشد تا کشیدنِ قطعه بشکند — وگرنه برداشتنِ مکعب و
 *      کشیدنِ تخته سرِ یک ژست دعوا می‌کردند.
 *
 *    • آستانه دارد. یک لمسِ ساده روی خانه باید کلیک بماند، نه اینکه به
 *      کشیدنِ یک‌پیکسلیِ تخته تبدیل شود و کلیک را ببلعد.
 */

/** تا این فاصله هنوز «لمس» است، نه «کشیدن». */
const PAN_THRESHOLD_PX = 8;
/** اصطکاکِ لغزشِ پس از رها کردن — هر فریم سرعت در این ضرب می‌شود. */
const GLIDE_FRICTION = 0.94;
/** زیر این سرعت (پیکسل بر فریم) لغزش تمام‌شده حساب می‌شود. */
const GLIDE_STOP = 0.4;

export function useBoardPan(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startScroll = 0;
    let panning = false;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let glideRaf = 0;

    /** کران‌های scrollLeft. در راست‌به‌چپ از منفیِ سرریز تا صفر است. */
    const bounds = () => {
      const max = el.scrollWidth - el.clientWidth;
      return getComputedStyle(el).direction === "rtl" ? { lo: -max, hi: 0 } : { lo: 0, hi: max };
    };
    const clamp = (v: number) => {
      const { lo, hi } = bounds();
      return Math.min(hi, Math.max(lo, v));
    };

    const stopGlide = () => {
      if (glideRaf) cancelAnimationFrame(glideRaf);
      glideRaf = 0;
    };

    /** لغزشِ نرم پس از رها کردن — تخته زیرِ انگشت ناگهان نمی‌ایستد. */
    const glide = () => {
      velocity *= GLIDE_FRICTION;
      if (Math.abs(velocity) < GLIDE_STOP) {
        glideRaf = 0;
        return;
      }
      const next = clamp(el.scrollLeft - velocity);
      if (next === el.scrollLeft) {
        glideRaf = 0;
        return;
      }
      el.scrollLeft = next;
      glideRaf = requestAnimationFrame(glide);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== null) return;
      // فقط لمس و قلم. با موس، چرخِ اسکرول و کشیدنِ نوار کارِ خودشان را
      // می‌کنند و ربودنِ کلیکِ چپ فقط مزاحمت است.
      if (event.pointerType === "mouse") return;
      const target = event.target as HTMLElement | null;
      // قطعه‌ها مالِ کشیدنِ قطعه‌اند.
      if (target?.closest(".gc-module")) return;
      if (el.scrollWidth <= el.clientWidth) return;

      stopGlide();
      pointerId = event.pointerId;
      startX = event.clientX;
      lastX = event.clientX;
      lastT = event.timeStamp;
      velocity = 0;
      startScroll = el.scrollLeft;
      panning = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (!panning) {
        if (Math.abs(dx) < PAN_THRESHOLD_PX) return;
        panning = true;
        /* ⚠️ گرفتنِ اشاره‌گر، وگرنه کشیدن نیمه‌کاره می‌ماند.
           اندازه‌گیری‌اش: بدون این، یک کشیدنِ ۱۷۰ پیکسلی فقط ۱۹ پیکسل تخته
           را جابه‌جا می‌کرد. مرورگر وسطِ کار ژست را برای خودش برمی‌داشت،
           `pointercancel` می‌فرستاد و بقیهٔ حرکت هرگز به ما نمی‌رسید. با
           capture، رویدادها تا انتها می‌آیند. */
        try {
          el.setPointerCapture(event.pointerId);
        } catch {
          /* عنصر ممکن است رفته باشد؛ کشیدن با شنوندهٔ window ادامه دارد. */
        }
      }
      // انگشت به یک سو، محتوا به همان سو: scrollLeft خلافِ جهتِ انگشت.
      el.scrollLeft = clamp(startScroll - dx);

      // سرعت برای لغزشِ بعد از رها کردن. بر حسبِ پیکسل در فریمِ ۶۰هرتز.
      const dt = event.timeStamp - lastT;
      if (dt > 0) velocity = ((event.clientX - lastX) / dt) * 16.7;
      lastX = event.clientX;
      lastT = event.timeStamp;

      event.preventDefault();
    };

    const stop = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      try {
        if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      } catch {
        /* عنصر ممکن است از DOM رفته باشد. */
      }
      const wasPanning = panning;
      pointerId = null;
      panning = false;
      if (wasPanning && event.type === "pointerup" && Math.abs(velocity) > GLIDE_STOP) {
        stopGlide();
        glideRaf = requestAnimationFrame(glide);
      }
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      stopGlide();
    };
  }, [ref, enabled]);
}
