"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import ArkanSphere from "./ArkanSphere";
import { RevealGroup, RevealItem, RevealLine } from "./reveal";

/** The عروض سماعی hero: an aurora-lit stage with a perspective grid floor, a
 *  cursor spotlight, the interactive arkān sphere, and a headline. */
export default function AruzHero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  // raw pointer position within the section, for the cursor spotlight
  const spx = useMotionValue(50);
  const spy = useMotionValue(30);
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${spx}% ${spy}%, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent 60%)`;

  // the cursor spotlight is a mouse-only flourish; skip it entirely on touch
  // devices (no hover, and the moving radial-gradient repaint is wasteful there)
  const [fine, setFine] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFine(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (reduced || !fine) return;
    const onMove = (e: PointerEvent) => {
      const el = sectionRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        spx.set(((e.clientX - r.left) / r.width) * 100);
        spy.set(((e.clientY - r.top) / r.height) * 100);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [spx, spy, reduced, fine]);

  return (
    <section
      ref={sectionRef}
      dir="rtl"
      className="relative flex min-h-[92vh] items-center overflow-hidden py-24"
    >
      {/* cursor spotlight — mouse only */}
      {!reduced && fine && (
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 -z-10"
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
        {/* aurora blobs — smaller blur radii so mobile GPUs don't allocate huge
            blur surfaces */}
        <div
          className="absolute -right-40 -top-20 size-[440px] rounded-full bg-primary/25 blur-[80px]"
          style={reduced ? undefined : { animation: "aruzDrift 18s ease-in-out infinite" }}
        />
        <div
          className="absolute -left-32 top-1/3 size-[400px] rounded-full bg-gold/20 blur-[80px]"
          style={reduced ? undefined : { animation: "aruzDrift2 22s ease-in-out infinite" }}
        />
        <div className="absolute bottom-0 left-1/3 size-[380px] rounded-full bg-lapis-light/20 blur-[90px]" />
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
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        {/* text column */}
        <RevealGroup stagger={0.14} className="relative z-10 text-center lg:text-right">
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
              وزنِ شعر را
            </RevealLine>
            <RevealLine className="aruz-gradient-text" delay={0.24}>
              با گوش می‌شنوی
            </RevealLine>
          </h1>

          <RevealItem>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              دیگر لازم نیست ارکان را حفظ کنی؛ در سروا ریتمِ هر بیت را می‌شنوی و
              وزنش را تشخیص می‌دهی. یادگیریِ عروض، به سادگیِ گوش دادن به یک آهنگ.
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
          <RevealItem>
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
      </svg>
    </Link>
  );
}
