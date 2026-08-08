"use client";

import Link from "next/link";
import { MotionConfig } from "motion/react";
import { GRADES, faNum } from "@/lib/doroos";
import { RevealGroup, RevealItem, RevealLine } from "@/components/UI/aruz/reveal";
import BookCard from "@/components/UI/doroos/BookCard";

/** Step one of the درسنامه: pick a پایه.
 *
 *  The three books sit beside the heading rather than a screen below it. The
 *  old layout gave the hero 70vh of its own and pushed the only thing you can
 *  actually click below the fold, so the first thing a reader saw was empty
 *  space. */
export default function DoroosHome() {
  const total = GRADES.reduce((n, g) => n + g.lessons.length, 0);
  const ready = GRADES.reduce((n, g) => n + g.lessons.filter((l) => l.ready).length, 0);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-20 overflow-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_15%_0%,color-mix(in_oklch,var(--color-primary)_11%,transparent),transparent_55%),radial-gradient(ellipse_at_88%_35%,color-mix(in_oklch,var(--color-gold)_9%,transparent),transparent_55%)]"
        />

        <section
          dir="rtl"
          className="relative z-20 container grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16 lg:py-20"
        >
          {/* ---------- the words ---------- */}
          <RevealGroup stagger={0.1} className="relative z-20 text-center lg:text-start">
            <RevealItem>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-lg">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                درسنامهٔ فارسیِ سروا
              </span>
            </RevealItem>

            <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl">
              <RevealLine className="text-foreground" delay={0.08}>
                هر بیت،
              </RevealLine>
              <RevealLine className="aruz-gradient-text" delay={0.2}>
                سه قلمرو
              </RevealLine>
            </h1>

            <RevealItem>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground lg:mx-0">
                هر درس بیت‌به‌بیت باز می‌شود: معنی و مفهوم، و بعد قلمرو زبانی،
                ادبی و فکری — جدا از هم، تا بدانی هر نکته به کدام قلمرو تعلق
                دارد. نقشِ دستوری و آرایه‌های هر بیت هم روی خودِ بیت کشیده
                می‌شوند.
              </p>
            </RevealItem>

            <RevealItem>
              <dl className="mx-auto mt-8 flex max-w-md items-stretch gap-6 lg:mx-0">
                {[
                  [faNum(GRADES.length), "کتاب"],
                  [faNum(total), "درس"],
                  [faNum(ready), "آماده"],
                ].map(([n, label], i) => (
                  <div key={label} className="flex items-stretch gap-6">
                    {i > 0 && <span aria-hidden className="w-px bg-border" />}
                    <div>
                      <dt className="font-serif text-2xl font-black text-foreground">
                        {n}
                      </dt>
                      <dd className="text-xs font-bold text-muted-foreground">{label}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </RevealItem>

            <RevealItem>
              <Link
                href="/guide"
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 font-bold text-foreground transition-all hover:border-primary/40 active:scale-95"
              >
                راهنمای استفاده
              </Link>
            </RevealItem>
          </RevealGroup>

          {/* ---------- the shelf ---------- */}
          <div className="relative z-20">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
              {GRADES.map((grade, i) => (
                <BookCard key={grade.key} grade={grade} index={i} />
              ))}
            </div>
            {/* the shelf they stand on */}
            <div
              aria-hidden
              className="mx-2 mt-4 h-px bg-gradient-to-l from-transparent via-border to-transparent"
            />
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
