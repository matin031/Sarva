"use client";

import type { QuestionPhase } from "@/lib/grammar-circuit/reducer";

/** نوارِ کنترل — جایی که دانش‌آموز *عمداً* پاسخش را ثبت می‌کند.
 *
 *  دکمه تا وقتی همهٔ خانه‌ها پر نشده‌اند غیرفعال است، و بازی هیچ‌وقت خودکار
 *  بررسی نمی‌کند: فشردنِ آگاهانه هم فرصتِ مرورِ نهایی می‌دهد و هم لحظهٔ
 *  بررسی را معنادار می‌کند. */
export default function ValidationBar({
  phase,
  filled,
  required,
  onValidate,
  onCorrect,
  onNext,
  isLastQuestion,
}: {
  phase: QuestionPhase;
  filled: number;
  required: number;
  onValidate: () => void;
  onCorrect: () => void;
  onNext: () => void;
  isLastQuestion: boolean;
}) {
  const remaining = required - filled;

  return (
    <div className="gc-controls" style={{ flex: "0 0 auto" }}>
      {(phase === "arranging" || phase === "readyToValidate") && (
        <>
          <span className="gc-controls-hint">
            {remaining > 0
              ? `${remaining.toLocaleString("fa-IR")} خانه هنوز خالی است`
              : "همهٔ خانه‌ها پر شد — می‌توانی اتصال را بررسی کنی"}
          </span>
          <button
            type="button"
            className="gc-btn gc-btn-primary"
            disabled={phase !== "readyToValidate"}
            onClick={onValidate}
          >
            بررسی اتصال
          </button>
        </>
      )}

      {phase === "validating" && (
        <span className="gc-controls-hint gc-controls-scanning">
          در حالِ بررسیِ مدار…
        </span>
      )}

      {phase === "failureSequence" && (
        <span className="gc-controls-hint">مدار بسته نشد.</span>
      )}

      {phase === "failureReview" && (
        <>
          <span className="gc-controls-hint">
            خانه‌های قرمز درست نیستند. اصلاحشان کن و دوباره بررسی کن.
          </span>
          <button type="button" className="gc-btn gc-btn-primary" onClick={onCorrect}>
            اصلاح پاسخ
          </button>
        </>
      )}

      {(phase === "successCurrent" || phase === "successReward") && (
        <span className="gc-controls-hint gc-controls-success">مدار کامل شد!</span>
      )}

      {phase === "questionComplete" && (
        <>
          <span className="gc-controls-hint gc-controls-success">مدار کامل شد!</span>
          <button type="button" className="gc-btn gc-btn-primary" onClick={onNext}>
            {isLastQuestion ? "دیدنِ نتیجه" : "مرحله بعدی"}
          </button>
        </>
      )}
    </div>
  );
}
