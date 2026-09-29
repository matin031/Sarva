"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { animate, motion, useReducedMotion } from "motion/react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Award,
  BarChart3,
  Check,
  ChevronLeft,
  CircleDashed,
  Clock3,
  ListChecks,
  MoonStar,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Minus,
} from "lucide-react";
import type { ClientExam } from "@/lib/exam/client-exam";
import type { PartResult, QuestionResult } from "@/lib/exam/result-types";
import { paletteHexColors } from "@/lib/theme/palette";

type Props = {
  exam: ClientExam;
  questionResults: Record<number, QuestionResult>;
  onRetry: () => void;
};

type Status = PartResult["status"];

/**
 * کارنامهٔ آزمون.
 *
 * ⚠️ رنگ‌های وضعیت *رزرو*اند: سبز، طلایی، قرمز و خاکستری فقط برای «درست،
 * ناقص، نادرست، در انتظار» به کار می‌روند و هیچ‌جا بی‌برچسب نمی‌آیند — کنارِ
 * هر رنگ یک آیکون و یک واژه هست، تا کسی که رنگ‌ها را از هم تشخیص نمی‌دهد
 * چیزی از دست ندهد. نمودارِ بخش‌ها تک‌رنگ (فیروزه‌ای) است، چون آنجا اندازه
 * معنا دارد و نه هویت.
 */
const STATUS: Record<
  Status,
  { label: string; short?: string; color: string; ink: string; soft: string; icon: typeof Check }
> = {
  correct: {
    label: "درست",
    color: "#16a34a",
    ink: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/12",
    icon: Check,
  },
  partial: {
    label: "ناقص",
    color: "var(--color-gold)",
    ink: "text-gold-ink dark:text-gold",
    soft: "bg-gold/20",
    icon: Minus,
  },
  incorrect: {
    label: "نادرست",
    color: "var(--color-destructive)",
    ink: "text-destructive dark:text-red-400",
    soft: "bg-destructive/12",
    icon: X,
  },
  needs_review: {
    label: "در انتظار بررسی",
    short: "در انتظار",
    color: "color-mix(in oklch, var(--muted-foreground) 45%, var(--border))",
    ink: "text-muted-foreground",
    soft: "bg-muted",
    icon: CircleDashed,
  },
};

const STATUS_ORDER: Status[] = ["correct", "partial", "incorrect", "needs_review"];

const fa = (n: number, digits = 2) => n.toLocaleString("fa-IR", { maximumFractionDigits: digits });

/** رتبهٔ کیفی — روی درصدِ بخشِ *تصحیح‌شده*، تا سؤالِ در انتظارِ بررسی کسی را
 *  «ضعیف» نشان ندهد. */
function band(p: number) {
  if (p >= 0.9) return { label: "ممتاز", note: "آماده‌ای؛ فقط مرورِ سبک.", tone: "great" as const };
  if (p >= 0.75) return { label: "خیلی خوب", note: "چند نکتهٔ کوچک تا نمرهٔ کامل.", tone: "great" as const };
  if (p >= 0.5) return { label: "قابلِ قبول", note: "پایه محکم است؛ بخش‌های ضعیف را مرور کن.", tone: "ok" as const };
  return { label: "نیاز به تلاشِ بیشتر", note: "از بخشِ ضعیف‌تر شروع کن و دوباره بسنج.", tone: "low" as const };
}

/** وضعیتِ یک سؤالِ چندبخشی در یک کلمه. */
function questionStatus(parts: PartResult[], score: number, max: number): Status {
  if (!parts.length) return "needs_review";
  if (parts.some((p) => p.status === "needs_review")) return "needs_review";
  if (score >= max) return "correct";
  if (score <= 0) return "incorrect";
  return "partial";
}

/** عدد از صفر بالا می‌رود، نه اینکه یک‌باره ظاهر شود. */
function CountUp({ value, digits = 2 }: { value: number; digits?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, {
      duration: Math.min(1.6, 0.5 + value / 15),
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v * 4) / 4),
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{fa(reduce ? value : shown, digits)}</>;
}

