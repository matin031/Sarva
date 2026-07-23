"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import CrystalOrb from "./CrystalOrb";

/** The عروض سماعی hero: an aurora-lit stage with a perspective grid floor, a
 *  pulsing audio orb, floating عروضی-foot chips, and a headline — all reacting
 *  to the pointer with layered 3D parallax. */
export default function AruzHero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  // normalized pointer position (-0.5 .. 0.5) with spring smoothing
  const mx = useSpring(useMotionValue(0), { stiffness: 90, damping: 18 });
  const my = useSpring(useMotionValue(0), { stiffness: 90, damping: 18 });
  // raw pointer position within the section, for the cursor spotlight
  const spx = useMotionValue(50);
  const spy = useMotionValue(30);
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${spx}% ${spy}%, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent 60%)`;

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
      const el = sectionRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        spx.set(((e.clientX - r.left) / r.width) * 100);
        spy.set(((e.clientY - r.top) / r.height) * 100);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, spx, spy, reduced]);

  return (
    <section
      ref={sectionRef}
      dir="rtl"
      className="relative flex min-h-[92vh] items-center overflow-hidden py-24"
    >
      {/* cursor spotlight */}
      {!reduced && (
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
        {/* aurora blobs */}
        <div
          className="absolute -right-40 -top-20 size-[520px] rounded-full bg-primary/25 blur-[120px]"
          style={reduced ? undefined : { animation: "aruzDrift 16s ease-in-out infinite" }}
        />
        <div
          className="absolute -left-32 top-1/3 size-[460px] rounded-full bg-gold/20 blur-[120px]"
          style={reduced ? undefined : { animation: "aruzDrift2 20s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-lapis-light/25 blur-[130px]"
          style={reduced ? undefined : { animation: "aruzDrift 22s ease-in-out infinite" }}
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
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        {/* text column */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center lg:text-right"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            عروضِ سماعی سروا
          </span>

          <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl xl:text-7xl">
            <span className="block text-foreground">وزنِ شعر را</span>
            <span className="aruz-gradient-text block">با گوش می‌شنوی</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
            دیگر لازم نیست ارکان را حفظ کنی؛ در سروا ریتمِ هر بیت را می‌شنوی و وزنش
            را تشخیص می‌دهی. یادگیریِ عروض، به سادگیِ گوش دادن به یک آهنگ.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <GlowCTA />
            <Link
              href="/guide"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card/60 px-6 font-bold text-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card active:scale-95"
            >
              راهنمای عروض
            </Link>
          </div>

          {/* mini stats */}
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
        </motion.div>

        {/* orb column with parallax chips */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          {/* slow orbiting rings */}
          <div
            aria-hidden
            className="absolute inset-2 rounded-full border border-dashed border-primary/15"
            style={reduced ? undefined : { animation: "aruzSpin 44s linear infinite" }}
          >
            <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_16px_var(--color-gold)]" />
          </div>
          <div
            aria-hidden
            className="absolute inset-10 rounded-full border border-primary/10"
            style={reduced ? undefined : { animation: "aruzSpin 30s linear infinite reverse" }}
          >
            <span className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_var(--color-primary)]" />
          </div>

          <ParallaxLayer mx={mx} my={my} depth={reduced ? 0 : 22}>
            <CrystalOrb reduced={reduced} />
          </ParallaxLayer>

          {/* floating arkan chips at varying depths, ringed around the orb */}
          <FloatChip mx={mx} my={my} depth={reduced ? 0 : 40} className="left-1/2 top-0 -translate-x-1/2">
            مفاعیلن
          </FloatChip>
          <FloatChip mx={mx} my={my} depth={reduced ? 0 : 58} className="right-0 top-[22%]">
            فعولن
          </FloatChip>
          <FloatChip mx={mx} my={my} depth={reduced ? 0 : 50} className="right-1 bottom-[30%]">
            مستفعلن
          </FloatChip>
          <FloatChip mx={mx} my={my} depth={reduced ? 0 : 44} className="bottom-2 left-1/2 -translate-x-1/2">
            فاعلاتن
          </FloatChip>
          <FloatChip mx={mx} my={my} depth={reduced ? 0 : 62} className="bottom-[30%] left-0">
            مفعولاتُ
          </FloatChip>
          <FloatChip mx={mx} my={my} depth={reduced ? 0 : 52} className="left-1 top-[22%]">
            متفاعلن
          </FloatChip>
        </motion.div>
      </div>
    </section>
  );
}

/** Translates its children opposite/along the pointer for a parallax depth cue. */
function ParallaxLayer({
  mx,
  my,
  depth,
  children,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  children: React.ReactNode;
}) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div
      style={{ x, y }}
      className="absolute inset-0 z-10 flex items-center justify-center"
    >
      {children}
    </motion.div>
  );
}

function FloatChip({
  mx,
  my,
  depth,
  className = "",
  children,
}: {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  depth: number;
  className?: string;
  children: React.ReactNode;
}) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.span
      style={{ x, y }}
      className={`absolute z-20 rounded-xl border border-border bg-card/70 px-3 py-1.5 text-sm font-bold text-foreground shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </motion.span>
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
