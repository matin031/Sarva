"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TestTube from "./TestTube";
import { KIMIA_FOOT_CATALOG } from "@/lib/kimia/catalog";
import { useReducedMotion } from "@/lib/perf/use-perf";
import type { FootKey } from "@/lib/kimia/types";

/**
 * پخش‌کنندهٔ گوشی — چرخ‌فلکِ مرکزمحور.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا روی گوشی شبکه جواب نمی‌دهد
 * ═══════════════════════════════════════════════════════════════════════
 * شانزده لوله در عرضِ ۳۹۰ پیکسل یعنی یا سه ردیفِ فشرده (که نصفِ ارتفاعِ
 * صفحه را می‌خورد و بودجهٔ ارتفاع را می‌شکند) یا لوله‌های ۲۰ پیکسلی که
 * نه خوانده می‌شوند و نه زده. اینجا یک ریلِ افقی می‌نشیند: همیشه یک
 * ماده در مرکز و کامل، و بقیه کوچک‌تر در دو طرف.
 *
 * ── چرا scroll-snap و نه یک کتابخانهٔ چرخ‌فلک ────────────────────────────
 * ⚠️ اسکرولِ بومی اینرسی، کشش، لغو با لمس و دسترسی‌پذیریِ صفحه‌کلید را
 * *مجانی* می‌دهد و هیچ‌کدام را نمی‌شود با JS به همان کیفیت نوشت.
 * `scroll-snap-type: x mandatory` نگهش می‌دارد روی مرکز، و کارِ ما فقط
 * کشیدنِ عمق است.
 *
 * ── فاصله از مرکز ───────────────────────────────────────────────────────
 * ⚠️ `--d` (فاصلهٔ نرمال‌شدهٔ هر آیتم از مرکز) از *اندازه‌گیریِ مستقیمِ
 * rect* می‌آید و نه از `scrollLeft`. در RTL علامت و مبدأِ `scrollLeft`
 * بین مرورگرها فرق دارد (کروم مثبت از راست، فایرفاکس منفی، سافاری
 * معکوس) و هر فرمولی روی آن، در یکی از سه مرورگر برعکس می‌شود.
 * `getBoundingClientRect` در همه یکی است.
 *
 * ⚠️ و همهٔ خواندن‌ها *پیش از* همهٔ نوشتن‌ها انجام می‌شوند: اول یک پاس
 * rect می‌گیریم، بعد یک پاس `style` می‌نویسیم. قاطی کردنشان یعنی
 * layout thrashing — مرورگر مجبور می‌شود بینِ هر دو آیتم دوباره layout
 * بسازد.
 *
 * ⚠️ حلقه فقط وقتی می‌چرخد که ریل در حالِ حرکت باشد. یک rAFِ همیشه‌روشن
 * برای چیزی که بیشترِ وقت ساکن است، فقط باتری می‌سوزاند.
 */