export default function ExamResults({ exam, questionResults, onRetry }: Props) {
  const [confirmingRetry, setConfirmingRetry] = useState(false);
  const reduce = useReducedMotion();

  const data = useMemo(() => {
    const sections = exam.sections.map((section) => {
      let score = 0;
      let max = 0;
      const questions = section.questions.map((question) => {
        const parts = questionResults[question.number]?.parts ?? [];
        let qs = 0;
        let qm = 0;
        for (const part of parts) {
          qs += part.score;
          qm += part.maxScore;
        }
        score += qs;
        max += qm;
        return { number: question.number, parts, score: qs, max: qm, status: questionStatus(parts, qs, qm) };
      });
      return { title: section.title, score, max, pct: max > 0 ? score / max : 0, questions };
    });

    const parts = sections.flatMap((s) => s.questions).flatMap((q) => q.parts);
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, parts.filter((p) => p.status === s).length])) as Record<
      Status,
      number
    >;
    const totalScore = sections.reduce((n, s) => n + s.score, 0);
    const maxScore = sections.reduce((n, s) => n + s.max, 0);
    const gradedMax = parts.filter((p) => p.status !== "needs_review").reduce((n, p) => n + p.maxScore, 0);
    const graded = sections.filter((s) => s.max > 0 && s.questions.some((q) => q.status !== "needs_review"));
    const sorted = [...graded].sort((a, b) => b.pct - a.pct);

    return {
      sections,
      counts,
      totalScore,
      maxScore,
      gradedMax,
      percent: maxScore > 0 ? totalScore / maxScore : 0,
      gradedPercent: gradedMax > 0 ? totalScore / gradedMax : 0,
      best: sorted.length > 1 ? sorted[0] : null,
      worst: sorted.length > 1 && sorted[sorted.length - 1].pct < sorted[0].pct ? sorted[sorted.length - 1] : null,
      questions: sections.flatMap((s) => s.questions.map((q) => ({ ...q, section: s.title }))),
    };
  }, [exam, questionResults]);

  const { sections, counts, totalScore, maxScore, gradedMax, percent, gradedPercent, best, worst, questions } = data;
  const verdict = band(gradedPercent);
  const pending = counts.needs_review;
  const outOf20 = maxScore > 0 && maxScore !== 20 ? (totalScore / maxScore) * 20 : null;
  const today = useMemo(
    () => new Date().toLocaleDateString("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }),
    [],
  );

  // کارنامهٔ قوی یک بار — همان لحظهٔ رسیدن — کاغذرنگ می‌گیرد.
  useEffect(() => {
    if (verdict.tone !== "great" || reduce) return;
    const t = window.setTimeout(() => {
      const colors = paletteHexColors(["#22c55e"]);
      void confetti({ particleCount: 90, spread: 100, startVelocity: 42, origin: { x: 0.5, y: 0.35 }, colors, zIndex: 60 });
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toneColor =
    verdict.tone === "great" ? STATUS.correct.color : verdict.tone === "ok" ? "var(--color-gold)" : "var(--color-destructive)";

  return (
    <div dir="rtl" className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 xs:px-5 sm:py-8">
      {/* ─────────────── سرِ کارنامه ─────────────── */}
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative isolate overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-[0_30px_70px_-40px_color-mix(in_oklch,var(--primary)_55%,black)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(ellipse at 100% 0%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 55%), radial-gradient(ellipse at 0% 100%, color-mix(in oklch, ${toneColor} 14%, transparent), transparent 60%)`,
          }}
        />
        {/* نوارِ بالای کارنامه */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 text-xs sm:px-7">
          <span className="inline-flex items-center gap-1.5 font-bold text-primary">
            <Award className="size-4" aria-hidden />
            کارنامهٔ آزمون
          </span>
          <span className="text-muted-foreground">{today}</span>
        </div>

        <div className="grid items-center gap-6 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 sm:p-7">
          <ScoreGauge percent={percent} total={totalScore} max={maxScore} color={toneColor} />

          <div className="min-w-0 text-center sm:text-start">
            <h1 className="text-xl font-black leading-snug xs:text-2xl">{exam.title}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold text-white shadow-sm"
                style={{ background: toneColor }}
              >
                <Award className="size-4" aria-hidden />
                {verdict.label}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold tabular-nums">
                {fa(Math.round(percent * 100), 0)}٪ نمرهٔ کل
              </span>
              {outOf20 !== null && (
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold tabular-nums">
                  معادلِ {fa(outOf20, 2)} از ۲۰
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{verdict.note}</p>

            <dl className="mt-5 grid grid-cols-2 gap-2 xs:grid-cols-4">
              {STATUS_ORDER.map((s) => {
                const { label, short, ink, soft, icon: Icon } = STATUS[s];
                return (
                  <div key={s} className={`rounded-2xl px-3 py-2.5 ${soft}`}>
                    <dt className={`flex items-center gap-1 text-[11px] font-bold ${ink}`}>
                      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
                      <span title={label}>{short ?? label}</span>
                    </dt>
                    <dd className="mt-0.5 text-xl font-black tabular-nums text-foreground">{fa(counts[s])}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        {pending > 0 && (
          <p className="mx-5 mb-5 flex items-start gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-xs leading-6 text-muted-foreground sm:mx-7 sm:mb-7">
            <Clock3 className="mt-1 size-3.5 shrink-0" aria-hidden />
            <span>
              {fa(pending)} بخش خودارزیابی نشده و در این نمره حساب نشده. از {fa(gradedMax)} نمرهٔ تصحیح‌شده،{" "}
              {fa(totalScore)} گرفته‌ای.
            </span>
          </p>
        )}
      </motion.header>

      {/* ─────────────── نمودارها ─────────────── */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card icon={BarChart3} title="عملکرد در هر بخش" subtitle="درصدِ نمره از سقفِ هر بخش">
          <ul className="flex flex-col gap-3.5">
            {sections.map((s, i) => (
              <li key={s.title} title={`${s.title}: ${fa(s.score)} از ${fa(s.max)}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-bold">{s.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    <span className="font-extrabold text-foreground">{fa(Math.round(s.pct * 100), 0)}٪</span> ·{" "}
                    {fa(s.score)} از {fa(s.max)}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        "linear-gradient(270deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 65%, var(--color-gold)))",
                    }}
                    initial={{ width: reduce ? `${s.pct * 100}%` : 0 }}
                    animate={{ width: `${s.pct * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card icon={Target} title="ترکیبِ پاسخ‌ها" subtitle="همهٔ بخش‌های سؤال‌ها">
          <StatusDonut counts={counts} />
        </Card>
      </div>

      <Card icon={ListChecks} title="سؤال به سؤال" subtitle="درصدِ نمرهٔ هر سؤال؛ رنگ، وضعیتِ آن است">
        <QuestionChart questions={questions} />
      </Card>

      {/* ─────────────── قوت و ضعف ─────────────── */}
      {(best || worst) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {best && (
            <Insight
              icon={TrendingUp}
              tone="good"
              label="نقطهٔ قوت"
              title={best.title}
              body={`${fa(Math.round(best.pct * 100), 0)}٪ نمرهٔ این بخش را گرفته‌ای.`}
            />
          )}
          {worst && (
            <Insight
              icon={TrendingDown}
              tone="bad"
              label="جای کار"
              title={worst.title}
              body={`${fa(Math.round(worst.pct * 100), 0)}٪ — مرورِ این بخش بیشترین اثر را روی نمره دارد.`}
            />
          )}
        </div>
      )}

      {/* ─────────────── ریزِ نمره‌ها ─────────────── */}
      <details className="group glass rounded-3xl">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-extrabold [&::-webkit-details-marker]:hidden">
          ریزِ نمره‌ها
          <ChevronLeft className="size-4 text-muted-foreground transition-transform group-open:-rotate-90" aria-hidden />
        </summary>
        <div className="flex flex-col gap-4 px-4 pb-5">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-2">
              <h2 className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
                <span>{section.title}</span>
                <span className="tabular-nums">
                  {fa(section.score)} از {fa(section.max)}
                </span>
              </h2>
              <div className="flex flex-col divide-y divide-border px-1">
                {section.questions.map((q) => (
                  <div key={q.number} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {fa(q.number)}
                    </span>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {q.parts.map((part, i) => {
                        const st = STATUS[part.status];
                        return (
                          <span
                            key={i}
                            className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium leading-relaxed ${st.soft} ${st.ink}`}
                          >
                            <st.icon className="size-3" strokeWidth={2.6} aria-hidden />
                            {part.label ? `${part.label}) ` : ""}
                            {st.label} · {fa(part.score)} از {fa(part.maxScore)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* ─────────────── گام بعد ─────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/shab-emtehan"
          className="glass group flex items-center gap-3 rounded-2xl p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MoonStar className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">مرورِ شب امتحان</span>
            <span className="block text-xs text-muted-foreground">مفهوم‌ها و نکته‌های هر درس، فشرده</span>
          </span>
          <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </Link>
        <Link
          href="/exam"
          className="glass group flex items-center gap-3 rounded-2xl p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-gold/20 text-gold-ink dark:text-gold">
            <ListChecks className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">آزمون‌های دیگر</span>
            <span className="block text-xs text-muted-foreground">یک امتحانِ نهاییِ دیگر بزن</span>
          </span>
          <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      </div>

      {confirmingRetry ? (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-foreground">
            با شروع دوباره، همهٔ پاسخ‌ها و نتیجهٔ این آزمون پاک می‌شود. مطمئنید؟
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingRetry(false)}
              className="min-h-11 flex-1 rounded-xl border border-border bg-card text-sm font-medium"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 flex-1 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground"
            >
              بله، پاک شود
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingRetry(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 px-5 text-base font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <RotateCcw className="size-4" aria-hidden />
          شروع دوباره
        </button>
      )}
    </div>
  );
}

/* ───────────────────────────── قطعه‌ها ───────────────────────────── */

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Check;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-5">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-extrabold">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function ScoreGauge({ percent, total, max, color }: { percent: number; total: number; max: number; color: string }) {
  const reduce = useReducedMotion();
  const r = 52;
  const ring = 2 * Math.PI * r;
  const offset = ring * (1 - Math.min(1, Math.max(0, percent)));

  return (
    <div className="relative mx-auto size-44 sm:size-48" role="img" aria-label={`نمره ${fa(total)} از ${fa(max)}`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="11" className="stroke-muted" />
        {/* ‌تیک‌های ربعی، مثلِ صفحهٔ یک سنجه */}
        {[0, 0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={60 + (r + 9) * Math.cos(t * 2 * Math.PI)}
            y1={60 + (r + 9) * Math.sin(t * 2 * Math.PI)}
            x2={60 + (r + 12) * Math.cos(t * 2 * Math.PI)}
            y2={60 + (r + 12) * Math.sin(t * 2 * Math.PI)}
            stroke="var(--border)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={ring}
          initial={{ strokeDashoffset: reduce ? offset : ring }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold text-muted-foreground">نمره</span>
        <span className="text-4xl font-black tabular-nums leading-tight text-foreground">
          <CountUp value={total} />
        </span>
        <span className="text-xs text-muted-foreground">از {fa(max)}</span>
      </div>
    </div>
  );
}

function StatusDonut({ counts }: { counts: Record<Status, number> }) {
  const data = STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => ({ key: s, name: STATUS[s].label, value: counts[s] }));
  const total = data.reduce((n, d) => n + d.value, 0);
  const correctPct = total ? Math.round((counts.correct / total) * 100) : 0;

  if (!total) {
    return <p className="py-10 text-center text-sm text-muted-foreground">پاسخی ثبت نشده.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative size-40"
        role="img"
        aria-label={data.map((d) => `${d.name} ${fa(d.value)}`).join("، ")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={900}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={STATUS[d.key].color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums">{fa(correctPct, 0)}٪</span>
          <span className="text-[11px] font-bold text-muted-foreground">کاملاً درست</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: STATUS[d.key].color }} aria-hidden />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ms-auto font-bold tabular-nums">{fa(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { payload: { name: string; value: number } }[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-[12px] leading-6 shadow-lg">
      <p className="font-bold">{name}</p>
      <p className="text-muted-foreground">
        {fa(value)} بخش · {fa(Math.round((value / total) * 100), 0)}٪
      </p>
    </div>
  );
}

type QuestionPoint = {
  number: number;
  section: string;
  score: number;
  max: number;
  status: Status;
};

function QuestionChart({ questions }: { questions: QuestionPoint[] }) {
  const data = questions.map((q) => ({
    ...q,
    label: fa(q.number),
    // سؤالِ در انتظار یک ستونِ کوتاهِ خاکستری می‌گیرد تا جایش خالی نماند.
    // سؤالِ صفر هم یک خُردهٔ قرمز می‌گیرد: ستونِ نامرئی نه دیده می‌شود و نه
    // راهنمای شناورش در دسترس است. عددِ واقعی در همان راهنما می‌آید.
    pct: q.status === "needs_review" ? 8 : Math.max(3, q.max > 0 ? Math.round((q.score / q.max) * 100) : 0),
  }));
  const present = STATUS_ORDER.filter((s) => questions.some((q) => q.status === s));

  return (
    <>
      {/* ⚠️ `dir="ltr"` و `reversed`: Recharts راست‌به‌چپ نمی‌فهمد؛ محور را خودمان
          برمی‌گردانیم تا سؤالِ اول سمتِ راست باشد، همان‌جا که خواننده شروع می‌کند. */}
      <div
        dir="ltr"
        className="h-52 w-full"
        role="img"
        aria-label={`نمرهٔ ${fa(questions.length)} سؤال، سؤال به سؤال`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }} barCategoryGap={questions.length > 24 ? 2 : "18%"}>
            <XAxis
              reversed
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={6}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickLine={false}
              axisLine={false}
              width={34}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => `${fa(v)}٪`}
            />
            <Tooltip cursor={{ fill: "var(--foreground)", opacity: 0.05 }} content={<QuestionTooltip />} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={800}>
              {data.map((d) => (
                <Cell key={d.number} fill={STATUS[d.status].color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
        {present.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: STATUS[s].color }} aria-hidden />
            {STATUS[s].label}
          </span>
        ))}
      </div>
    </>
  );
}

function QuestionTooltip({ active, payload }: { active?: boolean; payload?: { payload: QuestionPoint }[] }) {
  if (!active || !payload?.length) return null;
  const q = payload[0].payload;
  const st = STATUS[q.status];
  return (
    <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-[12px] leading-6 shadow-lg">
      <p className="font-bold">سؤال {fa(q.number)}</p>
      <p className="text-muted-foreground">{q.section}</p>
      <p className={`font-bold ${st.ink}`}>
        {st.label} · {fa(q.score)} از {fa(q.max)}
      </p>
    </div>
  );
}

function Insight({
  icon: Icon,
  tone,
  label,
  title,
  body,
}: {
  icon: typeof Check;
  tone: "good" | "bad";
  label: string;
  title: string;
  body: string;
}) {
  const good = tone === "good";
  return (
    <div className="glass flex items-start gap-3 rounded-2xl p-4">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          good ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive dark:text-red-400"
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={`text-[11px] font-bold ${good ? "text-emerald-700 dark:text-emerald-300" : "text-destructive dark:text-red-400"}`}>{label}</p>
        <p className="mt-0.5 truncate text-sm font-extrabold">{title}</p>
        <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
