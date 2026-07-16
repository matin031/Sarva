"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { fadeUp, cardPop, staggerContainer, defaultViewport } from "@/lib/motion";
import { MORE_NAV_LINKS } from "@/lib/site-nav";

const ICONS: Record<string, React.ReactNode> = {
  "/exam": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  ),
  "/vazn-yab": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0ZM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"
      />
    </svg>
  ),
  "/game": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12h4m-2-2v4m7-1h.01M17 9h.01M6.5 6h11a4.5 4.5 0 0 1 4.4 5.42l-.9 4.28a3 3 0 0 1-5.16 1.55L14 15.5H10l-1.84 1.75a3 3 0 0 1-5.16-1.55l-.9-4.28A4.5 4.5 0 0 1 6.5 6Z"
      />
    </svg>
  ),
};

const DESCRIPTIONS: Record<string, string> = {
  "/exam": "بانک کامل سؤالات امتحان نهایی فارسی را حل کن و همان لحظه نمره و پاسخ‌ها را ببین.",
  "/vazn-yab": "هر بیتی بنویسی، وزن عروضی‌اش را پیدا می‌کند و ریتمش را با صدا برایت اجرا می‌کند.",
  "/game": "با بازی‌های جاسوس‌یابی نقش‌های دستوری و برش‌زدن کلمات، دستور زبان را بازی‌وار یاد بگیر.",
};

const BG_COLORS: Record<string, string> = {
  "/exam": "bg-primary/10",
  "/vazn-yab": "bg-gold/20",
  "/game": "bg-turquoise-light/20",
};

function SiteHighlightsSection() {
  return (
    <div className="flex flex-col items-center justify-center cursor-default">
      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="text-center"
      >
        <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-bold">
          بیشتر از یک آزمون
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-muted-foreground text-center max-w-xl mx-auto text-base font-[550]"
        >
          عروضینو فقط عروض سماعی نیست؛ این بخش‌ها را هم امتحان کن
        </motion.p>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.12, 0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="mt-10 grid w-full grid-cols-1 sm:grid-cols-3 gap-6"
      >
        {MORE_NAV_LINKS.map((link) => (
          <motion.div key={link.href} variants={cardPop} className="h-full">
            <Link
              href={link.href}
              className="group hover:scale-102 transition-all space-y-1 glass rounded-2xl z-20 relative text-right p-6 block h-full"
            >
              <div
                className={`${BG_COLORS[link.href]} rounded-xl size-12 flex items-center justify-center ml-auto`}
              >
                <div className="w-6 h-6">{ICONS[link.href]}</div>
              </div>
              <h3 className="font-semibold text-lg">{link.label}</h3>
              <p className="leading-relaxed text-sm text-muted-foreground">{DESCRIPTIONS[link.href]}</p>
              <span className="inline-flex items-center gap-x-1 text-xs text-primary mt-2 transition-all group-hover:gap-x-2">
                برو ببین
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
                </svg>
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default SiteHighlightsSection;
