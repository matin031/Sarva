"use client";

import type { ClientQuestion } from "@/lib/exam/client-exam";
import type { PartResult } from "@/app/exam/[examKey]/actions";
import QuestionPartRenderer from "@/components/exam/QuestionPartRenderer";
import MarkedText from "@/components/exam/MarkedText";
import ReportButton from "@/components/UI/ReportButton";
import { extractReadableText } from "@/lib/reports/snapshot";

type Props = {
  question: ClientQuestion;
  answers: Record<number, unknown>;
  onAnswerChange: (partIndex: number, value: unknown) => void;
  disabled?: boolean;
  /** When present, the question has been submitted — each part renders a
   *  "پاسخ صحیح" reveal box under it, colored by grading status. */
  partResults?: PartResult[];
  /** Called when the student self-scores an open-ended part (selfGrade). */
  onSelfGrade?: (partIndex: number, score: number) => void;
  /** کلیدِ آزمون — فقط برای گزارشِ ایراد. بدونِ آن دکمهٔ گزارش نمی‌آید،
   *  چون گزارشی که نگوید کدام آزمون بود قابلِ پیگیری نیست. */
  examKey?: string;
};

const faNum = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

/** Score options for a self-graded part: 0 up to maxScore in 0.25 steps
 *  (e.g. maxScore 1 → 0, ۰٫۲۵, ۰٫۵, ۰٫۷۵, ۱). */
function scoreOptions(maxScore: number): number[] {
  const steps = Math.round(maxScore / 0.25);
  return Array.from({ length: steps + 1 }, (_, i) => i * 0.25);
}

const statusStyles: Record<
  PartResult["status"],
  { label: string; className: string }
> = {
  correct: {
    label: "درست",
    className:
      "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  },
  incorrect: {
    label: "نادرست",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  partial: {
    label: "ناقص",
    className: "border-gold/50 bg-gold/15 text-foreground",
  },
  needs_review: {
    label: "در انتظار بررسی",
    className: "border-border bg-muted text-muted-foreground",
  },
};

/** One numbered exam question (Q1..Q41). Always just iterates
 *  question.parts in order and renders each with QuestionPartRenderer —
 *  layoutPattern is metadata only and never drives rendering, so composite
 *  and multi-subquestion questions fall out of this same loop for free. */
export default function ExamQuestionCard({
  question,
  answers,
  onAnswerChange,
  disabled,
  partResults,
  onSelfGrade,
  examKey,
}: Props) {
  const totalScore = question.parts.reduce((sum, p) => sum + p.score, 0);

  return (
    <div
      dir="rtl"
      className=" glass relative z-20 dark:shadow-none shadow bg-card! rounded-2xl p-4 xs:p-5 md:p-6"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {question.number}
          </span>
          {question.pageRef && (
            <span className="text-xs text-muted-foreground">
              ص {question.pageRef}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {totalScore} نمره
          </span>
          {examKey && (
            <ReportButton
              target={{
                area: "exam",
                targetId: `${examKey}#${question.number}`,
                /* صورتِ سؤال، نه پاسخِ دانش‌آموز. `content` یک شیءِ
                   ساختاریافته است، پس متنش باید بیرون کشیده شود وگرنه
                   snapshot می‌شود «[object Object]» و دیگر با جست‌وجوی یک
                   مصراع پیدا نمی‌شود. */
                snapshot: extractReadableText([
                  question.instruction,
                  ...question.parts.map((p) => p.content),
                ]),
                targetRef: { exam_key: examKey, question_number: question.number },
              }}
              compact
            />
          )}
        </div>
      </div>

      {question.instruction && (
        <p className="mb-3 text-base leading-relaxed text-foreground xs:text-lg">
          <MarkedText text={question.instruction} />
        </p>
      )}

      <div className="flex flex-col gap-4">
        {question.parts.map((part, partIndex) => {
          const result = partResults?.[partIndex];
          return (
            <div key={partIndex} className="flex flex-col gap-2">
              {(part.label || question.parts.length > 1) && (
                <div className="flex items-center gap-2">
                  {part.label && (
                    <span className="text-sm font-semibold text-primary">
                      {part.label})
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {part.score} نمره
                  </span>
                  {part.pageRef && (
                    <span className="text-xs text-muted-foreground">
                      · ص {part.pageRef}
                    </span>
                  )}
                </div>
              )}
              <QuestionPartRenderer
                content={part.content}
                options={part.options}
                value={answers[partIndex]}
                onChange={(v) => onAnswerChange(partIndex, v)}
                disabled={disabled}
              />
              {result &&
                (() => {
                  // A self-graded part starts as needs_review (ungraded);
                  // once the student picks a score its status flips to
                  // correct/partial/incorrect, so "graded" = not needs_review.
                  const isSelfGrade = result.selfGrade;
                  const graded = result.status !== "needs_review";
                  const style = isSelfGrade && !graded ? statusStyles.needs_review : statusStyles[result.status];
                  return (
                    <div dir="rtl" className={`flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm ${style.className}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {isSelfGrade && !graded ? "خودارزیابی" : style.label}
                        </span>
                        {(!isSelfGrade ? result.status !== "needs_review" : graded) && (
                          <span className="text-xs">
                            {faNum(result.score)} / {faNum(result.maxScore)}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed">
                        <span className="text-muted-foreground">پاسخ صحیح: </span>
                        {result.correctAnswerText}
                      </p>
                      {isSelfGrade && (
                        <div className="mt-1.5 border-t border-current/15 pt-2">
                          <p className="mb-2 text-xs text-muted-foreground">
                            پاسخت را با پاسخ صحیح مقایسه کن و به خودت نمره بده:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {scoreOptions(result.maxScore).map((v) => {
                              const selected = graded && Math.abs(result.score - v) < 0.001;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => onSelfGrade?.(partIndex, v)}
                                  className={`min-h-9 min-w-11 rounded-lg border px-3 text-sm font-semibold transition-all ${
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-card text-foreground hover:border-primary/50"
                                  }`}
                                >
                                  {faNum(v)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {result.feedback && (
                        <p className="mt-1 flex gap-1.5 border-t border-current/15 pt-1.5 leading-relaxed whitespace-pre-line">
                          <span className="shrink-0" aria-hidden>
                            ✦
                          </span>
                          <span>{result.feedback}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
