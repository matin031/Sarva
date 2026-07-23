"use client";

import { motion } from "motion/react";
import { defaultViewport } from "@/lib/motion";
import TiltCard from "./TiltCard";
import { RevealGroup, RevealItem, RevealWords } from "./reveal";

const FEATURES: {
  title: string;
  desc: string;
  tag: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    tag: "صوت → وزن",
    title: "ریتم را بشنو، وزن را بگو",
    desc: "یک ریتمِ ضرب‌آهنگین پخش می‌شود؛ از میان ارکان، وزنِ منطبق را انتخاب می‌کنی.",
    accent: "var(--color-primary)",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9v6m3-9v12m3-8v4M4.5 12h.008M19.5 12h.008"
      />
    ),
  },
  {
    tag: "صوت → بیت",
    title: "از ریتم به بیت برس",
    desc: "ریتمی می‌شنوی و باید بیتی را بیابی که دقیقاً روی همان وزن خوانده شده است.",
    accent: "var(--color-gold)",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9 9 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
      />
    ),
  },
  {
    tag: "بیت → صوت",
    title: "بیت را بخوان، صدا را بشناس",
    desc: "بیتی را می‌بینی و باید از میان چند نمونهٔ صوتی، خوانشِ هم‌وزن را تشخیص دهی.",
    accent: "var(--color-lapis-light)",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
      />
    ),
  },
];

export default function AruzFeatures({ reduced }: { reduced: boolean }) {
  return (
    <section dir="rtl" className="container relative py-20">
      <RevealGroup stagger={0.12} className="mx-auto mb-14 max-w-2xl text-center">
        <RevealItem>
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            سه نوع پرسش
          </span>
        </RevealItem>
        <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
          <RevealWords text="عروض را از هر زاویه تمرین کن" />
        </h2>
        <RevealItem>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            هر پرسش گوشِ موسیقایی‌ات را از یک مسیرِ متفاوت تقویت می‌کند تا
            وزن‌شناسی برایت به یک مهارتِ درونی تبدیل شود.
          </p>
        </RevealItem>
      </RevealGroup>

      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.tag}
            initial={
              reduced
                ? false
                : { opacity: 0, y: 64, rotateX: -20, scale: 0.92 }
            }
            whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            viewport={defaultViewport}
            transition={{
              type: "spring",
              stiffness: 95,
              damping: 15,
              delay: i * 0.12,
            }}
            style={{ transformPerspective: 1000 }}
          >
            <TiltCard
              disabled={reduced}
              className="group h-full overflow-hidden rounded-3xl border 
              border-border glass relative z-30 p-7 backdrop-blur-sm transition-colors hover:border-primary/40"
            >
              {/* accent glow that reveals on hover */}
              <div
                aria-hidden
                className="absolute -right-16 -top-16 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
                style={{ background: f.accent }}
              />
              <div
                className="relative mb-6 flex size-14 items-center justify-center rounded-2xl border border-border bg-background/70"
                style={{ boxShadow: `0 0 30px -10px ${f.accent}` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  className="size-7"
                  style={{ color: f.accent }}
                >
                  {f.icon}
                </svg>
              </div>
              <div
                className="mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold"
                style={{
                  color: f.accent,
                  background: `color-mix(in oklch, ${f.accent} 12%, transparent)`,
                }}
              >
                {f.tag}
              </div>
              <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
