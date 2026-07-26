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

/** Step two: pick a درس out of the eighteen. Lessons without content yet are
 *  rendered as inert tiles rather than hidden, so the shape of the book is
 *  visible and progress through it is obvious. */
export default function LessonPicker({ grade }: { grade: Grade }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-20 overflow-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_80%_0%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_55%)]"
        />

        <section dir="rtl" className="relative z-20 container py-16">
          <RevealGroup stagger={0.1} className="relative z-20">
            <RevealItem>
              <Link
                href="/doroos"
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                <span aria-hidden>→</span>
                همهٔ پایه‌ها
              </Link>
            </RevealItem>

            <h1 className="mt-5 text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              <RevealLine className="text-foreground" delay={0.06}>
                {`${grade.book} — پایهٔ ${grade.label}`}
              </RevealLine>
            </h1>

            <RevealItem>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                درسی را که می‌خواهی مرور کنی انتخاب کن. هر درس بیت‌به‌بیت با
                تفکیکِ قلمرو زبانی، ادبی و فکری باز می‌شود.
              </p>
            </RevealItem>
          </RevealGroup>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grade.lessons.map((lesson, i) => {
              const label = lesson.title ?? `درس ${faNum(lesson.number)}`;
              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold tracking-widest text-muted-foreground">
                      درس {faNum(lesson.number)}
                    </span>
                    {lesson.ready ? (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        آماده
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                        به‌زودی
                      </span>
                    )}
                  </div>
                  <h2
                    className={`mt-3 text-lg font-bold ${
                      lesson.ready ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </h2>
                </>
              );

              return (
                <motion.li
                  key={lesson.number}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.5,
                    delay: Math.min(i, 8) * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative z-20"
                >
                  {lesson.ready ? (
                    <Link
                      href={`/doroos/${grade.key}/${lesson.number}`}
                      className="group relative z-20 block h-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 30%, transparent), transparent)",
                        }}
                      />
                      <div className="relative z-20">{body}</div>
                    </Link>
                  ) : (
                    <div
                      aria-disabled
                      className="relative z-20 h-full cursor-not-allowed rounded-2xl border border-dashed border-border bg-card p-5 opacity-70"
                    >
                      <div className="relative z-20">{body}</div>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </section>
      </div>
    </MotionConfig>
  );
}
