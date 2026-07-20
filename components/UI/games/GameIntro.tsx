"use client";
import { motion } from "motion/react";

/** Shared, lively intro card for a game: the game's own animated preview on
 *  top, then a tagline, numbered how-to steps, a lives badge and a bold CTA.
 *  Replaces the old flat "title + wall of text + button" intro. */
export default function GameIntro({
  title,
  tagline,
  steps,
  lives,
  accent,
  chipBg,
  Preview,
  onStart,
  cta = "بزن بریم",
}: {
  title: string;
  tagline: string;
  steps: string[];
  lives?: number;
  accent: string;
  chipBg: string;
  Preview: () => React.ReactNode;
  onStart: () => void;
  cta?: string;
}) {
  const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
  return (
    <motion.div
      key="intro"
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20 }}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className="glass relative z-20 mx-auto max-w-xl overflow-hidden rounded-3xl"
    >
      {/* animated preview header */}
      <motion.div variants={item} className="p-3 sm:p-4">
        <Preview />
      </motion.div>

      <div className="px-6 pb-7 text-center sm:px-8">
        <motion.h1 variants={item} className="text-2xl font-extrabold sm:text-3xl">
          {title}
        </motion.h1>
        <motion.p variants={item} className={`mt-1 text-sm font-semibold sm:text-base ${accent}`}>
          {tagline}
        </motion.p>

        <motion.ol variants={item} className="mx-auto mt-5 flex max-w-md flex-col gap-2.5 text-right">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground sm:text-base">
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${chipBg}`}>
                {(i + 1).toLocaleString("fa-IR")}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </motion.ol>

        {lives != null && (
          <motion.div variants={item} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-bold text-destructive">
            {Array.from({ length: lives }).map((_, i) => (
              <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M12 21s-6.7-4.35-9.33-8.24C.9 9.9 2 6.5 5 5.5c2-.67 3.7.3 4.7 1.6.3.4.9.4 1.2 0C11.9 5.8 13.6 4.83 15.6 5.5c3 1 4.1 4.4 2.33 7.26C18.7 16.65 12 21 12 21Z" />
              </svg>
            ))}
            <span className="mr-1">{lives.toLocaleString("fa-IR")} جان</span>
          </motion.div>
        )}

        <motion.div variants={item}>
          <button
            onClick={onStart}
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-9 py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-all hover:brightness-90 active:scale-95 sm:text-lg"
          >
            {cta}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-5 transition-transform group-hover:-translate-x-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
            </svg>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
