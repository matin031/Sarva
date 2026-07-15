"use client";

import type { ClientQuestion } from "@/lib/exam/client-exam";
import type { QuestionResult } from "@/app/exam/[examKey]/actions";

type FlatQuestion = { sectionTitle: string; question: ClientQuestion };

type Props = {
  flatQuestions: FlatQuestion[];
  currentIndex: number;
  questionResults: Record<number, QuestionResult>;
  onJump: (index: number) => void;
  onClose: () => void;
};

type NavStatus = "correct" | "incorrect" | "mixed" | "pending-review" | "unanswered";

function questionStatus(question: ClientQuestion, results: Record<number, QuestionResult>): NavStatus {
  const result = results[question.number];
  if (!result) return "unanswered";
  const graded = result.parts.map((p) => p.status).filter((s) => s !== "needs_review");
  if (graded.length === 0) return "pending-review";
  if (graded.every((s) => s === "correct")) return "correct";
  if (graded.every((s) => s === "incorrect")) return "incorrect";
  return "mixed";
}

const statusClasses: Record<NavStatus, string> = {
  correct: "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-400",
  incorrect: "bg-destructive/15 border-destructive/50 text-destructive",
  mixed: "bg-gold/20 border-gold/60 text-foreground",
  "pending-review": "bg-muted border-border text-muted-foreground",
  unanswered: "bg-card border-border text-foreground/70",
};

const legend: { status: NavStatus; label: string }[] = [
  { status: "correct", label: "درست" },
  { status: "incorrect", label: "نادرست" },
  { status: "mixed", label: "ترکیبی" },
  { status: "pending-review", label: "در انتظار بررسی" },
  { status: "unanswered", label: "پاسخ‌داده‌نشده" },
];

/** Bottom-sheet grid of every question, colored by grading status, so a
 *  41-question exam doesn't force strictly linear سؤال قبلی/بعدی
 *  navigation — tap any number to jump straight there. */
export default function ExamQuestionNav({ flatQuestions, currentIndex, questionResults, onJump, onClose }: Props) {
  return (
    <div dir="rtl" className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="glass max-h-[75vh] w-full overflow-y-auto rounded-t-3xl p-4 xs:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">فهرست سؤالات</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-11 items-center justify-center rounded-full text-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {legend.map(({ status, label }) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-full border ${statusClasses[status]}`} />
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-2 xs:grid-cols-7">
          {flatQuestions.map(({ question }, index) => {
            const status = questionStatus(question, questionResults);
            const isCurrent = index === currentIndex;
            return (
              <button
                key={question.number}
                type="button"
                onClick={() => {
                  onJump(index);
                  onClose();
                }}
                className={`flex min-h-11 items-center justify-center rounded-xl border-2 text-sm font-medium
                  transition-colors ${statusClasses[status]} ${
                    isCurrent ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                  }`}
              >
                {question.number}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
