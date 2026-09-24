"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { annotate } from "rough-notation";
import { useInView } from "motion/react";
import { useReducedMotion } from "@/lib/perf/use-perf";

export type HighlighterAction = "underline" | "highlight" | "box" | "circle" | "bracket" | "strike-through" | "crossed-off";

/** Magic UI's Rough Notation highlighter, adapted for Persian text, font
 * loading, responsive reflow and the site's reduced-motion preference.
 * https://magicui.design/docs/components/highlighter
 *
 * Rough Notation writes `color` into the SVG's `stroke` attribute, where CSS
 * variables and `color-mix()` are not reliable. The stroke is therefore drawn
 * in `currentColor` and the real colour is set as CSS on the SVG itself, so
 * theme tokens like `var(--gold)` follow light/dark mode. */
export function Highlighter({
  children,
  action = "underline",
  color = "var(--primary)",
  strokeWidth = 2,
  padding = 3,
  iterations = 2,
  duration = 750,
  delay = 0,
  className,
}: {
  children: ReactNode;
  action?: HighlighterAction;
  color?: string;
  strokeWidth?: number;
  padding?: number;
  iterations?: number;
  duration?: number;
  /** Milliseconds to wait after the text scrolls into view. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // ⚠️ `amount: 1` نه: عبارتِ بلند در موبایل ممکن است هیچ‌وقت کامل توی کادر نیفتد و نشان اصلاً کشیده نشود.
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || !inView) return;
    let disposed = false;
    let timer = 0;
    let cleanup = () => {};

    /* ⚠️ صبر کن تا متن از حرکت بایستد.
​
       rough-notation مختصات را یک‌بار و از روی `getBoundingClientRect` می‌خواند.
       اگر همان لحظه کارت هنوز در حالِ انیمیشنِ ورود باشد (motion با `scale` یا
       `y`)، نشان روی مختصاتِ کهنه کشیده می‌شود و تا ابد کنارِ کلمه می‌ماند —
       همان لکهٔ طلاییِ کج که وسطِ جملهٔ بغلی می‌افتاد. */
    const still = () => new Promise<void>(resolve => {
      let last = "", same = 0;
      const tick = () => {
        if (disposed) return;
        const box = element.getBoundingClientRect();
        const key = `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)}`;
        same = key === last ? same + 1 : 0;
        last = key;
        if (same >= 2) resolve(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    void document.fonts.ready.then(() => {
      if (disposed) return;
      timer = window.setTimeout(async () => {
        await still();
        if (disposed) return;
        const annotation = annotate(element, {
          type: action, color: "currentColor", strokeWidth, padding,
          multiline: true, rtl: true, iterations,
          animationDuration: duration, animate: !reduced,
        });
        annotation.show();
        // The SVG is attached on first show: before the element for highlights, after it otherwise.
        const svg = action === "highlight" ? element.previousElementSibling : element.nextElementSibling;
        if (svg instanceof SVGElement && svg.classList.contains("rough-annotation")) {
          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("focusable", "false");
          svg.style.color = color;
        }
        /* نشان را وقتی جابه‌جا شد دوباره بکش، بی‌آنکه ورودش تکرار شود.
​
           ⚠️ معیار، فاصلهٔ متن تا خودِ svg است و نه عرضِ متن: نشان هم‌جا با
           بومِ svg است، پس وقتی کل کارت جابه‌جا می‌شود هر دو با هم می‌روند و
           کاری لازم نیست؛ ولی همین که سطر بشکند یا پیامی بالاترش باز شود،
           متن نسبت به بوم سُر می‌خورد و نشان باید از نو کشیده شود. */
        const drift = () => {
          const box = element.getBoundingClientRect();
          const canvas = svg instanceof SVGElement ? svg.getBoundingClientRect() : box;
          return `${Math.round(box.x - canvas.x)},${Math.round(box.y - canvas.y)},${Math.round(box.width)}`;
        };
        let where = drift();
        const redraw = () => {
          const next = drift();
          if (next === where) return;
          where = next;
          annotation.hide();
          annotation.animate = false;
          annotation.show();
        };
        // ⚠️ پدر را می‌پاید و نه خودِ span را: این span حالا inline است و
        // ResizeObserver برای عنصرِ inline هیچ‌وقت شلیک نمی‌کند.
        const observer = new ResizeObserver(redraw);
        observer.observe(element.parentElement ?? element);
        window.addEventListener("resize", redraw);
        cleanup = () => { observer.disconnect(); window.removeEventListener("resize", redraw); annotation.remove(); };
      }, reduced ? 0 : delay);
    });
    return () => { disposed = true; window.clearTimeout(timer); cleanup(); };
  }, [action, color, strokeWidth, padding, iterations, duration, delay, inView, reduced]);

  /* ⚠️ `inline` و نه `inline-block`.
  
     با inline-block عبارتِ نشان‌دار **اصلاً نمی‌شکند**؛ یعنی یک عبارتِ چندکلمه‌ای یکجا
     به سطرِ بعد می‌پرد و وسطِ سطر چاله جا می‌گذارد — و بدتر: نقطهٔ بعدازش نویسهٔ
     خنثی‌ست و در متنِ راست‌به‌چپ اولِ سطرِ بعد می‌افتد. `multiline: true` در rough-notation
     برای همین هست: برای هر سطری که عبارت رویش پخش شده، یک نشان جدا می‌کشد. */
  return <span ref={ref} className={className} style={{ display: "inline", position: "relative", isolation: "isolate", lineHeight: "inherit" }}>{children}</span>;
}
