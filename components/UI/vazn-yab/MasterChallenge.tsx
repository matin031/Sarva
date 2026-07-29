"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    n: "۱",
    title: "بیتِ تصادفی را بزن",
    body: "یک بیت از گنجور می‌آید و خودش دو مصراع را پر می‌کند. هر بار یک شاعر و یک وزن تازه.",
  },
  {
    n: "۲",
    title: "حالتِ استادی را روشن کن",
    body: "قبل از دیدن جواب، ارکانی که به گوشت می‌آید را بنویس — مثلاً «مفاعیلن مفاعیلن فعولن».",
  },
  {
    n: "۳",
    title: "«پیدا کن» و ببین درست گفتی یا نه",
    body: "وزن واقعی پیدا می‌شود و حدست همان‌جا داوری می‌شود: درست، نزدیک، یا نشد.",
  },
];

/** Introduces the random-بیت button as what it really is: a self-test.
 *
 *  Sits between the hero and the form so the reader meets the idea before the
 *  controls, rather than discovering a mystery button on a toolbar. */
export default function MasterChallenge() {
  return (
    <motion.section
      dir="rtl"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: EASE }}
      className=" relative z-20 mx-auto mt-14 w-full max-w-4xl sm:mt-20"
    >
      <div className=" glass overflow-hidden rounded-3xl p-5 sm:p-8">
        <div className=" flex flex-wrap items-center gap-3">
          <span className=" flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-2xl">
            🏅
          </span>
          <div>
            <h2 className=" text-xl font-bold text-foreground sm:text-2xl">
              خودت را بیازما
            </h2>
            <p className=" text-xs text-muted-foreground sm:text-sm">
              برای آن‌ها که فکر می‌کنند در عروض استادند
            </p>
          </div>
        </div>

        <p className=" mt-4 leading-relaxed text-muted-foreground">
          وزن‌یاب فقط برای وقتی نیست که وزن را نمی‌دانی. یک بیتِ ناآشنا بگیر،
          اول خودت حدس بزن، بعد بگذار جواب را بدهد. سه قدم است:
        </p>

        <div className=" mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
              className=" relative rounded-2xl border border-border bg-card p-4"
            >
              <span className=" flex size-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {s.n}
              </span>
              <h3 className=" mt-3 font-bold text-foreground">{s.title}</h3>
              <p className=" mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>

        <p className=" mt-5 rounded-2xl border border-gold/30 bg-gold/5 p-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          نکته: اگر ارکان را درست بگویی ولی تعدادشان را نه، داوری «نزدیک» است —
          یعنی وزن را شناخته‌ای و فقط باید بشماری.
        </p>
      </div>
    </motion.section>
  );
}
