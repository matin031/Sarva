"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Check, ChevronLeft, Clock3, FileCheck2, Lightbulb, MoonStar, Sparkles, Target } from "lucide-react";
import { faNum } from "@/lib/doroos/catalog";
import type { ReviewGrade } from "@/lib/doroos/exam-night";
import { lessonId, useReviewed } from "./reviewed-store";

/** هر مفهوم نیم دقیقه، و هیچ درسی کمتر از سه دقیقه — برآوردی برای برنامه‌ریزی،
 *  نه یک قول. */
export const minutesFor = (concepts: number) => Math.max(3, Math.ceil(concepts * 0.5));

const PLAN = [
  { icon: Target, title: "مفهوم‌ها", body: "مفهومِ هر بیت را یک بار از رو بخوان؛ فقط مفهوم، نه همهٔ شرح." },
  { icon: Lightbulb, title: "خودآزمایی", body: "مفهوم‌ها را بپوشان و از حافظه بگو. هرچه یادت نبود، دوباره." },
  { icon: FileCheck2, title: "یک آزمون", body: "یک امتحانِ نهایی بزن تا بدانی نمره‌ات کجا می‌لنگد." },
  { icon: MoonStar, title: "خواب", body: "حافظه در خواب تثبیت می‌شود. نیمه‌شب، کتاب را ببند." },
];

/** ستاره‌های ثابتِ آسمانِ کارتِ بالا. موقعیت‌ها دستی‌اند تا در سرور و مرورگر
 *  یکی باشند (عددِ تصادفی یعنی hydration mismatch). */
const STARS = [
  [8, 22, 1.4], [16, 64, 1], [24, 38, 1.8], [33, 14, 1], [41, 72, 1.3], [52, 30, 1],
  [61, 58, 1.6], [70, 18, 1.1], [78, 44, 1], [88, 70, 1.5], [93, 26, 1.1], [12, 84, 1],
] as const;

