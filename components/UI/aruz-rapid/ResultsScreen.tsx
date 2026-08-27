"use client";

import Link from "next/link";
import {
  accuracy,
  averageResponseTime,
  type QuestionStats,
  type SessionStats,
} from "@/lib/aruz-rapid/machine";
import type { RapidAruzQuestion } from "@/lib/aruz-rapid/types";

const fa = (n: number) => n.toLocaleString("fa-IR");

function seconds(ms: number | null): string {
  if (ms === null) return "—";
  // زیرِ یک ثانیه، «۰ ثانیه» چیزی نمی‌گوید؛ میلی‌ثانیه گویاتر است.
  if (ms < 1000) return `${fa(Math.round(ms))} میلی‌ثانیه`;
  return `${fa(Math.round(ms / 100) / 10)} ثانیه`;
}

function percent(value: number): string {
  return `${fa(Math.round(value * 100))}٪`;
}

function Stat({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-center ${
        strong ? "border-primary/40 bg-primary/10" : "border-border bg-card"
      }`}
    >
      <div className={`text-lg font-black ${strong ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * صفحهٔ نتیجه.
 *
 * هیچ عددی اینجا محاسبه نمی‌شود جز قالب‌بندی؛ همه از آمارِ reducer می‌آید.
 * این صفحه یک صفحهٔ معمولیِ سروا است — نه بازیِ تمام‌صفحه — پس سربرگ و
 * پابرگِ سایت دوباره سرِ جایشان برمی‌گردند.
 */
export default function ResultsScreen({
  kind,
  question,
  questionStats,
  questionActiveTimeMs,
  sessionStats,
  sessionActiveTimeMs,
  questionNumber,
  questionCount,
  onNext,
  onRetry,
  onBackToIntro,
}: {
  kind: "question" | "session";
  question: RapidAruzQuestion | null;
  questionStats: QuestionStats;
  questionActiveTimeMs: number;
  sessionStats: SessionStats;
  sessionActiveTimeMs: number;
  questionNumber: number;
  questionCount: number;
  onNext: () => void;
  onRetry: () => void;
  onBackToIntro: () => void;
}) {
  const isSession = kind === "session";
  const average = averageResponseTime(questionStats);

  return (
    <div dir="rtl" className="container mx-auto max-w-2xl py-8 sm:py-12">
      <div className="glass relative z-20 rounded-3xl p-6 text-center sm:p-8">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/15 text-2xl">
          {isSession ? "🏁" : "✓"}
        </div>
        <h2 className="text-xl font-black text-primary sm:text-2xl">
          {isSession ? "نشست تمام شد" : "این را کامل تقطیع کردی"}
        </h2>

        {question ? (
          <p className="aruzr-result-text mt-4" dir="rtl" lang="fa">
            {question.previewText}
          </p>
        ) : null}

        {question?.explanation ? (
          <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat
            strong
            label="زمانِ دورِ موفق"
            value={seconds(questionStats.successfulRunTimeMs)}
          />
          <Stat strong label="زمانِ فعالِ این سؤال" value={seconds(questionActiveTimeMs)} />
          <Stat label="پاسخ‌های نادرست" value={fa(questionStats.wrongChoices)} />
          <Stat label="وقت‌های تمام‌شده" value={fa(questionStats.timeouts)} />
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="تلاش‌ها" value={fa(questionStats.attemptCount)} />
          <Stat label="بلندترین زنجیره" value={fa(questionStats.bestStreak)} />
          <Stat label="میانگینِ زمانِ پاسخ" value={seconds(average)} />
          <Stat label="دقت پاسخ‌ها" value={percent(accuracy(questionStats))} />
        </div>

        {isSession ? (
          <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-sm font-bold text-foreground">کلِ این نشست</h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat
                label="سؤال‌های کامل‌شده"
                value={`${fa(sessionStats.questionsCompleted)} / ${fa(questionCount)}`}
              />
              <Stat label="پاسخ‌های درست" value={fa(sessionStats.totalCorrectInputs)} />
              <Stat label="نادرست و وقت‌تمام" value={fa(sessionStats.totalWrongChoices + sessionStats.totalTimeouts)} />
              <Stat label="زمانِ فعالِ کل" value={seconds(sessionActiveTimeMs)} />
            </div>
          </div>
        ) : (
          <p className="mt-5 text-xs text-muted-foreground">
            سؤالِ {fa(questionNumber)} از {fa(questionCount)}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {isSession ? null : (
            <button
              type="button"
              onClick={onNext}
              className="min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground transition-[transform,border-color,filter,color] hover:brightness-90 active:scale-95"
            >
              سؤالِ بعدی
            </button>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-xl border border-border bg-card px-6 text-sm transition-[transform,border-color,filter,color] hover:border-primary/50 active:scale-95"
          >
            همین را دوباره
          </button>
          <button
            type="button"
            onClick={onBackToIntro}
            className="min-h-11 rounded-xl border border-border bg-card px-6 text-sm text-muted-foreground transition-[transform,border-color,filter,color] hover:border-primary/50 active:scale-95"
          >
            نشستِ تازه
          </button>
          <Link
            href="/game"
            className="min-h-11 rounded-xl px-4 text-sm leading-[2.75rem] text-muted-foreground transition-[transform,border-color,filter,color] hover:text-primary"
          >
            کهکشانِ بازی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
