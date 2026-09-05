"use client";

import { motion } from "motion/react";
import {
  COUNT_LABELS,
  PACE_LABELS,
  QUESTION_COUNTS,
  type AruzBridgeSessionConfig,
  type GamePace,
  type QuestionCount,
} from "@/lib/aruz-bridge/session";

/* صفحهٔ آغازِ دور.
 *
 * قاعدهٔ طراحی: بازیکن باید در چند ثانیه بفهمدش. برای همین فقط چهار چیز
 * پرسیده می‌شود و بقیه — ترتیبِ تصادفی، جای چپ/راست، سختی — خودکار است و
 * اصلاً نمایش داده نمی‌شود.
 *
 * ظاهر از همان اجزای سروا می‌آید (کارت، حاشیه، شعاع، رنگ‌های تم) تا این
 * صفحه بخشی از سایت حس شود، نه یک پنلِ تنظیماتِ چسبانده‌شده. */

const fa = new Intl.NumberFormat("fa-IR");

function Segment({
  selected,
  disabled,
  onClick,
  children,
  title,
  label,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  /** نامِ در دسترس. لازم است چون «معمولی» هم برچسبِ یک تعداد است و هم یک
   *  سرعت؛ بدونِ این، صفحه‌خوان (و هر تستِ خودکاری) دو کنترل را یکی می‌بیند. */
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-pressed={selected}
      className={`flex-1 rounded-xl border px-2 py-2.5 text-center transition-all active:scale-95 ${
        selected
          ? "border-primary bg-primary/12 text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-35 hover:border-border hover:text-muted-foreground" : ""}`}
    >
      {children}
    </button>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-right transition-all hover:border-primary/50 active:scale-[0.99]"
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.79a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

export function SessionSetup({
  session,
  onChange,
  onStart,
  loading,
  error,
  /** چند پرسشِ یکتا در مخزن هست. `null` یعنی هنوز نمی‌دانیم. */
  availableUnique,
}: {
  session: AruzBridgeSessionConfig;
  onChange: (next: AruzBridgeSessionConfig) => void;
  onStart: () => void;
  loading: boolean;
  error: string | null;
  availableUnique: number | null;
}) {
  const patch = (delta: Partial<AruzBridgeSessionConfig>) => onChange({ ...session, ...delta });

  /* وقتی تکرار خاموش است، تعدادی بیشتر از مخزن اصلاً شدنی نیست. به‌جای
     تکرارِ پنهانی، همان گزینه غیرفعال می‌شود و دلیلش هم نوشته می‌شود. */
  const capped = !session.allowRepeatQuestions && availableUnique != null;
  const isUnavailable = (count: QuestionCount) => capped && count > (availableUnique ?? 0);

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 260 }}
      className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
    >
      <div className="text-center">
        <h1 className="text-2xl font-black text-foreground sm:text-3xl">پلِ وزن</h1>
        <p className="mt-1 text-sm text-muted-foreground">آماده‌ای از پل عبور کنی؟</p>
      </div>

      <div className="mt-6 space-y-5">
        <section>
          <h2 className="mb-2 text-xs font-bold text-muted-foreground">تعدادِ سؤال</h2>
          <div className="flex gap-2">
            {QUESTION_COUNTS.map((count) => (
              <Segment
                key={count}
                selected={session.questionCount === count}
                disabled={isUnavailable(count)}
                onClick={() => patch({ questionCount: count })}
                label={`${fa.format(count)} سؤال`}
                title={
                  isUnavailable(count)
                    ? `فقط ${fa.format(availableUnique ?? 0)} سؤالِ یکتا موجود است`
                    : undefined
                }
              >
                <span className="block text-lg font-black tabular-nums">{fa.format(count)}</span>
                <span className="mt-0.5 block text-[0.65rem] opacity-80">{COUNT_LABELS[count]}</span>
              </Segment>
            ))}
          </div>
          {capped && (availableUnique ?? 0) < 20 && (
            <p className="mt-2 text-xs text-muted-foreground">
              فقط {fa.format(availableUnique ?? 0)} سؤالِ یکتا در این مجموعه موجود است.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-bold text-muted-foreground">سرعتِ تصمیم‌گیری</h2>
          <div className="flex gap-2">
            {(Object.keys(PACE_LABELS) as GamePace[]).map((pace) => (
              <Segment
                key={pace}
                selected={session.pace === pace}
                onClick={() => patch({ pace })}
                label={`سرعتِ ${PACE_LABELS[pace]}`}
              >
                <span className="block text-sm font-bold">{PACE_LABELS[pace]}</span>
              </Segment>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <CheckRow
            checked={session.reviewMistakes}
            onChange={(v) => patch({ reviewMistakes: v })}
            label="مرورِ اشتباه‌ها در پایان"
          />
          <CheckRow
            checked={session.allowRepeatQuestions}
            onChange={(v) => patch({ allowRepeatQuestions: v })}
            label="اجازهٔ تکرارِ سؤال در همین دور"
          />
          <CheckRow
            checked={session.soundEnabled}
            onChange={(v) => patch({ soundEnabled: v })}
            label="صدا"
          />
        </section>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-foreground">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        {loading ? "در حالِ آماده‌سازی…" : "شروعِ بازی"}
      </button>
    </motion.div>
  );
}