export default function ExamNightHub({ grades }: { grades: ReviewGrade[] }) {
  const { reviewed } = useReviewed();
  const [active, setActive] = useState<string>(grades[grades.length - 1]?.key ?? "");
  const tabsId = useId();

  const allReady = grades.flatMap((g) => g.lessons.filter((l) => l.ready).map((l) => ({ g: g.key, l })));
  const totalConcepts = allReady.reduce((n, x) => n + x.l.concepts, 0);
  const doneCount = allReady.filter((x) => reviewed.has(lessonId(x.g, x.l.number))).length;
  const grade = grades.find((g) => g.key === active) ?? grades[0];

  return (
    <div dir="rtl" className="container relative z-20 mx-auto max-w-5xl px-4 pt-6 pb-24 sm:pt-10">
      {/* ─────────────── آسمانِ شب ─────────────── */}
      <section className="relative isolate overflow-hidden rounded-[28px] px-6 py-10 text-white shadow-[0_30px_80px_-30px_oklch(0.25_0.1_265/0.7)] sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "radial-gradient(ellipse at 18% 0%, oklch(0.42 0.12 265 / 0.9), transparent 60%), radial-gradient(ellipse at 90% 100%, oklch(0.45 0.09 195 / 0.55), transparent 55%), linear-gradient(160deg, oklch(0.27 0.08 268), oklch(0.17 0.05 262))",
          }}
        />
        <svg aria-hidden className="absolute inset-0 -z-10 size-full" preserveAspectRatio="none">
          {STARS.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={r}
              fill="white"
              className="exam-night-twinkle"
              style={{ animationDelay: `${(i % 5) * 0.7}s` }}
            />
          ))}
        </svg>
        <Moon className="absolute -top-6 -left-6 size-36 sm:top-8 sm:left-10 sm:size-32" />

        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90 ring-1 ring-white/15 backdrop-blur">
            <Sparkles className="size-3.5 text-[oklch(0.88_0.1_85)]" aria-hidden />
            مرورِ آخر، پیش از جلسه
          </span>
          <h1 className="mt-4 text-4xl font-black leading-[1.2] sm:text-5xl">
            شبِ امتحان
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-8 text-white/75">
            همهٔ درسنامه، فشرده در یک برگه برای هر درس: مفهومِ هر بیت و بند، معنی،
            آرایه‌ها و نکته‌های پایانی. با حالتِ خودآزمایی ببین چه‌قدرش در ذهنت
            مانده.
          </p>

          <dl className="mt-8 grid max-w-md grid-cols-3 gap-2">
            {[
              [faNum(allReady.length), "درسِ آماده"],
              [faNum(totalConcepts), "مفهوم"],
              [faNum(doneCount), "مرور کرده‌ای"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-white/10">
                <dt className="font-serif text-2xl font-black tabular-nums">{n}</dt>
                <dd className="mt-0.5 text-[11px] font-bold text-white/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─────────────── نقشهٔ امشب ─────────────── */}
      <section aria-labelledby="plan-title" className="mt-12">
        <h2 id="plan-title" className="text-lg font-extrabold sm:text-xl">
          نقشهٔ امشب
        </h2>
        <ol className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PLAN.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="glass relative rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="font-serif text-sm font-black text-muted-foreground">
                  گام {faNum(i + 1)}
                </span>
              </div>
              <h3 className="mt-3 font-extrabold">{title}</h3>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─────────────── درس‌ها ─────────────── */}
      <section aria-labelledby="lessons-title" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="lessons-title" className="text-lg font-extrabold sm:text-xl">
              برگه‌های مرور
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">پایه‌ات را انتخاب کن و از درسِ اول شروع کن.</p>
          </div>

          <div role="tablist" aria-label="پایه" className="glass inline-flex rounded-2xl p-1">
            {grades.map((g) => {
              const selected = g.key === grade?.key;
              return (
                <button
                  key={g.key}
                  role="tab"
                  type="button"
                  id={`${tabsId}-${g.key}`}
                  aria-selected={selected}
                  aria-controls={`${tabsId}-panel`}
                  onClick={() => setActive(g.key)}
                  className={`min-h-10 rounded-xl px-4 text-sm font-bold transition-colors ${
                    selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {grade && (
          <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${grade.key}`} className="mt-6">
            <GradeProgress grade={grade} reviewed={reviewed} />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grade.lessons.map((l) => (
                <li key={l.number}>
                  <LessonCard grade={grade.key} lesson={l} done={reviewed.has(lessonId(grade.key, l.number))} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ─────────────── آزمون ─────────────── */}
      <section className="glass mt-12 flex flex-col items-start gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-gold-ink dark:text-gold">
          <FileCheck2 className="size-6" strokeWidth={1.7} aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="font-extrabold">مرورت تمام شد؟ حالا خودت را بسنج</h2>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">
            یک امتحانِ نهاییِ کامل بزن و در پایان کارنامه‌ات را با نمودارِ هر بخش ببین.
          </p>
        </div>
        <Link
          href="/exam"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
        >
          امتحاناتِ نهایی
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}

/** هلالِ ماه — یک دایره که دایرهٔ دیگری از آن بریده شده (mask)، پس به رنگِ
 *  زمینه وابسته نیست و روی هر گرادیانی درست دیده می‌شود. */
function Moon({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={`pointer-events-none ${className ?? ""}`}>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="oklch(0.98 0.04 90)" />
          <stop offset="100%" stopColor="oklch(0.84 0.12 82)" />
        </radialGradient>
        <mask id={`${id}-m`}>
          <rect width="100" height="100" fill="white" />
          <circle cx="66" cy="36" r="34" fill="black" />
        </mask>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="34" fill="oklch(0.85 0.11 85 / 0.45)" mask={`url(#${id}-m)`} filter={`url(#${id}-f)`} />
      <circle cx="50" cy="50" r="34" fill={`url(#${id}-g)`} mask={`url(#${id}-m)`} />
    </svg>
  );
}

function GradeProgress({ grade, reviewed }: { grade: ReviewGrade; reviewed: Set<string> }) {
  const ready = grade.lessons.filter((l) => l.ready);
  const done = ready.filter((l) => reviewed.has(lessonId(grade.key, l.number))).length;
  const pct = ready.length ? Math.round((done / ready.length) * 100) : 0;
  const left = ready
    .filter((l) => !reviewed.has(lessonId(grade.key, l.number)))
    .reduce((m, l) => m + minutesFor(l.concepts), 0);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold">
          {grade.book} · {faNum(done)} از {faNum(ready.length)} درس مرور شده
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden />
          {left > 0 ? `حدود ${faNum(left)} دقیقه مانده` : "همه را مرور کرده‌ای 🌙"}
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`پیشرفتِ مرورِ ${grade.book}`}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),color-mix(in_oklch,var(--color-primary)_60%,var(--color-gold)))] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LessonCard({
  grade,
  lesson,
  done,
}: {
  grade: string;
  lesson: ReviewGrade["lessons"][number];
  done: boolean;
}) {
  const badge = (
    <span
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-serif text-base font-black transition-colors ${
        done
          ? "bg-primary text-primary-foreground"
          : lesson.ready
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {done ? <Check className="size-5" strokeWidth={2.6} aria-hidden /> : faNum(lesson.number)}
    </span>
  );

  if (!lesson.ready) {
    return (
      <div className="flex h-full items-center gap-3 rounded-2xl border border-dashed border-border p-3.5 opacity-70">
        {badge}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-muted-foreground">{lesson.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">به‌زودی</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/shab-emtehan/${grade}/${lesson.number}`}
      className={`group glass flex h-full items-center gap-3 rounded-2xl p-3.5 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/40 active:scale-[0.98] ${
        done ? "border-primary/30" : ""
      }`}
    >
      {badge}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{lesson.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          درس {faNum(lesson.number)} · {faNum(lesson.concepts)} مفهوم · {faNum(minutesFor(lesson.concepts))} دقیقه
          {done && <span className="sr-only"> · مرور شده</span>}
        </p>
      </div>
      <ChevronLeft
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}
