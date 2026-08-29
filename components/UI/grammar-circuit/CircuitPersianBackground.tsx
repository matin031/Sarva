"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";

/** پس‌زمینهٔ «مدار دستور» — همان هندسهٔ ایرانیِ سروا، این بار برق‌دار.
 *
 *  ── چرا یک نسخهٔ جداگانه و نه تغییرِ `GeometricPattern` ────────────────────
 *  آن کامپوننت در `SiteChrome` روی کلِ سایت است. هر تغییری در رفتارش — حتی
 *  یک انیمیشن — روی درسنامه، آزمون و پنل هم می‌نشیند. پس نقشِ ستاره عیناً از
 *  همان‌جا برداشته شده ولی رفتارِ برقی فقط اینجا زندگی می‌کند.
 *
 *  ── سه لایه ───────────────────────────────────────────────────────────────
 *  ۱. لایهٔ پایه: همان الگوی ۸۰×۸۰ سروا، تکرارشونده و با کدری بسیار کم.
 *     یک `<svg>` است و *هیچ‌وقت* انیمیت نمی‌شود.
 *  ۲. گره‌های تپش: یک استخرِ کوچکِ ثابت (۷ عدد) که روی گره‌های *واقعیِ* همان
 *     شبکه می‌نشینند — مرکزِ ستاره در هر کاشی (۴۰+۸۰i، ۴۰+۸۰j). چون دقیقاً
 *     منطبق‌اند، حس می‌دهد «یکی از نقش‌ها روشن شد»، نه «یک لکه جایی درخشید».
 *  ۳. ردها: چند خطِ کوتاه بینِ دو گرهٔ همسایه که گاهی روشن می‌شوند و حسِ
 *     عبورِ جریان می‌دهند.
 *
 *  ── چرا هیچ state ای در کار نیست ──────────────────────────────────────────
 *  زمان‌بندی با `setTimeout` است و تپش‌ها مستقیم روی DOM اجرا می‌شوند
 *  (`element.animate`). یعنی هیچ رندرِ دوباره‌ای در React رخ نمی‌دهد — نه در
 *  این کامپوننت، نه در تختهٔ بازی. فقط `opacity` و `transform` انیمیت
 *  می‌شوند تا کار روی کامپوزیتور بماند؛ نه فیلترِ تمام‌صفحه، نه انیمیتِ
 *  پیوستهٔ یک SVGِ بزرگ. */

/** نقشِ ستارهٔ سروا — عیناً همان مسیرِ `GeometricPattern`. */
const STAR = "M40 10 L45 35 L70 40 L45 45 L40 70 L35 45 L10 40 L35 35 Z";

const TILE = 80;
/** تعدادِ گره‌هایی که هم‌زمان می‌توانند روشن باشند. عمداً کم. */
const NODES = 7;
const TRACES = 3;

