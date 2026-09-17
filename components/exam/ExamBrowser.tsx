"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BookOpenText, Check, ListChecks, Music4, ScrollText } from "lucide-react";
import { toFa } from "@/components/UI/CircularProgress";
import type { ExamSummary } from "@/lib/exam/db-exam";

const EASE = [0.16, 1, 0.3, 1] as const;

/** درس‌های بانک آزمون.
 *
 *  ⚠️ `match` روی رشتهٔ `exams.subject` کار می‌کند و نه روی یک برابریِ ساده:
 *  هر پایه کتاب خودش را دارد (farsi1/farsi2/farsi3،
 *  olum-fonoon1/2/3)، پس «درس» یک خانواده از subjectهاست و نه یک مقدار.
 *  ستونِ subject در دیتابیس TEXT آزاد است، پس افزودن درس سوم فقط یک ردیف
 *  اینجاست و نه مهاجرتِ پایگاه داده. */
const SUBJECTS = [
  {
    id: "farsi",
    title: "فارسی",
    tagline: "قلمرو زبانی، ادبی و فکری",
    Icon: BookOpenText,
    match: (s: string) => s.startsWith("farsi"),
    bookName: (grade: number) => `فارسی ${toFa(grade - 9)}`,
  },
  {
    id: "olum",
    title: "علوم و فنون ادبی",
    tagline: "تاریخ ادبیات، سبک‌شناسی، موسیقی شعر، زیبایی‌شناسی",
    Icon: Music4,
    match: (s: string) => s.startsWith("olum") || s.includes("fonoon"),
    bookName: (grade: number) => `علوم و فنون ${toFa(grade - 9)}`,
  },
] as const;

type SubjectId = (typeof SUBJECTS)[number]["id"] | "other";

const GRADE_TITLE: Record<number, string> = { 10: "دهم", 11: "یازدهم", 12: "دوازدهم" };
const STANDARD_GRADES = [10, 11, 12];

function subjectOf(subject: string): SubjectId {
  return SUBJECTS.find((s) => s.match(subject))?.id ?? "other";
}

/** انتخاب درس، بعد پایه، بعد آزمون‌های همان کتاب.
 *
 *  فهرستِ تخت، خواننده را وادار می‌کرد فیلترکردن را در ذهنش انجام دهد — و
 *  حالا که فارسی و علوم و فنون کنار هم‌اند، دو برابر بدتر هم می‌شد. همان
 *  الگوی واژه‌یاب: اول کتاب، بعد محتوا. */
