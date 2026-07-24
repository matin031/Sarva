"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, MotionConfig } from "motion/react";
import GuideChapter, { type Chapter } from "@/components/UI/guide/GuideChapter";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
  RevealWords,
} from "@/components/UI/aruz/reveal";

// real WebGL — client-only, kept out of the initial bundle
const Guide3DHero = dynamic(() => import("@/components/UI/guide/Guide3DHero"), {
  ssr: false,
});

const CHAPTERS: Chapter[] = [
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
    accent: "var(--color-primary)",
    hex: "#00b3ad",
    shape: "knot",
    badge: (
      <div className="flex h-8 items-end gap-1">
        {[10, 26, 16, 32, 20, 30, 14, 24, 12].map((h, i) => (
          <span key={i} className="w-1.5 rounded-full bg-primary/70" style={{ height: h }} />
        ))}
      </div>
    ),
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
    accent: "var(--color-gold)",
    hex: "#d9a441",
    shape: "torus",
    badge: (
      <span className="rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold">
        وزن: مفاعیلن فعولن
      </span>
    ),
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
    accent: "var(--color-lapis-light)",
    hex: "#5b6ea8",
    shape: "octa",
    badge: (
      <div className="flex gap-2">
        {["📖", "🕵️", "🥷"].map((e) => (
          <span
            key={e}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-background/70 text-xl"
          >
            {e}
          </span>
        ))}
      </div>
    ),
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
    accent: "var(--color-primary)",
    hex: "#00b3ad",
    shape: "box",
    badge: (
      <div className="w-40">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>نمره</span>
          <span className="font-bold text-primary">۱۸ / ۲۰</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-[90%] rounded-full bg-gradient-to-l from-primary to-gold" />
        </div>
      </div>
    ),
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
    accent: "var(--color-gold)",
    hex: "#d9a441",
    shape: "sphere",
    badge: (
      <div className="flex gap-5 text-center">
        {[
          ["۱۲", "روز پیاپی"],
          ["۸۴٪", "پیشرفت"],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="text-2xl font-black text-gold">{n}</div>
            <div className="text-[11px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function GuidePage() {
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
      <div className="relative overflow-hidden bg-background">
        {/* ---------- hero ---------- */}
        <section
          dir="rtl"
          className="relative flex min-h-[88vh] items-center overflow-hidden py-24 sm:py-28"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-32 -top-24 size-[380px] rounded-full bg-primary/20 blur-[80px]" />
            <div className="absolute -left-24 top-1/4 size-[340px] rounded-full bg-gold/15 blur-[80px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--color-background)_92%)]" />
          </div>

          <div className="container grid items-center gap-8 lg:grid-cols-2">
          <RevealGroup
            stagger={0.12}
            className="relative z-20 order-2 text-center lg:order-1 lg:text-right"
          >
            <RevealItem>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur-sm">
                راهنمای سروا
              </span>
            </RevealItem>
            <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl">
              <RevealLine className="text-foreground" delay={0.08}>
                با هر بخشِ سروا
              </RevealLine>
              <RevealLine className="aruz-gradient-text" delay={0.2}>
                آشنا شو
              </RevealLine>
            </h1>
            <RevealItem>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                سروا یک پلتفرمِ کامل است، نه یک آزمون؛ از عروضِ سماعی و وزن‌یاب تا
                بازی‌ها، آزمون‌های نهایی و پنلِ پیشرفت. این‌جا هر بخش را کوتاه و
                کاربردی یاد می‌گیری.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  href="/aruz"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-95 active:scale-95"
                >
                  شروعِ یادگیری
                </Link>
                <span className="text-sm text-muted-foreground">
                  ۵ بخش · اسکرول کن تا همه را ببینی ↓
                </span>
              </div>
            </RevealItem>
          </RevealGroup>

            {/* live WebGL centrepiece */}
            <motion.div
              aria-hidden
              initial={reduced ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="pointer-events-none relative z-10 order-1 h-[46vh] min-h-64 w-full lg:order-2 lg:h-[70vh]"
            >
              <Guide3DHero reduced={reduced} />
            </motion.div>
          </div>
        </section>

        {/* ---------- chapters ---------- */}
        {CHAPTERS.map((c, i) => (
          <GuideChapter key={c.index} chapter={c} flip={i % 2 === 1} reduced={reduced} />
        ))}

        {/* ---------- final CTA ---------- */}
        <section dir="rtl" className="container relative py-24">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="glass relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-primary/30 p-10 text-center shadow-2xl sm:p-16"
          >
            <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/15 blur-3xl" />
            <h2 className="relative text-3xl font-black text-foreground sm:text-4xl">
              <RevealWords text="آماده‌ای شروع کنی؟" />
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">
              حساب بساز تا پیشرفتت ذخیره شود، بعد هر بخش را آزاد کن و جلو برو.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
              >
                ساختِ حساب
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card/60 px-8 font-bold text-foreground transition-all hover:border-primary/40 active:scale-95"
              >
                صفحهٔ اصلی
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </MotionConfig>
  );
}
