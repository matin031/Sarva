"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, MotionConfig } from "motion/react";
import PlanetStop, { type Stop } from "@/components/UI/guide/PlanetStop";
import SpaceCable from "@/components/UI/guide/SpaceCable";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
  RevealWords,
} from "@/components/UI/aruz/reveal";

const Starfield = dynamic(() => import("@/components/UI/guide/Starfield"), {
  ssr: false,
});
// one shared WebGL context for every planet on the page
const GalaxyCanvas = dynamic(
  () => import("@/components/UI/guide/GalaxyCanvas"),
  { ssr: false },
);

/** The guide as a galaxy map: every part of the platform is a planet, and one
 *  meandering space cable threads them together from the top of the page down. */
const STOPS: Stop[] = [
  {
    index: "۰۱",
    tag: "عروضِ سماعی",
    title: "وزن را با گوش تشخیص بده",
    desc: "ریتمِ هر بیت را می‌شنوی و از میان گزینه‌ها وزنِ درست را انتخاب می‌کنی؛ سه نوع پرسشِ صوتی، بدونِ نیاز به حفظ‌کردنِ ارکان.",
    steps: [
      "روی دکمهٔ پخش بزن و به ریتم گوش بده",
      "وزن یا بیتِ هم‌وزن را از گزینه‌ها انتخاب کن",
      "بازخوردِ فوری بگیر و گوشِ موسیقایی‌ات را قوی کن",
    ],
    href: "/aruz",
    cta: "شروعِ عروضِ سماعی",
    accent: "#00b3ad",
    planet: { color: "#00b3ad", ring: true, distort: 0.22 },
  },
  {
    index: "۰۲",
    tag: "وزن‌یاب",
    title: "مصراع را بده، وزنش را بگیر",
    desc: "کافی‌ست یک مصراع را تایپ کنی؛ سروا در لحظه تقطیع می‌کند و وزنِ عروضی و بحرِ آن را نشانت می‌دهد.",
    steps: [
      "مصراع یا بیتِ موردنظرت را وارد کن",
      "تقطیعِ هجاها و ارکان را همان لحظه ببین",
      "نامِ وزن و بحر را بشناس و یاد بگیر",
    ],
    href: "/vazn-yab",
    cta: "بازکردنِ وزن‌یاب",
    accent: "#d9a441",
    planet: { color: "#d9a441", distort: 0.28 },
  },
  {
    index: "۰۳",
    tag: "بازی‌ها",
    title: "با بازی یاد بگیر، نه با حفظ",
    desc: "واژه‌یاب، جاسوسِ نقش‌ها و نینجای دستور زبان؛ مفاهیمِ ادبی و دستوری را با بازی‌های تعاملی و تصویری تمرین می‌کنی.",
    steps: [
      "یک بازی را انتخاب کن (واژه‌یاب، جاسوس، نینجا)",
      "با تصویر و چالش، معنی و نقشِ کلمات را یاد بگیر",
      "امتیاز بگیر و اشتباه‌هایت را در پنل مرور کن",
    ],
    href: "/game",
    cta: "رفتن به بازی‌ها",
    accent: "#7b8fd4",
    planet: { color: "#7b8fd4", moon: true, distort: 0.18 },
  },
  {
    index: "۰۴",
    tag: "آزمونِ نهایی",
    title: "امتحاناتِ نهایی را آنلاین تمرین کن",
    desc: "نمونه‌سؤال‌های امتحانِ نهاییِ سال‌های گذشته را به‌صورتِ تعاملی پاسخ می‌دهی و نمره‌ات را همان لحظه می‌بینی.",
    steps: [
      "آزمونِ موردنظرت را از فهرست انتخاب کن",
      "سؤال‌ها را تشریحی یا تستی پاسخ بده",
      "نمره و پاسخِ درست را بلافاصله ببین",
    ],
    href: "/exam",
    cta: "دیدنِ آزمون‌ها",
    accent: "#2bb39a",
    planet: { color: "#2bb39a", ring: true, distort: 0.16 },
  },
  {
    index: "۰۵",
    tag: "پنلِ کاربری",
    title: "پیشرفتت را دنبال کن",
    desc: "همهٔ فعالیت‌هایت یک‌جا: امتیازها، پیشرفت، و مهم‌تر از همه واژه‌ها و مفاهیمی که اشتباه زده‌ای تا آن‌ها را مرور کنی.",
    steps: [
      "واردِ حسابت شو تا پیشرفتت ذخیره شود",
      "کلمات و سؤالاتِ اشتباه را دسته‌بندی‌شده ببین",
      "نقاطِ ضعفت را هدفمند تمرین کن",
    ],
    href: "/panel",
    cta: "ورود به پنل",
    accent: "#c79be0",
    planet: { color: "#c79be0", moon: true, distort: 0.24 },
  },
];

export default function GuidePage() {
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
        <GalaxyCanvas eventSource={rootRef} reduced={reduced} />

        {/* the whole map, with the cable threaded behind every stop */}
        <div className="relative">
          <SpaceCable reduced={reduced} />

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
                  نقشهٔ کهکشانِ سروا
                </span>
              </RevealItem>

              <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl">
                <RevealLine className="text-foreground" delay={0.08}>
                  هر بخشِ سروا
                </RevealLine>
                <RevealLine className="aruz-gradient-text" delay={0.2}>
                  یک سیاره است
                </RevealLine>
              </h1>

              <RevealItem>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  از این‌جا یک سیمِ نوری تا انتهای کهکشان کشیده شده و پنج سیاره را
                  به هم وصل می‌کند. اسکرول کن و سیاره‌به‌سیاره جلو برو تا با همهٔ
                  امکاناتِ سروا آشنا شوی.
                </p>
              </RevealItem>

              <RevealItem>
                <div className="mt-9 flex flex-col items-center gap-3">
                  <Link
                    href="/aruz"
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-7 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
                  >
                    آغازِ سفر
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    ۵ سیاره · سیمِ نوری راهنمایت می‌کند ↓
                  </span>
                </div>
              </RevealItem>
            </RevealGroup>
          </section>

          {/* ---------- planets ---------- */}
          {STOPS.map((s, i) => (
            <PlanetStop
              key={s.index}
              stop={s}
              flip={i % 2 === 1}
              reduced={reduced}
            />
          ))}

        {/* ---------- end of the line (still under the cable) ---------- */}
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
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/15 blur-3xl"
            />
            <h2 className="relative z-20 text-3xl font-black text-foreground sm:text-4xl">
              <RevealWords text="کهکشان مالِ توست" />
            </h2>
            <p className="relative z-20 mx-auto mt-4 max-w-lg text-muted-foreground">
              حساب بساز تا مسیرت بینِ سیاره‌ها ذخیره شود و از هرجا ادامه بدهی.
            </p>
            <div className="relative z-20 mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
              >
                ساختِ حساب
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-8 font-bold text-foreground transition-all hover:border-primary/40 active:scale-95"
              >
                صفحهٔ اصلی
              </Link>
            </div>
          </motion.div>
        </section>
        </div>
      </div>
    </MotionConfig>
  );
}