export default function ExamBrowser({ exams }: { exams: ExamSummary[] }) {
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [grade, setGrade] = useState<number | null>(null);

  /** شمارشِ آزمون‌های هر درس، و پایه‌هایی که واقعاً آزمون دارند. */
  const bySubject = useMemo(() => {
    const m = new Map<SubjectId, ExamSummary[]>();
    for (const e of exams) {
      const id = subjectOf(e.subject);
      const list = m.get(id) ?? [];
      list.push(e);
      m.set(id, list);
    }
    return m;
  }, [exams]);

  const subjectExams = useMemo(
    () => (subject === null ? [] : bySubject.get(subject) ?? []),
    [bySubject, subject],
  );

  /** پایه‌های نمایش‌داده‌شده: سه پایهٔ کتاب‌ها، به‌علاوهٔ هر پایهٔ غیرمنتظره‌ای
   *  که در داده هست (تا برگه‌ای بی‌خانه نماند). */
  const grades = useMemo(() => {
    const extra = subjectExams.map((e) => e.grade).filter((g) => !STANDARD_GRADES.includes(g));
    return [...STANDARD_GRADES, ...new Set(extra)];
  }, [subjectExams]);

  const shown = grade === null ? [] : subjectExams.filter((e) => e.grade === grade);
  const activeSubject = SUBJECTS.find((s) => s.id === subject);

  function pickSubject(id: SubjectId) {
    setSubject(id);
    setGrade(null);
  }

  return (
    <div dir="rtl" className=" container relative z-20 mx-auto mt-14 mb-24 max-w-4xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className=" text-center"
      >
        <span className=" inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          <ScrollText aria-hidden className=" size-4" />
          امتحان نهایی
        </span>
        <h1 className=" mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          {subject === null ? "کدام درس؟" : grade === null ? "کدام پایه؟" : "کدام آزمون؟"}
        </h1>
        <p className=" mx-auto mt-3 max-w-lg text-pretty leading-relaxed text-muted-foreground">
          آزمون‌های نهاییِ سال‌های گذشته، دقیقاً با همان صورت‌سؤال و بارم — سؤال‌به‌سؤال
          و تعاملی، با پاسخ درست بلافاصله بعد از هر سؤال.
        </p>
      </motion.div>

      {/* ---------------- مسیر انتخاب‌شده ---------------- */}
      <AnimatePresence initial={false}>
        {subject !== null && (
          <motion.nav
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
            aria-label="مسیر انتخاب"
            className=" mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <Crumb
              label={activeSubject?.title ?? "سایر درس‌ها"}
              onClick={() => {
                setSubject(null);
                setGrade(null);
              }}
            />
            {grade !== null && (
              <Crumb
                label={GRADE_TITLE[grade] ?? `پایهٔ ${toFa(grade)}`}
                onClick={() => setGrade(null)}
              />
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ---------------- ۱) انتخاب درس ---------------- */}
      <AnimatePresence mode="wait">
        {subject === null && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {SUBJECTS.map((s, i) => {
              const list = bySubject.get(s.id) ?? [];
              const gradeCount = new Set(list.map((e) => e.grade)).size;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => pickSubject(s.id)}
                  disabled={!list.length}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 * i, ease: EASE }}
                  whileHover={list.length ? { y: -4 } : undefined}
                  className={`glass group relative flex flex-col overflow-hidden rounded-3xl p-6 text-right transition-colors ${
                    list.length
                      ? "cursor-pointer hover:border-primary/50"
                      : "cursor-not-allowed opacity-45"
                  }`}
                >
                  <span className=" flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <s.Icon aria-hidden className=" size-6" />
                  </span>
                  <h2 className=" mt-4 text-xl font-black text-foreground sm:text-2xl">
                    {s.title}
                  </h2>
                  <p className=" mt-1 text-sm leading-relaxed text-muted-foreground">
                    {s.tagline}
                  </p>
                  <div className=" mt-5 flex flex-wrap items-center gap-2 text-xs">
                    <span className=" rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                      {list.length ? `${toFa(list.length)} آزمون` : "به‌زودی"}
                    </span>
                    {gradeCount > 0 && (
                      <span className=" rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                        {toFa(gradeCount)} پایه
                      </span>
                    )}
                  </div>
                  <span className=" absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity group-hover:opacity-70" />
                </motion.button>
              );
            })}

            {(bySubject.get("other")?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => pickSubject("other")}
                className=" glass rounded-2xl p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary sm:col-span-2"
              >
                سایر درس‌ها ({toFa(bySubject.get("other")!.length)} آزمون)
              </button>
            )}
          </motion.div>
        )}

        {/* ---------------- ۲) انتخاب پایه ---------------- */}
        {subject !== null && grade === null && (
          <motion.div
            key={`grades-${subject}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {grades.map((g, i) => {
              const count = subjectExams.filter((e) => e.grade === g).length;
              return (
                <motion.button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  disabled={!count}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.05 * i, ease: EASE }}
                  whileHover={count ? { y: -4 } : undefined}
                  className={`glass group relative overflow-hidden rounded-3xl p-5 text-right transition-colors sm:p-6 ${
                    count ? "cursor-pointer hover:border-primary/50" : "cursor-not-allowed opacity-45"
                  }`}
                >
                  <div className=" flex items-start justify-between gap-3">
                    <div>
                      <h2 className=" text-xl font-black text-foreground sm:text-2xl">
                        {GRADE_TITLE[g] ?? `پایهٔ ${toFa(g)}`}
                      </h2>
                      <p className=" mt-0.5 text-xs text-muted-foreground">
                        {activeSubject && GRADE_TITLE[g] ? activeSubject.bookName(g) : "—"}
                      </p>
                    </div>
                    <span className=" flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {toFa(g)}
                    </span>
                  </div>
                  <p className=" mt-4 text-sm text-muted-foreground">
                    {count ? `${toFa(count)} آزمون موجود` : "هنوز آزمونی ثبت نشده"}
                  </p>
                  <span className=" absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity group-hover:opacity-70" />
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* ---------------- ۳) آزمون‌های همان کتاب ---------------- */}
        {subject !== null && grade !== null && (
          <motion.div
            key={`exams-${subject}-${grade}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" mt-8"
          >
            <h3 className=" mb-4 text-sm font-bold text-muted-foreground">
              {shown.length ? `${toFa(shown.length)} آزمون` : "آزمونی برای این کتاب ثبت نشده است"}
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
                      <h4 className=" truncate font-bold text-foreground sm:text-lg">{e.title}</h4>
                      <div className=" mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className=" inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                          <ListChecks aria-hidden className=" size-3.5" />
                          {toFa(e.questionCount)} سؤال
                        </span>
                        <span className=" inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                          <Check aria-hidden className=" size-3.5" />
                          بارم {toFa(e.totalScore)}
                        </span>
                      </div>
                    </div>

                    <span className=" flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:-translate-x-1">
                      <ArrowLeft aria-hidden className=" size-5" />
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

/** یک قدمِ مسیر: کلیک روی آن، همان قدم را دوباره باز می‌کند. */
function Crumb({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className=" inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary"
    >
      {label}
      <span className=" text-xs text-muted-foreground">تغییر</span>
    </button>
  );
}
