"use client";

import { motion } from "motion/react";
import { defaultViewport } from "@/lib/motion";
import { RevealGroup, RevealItem, RevealWords } from "@/components/UI/aruz/reveal";
import styles from "./aruz.module.css";

type Tone = React.CSSProperties & Record<`--${string}`, string>;

/** سه نوع پرسشِ آزمونِ صوتی. هر کارت یک تصویرِ کوچکِ زنده از همان پرسش دارد. */
const FEATURES: { route: string; title: string; desc: string; tone: Tone; stage: React.ReactNode }[] = [
  {
    route: "صوت ← وزن",
    title: "ریتم را بشنو، وزن را بگو",
    desc: "یک ریتم پخش می‌شود و از میان ارکان، وزن درست را انتخاب می‌کنی.",
    tone: { "--tone": "var(--primary)" },
    stage: (
      <div className="flex flex-col items-center" aria-hidden>
        <span className={styles.eq}>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ "--i": String(i), height: `${40 + ((i * 37) % 60)}%` } as Tone} />
          ))}
        </span>
        <span className={styles.chips}>
          <span className={styles.chip}>فاعلاتن</span>
          <span className={styles.chip} data-on>
            مفاعیلن
          </span>
          <span className={styles.chip}>فعولن</span>
        </span>
      </div>
    ),
  },
  {
    route: "صوت ← بیت",
    title: "از ریتم به بیت برس",
    desc: "ریتمی می‌شنوی و باید بیتی را پیدا کنی که روی همان وزن خوانده می‌شود.",
    tone: { "--tone": "var(--gold)", "--tone-ink": "var(--gold-ink)", "--tone-fg": "#1c1a14" },
    stage: (
      <div className="flex flex-col items-center" aria-hidden>
        <svg viewBox="0 0 170 36" className={styles.wave} fill="none">
          <path
            d="M2 18c8 0 8-12 16-12s8 24 16 24 8-18 16-18 8 12 16 12 8-16 16-16 8 20 16 20 8-10 16-10 8 6 16 6 8-8 16-8 8 4 12 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.lines}>
          <span style={{ width: "86%" }} />
          <span data-on />
          <span style={{ width: "70%" }} />
        </span>
      </div>
    ),
  },
  {
    route: "بیت ← صوت",
    title: "بیت را بخوان، صدا را بشناس",
    desc: "بیتی را می‌بینی و از میان چند نمونهٔ صوتی، خوانش هم‌وزن را پیدا می‌کنی.",
    tone: { "--tone": "var(--lapis-light)", "--tone-fg": "var(--background)" },
    stage: (
      <span className={styles.players} aria-hidden>
        <span className={styles.player}>
          <i />
          <b />
        </span>
        <span className={styles.player} data-on>
          <i />
          <b />
        </span>
        <span className={styles.player}>
          <i />
          <b />
        </span>
      </span>
    ),
  },
];

export default function AruzFeatures({ reduced }: { reduced: boolean }) {
  return (
    <section dir="rtl" className="container relative z-20 py-20 cursor-default">
      <RevealGroup stagger={0.12} className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
          <RevealWords text="آزمونی از جنس یادگیری" inherit />
        </h2>
        <RevealItem>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            سه نوع پرسش، هر کدام از یک مسیر گوشت را با وزن آشنا می‌کند.
          </p>
        </RevealItem>
      </RevealGroup>

      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.article
            key={f.route}
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={defaultViewport}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={styles.feature}
            style={f.tone}
          >
            <div className={styles.stage}>{f.stage}</div>
            <div className={styles.featureBody}>
              <span className={styles.route}>{f.route}</span>
              <h3 className="mt-2 text-lg font-black text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.desc}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
