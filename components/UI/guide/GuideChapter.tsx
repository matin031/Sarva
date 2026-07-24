"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import TiltCard from "@/components/UI/aruz/TiltCard";
import { RevealGroup, RevealItem, RevealWords } from "@/components/UI/aruz/reveal";

export type Chapter = {
  index: string;
  tag: string;
  title: string;
  desc: string;
  steps: string[];
  href: string;
  cta: string;
  accent: string;
  icon: ReactNode;
  preview?: ReactNode;
};

/** One feature "chapter" of the guide: a staggered text column beside a 3D
 *  tilting preview card. Alternates sides on `flip` for rhythm. */
export default function GuideChapter({
  chapter,
  flip,
  reduced,
}: {
  chapter: Chapter;
  flip: boolean;
  reduced: boolean;
}) {
  const { index, tag, title, desc, steps, href, cta, accent, icon, preview } = chapter;
  return (
    <section dir="rtl" className="container relative py-14 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* text */}
        <RevealGroup
          stagger={0.1}
          className={`relative z-10 ${flip ? "lg:order-2" : ""}`}
        >
          <RevealItem>
            <div className="mb-4 flex items-center gap-3">
              <span
                className="text-4xl font-black tabular-nums sm:text-5xl"
                style={{ color: accent, opacity: 0.9 }}
              >
                {index}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  color: accent,
                  background: `color-mix(in oklch, ${accent} 12%, transparent)`,
                }}
              >
                {tag}
              </span>
            </div>
          </RevealItem>

          <h2 className="text-2xl font-black text-foreground sm:text-3xl md:text-4xl">
            <RevealWords text={title} />
          </h2>

          <RevealItem>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              {desc}
            </p>
          </RevealItem>

          <RevealItem>
            <ul className="mt-5 space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: accent }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </RevealItem>

          <RevealItem>
            <Link
              href={href}
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 font-bold text-white shadow-lg transition-all active:scale-95"
              style={{ background: accent, boxShadow: `0 10px 30px -10px ${accent}` }}
            >
              {cta}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
              </svg>
            </Link>
          </RevealItem>
        </RevealGroup>

        {/* 3D preview card */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 50, rotateX: -16, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          style={{ transformPerspective: 1000 }}
          className={`relative ${flip ? "lg:order-1" : ""}`}
        >
          <TiltCard
            disabled={reduced}
            max={10}
            className="glass relative overflow-hidden rounded-[2rem] border border-border p-8 shadow-2xl"
          >
            {/* accent glow */}
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-52 rounded-full opacity-50 blur-3xl"
              style={{ background: accent }}
            />
            <div className="relative flex min-h-56 flex-col items-center justify-center gap-5">
              <div
                className="flex size-20 items-center justify-center rounded-3xl border border-border bg-background/70"
                style={{ boxShadow: `0 0 40px -12px ${accent}`, color: accent }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-10">
                  {icon}
                </svg>
              </div>
              {preview}
            </div>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  );
}
