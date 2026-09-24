"use client";

import type { ClientQuestion } from "@/lib/exam/client-exam";
import type { PartResult } from "@/lib/exam/result-types";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import QuestionPartRenderer from "@/components/exam/QuestionPartRenderer";
import AnswerFeedback from "@/components/exam/AnswerFeedback";
import type { QuestionOutcome } from "@/components/exam/celebrate";
import HighlightedText from "@/components/exam/HighlightedText";
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
  /** Set only for the render right after «ثبت پاسخ»: drives the one-off
   *  glow/shake and the «+نمره» chip. Revisiting a question leaves it unset. */
  freshOutcome?: QuestionOutcome;
};

const faNum = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

/* چرخشِ کوتاهِ «نه» — کوچک و یک‌بار، تا تنبیه حس نشود. */
const shake = { x: [0, -7, 7, -5, 5, -2, 0], transition: { duration: 0.42 } };
const glow = {
  boxShadow: [
    "0 0 0 0 rgba(34,197,94,0)",
    "0 0 0 6px rgba(34,197,94,0.35)",
    "0 0 0 14px rgba(34,197,94,0)",
  ],
  transition: { duration: 0.9, ease: "easeOut" as const },
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
  freshOutcome,
}: Props) {
  const reduce = useReducedMotion();
  const totalScore = question.parts.reduce((sum, p) => sum + p.score, 0);
  const earned = partResults?.reduce((sum, p) => sum + (p.status === "needs_review" ? 0 : p.score), 0) ?? 0;
  const allGraded = partResults?.every((p) => p.status !== "needs_review") ?? false;
  const fresh = freshOutcome !== undefined;
  const cardAnim = !fresh || reduce ? undefined : freshOutcome === "correct" ? glow : freshOutcome === "wrong" ? shake : undefined;

  return (
    <motion.div
      dir="rtl"
      animate={cardAnim}
      className={`glass relative z-20 dark:shadow-none shadow bg-card! rounded-2xl p-4 xs:p-5 md:p-6 transition-colors duration-500 ${
        freshOutcome === "correct" ? "ring-1 ring-green-500/40" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {question.number}
          </span>
          {question.pageRef && (
            <span className="text-xs text-muted-foreground">
              ص {faNum(question.pageRef)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="relative">
            {partResults && allGraded ? (
              <motion.span
                key="earned"
                initial={fresh && !reduce ? { scale: 0.6, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                  earned >= totalScore
                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                    : earned > 0
                      ? "bg-gold/20 text-foreground"
                      : "bg-destructive/10 text-destructive"
                }`}
              >
                {faNum(earned)} از {faNum(totalScore)}
              </motion.span>
            ) : (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {faNum(totalScore)} نمره
              </span>
            )}
            <AnimatePresence>
              {fresh && !reduce && earned > 0 && (
                <motion.span
                  key="plus"
                  initial={{ opacity: 0, y: 4, scale: 0.8 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -26, scale: 1 }}
                  transition={{ duration: 1.3, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
                  className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-black text-green-600 dark:text-green-400"
                  aria-hidden
                  dir="ltr"
                >
                  +{faNum(earned)}
                </motion.span>
              )}
            </AnimatePresence>
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
          <HighlightedText text={question.instruction} />
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
                    {faNum(part.score)} نمره
                  </span>
                  {part.pageRef && (
                    <span className="text-xs text-muted-foreground">
                      · ص {faNum(part.pageRef)}
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
              {result && (
                <AnswerFeedback
                  result={result}
                  fresh={fresh}
                  index={partIndex}
                  onSelfGrade={(score) => onSelfGrade?.(partIndex, score)}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
