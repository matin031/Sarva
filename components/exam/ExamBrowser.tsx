"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import type { ExamSummary } from "@/lib/exam/db-exam";

const EASE = [0.16, 1, 0.3, 1] as const;

const GRADES = [
  { n: 10, title: "دهم", sub: "فارسی ۱", glyph: "۱۰" },
  { n: 11, title: "یازدهم", sub: "فارسی ۲", glyph: "۱۱" },
  { n: 12, title: "دوازدهم", sub: "فارسی ۳", glyph: "۱۲" },
];

/** انتخاب پایه، بعد آزمون‌های همان پایه.
 *
 *  Three books share this page, and a flat list of every paper made the reader
 *  do the filtering in their head. The پایه is picked first, and only then does
 *  the list appear — the same shape as واژه‌یاب, so the site behaves the same
 *  way wherever a student has to choose a book. */
export default function ExamBrowser({ exams }: { exams: ExamSummary[] }) {
  const [grade, setGrade] = useState<number | null>(null);

  const byGrade = useMemo(() => {
    const m = new Map<number, ExamSummary[]>();
    for (const e of exams) {
      const list = m.get(e.grade) ?? [];
      list.push(e);
      m.set(e.grade, list);
    }
    return m;
  }, [exams]);

  /** Papers whose grade is not one of the three books still deserve a home. */
  const orphans = useMemo(
    () => exams.filter((e) => !GRADES.some((g) => g.n === e.grade)),
    [exams],
  );

  const shown = grade === null ? [] : grade === 0 ? orphans : byGrade.get(grade) ?? [];

  return (
    <div dir="rtl" className=" container relative z-20 mx-auto mt-14 mb-24 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className=" text-center"
      >
        <span className=" inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          امتحان نهایی
        </span>
        <h1 className=" mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          کدام پایه؟
        </h1>
        <p className=" mx-auto mt-3 max-w-lg text-pretty leading-relaxed text-muted-foreground">
          آزمون‌های نهاییِ سال‌های گذشته، دقیقاً با همان صورت‌سؤال و بارم. پایه‌ات
          را انتخاب کن تا آزمون‌هایش را ببینی.
        </p>
      </motion.div>

      {/* ---------------- pick a book ---------------- */}
      <div className=" mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {GRADES.map((g, i) => {
          const count = byGrade.get(g.n)?.length ?? 0;
          const active = grade === g.n;
          return (
            <motion.button
              key={g.n}
              type="button"
              onClick={() => setGrade(active ? null : g.n)}
              aria-pressed={active}
              disabled={!count}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 * i, ease: EASE }}
              whileHover={count ? { y: -4 } : undefined}
              className={`glass group relative overflow-hidden rounded-3xl p-5 text-right transition-colors sm:p-6 ${
                !count
                  ? "cursor-not-allowed opacity-45"
                  : active
                    ? "border-primary/60! ring-2 ring-primary/40"
                    : "cursor-pointer hover:border-primary/50"
              }`}
            >
              <div className=" flex items-start justify-between gap-3">
                <div>
                  <h2 className=" text-xl font-black text-foreground sm:text-2xl">
                    {g.title}
                  </h2>
                  <p className=" mt-0.5 text-xs text-muted-foreground">{g.sub}</p>
                </div>
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {g.glyph}
                </span>
              </div>

              <p className=" mt-4 text-sm text-muted-foreground">
                {count
                  ? `${toFa(count)} آزمون موجود`
                  : "هنوز آزمونی ثبت نشده"}
              </p>

              <span
                className={`absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent transition-opacity ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                }`}
              />
            </motion.button>
          );
        })}
      </div>

      {orphans.length > 0 && (
        <div className=" mt-4 text-center">
          <button
            type="button"
            onClick={() => setGrade(grade === 0 ? null : 0)}
            className=" rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            آزمون‌های بدون پایهٔ مشخص ({toFa(orphans.length)})
          </button>
        </div>
      )}

      {/* ---------------- that book's papers ---------------- */}
      <AnimatePresence mode="wait">
        {grade !== null && (
          <motion.div
            key={grade}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" mt-10"
          >
            <h3 className=" mb-4 text-sm font-bold text-muted-foreground">
              {shown.length
                ? `${toFa(shown.length)} آزمون`
                : "آزمونی برای این پایه ثبت نشده است"}
            </h3>

            <div className=" flex flex-col gap-4">
              {shown.map((e, i) => (
                <motion.div
                  key={e.examKey}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05, ease: EASE }}
                >
                  <Link
                    href={`/exam/${e.examKey}`}
                    className=" glass group flex items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:border-primary/50 hover:brightness-105"
                  >
                    <div className=" min-w-0">
                      <h4 className=" truncate font-bold text-foreground sm:text-lg">
                        {e.title}
                      </h4>
                      <div className=" mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className=" rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                          {toFa(e.questionCount)} سؤال
                        </span>
                        <span className=" rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                          بارم {toFa(e.totalScore)}
                        </span>
                      </div>
                    </div>

                    <span className=" flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:-translate-x-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden
                        className=" size-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                        />
                      </svg>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!exams.length && (
        <p className=" mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          هنوز آزمونی در بانک ثبت نشده است.
        </p>
      )}
    </div>
  );
}
