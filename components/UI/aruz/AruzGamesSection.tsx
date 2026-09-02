"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { RevealGroup, RevealItem, RevealWords } from "@/components/UI/aruz/reveal";

/**
 * دو بازیِ عروضیِ سروا، در صفحهٔ عروض.
 *
 * چرا اینجا و نه فقط در «کهکشانِ بازی‌ها»: کسی که این صفحه را می‌خواند دقیقاً
 * همان کسی است که دنبالِ تمرینِ وزن است. فرستادنش به فهرستِ عمومیِ بازی‌ها
 * یعنی یک کلیکِ اضافه و یک صفحهٔ واسط که هیچ‌چیز تازه‌ای نمی‌گوید.
 *
 * ⚠️ لینک‌ها مستقیم به *صفحهٔ شروعِ* خودِ بازی می‌روند (`/game/aruz-rapid` و
 * `/game/aruz-bridge`) و نه به `/game`. همان چیزی که خواسته شده: از اینجا یک
 * قدم تا بازی.
 */

type AruzGame = {
  href: string;
  eyebrow: string;
  title: string;
  desc: string;
  points: string[];
  cta: string;
  accent: string;
  art: React.ReactNode;
};

const GAMES: AruzGame[] = [
  {
    href: "/game/aruz-rapid",
    eyebrow: "تقطیعِ سریع",
    title: "کوتاه یا بلند؟",
    desc: "یک مصراعِ اعراب‌گذاری‌شده را چند ثانیه می‌بینی، بعد پوشانده می‌شود و باید هجاها را یکی‌یکی تقطیع کنی. یک اشتباه، و از اول.",
    points: [
      "مصراع را با اعرابِ کامل ببین و در ذهنت تقطیعش کن",
      "متن پوشیده می‌شود و واحدها یکی‌یکی می‌آیند",
      "هر پاسخِ درست کمی از مصراع را باز می‌کند",
    ],
    cta: "شروعِ تقطیعِ سریع",
    accent: "#e0684a",
    art: (
      // هجاهای کوتاه و بلند — همان زبانِ بصریِ خودِ بازی
      <span className="flex items-end gap-1.5" aria-hidden>
        {[10, 22, 22, 10, 22, 10, 22, 22].map((h, i) => (
          <span
            key={i}
            className="w-2.5 rounded-full"
            style={{
              height: h,
              background:
                h > 14
                  ? "linear-gradient(to top, #e0684a, #f0a58c)"
                  : "color-mix(in oklch, #e0684a 35%, transparent)",
            }}
          />
        ))}
      </span>
    ),
  },
  {
    href: "/game/aruz-bridge",
    eyebrow: "پلِ شیشه‌ای",
    title: "پلِ وزن",
    desc: "روی پلِ شیشه‌ای، وزنِ هر واژه را تشخیص بده و روی شیشهٔ امن بپر. اشتباه کنی، شیشه زیرِ پایت می‌شکند.",
    points: [
      "دو وزن روی دو شیشهٔ پیشِ رو می‌بینی",
      "واژه برای لحظه‌ای نشان داده می‌شود؛ وزنش را تشخیص بده",
      "روی شیشهٔ درست بپر — پیش از آنکه زمان تمام شود",
    ],
    cta: "شروعِ پلِ وزن",
    accent: "#4fd1c5",
    art: (
      <span className="flex items-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-7 rotate-45 rounded-[4px] border"
            style={{
              borderColor: "color-mix(in oklch, #4fd1c5 60%, transparent)",
              background:
                i === 1
                  ? "color-mix(in oklch, #4fd1c5 22%, transparent)"
                  : "color-mix(in oklch, #4fd1c5 7%, transparent)",
            }}
          />
        ))}
      </span>
    ),
  },
];

export default function AruzGamesSection({ reduced }: { reduced: boolean }) {
  return (
    <section dir="rtl" className="container relative py-20">
      <RevealGroup stagger={0.12} className="mx-auto mb-12 max-w-2xl text-center">
        <RevealItem>
          <span className="mb-3 inline-block rounded-full bg-gold/15 px-4 py-1 text-sm font-semibold text-gold-ink dark:text-gold">
            تمرین، به شکلِ بازی
          </span>
        </RevealItem>
        <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
          <RevealWords text="وزن را بازی کن" inherit />
        </h2>
        <RevealItem>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            دو بازی که مستقیماً روی همین مهارت کار می‌کنند: یکی چشم و ذهنت را برای تقطیع
            تیز می‌کند، دیگری گوشت را برای تشخیصِ وزن.
          </p>
        </RevealItem>
      </RevealGroup>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {GAMES.map((g, i) => (
          <motion.article
            key={g.href}
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-xl transition-colors sm:p-8"
            style={{ borderColor: `color-mix(in oklch, ${g.accent} 22%, var(--color-border))` }}
          >
            {/* هالهٔ گوشه — گرادیان و نه blur، تا لایهٔ فیلترشده نسازد */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full opacity-70 transition-opacity group-hover:opacity-100"
              style={{
                background: `radial-gradient(closest-side, ${g.accent}33, transparent)`,
              }}
            />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span
                  className="font-mono text-[11px] tracking-[0.28em]"
                  style={{ color: g.accent }}
                >
                  {g.eyebrow}
                </span>
                <h3 className="mt-1.5 text-2xl font-black">{g.title}</h3>
              </div>
              <span className="shrink-0 pt-1">{g.art}</span>
            </div>

            <p className="relative mt-3 leading-relaxed text-muted-foreground">{g.desc}</p>

            <ul className="relative mt-5 space-y-2.5">
              {g.points.map((s, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: g.accent }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </span>
                  {s}
                </li>
              ))}
            </ul>

            <Link
              href={g.href}
              className="relative mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 font-bold text-white shadow-lg transition-all active:scale-95"
              style={{ background: g.accent, boxShadow: `0 10px 30px -12px ${g.accent}` }}
            >
              {g.cta}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 transition-transform group-hover:-translate-x-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
              </svg>
            </Link>
          </motion.article>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/game"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          دیدنِ همهٔ بازی‌های سروا ←
        </Link>
      </div>
    </section>
  );
}
