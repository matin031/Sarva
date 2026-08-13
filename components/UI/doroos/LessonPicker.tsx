"use client";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import type { Grade } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
} from "@/components/UI/aruz/reveal";
import Shamseh from "@/components/UI/doroos/Shamseh";

const TONE: Record<string, string> = {
  dahom: "--color-primary",
  yazdahom: "--color-gold-ink",
  davazdahom: "--color-lapis-light",
};

export default function LessonPicker({ grade }: { grade: Grade }) {
  const token = TONE[grade.key] ?? "--color-primary";
  const c = (pct: number) =>
    `color-mix(in oklch, var(${token}) ${pct}%, transparent)`;
  const ready = grade.lessons.filter((l) => l.ready).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-20 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse at 82% 0%, ${c(11)}, transparent 55%)`,
          }}
        />

        <section dir="rtl" className="relative z-20 container max-w-3xl py-14">
          <RevealGroup stagger={0.09} className="relative z-20">
            <RevealItem>
              <Link
                href="/doroos"
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                همهٔ پایه‌ها
                <span className=" rotate-180" aria-hidden>
                  →
                </span>
              </Link>
            </RevealItem>

            {/* ---------- title page ---------- */}
            <RevealItem>
              <div className="relative z-20 mt-5 overflow-hidden rounded-[1.4rem] border border-border bg-card px-6 py-10 text-center">
                <Shamseh
                  className="pointer-events-none absolute start-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
                  style={{ color: `var(${token})`, opacity: 0.14 }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-3 rounded-xl border"
                  style={{ borderColor: c(28) }}
                />
                <div className="relative z-20">
                  <span
                    className="text-[0.7rem] font-black tracking-[0.2em]"
                    style={{ color: c(90) }}
                  >
                    پایهٔ {grade.label}
                  </span>
                  <h1 className="mt-2 font-serif text-4xl font-black text-foreground sm:text-5xl">
                    <RevealLine delay={0.06}>{grade.book}</RevealLine>
                  </h1>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="h-px w-10" style={{ background: c(45) }} />
                    <span
                      className="size-1.5 rotate-45"
                      style={{ background: c(70) }}
                    />
                    <span className="h-px w-10" style={{ background: c(45) }} />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {ready
                      ? `${faNum(ready)} درس از ${faNum(grade.lessons.length)} درس آمادهٔ خواندن است.`
                      : `هر ${faNum(grade.lessons.length)} درسِ این کتاب به‌زودی افزوده می‌شود.`}
                  </p>
                </div>
              </div>
            </RevealItem>
          </RevealGroup>

          {/* ---------- فهرست ---------- */}
          <h2 className="mt-12 mb-1 flex items-center gap-3 text-xs font-black tracking-[0.2em] text-muted-foreground">
            فهرست
            <span aria-hidden className="h-px flex-1 bg-border" />
          </h2>

          <ol className="relative z-20">
            {grade.lessons.map((lesson, i) => {
              const row = (
                <div className=" w-full flex justify-between items-center">
                  <div className=" flex items-center">
                    <span
                      className="w-14 shrink-0 font-serif text-lg font-black tabular-nums transition-colors"
                      style={{
                        color: lesson.ready ? `var(${token})` : undefined,
                      }}
                    >
                      {faNum(lesson.number)}
                    </span>
                    <span
                      className={`shrink-0 sm:text-base text-sm ${
                        lesson.ready
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {lesson.title ?? `درس ${faNum(lesson.number)}`}
                    </span>
                  </div>
                  {/* leader dots, the way a contents page joins a title to its page */}

                  <span className="shrink-0 text-xs font-bold whitespace-nowrap">
                    {lesson.ready ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        style={{ color: `var(${token})` }}
                      >
                        خواندن
                        <span
                          aria-hidden
                          className="transition-transform group-hover:-translate-x-1"
                        >
                          ←
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">به‌زودی</span>
                    )}
                  </span>
                </div>
              );

              return (
                <motion.li
                  key={lesson.number}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(i, 10) * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative z-20 "
                >
                  {lesson.ready ? (
                    <Link
                      href={`/doroos/${grade.key}/${lesson.number}`}
                      className="group bg-card! mt-6 -mx-3 flex items-center rounded-xl px-3 py-3.5 transition-colors
                       focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      style={{ ["--hov" as string]: c(7) }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = c(7);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {row}
                    </Link>
                  ) : (
                    <div
                      aria-disabled
                      className="-mx-3 flex bg-card! mt-6 rounded-xl items-center px-3 py-3.5 "
                    >
                      {row}
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ol>
        </section>
      </div>
    </MotionConfig>
  );
}
