"use client";

import type { QuestionPhase } from "@/lib/grammar-circuit/reducer";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** نوارِ کنترل — جایی که دانش‌آموز *عمداً* پاسخش را ثبت می‌کند.
 *
 *  دکمه تا وقتی همهٔ خانه‌ها پر نشده‌اند غیرفعال است، و بازی هیچ‌وقت خودکار
 *  بررسی نمی‌کند: فشردنِ آگاهانه هم فرصتِ مرورِ نهایی می‌دهد و هم لحظهٔ
 *  بررسی را معنادار می‌کند.
 *
 *  ⚠️ دکمه همیشه در همان جا رندر می‌شود و فقط برچسب و حالتش عوض می‌شود؛
 *  آمدن و رفتنش ردیف را بالا و پایین می‌برد. */
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
  const arranging = phase === "arranging" || phase === "readyToValidate";
  const success =
    phase === "successCurrent" || phase === "successReward" || phase === "questionComplete";

  const hint = arranging
    ? `${fa(filled)} از ${fa(required)} خانه`
    : phase === "validating"
      ? "در حال بررسی…"
      : phase === "failureSequence"
        ? "مدار بسته نشد"
        : phase === "failureReview"
          ? "خانه‌های قرمز را درست کن"
          : success
            ? "مدار کامل شد"
            : "";

  const tone = success ? "ok" : phase === "failureSequence" || phase === "failureReview" ? "bad" : undefined;

  const button =
    phase === "failureReview"
      ? { label: "اصلاح", onClick: onCorrect, disabled: false }
      : phase === "questionComplete"
        ? { label: isLastQuestion ? "دیدن نتیجه" : "مدار بعدی", onClick: onNext, disabled: false }
        : { label: "بررسی", onClick: arranging ? () => onValidate() : () => {}, disabled: phase !== "readyToValidate" };

  return (
    <div className="gc-controls">
      <span className="gc-controls-hint" data-tone={tone} aria-live="off">
        {arranging && (
          <span className="gc-fill-meter" aria-hidden>
            {Array.from({ length: required }, (_, i) => (
              <span key={i} data-on={i < filled || undefined} />
            ))}
          </span>
        )}
        {hint}
      </span>
      <button
        type="button"
        className="gc-btn gc-btn-primary"
        data-busy={phase === "validating" || undefined}
        disabled={button.disabled}
        onClick={button.onClick}
      >
        {button.label}
      </button>
    </div>
  );
}
