"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";
import { useDocumentVisible, useReducedMotion } from "@/lib/perf/use-perf";

/**
 * Magic UI's Particles, adapted to Sarva.
 * Source: https://magicui.design/docs/components/particles
 * MIT notice: components/home/MAGIC-UI-LICENSE.md.
 *
 * رفتارِ دیداری همان است — ذره‌های ریزِ شناور که با حرکتِ اشاره‌گر آرام
 * کشیده می‌شوند — ولی چهار چیز عمداً فرق دارد:
 *
 * ⚠️ ۱) موقعیتِ اشاره‌گر با `setState` ثبت نمی‌شود.
 *
 * نسخهٔ اصلی روی هر `mousemove` یک `setState` می‌زند. یعنی روی یک حرکتِ
 * معمولیِ ماوس، شصت رندرِ React در ثانیه — و آن رندرها *کلِ زیردرخت* را
 * درگیر می‌کنند، در حالی که تنها مصرف‌کنندهٔ آن عدد یک حلقهٔ `rAF` است که
 * اصلاً داخلِ React نیست. اینجا مقدار در یک `ref` می‌نشیند و حلقه خودش
 * می‌خواندش: صفر رندر.
 *
 * ⚠️ ۲) `ResizeObserver` به‌جای شنوندهٔ `resize` روی پنجره.
 *
 * این لایه پشتِ یک ناحیهٔ بازی می‌نشیند که اندازه‌اش با چیدمان عوض می‌شود،
 * نه فقط با اندازهٔ پنجره — چرخشِ گوشی، باز شدنِ صفحهٔ نتیجه، یا مصراعی که
 * دو خط می‌شود. شنوندهٔ پنجره هیچ‌کدام را نمی‌بیند.
 *
 * ⚠️ ۳) رنگ می‌تواند یک متغیّرِ CSS باشد.
 *
 * نسخهٔ اصلی فقط hex می‌پذیرد (`hexToRgb`). پالتِ سروا با `oklch` و متغیّر
 * تعریف شده و هیچ‌جا hex ندارد، پس رنگ یک بار از `getComputedStyle` خوانده
 * و روی `fillStyle` نشانده می‌شود؛ شفافیت با `globalAlpha` جدا اعمال
 * می‌شود تا به فرمتِ رنگ کاری نداشته باشیم. یعنی تمِ روشن/تیره خودبه‌خود
 * درست است.
 *
 * ⚠️ ۴) حلقه در تبِ پنهان و در حالتِ «حرکتِ کمتر» اصلاً نمی‌چرخد.
 *
 * با `prefers-reduced-motion` ذره‌ها یک بار کشیده می‌شوند و همان‌جا
 * می‌مانند: پس‌زمینه‌ای ساکن که هنوز بافت دارد، ولی هیچ حرکتی ندارد.
 */

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

export interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  /** تعدادِ ذره‌ها. روی دستگاهِ ضعیف خودِ صدازننده کمترش می‌کند. */
  quantity?: number;
  /** هرچه بزرگ‌تر، ذره کمتر به اشاره‌گر واکنش نشان می‌دهد. */
  staticity?: number;
  /** نرمیِ دنبال‌کردنِ اشاره‌گر؛ بزرگ‌تر یعنی تنبل‌تر. */
  ease?: number;
  /** کمینهٔ شعاعِ ذره بر حسبِ پیکسلِ CSS. */
  size?: number;
  /** هر رنگِ معتبرِ CSS، از جمله `var(--color-primary)`. */
  color?: string;
  vx?: number;
  vy?: number;
}

/** `var(--x)` → مقدارِ واقعی. هر چیزِ دیگری دست‌نخورده برمی‌گردد. */
function resolveColor(raw: string, host: HTMLElement): string {
  const match = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw.trim());
  if (!match) return raw;
  const value = getComputedStyle(host).getPropertyValue(match[1]!).trim();
  return value || "#ffffff";
}

