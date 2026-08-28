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
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div className="aruzr-stat" data-primary={primary ? "true" : "false"}>
      <div className="aruzr-stat-value">{value}</div>
      <div className="aruzr-stat-label">{label}</div>
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
      <div className="aruzr-card aruzr-surface p-6 text-center sm:p-8">
        <span className="aruzr-badge">{isSession ? "پایانِ نشست" : "مصراع تمام شد"}</span>

        <h2 className="mt-4 text-xl font-black text-[color:var(--aruzr-text)] sm:text-2xl">
          {isSession ? "این نشست را کامل کردی" : "این مصراع را کامل تقطیع کردی"}
        </h2>

        {question ? (
          <div className="aruzr-panel mt-5" data-state="open">
            <p className="aruzr-result-text" dir="rtl" lang="fa">
              {question.previewText}
            </p>
            {question.meter || question.attribution ? (
              <p className="aruzr-muted mt-2 text-xs">
                {[question.meter, question.attribution].filter(Boolean).join(" — ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat primary label="زمانِ دورِ موفق" value={seconds(questionStats.successfulRunTimeMs)} />
          <Stat primary label="زمانِ فعالِ مصراع" value={seconds(questionActiveTimeMs)} />
          <Stat label="پاسخِ نادرست" value={fa(questionStats.wrongChoices)} />
          <Stat label="وقتِ تمام‌شده" value={fa(questionStats.timeouts)} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="تلاش‌ها" value={fa(questionStats.attemptCount)} />
          <Stat label="بلندترین زنجیره" value={fa(questionStats.bestStreak)} />
          <Stat label="میانگینِ زمانِ پاسخ" value={seconds(average)} />
          <Stat label="دقت پاسخ‌ها" value={percent(accuracy(questionStats))} />
        </div>

        {isSession ? (
          <div className="aruzr-panel mt-6 p-4">
            <h3 className="aruzr-muted text-xs font-bold">کلِ این نشست</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="مصراع‌های کامل‌شده"
                value={`${fa(sessionStats.questionsCompleted)} / ${fa(questionCount)}`}
              />
              <Stat label="پاسخ‌های درست" value={fa(sessionStats.totalCorrectInputs)} />
              <Stat
                label="نادرست و وقت‌تمام"
                value={fa(sessionStats.totalWrongChoices + sessionStats.totalTimeouts)}
              />
              <Stat label="زمانِ فعالِ کل" value={seconds(sessionActiveTimeMs)} />
            </div>
          </div>
        ) : (
          <p className="aruzr-subtle mt-4 text-xs">
            مصراعِ {fa(questionNumber)} از {fa(questionCount)}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {isSession ? null : (
            <button type="button" onClick={onNext} className="aruzr-cta">
              مصراعِ بعدی
            </button>
          )}
          <button type="button" onClick={onRetry} className="aruzr-ghost-btn">
            همین را دوباره
          </button>
          <button type="button" onClick={onBackToIntro} className="aruzr-ghost-btn">
            نشستِ تازه
          </button>
        </div>

        <Link
          href="/game"
          className="aruzr-subtle mt-5 inline-block text-xs transition-colors hover:text-[color:var(--aruzr-accent)]"
        >
          بازگشت به کهکشانِ بازی‌ها
        </Link>
      </div>
    </div>
  );
}
