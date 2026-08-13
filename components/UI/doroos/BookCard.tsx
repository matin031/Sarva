"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { Grade } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";
import Shamseh from "@/components/UI/doroos/Shamseh";

/** One پایه, drawn as its book.
 *
 *  On a wide screen that is the cover: a ruled جدول frame, a شمسه behind the
 *  title, corner lozenges, and one tick per lesson along the bottom.
 *
 *  On a phone a cover is the wrong object. There is no width for a portrait
 *  card, and a landscape one is a large empty frame around three words. So
 *  below sm the same book becomes a shelf row — a small cover, the title, and
 *  a progress rail — which is compact, scannable, and reads as a list of books
 *  rather than three posters. */

const TONE: Record<string, string> = {
  dahom: "--color-primary",
  yazdahom: "--color-gold-ink",
  davazdahom: "--color-lapis-light",
};

export default function BookCard({ grade, index }: { grade: Grade; index: number }) {
  const total = grade.lessons.length;
  const ready = grade.lessons.filter((l) => l.ready).length;
  const token = TONE[grade.key] ?? "--color-primary";
  const c = (pct: number) => `color-mix(in oklch, var(${token}) ${pct}%, transparent)`;

  const inner = (
    <>
      {/* ---------- phone: a shelf row ---------- */}
      <div className="flex items-center gap-4 p-3.5 sm:hidden">
        <div
          className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg border"
          style={{ borderColor: c(40), background: c(6) }}
        >
          <Shamseh
            className="absolute inset-1.5"
            style={{ color: `var(${token})`, opacity: 0.22 }}
          />
          <span
            className="absolute inset-0 flex items-center justify-center font-serif text-xl font-black"
            style={{ color: c(95) }}
          >
            {faNum(index + 1)}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-start">
          <span
            className="text-[0.66rem] font-black tracking-[0.15em]"
            style={{ color: c(90) }}
          >
            پایهٔ {grade.label}
          </span>
          <h2 className="font-serif text-xl font-black text-foreground">
            {grade.book}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max((ready / total) * 100, ready ? 6 : 0)}%`,
                  background: `var(${token})`,
                }}
              />
            </span>
            <span className="shrink-0 text-[0.66rem] font-bold text-muted-foreground">
              {faNum(ready)} از {faNum(total)}
            </span>
          </div>
        </div>

        {/* only a row you can actually open gets an arrow */}
        {ready ? (
          <span aria-hidden className="shrink-0 text-lg" style={{ color: c(80) }}>
            ←
          </span>
        ) : (
          <span className="shrink-0 text-[0.66rem] font-bold text-muted-foreground">
            به‌زودی
          </span>
        )}
      </div>

      {/* ---------- wide: the cover ---------- */}
      <div className="hidden sm:block">
        <Shamseh
          className="pointer-events-none absolute start-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
          style={{ color: `var(${token})`, opacity: 0.16 }}
        />

        {/* جدول — the ruled frame, two lines with a hairline gap */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-xl border"
          style={{ borderColor: c(38) }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[0.9rem] rounded-lg border"
          style={{ borderColor: c(16) }}
        />
        {["top-3 start-3", "top-3 end-3", "bottom-3 start-3", "bottom-3 end-3"].map(
          (pos) => (
            <span
              key={pos}
              aria-hidden
              className={`pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ${pos}`}
              style={{ background: c(55) }}
            />
          ),
        )}

        <div className="relative z-20 flex h-full flex-col items-center justify-between px-6 py-9 text-center">
          <span
            className="text-[0.7rem] font-black tracking-[0.2em]"
            style={{ color: c(90) }}
          >
            پایهٔ {grade.label}
          </span>

          <div>
            <h2 className="font-serif text-3xl font-black whitespace-nowrap text-foreground md:text-4xl">
              {grade.book}
            </h2>
            {/* rule with a lozenge in the middle, the way a title page is ruled */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-px w-8" style={{ background: c(45) }} />
              <span className="size-1.5 rotate-45" style={{ background: c(70) }} />
              <span className="h-px w-8" style={{ background: c(45) }} />
            </div>
            <p className="mt-3 text-xs font-bold text-muted-foreground">
              {faNum(total)} درس
            </p>
          </div>

          <div className="w-full">
            {/* one tick per lesson: the shape of the book, and how far in we are */}
            <div className="mb-2.5 flex justify-center gap-[3px]">
              {grade.lessons.map((l) => (
                <span
                  key={l.number}
                  className="h-1.5 w-1 rounded-full"
                  style={{
                    background: l.ready ? `var(${token})` : "var(--color-border)",
                  }}
                />
              ))}
            </div>
            <p className="text-[0.72rem] font-bold text-muted-foreground">
              {ready ? `${faNum(ready)} درس آمادهٔ خواندن` : "به‌زودی افزوده می‌شود"}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const shell =
    "group relative block overflow-hidden rounded-2xl border bg-card sm:aspect-[3/4] sm:rounded-[1.4rem]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-20"
    >
      {ready ? (
        <Link
          href={`/doroos/${grade.key}`}
          className={`${shell} border-border shadow-lg transition-all duration-500 hover:border-transparent sm:hover:-translate-y-2 sm:hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`}
        >
          {inner}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:rounded-[1.4rem]"
            style={{ boxShadow: `inset 0 0 0 1.5px ${c(55)}` }}
          />
        </Link>
      ) : (
        <div className={`${shell} border-dashed border-border opacity-60`}>{inner}</div>
      )}
    </motion.div>
  );
}
