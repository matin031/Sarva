"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Grade } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";
import Shamseh from "@/components/UI/doroos/Shamseh";

/** One پایه, drawn as the cover of its book.
 *
 *  A textbook is a physical thing the reader already knows the look of, so the
 *  card is built like a binding: a ruled frame (جدول), a شمسه behind the title,
 *  corner marks, and the lesson count set where a colophon would sit. Each
 *  grade keeps its own colour so the three read apart at a glance. */

const TONE: Record<string, string> = {
  dahom: "--color-primary",
  yazdahom: "--color-gold",
  davazdahom: "--color-lapis-light",
};

export default function BookCard({ grade, index }: { grade: Grade; index: number }) {
  const ready = grade.lessons.filter((l) => l.ready).length;
  const token = TONE[grade.key] ?? "--color-primary";
  const c = (pct: number) => `color-mix(in oklch, var(${token}) ${pct}%, transparent)`;

  const inner = (
    <>
      {/* The شمسه sits behind everything, large and faint. It is sized off the
          card's shorter side — the cover lies down below sm, and a width-based
          size would stretch the rosette across the whole page there. */}
      <Shamseh
        className="pointer-events-none absolute start-1/2 top-1/2 aspect-square h-[115%] w-auto -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2 sm:h-auto sm:w-[78%]"
        style={{ color: `var(${token})`, opacity: 0.16 }}
      />

      {/* جدول — the ruled frame, two lines with a hairline gap */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-xl border transition-colors duration-500"
        style={{ borderColor: c(38) }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[0.9rem] rounded-lg border"
        style={{ borderColor: c(16) }}
      />

      {/* corner marks */}
      {(
        [
          ["top-3 start-3", ""],
          ["top-3 end-3", ""],
          ["bottom-3 start-3", ""],
          ["bottom-3 end-3", ""],
        ] as const
      ).map(([pos], i) => (
        <span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ${pos}`}
          style={{ background: c(55) }}
        />
      ))}

      <div className="relative z-20 flex h-full flex-col items-center justify-between px-5 py-7 text-center sm:px-6 sm:py-9">
        <span
          className="text-[0.7rem] font-black tracking-[0.2em]"
          style={{ color: c(90) }}
        >
          پایهٔ {grade.label}
        </span>

        <div>
          <h2 className="font-serif text-2xl font-black whitespace-nowrap text-foreground sm:text-3xl md:text-4xl">
            {grade.book}
          </h2>
          {/* rule with a lozenge in the middle, the way a title page is ruled */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-px w-8" style={{ background: c(45) }} />
            <span className="size-1.5 rotate-45" style={{ background: c(70) }} />
            <span className="h-px w-8" style={{ background: c(45) }} />
          </div>
          <p className="mt-3 hidden text-xs font-bold text-muted-foreground sm:block">
            {faNum(grade.lessons.length)} درس
          </p>
        </div>

        <div className="w-full">
          {/* one tick per lesson: the shape of the book, and how far in we are */}
          <div className="mb-2.5 flex justify-center gap-[3px]">
            {grade.lessons.map((l) => (
              <span
                key={l.number}
                className="h-1.5 w-1 rounded-full transition-colors duration-500"
                style={{ background: l.ready ? `var(${token})` : "var(--color-border)" }}
              />
            ))}
          </div>
          <p className="text-[0.72rem] font-bold text-muted-foreground">
            {ready
              ? `${faNum(ready)} درس آمادهٔ خواندن`
              : "به‌زودی افزوده می‌شود"}
          </p>
        </div>
      </div>
    </>
  );

  const shell =
    "group relative block aspect-[5/3.1] overflow-hidden rounded-[1.4rem] border bg-card sm:aspect-[3/4]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-20"
    >
      {ready ? (
        <Link
          href={`/doroos/${grade.key}`}
          className={`${shell} border-border shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`}
          style={{ ["--tw-shadow-color" as string]: c(30) }}
        >
          {inner}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.4rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ boxShadow: `inset 0 0 0 1.5px ${c(55)}` }}
          />
        </Link>
      ) : (
        <div className={`${shell} border-dashed border-border opacity-60`}>{inner}</div>
      )}
    </motion.div>
  );
}
