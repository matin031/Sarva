"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, MotionConfig } from "motion/react";
import PlanetStop, { type Stop } from "@/components/UI/galaxy/PlanetStop";
import SpaceCable from "@/components/UI/galaxy/SpaceCable";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
  RevealWords,
} from "@/components/UI/aruz/reveal";

const Starfield = dynamic(() => import("@/components/UI/galaxy/Starfield"), {
  ssr: false,
});
// one shared WebGL context — and one scene — for every planet on the page
const GalaxyScene = dynamic(
  () => import("@/components/UI/galaxy/runtime").then((m) => m.GalaxyScene),
  { ssr: false },
);

/** The games hub as a galaxy map: every game is a planet, and one meandering
 *  space cable threads them together from the top of the page down. */
const STOPS: Stop[] = [
  {
    index: "۰۱",
    tag: "نقش‌ها و آرایه‌ها",
    title: "جاسوسِ نقش‌ها",
    desc: "یک بیت باز می‌شود و چهار مظنون دربارهٔ آن ادعا می‌کنند؛ یکی‌شان نقشی دستوری یا آرایه‌ای می‌گوید که اصلاً در بیت نیست.",
    steps: [
      "پشتِ هر در یک بیت و چهار ادعا منتظرِ توست",
      "ادعاها را با خودِ بیت بسنج",
      "جاسوسِ دروغگو را نشانه بگیر و شلیک کن",
    ],
    href: "/game/jasoos",
    cta: "شروعِ جاسوسِ نقش‌ها",
    accent: "#7b8fd4",
    planet: { color: "#7b8fd4", moon: true, distort: 0.2 },
  },
  {
    index: "۰۲",
    tag: "دسته‌های دستوری",
    title: "نینجای دستور زبان",
    desc: "یک دستهٔ دستوری می‌گیری — قید، صفت، حرف ربط یا ضمیر — و ده‌ها کلمه در هوا پرتاب می‌شوند.",
    steps: [
      "دسته‌ای که باید شکار کنی را ببین",
      "کلمه‌ها را در پرواز تشخیص بده",
      "فقط کلمه‌های همان دسته را برش بزن",
    ],
    href: "/game/ninja",
    cta: "شروعِ نینجای دستور",
    accent: "#00b3ad",
    planet: { color: "#00b3ad", ring: true, distort: 0.24 },
  },
  {
    index: "۰۳",
    tag: "آثار و پدیدآورندگان",
    title: "جفت‌های ادبی",
    desc: "اول آثار و نویسنده‌هایشان را مرور می‌کنی، بعد کارت‌ها برمی‌گردند و باید از حافظه‌ات کمک بگیری.",
    steps: [
      "آثار و پدیدآورندگان را مرور کن",
      "کارت‌ها برمی‌گردند؛ جای هرکدام را به یاد بسپار",
      "هر اثر را به خالقش جفت کن",
    ],
    href: "/game/pairs",
    cta: "شروعِ جفت‌های ادبی",
    accent: "#d9a441",
    planet: { color: "#d9a441", ring: true, distort: 0.18 },
  },
  {
    index: "۰۴",
    tag: "واژگانِ درس‌ها",
    title: "واژه‌یاب",
    desc: "تصویر را می‌بینی و از میان سه واژه، واژهٔ درست را انتخاب می‌کنی؛ بعد معنیِ کاملش را یاد می‌گیری.",
    steps: [
      "پایه و درسِ موردنظرت را انتخاب کن",
      "تصویر را ببین و واژهٔ مربوط را بزن",
      "معنیِ کامل را بخوان و اشتباه‌ها را در پنل مرور کن",
    ],
    href: "/game/vocab",
    cta: "شروعِ واژه‌یاب",
    accent: "#c79be0",
    planet: { color: "#c79be0", moon: true, distort: 0.26 },
  },
];

export default function GamesGalaxy() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className="relative overflow-hidden bg-background">
        {/* deep-space wash + drifting stars */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_20%_10%,color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_60%,color-mix(in_oklch,var(--color-gold)_10%,transparent),transparent_55%)]"
        />
        <Starfield reduced={reduced} />
        <GalaxyScene eventSource={rootRef} reduced={reduced} />

        <div className="relative">
          <SpaceCable planets={STOPS.length} reduced={reduced} />

          {/* ---------- launch pad ---------- */}
          <section
            dir="rtl"
            className="relative z-20 container flex min-h-[88vh] items-center justify-center py-24 text-center"
          >
            <RevealGroup stagger={0.12} className="relative z-20">
              <RevealItem>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-lg">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  کهکشانِ بازی‌های سروا
                </span>
              </RevealItem>

              <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl">
                <RevealLine className="text-foreground" delay={0.08}>
                  هر بازی
                </RevealLine>
                <RevealLine className="aruz-gradient-text" delay={0.2}>
                  یک سیاره است
                </RevealLine>
              </h1>

              <RevealItem>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  چهار بازی برای یادگیریِ ادبیات و دستورِ زبان، بدونِ حفظ‌کردن. یک
                  سیمِ نوری همه را به هم وصل کرده؛ اسکرول کن و سیاره‌ای را که
                  می‌خواهی انتخاب کن.
                </p>
              </RevealItem>

              <RevealItem>
                <div className="mt-9 flex flex-col items-center gap-3">
                  <Link
                    href="/game/vocab"
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-7 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
                  >
                    آغازِ بازی
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    ۴ بازی · سیمِ نوری راهنمایت می‌کند ↓
                  </span>
                </div>
              </RevealItem>
            </RevealGroup>
          </section>

          {/* ---------- game planets ---------- */}
          {STOPS.map((s, i) => (
            <PlanetStop
              key={s.index}
              stop={s}
              flip={i % 2 === 1}
              reduced={reduced}
            />
          ))}

          {/* ---------- end of the line ---------- */}
          <section dir="rtl" className="relative z-20 container py-24">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-primary/30 bg-card p-10 text-center shadow-2xl sm:p-16"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 28%, transparent), transparent)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 22%, transparent), transparent)",
                }}
              />
              <h2 className="relative z-20 text-3xl font-black text-foreground sm:text-4xl">
                <RevealWords text="امتیازت را ثبت کن" />
              </h2>
              <p className="relative z-20 mx-auto mt-4 max-w-lg text-muted-foreground">
                حساب بساز تا رکوردها و واژه‌هایی که اشتباه زده‌ای ذخیره شوند و
                بتوانی مرورشان کنی.
              </p>
              <div className="relative z-20 mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/auth"
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
                >
                  ساختِ حساب
                </Link>
                <Link
                  href="/panel"
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-8 font-bold text-foreground transition-all hover:border-primary/40 active:scale-95"
                >
                  پنلِ کاربری
                </Link>
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </MotionConfig>
  );
}
