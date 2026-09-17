"use client";

import * as React from "react";
import { useReducedMotion } from "@/lib/perf/use-perf";

/**
 * Magic UI's Cool Mode, adapted to Sarva.
 * Source: https://magicui.design/docs/components/cool-mode
 * MIT notice: components/home/MAGIC-UI-LICENSE.md.
 *
 * ⚠️ یک پوششِ `inline-flex` دورِ بچه می‌کشد و **عمداً** `cloneElement` نمی‌کند.
 *
 * نسخهٔ اول بچه را clone می‌کرد تا شنونده را مستقیم روی خودِ دکمه بگذارد —
 * دقیقاً کاری که Magic UI می‌کند. در این پروژه کار نمی‌کند: صفحهٔ خانهٔ
 * پنل یک Server Component است و چیزی که از آنجا به‌عنوان `children` به یک کامپوننتِ
 * کلاینت می‌رسد، یک عنصرِ React عادی نیست بلکه گرهِ رندرشدهٔ RSC است.
 * `cloneElement` روی آن یک عنصرِ بی‌نوع می‌سازد و صفحه با
 * «Element type is invalid» ۵۰۰ می‌دهد — یک خطای کاملاً مبهم که هیچ اشاره‌ای به
 * علتش ندارد. پوشش، هم این را حل می‌کند و هم یعنی دکمهٔ داخلش هر چیزی
 * می‌تواند باشد (Button، ShinyButton، یک `<Link>`) بدونِ هیچ قراردادی دربارهٔ ref.
 *
 * `inline-flex` و نه `display:contents`: پوشش باید جعبه داشته باشد تا برای
 * کلیکِ کیبورد، مرکزِ دکمه قابلِ اندازه‌گیری باشد.
 *
 * ⚠️ ذره‌ها در یک لایهٔ `fixed` و `pointer-events:none` روی `<body>` کشیده
 * می‌شوند و نه داخلِ خودِ دکمه — وگرنه اولین کارتی که `overflow:hidden` دارد
 * آن‌ها را می‌بُرد، و در پنل بیشترِ کارت‌ها همین‌طورند.
 *
 * ⚠️ کلِ شبیه‌سازی بیرونِ React است: یک کلاسِ ساده که `requestAnimationFrame`
 * دارد و مستقیم روی DOM می‌نویسد. سی ذره یعنی سی `setState` در هر فریم؛ همان
 * چیزی است که یک جلوهٔ تزئینی را به یک افتِ فریم تبدیل می‌کند. React فقط
 * می‌داند که این شیء وجود دارد و کِی باید نابود شود.
 *
 * ⚠️ و با `prefers-reduced-motion` هیچ ذره‌ای ساخته نمی‌شود. این جلوه صرفاً
 * جشن است؛ اولین چیزی است که باید کنار برود.
 */

export type CoolModeOptions = {
  /** نویسه‌هایی که پرتاب می‌شوند. یکی به‌تصادف برای هر ذره. */
  glyphs?: string[];
  /** اندازهٔ ذره برحسب پیکسل. */
  size?: number;
  /** تعداد ذره در هر کلیک. */
  count?: number;
};

const DEFAULT_GLYPHS = ["✦", "✧", "❈", "✿"];
const DEFAULT_SIZE = 16;
const DEFAULT_COUNT = 18;

const GRAVITY = 0.32;
const DRAG = 0.985;
/** سقفِ ذره‌های هم‌زمان. کلیکِ پیاپی نباید هزار گره به DOM اضافه کند. */
const MAX_PARTICLES = 90;

type Particle = {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

/** شبیه‌سازِ ذره‌ها — بیرونِ درختِ React، با حالتِ کاملاً درونی. */
class ParticleField {
  private layer: HTMLDivElement | null = null;
  private items: Particle[] = [];
  private frame = 0;
  private dead = false;

  burst(x: number, y: number, glyphs: string[], size: number, count: number) {
    if (this.dead) return;
    const host = this.ensureLayer();
    const room = Math.max(0, MAX_PARTICLES - this.items.length);

    for (let i = 0; i < Math.min(count, room); i++) {
      const el = document.createElement("span");
      el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      el.style.cssText = `position:absolute;top:0;left:0;will-change:transform,opacity;font-size:${size}px;line-height:1;color:var(--primary);user-select:none`;
      host.appendChild(el);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 6 + Math.random() * 7;
      this.items.push({
        el,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 46 + Math.random() * 26,
      });
    }

    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  /** با unmount صدا زده می‌شود: حلقه، گره‌ها و لایه، همه با هم. */
  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.items = [];
    this.layer?.remove();
    this.layer = null;
  }

  private ensureLayer(): HTMLDivElement {
    if (this.layer) return this.layer;
    const node = document.createElement("div");
    node.setAttribute("aria-hidden", "true");
    node.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden";
    document.body.appendChild(node);
    this.layer = node;
    return node;
  }

  private tick = () => {
    const alive: Particle[] = [];

    for (const p of this.items) {
      p.vy += GRAVITY;
      p.vx *= DRAG;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      if (p.life <= 0 || p.y > window.innerHeight + 40) {
        p.el.remove();
        continue;
      }

      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.x * 2}deg)`;
      p.el.style.opacity = String(Math.min(1, p.life / 22));
      alive.push(p);
    }

    this.items = alive;

    if (alive.length > 0) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }

    /* ⚠️ لایه با تمام شدنِ ذره‌ها برداشته می‌شود. یک `div`ِ تمام‌صفحه که
       همیشه بماند، بی‌ضرر به نظر می‌رسد تا روزی که چیزی رویش حساب کند. */
    this.frame = 0;
    this.layer?.remove();
    this.layer = null;
  };
}

export function CoolMode({
  children,
  options,
  disabled = false,
  className,
}: {
  children: React.ReactNode;
  options?: CoolModeOptions;
  disabled?: boolean;
  className?: string;
}) {
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const fieldRef = React.useRef<ParticleField | null>(null);
  const reduced = useReducedMotion();

  const glyphs = options?.glyphs ?? DEFAULT_GLYPHS;
  const size = options?.size ?? DEFAULT_SIZE;
  const count = options?.count ?? DEFAULT_COUNT;

  React.useEffect(() => {
    const field = new ParticleField();
    fieldRef.current = field;
    return () => {
      field.destroy();
      fieldRef.current = null;
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (reduced || disabled) return;

    /* کلیکِ کیبورد مختصاتِ ۰،۰ می‌دهد — آن‌وقت ذره‌ها از گوشهٔ صفحه
       می‌پاشند. در آن حالت مرکزِ خودِ دکمه مبدأ می‌شود. */
    let { clientX: x, clientY: y } = event;
    if (x === 0 && y === 0) {
      const box = hostRef.current?.getBoundingClientRect();
      if (!box) return;
      x = box.left + box.width / 2;
      y = box.top + box.height / 2;
    }

    fieldRef.current?.burst(x, y, glyphs, size, count);
  };

  return (
    <span ref={hostRef} onPointerDown={onPointerDown} className={className ?? "inline-flex"}>
      {children}
    </span>
  );
}
