"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenText, Check, ChevronLeft, ChevronRight, Eye, Lightbulb, RotateCcw, X } from "lucide-react";
import { faNum } from "@/lib/doroos/catalog";
import type { ReviewSheet, ReviewUnit } from "@/lib/doroos/exam-night";
import { lessonId, useReviewed } from "./reviewed-store";

type Mode = "review" | "quiz";
/** در خودآزمایی: هنوز دیده نشده، دیده شد، یادم بود، یادم نبود. */
type Recall = "hidden" | "shown" | "knew" | "missed";

type Neighbour = { number: number; title: string } | null;

export default function ReviewSheetView({
  sheet,
  book,
  gradeLabel,
  prev,
  next,
}: {
  sheet: ReviewSheet;
  book: string;
  gradeLabel: string;
  prev: Neighbour;
  next: Neighbour;
}) {
  const [mode, setMode] = useState<Mode>("review");
  const [recall, setRecall] = useState<Record<number, Recall>>({});
  const { reviewed, toggle } = useReviewed();
  const id = lessonId(sheet.grade, sheet.number);
  const done = reviewed.has(id);

  const withConcept = sheet.units.filter((u) => u.concept);
  const knew = withConcept.filter((u) => recall[u.n] === "knew").length;
  const missed = withConcept.filter((u) => recall[u.n] === "missed").length;
  const answered = knew + missed;

  const restart = () => setRecall({});

  return (
    <div dir="rtl" className="container relative z-20 mx-auto max-w-3xl px-4 pt-6 pb-28 sm:pt-10">
      <nav aria-label="مسیر" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/shab-emtehan" className="transition-colors hover:text-primary">
          شب امتحان
        </Link>
        <ChevronLeft className="size-3.5" aria-hidden />
        <span>{book}</span>
      </nav>

      {/* ─────────────── سرِ برگه ─────────────── */}
      <header className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative">
          <span className="text-xs font-bold text-primary">
            فارسی {gradeLabel} · درس {faNum(sheet.number)}
          </span>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{sheet.title}</h1>
          {sheet.by && <p className="mt-1.5 text-sm text-gold-ink dark:text-gold">{sheet.by}</p>}
          {sheet.intro && <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{sheet.intro}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="حالتِ برگه" className="inline-flex rounded-2xl bg-muted p-1">
              {(
                [
                  ["review", "مرور", BookOpenText],
                  ["quiz", "خودآزمایی", Lightbulb],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors ${
                    mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-muted-foreground">
              {faNum(withConcept.length)} مفهوم
              {sheet.wrapUp.length > 0 && ` · ${faNum(sheet.wrapUp.length)} نکتهٔ پایانی`}
            </span>
          </div>
        </div>
      </header>

      {/* ─────────────── امتیازِ خودآزمایی ─────────────── */}
      {mode === "quiz" && (
        <div className="glass-pop sticky top-3 z-30 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3" aria-live="polite">
          <div className="flex flex-1 items-center gap-2 text-sm">
            <span className="font-bold">
              {faNum(answered)} از {faNum(withConcept.length)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Check className="size-3" aria-hidden /> {faNum(knew)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-bold text-destructive">
              <X className="size-3" aria-hidden /> {faNum(missed)}
            </span>
          </div>
          <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:flex">
            <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(knew / Math.max(1, withConcept.length)) * 100}%` }} />
            <div className="h-full bg-destructive/70 transition-[width] duration-500" style={{ width: `${(missed / Math.max(1, withConcept.length)) * 100}%` }} />
          </div>
          {answered > 0 && (
            <button
              type="button"
              onClick={restart}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              از نو
            </button>
          )}
        </div>
      )}

      {/* ─────────────── مفهوم‌ها ─────────────── */}
      <ol className="mt-6 flex flex-col gap-3">
        {sheet.units.map((u) => (
          <li key={u.n}>
            <UnitCard
              unit={u}
              quiz={mode === "quiz"}
              state={recall[u.n] ?? "hidden"}
              onState={(s) => setRecall((r) => ({ ...r, [u.n]: s }))}
            />
          </li>
        ))}
      </ol>

      {/* ─────────────── نکته‌های پایانی ─────────────── */}
      {sheet.wrapUp.length > 0 && (
        <section aria-labelledby="wrap-title" className="mt-10">
          <h2 id="wrap-title" className="flex items-center gap-2 text-lg font-extrabold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gold/20 text-gold-ink dark:text-gold">
              <Lightbulb className="size-4" aria-hidden />
            </span>
            نکته‌های طلایی
          </h2>
          <div className="mt-4 grid gap-3">
            {sheet.wrapUp.map((t, i) => (
              <article key={i} className="glass rounded-2xl border-s-4 border-s-gold/70 p-4 sm:p-5">
                <h3 className="font-extrabold">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-foreground/80">{t.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────── پایانِ برگه ─────────────── */}
      <div className="glass mt-10 flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex-1">
          <p className="font-extrabold">{done ? "این درس را مرور کرده‌ای" : "مرورِ این درس تمام شد؟"}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            تیکِ مرور فقط در همین مرورگر می‌ماند و پیشرفتت را در صفحهٔ شب امتحان نشان می‌دهد.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-pressed={done}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-bold transition-[transform,background-color] active:scale-95 ${
            done ? "border border-primary/40 bg-primary/10 text-primary" : "bg-primary text-primary-foreground"
          }`}
        >
          <Check className="size-4" strokeWidth={2.6} aria-hidden />
          {done ? "مرور شد" : "مرور کردم"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/shab-emtehan/${sheet.grade}/${prev.number}`}
            className="glass flex items-center gap-2 rounded-2xl p-4 text-sm transition-colors hover:border-primary/40"
          >
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">درسِ قبل</span>
              <span className="block truncate font-bold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span aria-hidden className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={`/shab-emtehan/${sheet.grade}/${next.number}`}
            className="glass flex items-center justify-end gap-2 rounded-2xl p-4 text-end text-sm transition-colors hover:border-primary/40"
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">درسِ بعد</span>
              <span className="block truncate font-bold">{next.title}</span>
            </span>
            <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        شرحِ کامل و قلمروها در{" "}
        <Link href={`/doroos/${sheet.grade}/${sheet.number}`} className="font-bold text-primary hover:underline">
          درسنامهٔ همین درس
        </Link>
        .
      </p>
    </div>
  );
}

function UnitCard({
  unit,
  quiz,
  state,
  onState,
}: {
  unit: ReviewUnit;
  quiz: boolean;
  state: Recall;
  onState: (s: Recall) => void;
}) {
  const hidden = quiz && unit.concept && state === "hidden";
  const judged = state === "knew" || state === "missed";

  return (
    <article
      className={`glass rounded-2xl p-4 transition-colors sm:p-5 ${
        quiz && state === "knew" ? "border-emerald-500/40" : quiz && state === "missed" ? "border-destructive/40" : ""
      }`}
    >
      <div className="flex gap-3">
        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted font-serif text-xs font-black text-muted-foreground">
          {faNum(unit.n)}
        </span>
        <div className="min-w-0 flex-1">
          {unit.form === "verse" ? (
            <div className="font-serif text-[17px] leading-9 font-bold sm:text-lg">
              {unit.lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-foreground/75">{unit.lines[0]}</p>
          )}
        </div>
      </div>

      {unit.concept && (
        <div className="mt-3 ps-10">
          {hidden ? (
            <button
              type="button"
              onClick={() => onState("shown")}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <Eye className="size-4" aria-hidden />
              مفهوم را به یاد بیاور، بعد ببین
            </button>
          ) : (
            <div className="rounded-xl bg-primary/8 px-3.5 py-2.5">
              <span className="text-[11px] font-bold text-primary">مفهوم</span>
              <p className="mt-0.5 text-[15px] font-bold leading-7">{unit.concept}</p>
            </div>
          )}

          {quiz && state !== "hidden" && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                aria-pressed={state === "knew"}
                onClick={() => onState("knew")}
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors ${
                  state === "knew"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                }`}
              >
                <Check className="size-4" aria-hidden /> یادم بود
              </button>
              <button
                type="button"
                aria-pressed={state === "missed"}
                onClick={() => onState("missed")}
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors ${
                  state === "missed" ? "bg-destructive text-white" : "bg-destructive/10 text-destructive hover:bg-destructive/15"
                }`}
              >
                <X className="size-4" aria-hidden /> یادم نبود
              </button>
            </div>
          )}
        </div>
      )}

      {(unit.meaning || unit.literary.length > 0) && (!quiz || judged || !unit.concept) && (
        <details className="group mt-3 ps-10">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-lg text-[13px] font-bold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronLeft className="size-3.5 transition-transform group-open:-rotate-90" aria-hidden />
            معنی{unit.literary.length > 0 ? " و آرایه‌ها" : ""}
          </summary>
          <div className="mt-2 space-y-2 text-sm leading-7">
            {unit.meaning && <p className="text-foreground/85">{unit.meaning}</p>}
            {unit.literary.length > 0 && (
              <ul className="space-y-1 border-s-2 border-gold/50 ps-3 text-[13px] text-foreground/75">
                {unit.literary.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}
    </article>
  );
}
