"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuality, useScrolling, useFinePointer } from "@/lib/perf/use-perf";
import { motion } from "motion/react";
import ArkanSphere from "./ArkanSphere";
import { RevealGroup, RevealItem, RevealLine } from "@/components/UI/aruz/reveal";
import styles from "./aruz.module.css";

/** The عروض سماعی hero: an aurora-lit stage with a perspective grid floor, a
 *  cursor spotlight, the interactive arkān sphere, and a headline. */
export default function AruzHero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  // raw pointer position within the section, for the cursor spotlight
  // ⚠️ پیش از این، نورافکن یک radial-gradient بود که *محلش* عوض می‌شد، روی
  // یک سطحِ inset-0. تغییرِ محلِ گرادیان یعنی رنگ‌آمیزیِ دوبارهٔ همان سطحِ
  // بزرگ در هر حرکتِ اشاره‌گر — روی ترک‌پد و هم‌زمان با اسکرول گران است.
  //
  // حالا یک دایرهٔ ثابت با گرادیانِ ثابت است که فقط translate3d می‌شود:
  // هیچ رنگ‌آمیزیِ دوباره‌ای لازم نیست، فقط جابه‌جاییِ لایه در compositor.
  const glowRef = useRef<HTMLDivElement>(null);

  const { settings } = useQuality();
  const scrolling = useScrolling();

  // نورافکن فقط جایی که واقعاً معنا دارد: موس، کیفیتِ کافی، بدونِ اسکرول،
  // و نه در حالتِ حرکتِ کم.
  const fine = useFinePointer();
  const spotlightOn = !reduced && fine && settings.spotlight && !scrolling;

  useEffect(() => {
    if (!spotlightOn) return;
    const el = sectionRef.current;
    if (!el) return;

    // The pointer listener is on window, so it fires for movement anywhere on
    // the page; reading the section's box inside it would mean a layout read
    // per move. The box is therefore measured in document space once, and again
    // only when the layout could actually have moved it.
    const geo = { left: 0, top: 0, w: 1, h: 1 };
    const scroll = { x: 0, y: 0 };

    /** Reading window.scrollY *inside* a scroll event is the read-after-write
     *  that DevTools reports as "Forced reflow": by then this frame's style is
     *  already invalidated, so the read forces a synchronous layout. The scroll
     *  handler therefore only raises a flag, and the single read happens in a
     *  requestAnimationFrame callback — the frame's read phase, before anything
     *  writes — so it is never a forced layout. At most one read per frame, and
     *  no frames at all while the page is still. */
    let pending = 0;
    const sample = () => {
      pending = 0;
      scroll.x = window.scrollX;
      scroll.y = window.scrollY;
    };
    const onScroll = () => {
      if (!pending) pending = requestAnimationFrame(sample);
    };

    const measure = () => {
      const r = el.getBoundingClientRect();
      scroll.x = window.scrollX;
      scroll.y = window.scrollY;
      geo.left = r.left + scroll.x;
      geo.top = r.top + scroll.y;
      geo.w = r.width || 1;
      geo.h = r.height || 1;
    };
    let id = requestAnimationFrame(measure);

    let lastW = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w === lastW) return;
      lastW = w;
      cancelAnimationFrame(id);
      id = requestAnimationFrame(measure);
    });
    ro.observe(el);

    // ⚠️ فقط مختصات را نگه می‌داریم و نوشتن را به یک rAF واحد می‌سپاریم.
    // pointermove روی ترک‌پد ده‌ها بار در ثانیه می‌آید؛ بدون این throttle
    // هر کدام یک نوشتنِ استایل بود. هیچ خواندنی از DOM اینجا نیست — جعبه و
    // آفستِ اسکرول از پیش کش شده‌اند.
    let px = 0;
    let py = 0;
    let writeRaf = 0;
    const write = () => {
      writeRaf = 0;
      const g = glowRef.current;
      if (g) g.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX + scroll.x - geo.left;
      py = e.clientY + scroll.y - geo.top;
      if (!writeRaf) writeRaf = requestAnimationFrame(write);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // شنونده روی خودِ hero است، نه window: بیرونِ این بخش اصلاً خبری نیست.
    el.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(id);
      if (pending) cancelAnimationFrame(pending);
      if (writeRaf) cancelAnimationFrame(writeRaf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointermove", onMove);
    };
  }, [reduced, fine, spotlightOn]);

  return (
    <section
      ref={sectionRef}
      dir="rtl"
      className="relative flex min-h-[92vh] items-center overflow-hidden py-24"
    >
      {/* نورافکنِ اشاره‌گر — گرادیانِ ثابت، جابه‌جاییِ compositor-only */}
      {spotlightOn && (
        <div
          ref={glowRef}
          aria-hidden
          style={{
            background:
              "radial-gradient(circle closest-side, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent)",
            // will-change فقط وقتی نورافکن واقعاً روشن است — نه دائمی.
            willChange: "transform",
          }}
          className="pointer-events-none absolute -left-[600px] -top-[600px] size-[1200px] -z-10"
        />
      )}
      {/* ---------- background layers ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Aurora blobs. These used to be solid circles behind `filter: blur()`.
            An 80–90px blur is a multi-pass, full-surface operation and it was
            by far the most expensive paint on the page — measurably so, on any
            device without a strong GPU. A radial-gradient is a single cheap
            gradient fill and gives the same soft glow, so the blur is gone. */}
        <div
          className="absolute -right-40 -top-20 size-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 30%, transparent), color-mix(in oklch, var(--color-primary) 10%, transparent) 62%, transparent)",
            ...(reduced
              ? null
              : {
                  animation: "aruzDrift 18s ease-in-out infinite",
                  willChange: "transform, opacity",
                }),
          }}
        />
        <div
          className="absolute -left-32 top-1/4 size-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 24%, transparent), color-mix(in oklch, var(--color-gold) 8%, transparent) 62%, transparent)",
            ...(reduced
              ? null
              : {
                  animation: "aruzDrift2 22s ease-in-out infinite",
                  willChange: "transform, opacity",
                }),
          }}
        />
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-background)_92%)]" />
      </div>

      {/* ---------- content ---------- */}
      <div className="container cursor-default grid items-center gap-12 lg:grid-cols-2">
        {/* text column */}
        <RevealGroup
          stagger={0.14}
          className="relative z-10 min-w-0 text-center lg:text-right"
        >
          <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl xl:text-7xl">
            <RevealLine className="text-foreground" delay={0.1}>
              آرزویی دست‌یافتنی
            </RevealLine>
            <RevealLine className="aruz-gradient-text" delay={0.24}>
              به سادگی گوش دادن
            </RevealLine>
          </h1>

          <RevealItem>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              سماعی شدن در عروض حالا دیگر دشوار نیست با تست‌های صوتی و تعاملی
              ســروا به راحتی وزن هر بیت را تنها با گوش دادن تشخیص می‌دهی
            </p>
          </RevealItem>

          <RevealItem>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <GlowCTA />
              <Link
                href="/guide"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card/60 px-6 font-bold text-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card active:scale-95"
              >
                راهنمای عروض
              </Link>
            </div>
          </RevealItem>

          <RevealItem>
            <MeterStrip />
          </RevealItem>
        </RevealGroup>

        {/* visual column — the interactive arkān sphere */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative z-10 mx-auto w-full max-w-md"
        >
          <ArkanSphere reduced={reduced} />
        </motion.div>
      </div>
    </section>
  );
}

/** «مفاعیلن مفاعیلن مفاعیلن مفاعیلن» به زبانِ کوتاه و بلند؛ یک نشانگر روی
 *  هجاها جلو می‌رود، مثلِ گوشی که بیت را دنبال می‌کند. */
function MeterStrip() {
  const foot = [false, true, true, true];
  return (
    <div className={styles.meter}>
      <span className={styles.meterFeet} aria-hidden>
        {[0, 1, 2, 3].map((f) => (
          <span key={f} className={styles.foot}>
            {foot.map((long, j) => (
              <span
                key={j}
                className={styles.syl}
                data-long={long || undefined}
                style={{ "--i": String(f * 4 + j) } as React.CSSProperties}
              />
            ))}
          </span>
        ))}
      </span>
      <span className={styles.meterLabel}>هزج مثمن سالم</span>
    </div>
  );
}

/** The primary CTA with an animated conic glow halo. */
function GlowCTA() {
  return (
    <Link
      href="/quiz"
      className="group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-xl bg-primary px-7 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.5), transparent 30%)",
          animation: "aruzConic 2.5s linear infinite",
        }}
      />
      شروع آزمون صوتی
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 6 5 12l6 6M19 12H5"
        />
      </svg>
    </Link>
  );
}
