"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import GuideChapter, { type Chapter } from "@/components/UI/guide/GuideChapter";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
  RevealWords,
} from "@/components/UI/aruz/reveal";

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
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
      />
    ),
    preview: (
      <div className="flex h-8 items-end gap-1">
        {[10, 26, 16, 32, 20, 30, 14, 24, 12].map((h, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-primary/70"
            style={{ height: h }}
          />
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
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    ),
    preview: (
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
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    ),
    preview: (
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
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
      />
    ),
    preview: (
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
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    ),
    preview: (
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
        <section dir="rtl" className="relative overflow-hidden py-24 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -right-32 -top-24 size-[380px] rounded-full bg-primary/20 blur-[80px]" />
            <div className="absolute -left-24 top-1/4 size-[340px] rounded-full bg-gold/15 blur-[80px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--color-background)_92%)]" />
          </div>

          <RevealGroup stagger={0.12} className="container text-center">
            <RevealItem>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
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
                سروا یک پلتفرمِ کامل است، نه یک آزمون؛ از عروضِ سماعی و وزن‌یاب
                تا بازی‌ها، آزمون‌های نهایی و پنلِ پیشرفت. این‌جا هر بخش را
                کوتاه و کاربردی یاد می‌گیری.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
        </section>

        {/* ---------- chapters ---------- */}
        {CHAPTERS.map((c, i) => (
          <GuideChapter
            key={c.index}
            chapter={c}
            flip={i % 2 === 1}
            reduced={reduced}
          />
        ))}

        {/* ---------- final CTA ---------- */}
        <section dir="rtl" className="container relative z-20 py-24">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="glass relative z-20 mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-primary/30 p-10 text-center shadow-2xl sm:p-16"
          >
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/15 blur-3xl"
            />
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
