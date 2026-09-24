"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { RevealGroup, RevealItem, RevealWords } from "@/components/UI/aruz/reveal";
import styles from "./aruz.module.css";

/**
 * سه بازیِ عروضیِ سروا، در صفحهٔ عروض.
 *
 * چرا اینجا و نه فقط در «کهکشانِ بازی‌ها»: کسی که این صفحه را می‌خواند دقیقاً
 * همان کسی است که دنبالِ تمرینِ وزن است. لینک‌ها مستقیم به صفحهٔ شروعِ خودِ
 * بازی می‌روند.
 *
 * ⚠️ رنگِ هر کارت از توکن‌های پالت است (`--tone`) و نه یک هگزِ ثابت؛ پیش از
 * این نارنجی و فیروزه‌ایِ ثابت داشتند و با عوض شدنِ پالت عوض نمی‌شدند.
 * `--tone-fg` رنگِ متنِ روی همان رنگ است: طلایی در هر دو تم روشن است و
 * متنِ تیره می‌خواهد.
 */

type Tone = React.CSSProperties & Record<`--${string}`, string>;

type AruzGame = {
  href: string;
  title: string;
  desc: string;
  cta: string;
  tone: Tone;
  isNew?: boolean;
  art: React.ReactNode;
};

const GAMES: AruzGame[] = [
  {
    href: "/game/kimia",
    title: "کیمیای وزن",
    desc: "ریتم بیت را بشنو و ارکان عروضی را در جایگاه‌ها بچین تا وزن مصراع ساخته شود.",
    cta: "شروع کیمیا",
    isNew: true,
    tone: { "--tone": "var(--primary)" },
    art: (
      <span className={styles.tubes} aria-hidden>
        {[
          ["var(--primary)", "70%", "0s"],
          ["var(--gold)", "48%", "-1.2s"],
          ["var(--lapis-light)", "82%", "-2.4s"],
        ].map(([c, h, d]) => (
          <span key={c} className={styles.tube}>
            <span className={styles.liquid} style={{ "--c": c, "--h": h, "--d": d } as Tone} />
          </span>
        ))}
      </span>
    ),
  },
  {
    href: "/game/aruz-rapid",
    title: "کوتاه یا بلند؟",
    desc: "مصراع اعراب‌گذاری‌شده را ببین؛ بعد پوشیده می‌شود و باید هجاها را یکی‌یکی تقطیع کنی.",
    cta: "شروع تقطیع سریع",
    tone: { "--tone": "var(--gold)", "--tone-ink": "var(--gold-ink)", "--tone-fg": "#1c1a14" },
    art: (
      <span className={styles.bars} aria-hidden>
        {[16, 40, 40, 16, 40, 16, 40, 40].map((h, i) => (
          <span key={i} style={{ height: h, "--i": String(i) } as Tone} />
        ))}
      </span>
    ),
  },
  {
    href: "/game/aruz-bridge",
    title: "پل وزن",
    desc: "وزن هر واژه را تشخیص بده و روی شیشهٔ درست بپر. اشتباه کنی، شیشه زیر پایت می‌شکند.",
    cta: "شروع پل وزن",
    tone: { "--tone": "var(--lapis-light)", "--tone-fg": "var(--background)" },
    art: (
      <span className={styles.bridge} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.pane} style={{ "--i": String(i) } as Tone} />
        ))}
      </span>
    ),
  },
];

export default function AruzGamesSection({ reduced }: { reduced: boolean }) {
  return (
    <section dir="rtl" className="container relative z-20 py-20">
      <RevealGroup stagger={0.12} className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
          <RevealWords text="وزن را بازی کن" inherit />
        </h2>
        <RevealItem>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            سه بازی برای تمرین تقطیع و تشخیص وزن.
          </p>
        </RevealItem>
      </RevealGroup>

      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g, i) => (
          <motion.div
            key={g.href}
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={i === 0 ? "h-full md:col-span-2 lg:col-span-1" : "h-full"}
          >
            <Link href={g.href} className={`${styles.game} group`} style={g.tone}>
              {g.isNew && <span className={styles.newTag}>تازه</span>}
              <div className={styles.gameArt}>{g.art}</div>
              <div className={styles.gameBody}>
                <h3 className="text-xl font-black text-foreground">{g.title}</h3>
                <p className="mt-2 mb-6 text-sm leading-7 text-muted-foreground">{g.desc}</p>
                <span className={styles.play}>
                  {g.cta}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
                  </svg>
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/game"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          همهٔ بازی‌ها ←
        </Link>
      </div>
    </section>
  );
}