export default function VialCoverflow({
  disabled,
  recentFoot,
  onPick,
}: {
  disabled: boolean;
  recentFoot: FootKey | null;
  onPick: (foot: FootKey) => void;
}) {
  /**
   * ⚠️ در حالتِ کم‌حرکت، *عمق* کلاً خاموش می‌شود و ریل فقط یک نوارِ
   * snap‌دار می‌ماند: هیچ مقیاس و هیچ محوشدنی. همان اطلاعات (کدام ماده
   * وسط است) با قابِ فوکوس و پررنگیِ نام منتقل می‌شود.
   */
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<FootKey, HTMLButtonElement>());
  const frame = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const [centered, setCentered] = useState<FootKey>(KIMIA_FOOT_CATALOG[0]);
  /**
   * ⚠️ همین ref است که «مادهٔ وسط» را از وابستگی‌های `paint` بیرون
   * می‌کشد — و بدونش کلِ چرخ‌فلک قفل بود:
   *
   *   `paint` به `centered` وابسته بود → با هر بار عوض شدنِ مادهٔ وسط،
   *   تابع تازه می‌شد → effectِ شنونده‌ها از نو اجرا می‌شد → و آن effect
   *   ریل را روی مادهٔ اول می‌نشاند. یعنی هر بار که کاربر ریل را
   *   می‌چرخاند، بلافاصله برمی‌گشت سرِ خط. (تستِ مرورگری همین را گرفت:
   *   `scrollLeft` بعد از هر لمس صفر می‌ماند.)
   */
  const centeredRef = useRef<FootKey>(KIMIA_FOOT_CATALOG[0]);

  /** یک پاسِ کامل: اول همهٔ خواندن‌ها، بعد همهٔ نوشتن‌ها. */
  const paint = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const trackRect = track.getBoundingClientRect();
    const mid = trackRect.left + trackRect.width / 2;

    /* ── خواندن ─────────────────────────────────────────────────────── */
    const reads: { el: HTMLButtonElement; foot: FootKey; d: number }[] = [];
    let pitch = 1;
    let nearest: { foot: FootKey; d: number } | null = null;
    for (const [foot, el] of itemRefs.current) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) pitch = rect.width;
      const d = (rect.left + rect.width / 2 - mid) / Math.max(1, rect.width);
      reads.push({ el, foot, d });
      if (!nearest || Math.abs(d) < Math.abs(nearest.d)) nearest = { foot, d };
    }
    void pitch;

    /* ── نوشتن ──────────────────────────────────────────────────────── */
    for (const { el, d } of reads) {
      el.style.setProperty("--d", d.toFixed(3));
      el.style.setProperty("--ad", Math.min(3, Math.abs(d)).toFixed(3));
    }

    if (nearest && nearest.foot !== centeredRef.current) {
      centeredRef.current = nearest.foot;
      setCentered(nearest.foot);
    }
  }, []);

  /* حلقه فقط تا وقتی ریل حرکت می‌کند. */
  const spin = useCallback(() => {
    if (frame.current !== null) return;
    const tick = () => {
      paint();
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [paint]);

  const settle = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    paint();
  }, [paint]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      spin();
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(settle, 140);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(() => paint());
    observer.observe(track);

    /* ⚠️ ریل را روی *اولین* ماده می‌نشانیم و نه هرجا که مرورگر رها
       می‌کند. در RTL، جای شروعِ اسکرول بینِ مرورگرها فرق دارد و کروم
       ریل را ته‌خط (آخرین ماده) نشان می‌داد. */
    const centerFirst = () => {
      const first = itemRefs.current.get(KIMIA_FOOT_CATALOG[0]);
      first?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
      paint();
    };
    /* ⚠️ یک فریم صبر: پیش از اولین layout، عرضِ ریل صفر است و
       `scrollIntoView` هیچ کاری نمی‌کند. */
    const raf = requestAnimationFrame(centerFirst);
    const ready = document.fonts?.ready ?? Promise.resolve();
    void ready.then(centerFirst);
    paint();

    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      frame.current = null;
    };
  }, [paint, settle, spin]);

  const scrollTo = useCallback((foot: FootKey) => {
    const el = itemRefs.current.get(foot);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  const step = useCallback(
    (delta: number) => {
      const index = KIMIA_FOOT_CATALOG.indexOf(centeredRef.current);
      const next = KIMIA_FOOT_CATALOG[Math.min(KIMIA_FOOT_CATALOG.length - 1, Math.max(0, index + delta))];
      if (next) {
        scrollTo(next);
        itemRefs.current.get(next)?.focus({ preventScroll: true });
      }
    },
    [scrollTo],
  );

  return (
    <section
      className="km-cf"
      data-reduced={reduced || undefined}
      aria-roledescription="carousel"
      aria-label="ارکانِ عروضی"
      onKeyDown={(e) => {
        if (disabled) return;
        /* ⚠️ در RTL «راست» یعنی قبلی. */
        if (e.key === "ArrowRight") {
          e.preventDefault();
          step(-1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          step(1);
        }
      }}
    >
      {/* `data-carousel` را `dispenserHomeFor` می‌خواند: مقصدِ شبحِ
          برگشت مرکزِ همین ریل است. */}
      <div ref={trackRef} className="km-cf-track" data-carousel="">
        {KIMIA_FOOT_CATALOG.map((foot) => {
          const isCentered = foot === centered;
          return (
            <button
              key={foot}
              ref={(el) => {
                if (el) itemRefs.current.set(foot, el);
                else itemRefs.current.delete(foot);
              }}
              type="button"
              className="km-cf-item"
              data-dispenser={foot}
              data-centered={isCentered || undefined}
              data-recent={recentFoot === foot || undefined}
              aria-disabled={disabled || undefined}
              aria-label={
                isCentered ? `${foot} — افزودن به جایگاهِ بعدی` : `${foot} — آوردن به مرکز`
              }
              onClick={() => {
                if (disabled) return;
                /* ⚠️ آیتمِ کناری *اضافه نمی‌کند*: اول می‌آید وسط. روی یک
                   ریلِ شلوغ، لمسِ ناخواستهٔ همسایه نباید چیدمان را عوض
                   کند. */
                if (isCentered) onPick(foot);
                else scrollTo(foot);
              }}
            >
              {/* ⚠️ همان `TestTube`ِ بازی و نه یک کپیِ تصویری — فقط
                  بدونِ دکمه، چون خودش داخلِ یک دکمه است. */}
              <TestTube foot={foot} role="dispenser" label="full" plain />
            </button>
          );
        })}
      </div>

      {/* نامِ مادهٔ وسط، برای صفحه‌خوان. */}
      <span className="sr-only" aria-live="polite">
        {centered}
      </span>
    </section>
  );
}
