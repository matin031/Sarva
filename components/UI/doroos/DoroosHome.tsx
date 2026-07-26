"use client";

import Link from "next/link";
import { MotionConfig } from "motion/react";
import { GRADES, faNum } from "@/lib/doroos";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
} from "@/components/UI/aruz/reveal";
import BookCard from "@/components/UI/doroos/BookCard";

/** Step one of the درسنامه: pick a پایه. Three books, presented as three
 *  spines the reader chooses between before ever seeing a lesson list. */
export default function DoroosHome() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-20 overflow-hidden bg-background">
        {/* ambient wash — gradients only, no blur surfaces to rasterise */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_15%_5%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_55%),radial-gradient(ellipse_at_85%_45%,color-mix(in_oklch,var(--color-gold)_10%,transparent),transparent_55%)]"
        />

        <section
          dir="rtl"
          className="relative z-20 container flex min-h-[70vh] flex-col justify-center py-20 text-center"
        >
          <RevealGroup stagger={0.12} className="relative z-20">
            <RevealItem>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-lg">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                درسنامهٔ فارسیِ سروا
              </span>
            </RevealItem>

            <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl">
              <RevealLine className="text-foreground" delay={0.08}>
                هر بیت،
              </RevealLine>
              <RevealLine className="aruz-gradient-text" delay={0.2}>
                سه قلمرو
              </RevealLine>
            </h1>

            <RevealItem>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                هر درس بیت‌به‌بیت باز می‌شود: معنی و مفهوم، و بعد قلمرو زبانی،
                ادبی و فکری — جدا از هم، تا بدانی هر نکته به کدام قلمرو تعلق
                دارد. پایه‌ات را انتخاب کن.
              </p>
            </RevealItem>
          </RevealGroup>
        </section>

        {/* ---------- three books ---------- */}
        <section dir="rtl" className="relative z-20 container pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {GRADES.map((grade, i) => (
              <BookCard key={grade.key} grade={grade} index={i} />
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            هر کتاب {faNum(18)} درس دارد؛ درس‌هایی که آماده‌اند نشانه‌گذاری
            شده‌اند.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/guide"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 font-bold text-foreground transition-all hover:border-primary/40 active:scale-95"
            >
              راهنمای استفاده
            </Link>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