const MIN_GAP_MS = 3000;
const MAX_GAP_MS = 6000;
const MIN_PULSE_MS = 500;
const MAX_PULSE_MS = 900;
/** هر چند تپش، یک ردِ کوتاه هم روشن شود. */
const TRACE_CHANCE = 0.45;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function CircuitPersianBackground({
  className = "",
}: {
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const traceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // کاهشِ حرکت: فقط نقشِ ثابت می‌ماند، بدونِ هیچ زمان‌بندی‌ای.
    if (reducedMotion) return;

    const host = hostRef.current;
    if (!host) return;

    let timer: number | undefined;
    let cancelled = false;
    const running = new Set<Animation>();
    let nodeCursor = 0;
    let traceCursor = 0;

    /** یک گرهٔ تصادفی روی شبکهٔ همان الگو.
     *
     *  یک کاشی از هر لبه فاصله می‌گیریم: گرهٔ چسبیده به لبه نصفه بریده
     *  می‌شود و به‌جای «یکی از نقش‌ها روشن شد» شبیهِ یک لکه در گوشهٔ صفحه
     *  دیده می‌شود. */
    const pickNode = () => {
      const cols = Math.max(1, Math.floor(host.clientWidth / TILE));
      const rows = Math.max(1, Math.floor(host.clientHeight / TILE));
      const minCol = cols > 2 ? 1 : 0;
      const maxCol = cols > 2 ? cols - 2 : cols - 1;
      const minRow = rows > 2 ? 1 : 0;
      const maxRow = rows > 2 ? rows - 2 : rows - 1;
      const col = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));
      const row = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));
      return { x: col * TILE, y: row * TILE, col, row, cols, rows };
    };

    /** یک تپش را اجرا می‌کند.
     *
     *  جای گره **داخلِ خودِ keyframe** نوشته می‌شود، نه در `style.transform`.
     *  دلیلش یک نکتهٔ ظریفِ WAAPI است: انیمیشن روی `transform` مقدارِ
     *  درون‌خطیِ همان ویژگی را کاملاً کنار می‌گذارد. اگر جای گره را در
     *  `style` بگذاریم و مقیاس را در keyframe، هر تپش به مبدأ — گوشهٔ
     *  بالا-چپِ صفحه — می‌پرد. (همین اتفاق افتاد و آزمونِ موقعیت گرفتش.) */
    const play = (
      el: HTMLElement,
      peak: number,
      duration: number,
      scaleTo: number,
      x: number,
      y: number,
    ) => {
      const at = (scale: number) => `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      const animation = el.animate(
        [
          { opacity: 0, transform: at(scaleTo === 1 ? 1 : 0.9) },
          { opacity: peak, transform: at(1), offset: 0.32 },
          { opacity: 0, transform: at(scaleTo) },
        ],
        { duration, easing: "cubic-bezier(0.4, 0, 0.3, 1)" },
      );
      running.add(animation);
      animation.finished.catch(() => {}).finally(() => running.delete(animation));
      return animation;
    };

    const pulse = () => {
      if (cancelled) return;

      const node = nodeRefs.current[nodeCursor % NODES];
      nodeCursor += 1;
      const spot = pickNode();

      if (node) {
        // دو رنگِ هویتی: بیشتر فیروزه‌ای، گاهی طلایی.
        node.dataset.tone = Math.random() < 0.72 ? "teal" : "gold";
        play(node, rand(0.3, 0.52), rand(MIN_PULSE_MS, MAX_PULSE_MS), 1.14, spot.x, spot.y);
      }

      /* گاهی یک ردِ کوتاه بینِ همین گره و همسایه‌اش روشن می‌شود — اشارهٔ
         ظریفی به عبورِ جریان، نه یک خطِ پررنگ. */
      if (Math.random() < TRACE_CHANCE) {
        const trace = traceRefs.current[traceCursor % TRACES];
        traceCursor += 1;
        if (trace) {
          const horizontal = Math.random() < 0.5;
          const canRight = spot.col + 1 < spot.cols;
          const canDown = spot.row + 1 < spot.rows;
          const useH = horizontal ? canRight : !canDown && canRight;
          const x = spot.x + TILE / 2;
          const y = spot.y + TILE / 2;
          trace.dataset.dir = useH ? "h" : "v";
          trace.dataset.tone = node?.dataset.tone ?? "teal";
          play(trace, rand(0.22, 0.4), rand(MIN_PULSE_MS, MAX_PULSE_MS), 1, x, y);
        }
      }

      timer = window.setTimeout(pulse, rand(MIN_GAP_MS, MAX_GAP_MS));
    };

    // اولین تپش کمی بعد از باز شدنِ صفحه، تا با ورودِ کاربر هم‌زمان نشود.
    timer = window.setTimeout(pulse, rand(1200, 2400));

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      for (const animation of running) animation.cancel();
      running.clear();
    };
  }, [reducedMotion]);

  return (
    <div ref={hostRef} className={`gc-bg ${className}`} aria-hidden>
      {/* لایهٔ پایه — نقشِ سروا، ثابت و بی‌حرکت. */}
      <svg className="gc-bg-base" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="gc-persian-tile"
            x="0"
            y="0"
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
          >
            <path d={STAR} fill="currentColor" opacity="0.5" />
            <path d="M0 0 L10 0 L0 10 Z" fill="currentColor" opacity="0.35" />
            <path d="M80 0 L80 10 L70 0 Z" fill="currentColor" opacity="0.35" />
            <path d="M0 80 L0 70 L10 80 Z" fill="currentColor" opacity="0.35" />
            <path d="M80 80 L70 80 L80 70 Z" fill="currentColor" opacity="0.35" />
            <circle cx="40" cy="40" r="3" fill="currentColor" opacity="0.28" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gc-persian-tile)" />
      </svg>

      {/* گره‌های تپش — روی همان شبکه، در ابتدا نامرئی. */}
      {Array.from({ length: NODES }).map((_, i) => (
        <div
          key={`node-${i}`}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          className="gc-bg-node"
          data-tone="teal"
        >
          <span className="gc-bg-halo" />
          <svg viewBox={`0 0 ${TILE} ${TILE}`} width={TILE} height={TILE}>
            <path d={STAR} fill="currentColor" />
            <circle cx="40" cy="40" r="3.5" fill="currentColor" />
          </svg>
        </div>
      ))}

      {/* ردهای کوتاهِ بینِ گره‌ها. */}
      {Array.from({ length: TRACES }).map((_, i) => (
        <div
          key={`trace-${i}`}
          ref={(el) => {
            traceRefs.current[i] = el;
          }}
          className="gc-bg-trace"
          data-dir="h"
          data-tone="teal"
        />
      ))}
    </div>
  );
}
