"use client";

import Link from "next/link";
import { motion, MotionConfig, useScroll, useSpring } from "motion/react";
import type { Grade } from "@/lib/doroos/types";
import type { Lesson } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
} from "@/components/UI/aruz/reveal";
import BeytCard from "@/components/UI/doroos/BeytCard";
import RealmPanel from "@/components/UI/doroos/RealmPanel";
import { REALMS } from "@/lib/doroos/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The lesson itself. A reading-progress bar rides the top of the page — this
 *  is the one place useScroll genuinely fits, because scroll progress *is* the
 *  value being animated, and Framer samples it in its own read phase. */
export default function LessonView({
  grade,
  lesson,
}: {
  grade: Grade;
  lesson: Lesson;
}) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  const units =
    lesson.kind === "poem" ? lesson.beyts.length : lesson.passages.length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-20 overflow-hidden bg-background">
        {/* reading progress */}
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="fixed inset-x-0 top-0 z-50 h-1 origin-right bg-primary"
        />

        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_10%_0%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_50%),radial-gradient(ellipse_at_90%_30%,color-mix(in_oklch,var(--color-gold)_8%,transparent),transparent_50%)]"
        />

        {/* ---------- lesson header ---------- */}
        <section dir="rtl" className="relative z-20 container pt-16 pb-10">
          <RevealGroup stagger={0.1} className="relative z-20">
            <RevealItem>
              <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Link
                  href="/doroos"
                  className="font-bold transition-colors hover:text-primary"
                >
                  درسنامه
                </Link>
                <span aria-hidden>/</span>
                <Link
                  href={`/doroos/${grade.key}`}
                  className="font-bold transition-colors hover:text-primary"
                >
                  {grade.book}
                </Link>
                <span aria-hidden>/</span>
                <span>درس {faNum(lesson.number)}</span>
              </nav>
            </RevealItem>

            <h1 className="mt-5 text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              <RevealLine className="aruz-gradient-text" delay={0.06}>
                {lesson.title}
              </RevealLine>
            </h1>

            <RevealItem>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {lesson.kind === "poem" && lesson.poet ? (
                  <span className="rounded-full border border-gold/40 bg-card px-3 py-1 font-bold text-gold">
                    {lesson.poet}
                  </span>
                ) : null}
                <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-muted-foreground">
                  پایهٔ {grade.label}
                </span>
                <span className="rounded-full border border-primary/40 bg-card px-3 py-1 font-bold text-primary">
                  {lesson.kind === "poem"
                    ? `${faNum(units)} بیت`
                    : `${faNum(units)} بند`}
                </span>
              </div>
            </RevealItem>

            {lesson.intro ? (
              <RevealItem>
                <p className="mt-6 max-w-2xl text-muted-foreground">
                  {lesson.intro}
                </p>
              </RevealItem>
            ) : null}

            {/* legend: what the three colours mean */}
            <RevealItem>
              <ul className="mt-7 flex flex-wrap gap-4 text-xs font-bold">
                {REALMS.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: `var(${r.token})` }}
                    />
                    <span style={{ color: `var(${r.token})` }}>{r.label}</span>
                  </li>
                ))}
              </ul>
            </RevealItem>
          </RevealGroup>
        </section>

        {/* ---------- the analysis ---------- */}
        <section dir="rtl" className="relative z-20 container space-y-14 pb-20">
          {lesson.kind === "poem"
            ? lesson.beyts.map((b) => <BeytCard key={b.n} beyt={b} />)
            : lesson.passages.map((p) => (
                <article
                  key={p.n}
                  id={`band-${p.n}`}
                  className="relative z-20 scroll-mt-28"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="relative z-20 rounded-3xl border border-primary/25 bg-card p-6 shadow-xl sm:p-9"
                  >
                    <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                      بند {faNum(p.n)}
                    </span>
                    <p className="mt-5 font-serif text-lg leading-[2.1] text-foreground">
                      {p.text}
                    </p>
                    {p.meaning ? (
                      <div className="relative z-20 mt-6 rounded-2xl border border-border bg-background p-4">
                        <h3 className="mb-1.5 text-xs font-black text-muted-foreground">
                          معنی
                        </h3>
                        <p className="text-sm leading-relaxed text-foreground">
                          {p.meaning}
                        </p>
                      </div>
                    ) : null}
                  </motion.div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <RealmPanel
                      label={REALMS[0].label}
                      token={REALMS[0].token}
                      items={p.linguistic}
                    />
                    <RealmPanel
                      label={REALMS[1].label}
                      token={REALMS[1].token}
                      items={p.literary}
                      delay={0.08}
                    />
                    <RealmPanel
                      label={REALMS[2].label}
                      token={REALMS[2].token}
                      body={p.intellectual}
                      delay={0.16}
                    />
                  </div>
                </article>
              ))}
        </section>

        {/* ---------- closing notes ---------- */}
        {lesson.wrapUp?.length ? (
          <section dir="rtl" className="relative z-20 container pb-24">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative z-20 overflow-hidden rounded-3xl border border-gold/30 bg-card p-7 shadow-xl sm:p-10"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 22%, transparent), transparent)",
                }}
              />
              <h2 className="relative z-20 text-2xl font-black text-foreground sm:text-3xl">
                نکات پایانی و جمع‌بندی
              </h2>
              <div className="relative z-20 mt-6 grid gap-4 md:grid-cols-2">
                {lesson.wrapUp.map((topic, i) => (
                  <motion.div
                    key={topic.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{
                      duration: 0.5,
                      delay: Math.min(i, 6) * 0.07,
                      ease: EASE,
                    }}
                    className="relative z-20 rounded-2xl border border-border bg-background p-5"
                  >
                    <h3 className="mb-2 font-black text-gold">{topic.title}</h3>
                    <p className="text-sm leading-relaxed text-foreground">
                      {topic.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>
        ) : null}

        {/* ---------- end of lesson ---------- */}
        <section dir="rtl" className="relative z-20 container pb-24">
          <div className="relative z-20 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/doroos/${grade.key}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-7 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
            >
              درس‌های دیگرِ {grade.book}
            </Link>
            <Link
              href="/doroos"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-card px-7 font-bold text-foreground transition-all hover:border-primary/40 active:scale-95"
            >
              تغییرِ پایه
            </Link>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
