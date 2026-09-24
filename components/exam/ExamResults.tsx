"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { animate, motion, useReducedMotion } from "motion/react";
import type { ClientExam } from "@/lib/exam/client-exam";
import type { PartResult, QuestionResult } from "@/lib/exam/result-types";
import { paletteHexColors } from "@/lib/theme/palette";

type Props = {
  exam: ClientExam;
  questionResults: Record<number, QuestionResult>;
  onRetry: () => void;
};

const statusStyles: Record<PartResult["status"], { label: string; className: string }> = {
  correct: { label: "درست", className: "bg-green-500/15 text-green-600 dark:text-green-400" },
  incorrect: { label: "نادرست", className: "bg-destructive/15 text-destructive" },
  partial: { label: "ناقص", className: "bg-gold/25 text-foreground" },
  needs_review: { label: "در انتظار بررسی", className: "bg-muted text-muted-foreground" },
};

const fa = (n: number, digits = 2) => n.toLocaleString("fa-IR", { maximumFractionDigits: digits });

/** The total ticks up from zero instead of just appearing. */
function CountUp({ value }: { value: number }) {
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
  return <>{fa(reduce ? value : shown)}</>;
}

export default function ExamResults({ exam, questionResults, onRetry }: Props) {
  const [confirmingRetry, setConfirmingRetry] = useState(false);
  const reduce = useReducedMotion();

  const sections = exam.sections.map((section) => {
    let sectionScore = 0;
    let sectionMaxScore = 0;

    const questions = section.questions.map((question) => {
      const parts = questionResults[question.number]?.parts ?? [];
      for (const part of parts) {
        sectionScore += part.score;
        sectionMaxScore += part.maxScore;
      }
      return { number: question.number, parts };
    });

    return { title: section.title, score: sectionScore, maxScore: sectionMaxScore, questions };
  });

  const totalScore = sections.reduce((s, sec) => s + sec.score, 0);
  const maxScore = sections.reduce((s, sec) => s + sec.maxScore, 0);
  const autoGradedMaxScore = sections
    .flatMap((s) => s.questions)
    .flatMap((q) => q.parts)
    .filter((p) => p.status !== "needs_review")
    .reduce((s, p) => s + p.maxScore, 0);
  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const pendingCount = sections
    .flatMap((s) => s.questions)
    .flatMap((q) => q.parts)
    .filter((p) => p.status === "needs_review").length;
  const gradedPercent = autoGradedMaxScore > 0 ? totalScore / autoGradedMaxScore : 0;
  const tone = gradedPercent >= 0.85 ? "great" : gradedPercent >= 0.5 ? "ok" : "low";

  // a strong paper earns one burst of confetti — once, on arrival
  useEffect(() => {
    if (tone !== "great" || reduce) return;
    const t = window.setTimeout(() => {
      const colors = paletteHexColors(["#22c55e"]);
      void confetti({ particleCount: 90, spread: 100, startVelocity: 42, origin: { x: 0.5, y: 0.35 }, colors, zIndex: 60 });
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ring = 2 * Math.PI * 52;

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 xs:px-5">
      <div className="text-center">
        <h1 className="text-xl font-bold xs:text-2xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">نتیجهٔ آزمون</p>
      </div>

      <div className="glass flex flex-col items-center gap-2 rounded-2xl p-6 text-center">
        <div className="relative size-36">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-muted" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={ring}
              initial={{ strokeDashoffset: reduce ? ring * (1 - percent / 100) : ring }}
              animate={{ strokeDashoffset: ring * (1 - percent / 100) }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className={
                tone === "great" ? "stroke-green-500" : tone === "ok" ? "stroke-gold" : "stroke-destructive/70"
              }
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black tabular-nums text-foreground">
              <CountUp value={totalScore} />
            </span>
            <span className="text-xs text-muted-foreground">از {fa(maxScore)}</span>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{fa(percent, 0)}٪ نمرهٔ کل</span>
        {pendingCount > 0 && (
          <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {fa(pendingCount)} بخش خودارزیابی نشده و در این نمره حساب نشده. از {fa(autoGradedMaxScore)} نمرهٔ
            تصحیح‌شده، {fa(totalScore)} گرفته‌ای.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <h2 className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
              <span>{section.title}</span>
              <span className="tabular-nums">
                {fa(section.score)} از {fa(section.maxScore)}
              </span>
            </h2>
            <div className="glass flex flex-col divide-y divide-border rounded-2xl px-4">
              {section.questions.map((q) => (
                <div key={q.number} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {q.number}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {q.parts.map((part, i) => {
                      const style = statusStyles[part.status];
                      return (
                        <span
                          key={i}
                          className={`min-h-11 rounded-lg px-2.5 py-1 text-xs font-medium leading-relaxed ${style.className}`}
                        >
                          {part.label ? `${part.label}) ` : ""}
                          {style.label} · {fa(part.score)} از {fa(part.maxScore)}
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

      {confirmingRetry ? (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 text-center">
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
          className="min-h-11 rounded-xl border-2 border-primary bg-primary/10 px-5 text-base font-semibold text-primary
            transition-colors hover:bg-primary/15"
        >
          شروع دوباره
        </button>
      )}
    </div>
  );
}
