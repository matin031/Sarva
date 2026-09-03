"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuality, useScrolling, useFinePointer } from "@/lib/perf/use-perf";
import { motion } from "motion/react";
import ArkanSphere from "./ArkanSphere";
import { RevealGroup, RevealItem, RevealLine } from "@/components/UI/aruz/reveal";

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
      {/* fine grain texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

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
        <div
          className="absolute -bottom-24 left-1/4 size-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-lapis-light) 26%, transparent), transparent)",
          }}
        />
        {/* perspective 3D grid floor */}
        <div
          className="absolute inset-x-0 bottom-0 h-[45vh] [mask-image:linear-gradient(to_top,black,transparent)]"
          style={{ perspective: "500px" }}
        >
          <div
            className="aruz-grid-floor absolute inset-0 origin-bottom"
            style={{ transform: "rotateX(68deg)" }}
          />
        </div>
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--color-background)_92%)]" />
      </div>

      {/* ---------- content ---------- */}
      <div className="container cursor-default grid items-center gap-12 lg:grid-cols-2">
        {/* text column */}
        <RevealGroup
          stagger={0.14}
          className="relative z-10 text-center lg:text-right"
        >
          <RevealItem>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              عروضِ سماعی سروا
            </span>
          </RevealItem>

          <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl xl:text-7xl">
            <RevealLine className="text-foreground" delay={0.1}>
              آرزویی دست‌یافتنی
            </RevealLine>
            <RevealLine className="aruz-gradient-text" delay={0.24}>
              به سادگیِ گوش دادن
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

          {/* mini stats */}
          {/* <RevealItem>
            <div className="mt-10 flex items-center justify-center gap-5 text-center sm:gap-7 lg:justify-start">
              {[
                ["+۲۵۰۰", "شعر و بیت"],
                ["+۱۲", "وزنِ اصلی"],
                ["+۹۸٪", "دقتِ تشخیص"],
                ["+۱۰K", "کاربرِ فعال"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="text-xl font-black text-primary sm:text-3xl">{n}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground sm:text-sm">{l}</div>
                </div>
              ))}
            </div>
          </RevealItem> */}
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
      شروع آزمونِ صوتی
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