export function Particles({
  className,
  quantity = 90,
  staticity = 50,
  ease = 50,
  size = 0.4,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  ...props
}: ParticlesProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const reduced = useReducedMotion();
  const visible = useDocumentVisible();

  /* ⚠️ گزینه‌ها در یک ref می‌نشینند تا عوض شدنِ یک عدد، کلِ صحنه را از نو
     نسازد. حلقه هر فریم از همین‌جا می‌خواند. */
  const opts = useRef({ quantity, staticity, ease, size, color, vx, vy });
  opts.current = { quantity, staticity, ease, size, color, vx, vy };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0 };
    let circles: Circle[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const fill = resolveColor(opts.current.color, host);

    const spawn = (): Circle => ({
      x: Math.floor(Math.random() * w),
      y: Math.floor(Math.random() * h),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + opts.current.size,
      alpha: 0,
      targetAlpha: Number((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    });

    const draw = (circle: Circle) => {
      context.globalAlpha = circle.alpha;
      context.beginPath();
      context.arc(
        circle.x + circle.translateX,
        circle.y + circle.translateY,
        circle.size,
        0,
        2 * Math.PI,
      );
      context.fill();
    };

    const resize = () => {
      w = host.offsetWidth;
      h = host.offsetHeight;
      if (w === 0 || h === 0) return;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = fill;

      circles = Array.from({ length: opts.current.quantity }, spawn);
      render();
    };

    /** یک قاب — بدونِ پیشروی. برای حالتِ ساکن هم همین کشیده می‌شود. */
    const render = () => {
      context.clearRect(0, 0, w, h);
      for (const circle of circles) draw(circle);
    };

    /** شفافیت نزدیکِ لبه‌ها کم می‌شود تا ذره‌ها «بریده» ظاهر نشوند. */
    const fade = (circle: Circle) => {
      const edge = Math.min(
        circle.x + circle.translateX - circle.size,
        w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        h - circle.y - circle.translateY - circle.size,
      );
      const near = Math.max(0, Math.min(1, edge / 20));
      if (near >= 1) circle.alpha = Math.min(circle.alpha + 0.02, circle.targetAlpha);
      else circle.alpha = circle.targetAlpha * near;
    };

    const step = () => {
      const { staticity: st, ease: es, vx: dx0, vy: dy0 } = opts.current;
      context.clearRect(0, 0, w, h);

      for (let i = 0; i < circles.length; i++) {
        const circle = circles[i]!;
        fade(circle);

        circle.x += circle.dx + dx0;
        circle.y += circle.dy + dy0;
        circle.translateX += (mouse.x / (st / circle.magnetism) - circle.translateX) / es;
        circle.translateY += (mouse.y / (st / circle.magnetism) - circle.translateY) / es;

        draw(circle);

        /* ⚠️ ذرهٔ بیرون‌رفته *جایگزین* می‌شود و نه `splice`: نسخهٔ اصلی وسطِ
           همان حلقه‌ای که رویش می‌چرخد از آرایه حذف می‌کرد، پس هر بار یک
           ذرهٔ بعدی را هم از قلم می‌انداخت. جایگزینیِ درجا هم تعداد را ثابت
           نگه می‌دارد و هم هزینهٔ جابه‌جاییِ آرایه را ندارد. */
        if (
          circle.x < -circle.size ||
          circle.x > w + circle.size ||
          circle.y < -circle.size ||
          circle.y > h + circle.size
        ) {
          circles[i] = spawn();
        }
      }

      raf = window.requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - w / 2;
      const y = event.clientY - rect.top - h / 2;
      if (Math.abs(x) < w / 2 && Math.abs(y) < h / 2) {
        mouse.x = x;
        mouse.y = y;
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animating = !reduced && visible;
    if (animating) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      raf = window.requestAnimationFrame(step);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reduced, visible]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      {...props}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}

export default Particles;
