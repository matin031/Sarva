"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { PreparedStep, RunSummary } from "@/lib/aruz-bridge/types";

/* صفحه‌های بیرون از بازی: شروع، پایان و پیروزی.
 *
 * این‌ها عمداً از همان اجزای بصریِ بقیهٔ سروا استفاده می‌کنند — همان
 * radius، همان border، همان رنگ‌ها و همان فونت — تا بازی مثلِ یک جزیرهٔ
 * جدا نچسبد. فقط *داخلِ* صحنهٔ سه‌بعدی است که هویتِ مخصوصِ بازی را دارد. */

const fa = new Intl.NumberFormat("fa-IR");

/* صفحه‌های پایان دیگر پوششِ روی کادرِ تیره نیستند.
   پیش‌تر یک ستونِ باریک وسطِ یک مستطیلِ سیاهِ بزرگ بودند؛ حالا کارتِ معمولیِ
   سروا در جریانِ خودِ صفحه‌اند، مثلِ هر کارتِ دیگری در سایت. */
const card =
  "mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-5 text-center shadow-sm sm:p-7";
const primaryButton =
  "w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95";
const ghostButton =
  "w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition-all hover:brightness-110 active:scale-95";

function Enter({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 260 }}
      className={card}
    >
      {children}
    </motion.div>
  );
}

function SummaryGrid({ summary }: { summary: RunSummary }) {
  const cells = [
    { label: "امتیاز", value: fa.format(summary.score) },
    {
      label: "پاسخِ درست",
      value: `${fa.format(summary.correctCount)} از ${fa.format(summary.totalQuestions)}`,
    },
    { label: "بهترین زنجیره", value: fa.format(summary.bestStreak) },
    { label: "دقت", value: `${fa.format(Math.round(summary.accuracy * 100))}٪` },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-background/60 p-3">
          <p className="text-[0.65rem] text-muted-foreground">{c.label}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export interface ResultActions {
  onRetry: () => void;
  onChangeSettings: () => void;
  /** فقط وقتی «مرورِ اشتباه‌ها» روشن است و اشتباهی ثبت شده. */
  onReview?: () => void;
  failedCount: number;
}

function ResultActionButtons({
  onRetry,
  onChangeSettings,
  onReview,
  failedCount,
}: ResultActions) {
  return (
    <div className="mt-5 flex flex-col gap-2">
      {onReview && failedCount > 0 && (
        <button type="button" onClick={onReview} className={primaryButton}>
          {failedCount === 1
            ? "تمرینِ سؤالِ اشتباه"
            : `تمرینِ ${fa.format(failedCount)} سؤالِ اشتباه`}
        </button>
      )}
      <button
        type="button"
        onClick={onRetry}
        className={onReview && failedCount > 0 ? ghostButton : primaryButton}
      >
        دوباره
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={onChangeSettings} className={ghostButton}>
          تغییرِ تنظیمات
        </button>
        <Link href="/game" className={`${ghostButton} inline-flex items-center justify-center`}>
          بازگشت
        </Link>
      </div>
    </div>
  );
}

export function GameOverScreen({
  summary,
  reason,
  step,
  actions,
}: {
  summary: RunSummary;
  reason: "wrong" | "timeout" | null;
  step: PreparedStep | null;
  actions: ResultActions;
}) {
  return (
    <Enter>
      <h2 className="text-2xl font-black text-destructive sm:text-3xl">شیشه شکست!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {reason === "timeout"
          ? "زمان تمام شد و شیشهٔ زیرِ پایت تاب نیاورد."
          : "روی شیشهٔ نادرست فرود آمدی."}
      </p>

      {step && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/8 p-4">
          <p className="text-xs text-muted-foreground">پاسخِ درست</p>
          <p className="mt-0.5 text-xl font-black text-primary">{step.question.correctPattern}</p>
          {step.question.promptText && (
            <p className="mt-1 text-xs text-muted-foreground">
              برای «{step.question.promptText}»
            </p>
          )}
          {step.question.explanation && (
            <p className="mt-2.5 border-t border-primary/20 pt-2.5 text-right text-xs leading-relaxed text-muted-foreground">
              {step.question.explanation}
            </p>
          )}
        </div>
      )}

      <SummaryGrid summary={summary} />
      <ResultActionButtons {...actions} />
    </Enter>
  );
}

export function FinishedScreen({
  summary,
  actions,
}: {
  summary: RunSummary;
  actions: ResultActions;
}) {
  const perfect = summary.correctCount === summary.totalQuestions;
  return (
    <Enter>
      <h2 className="text-2xl font-black text-primary sm:text-3xl">
        {perfect ? "بی‌نقص!" : "از پل گذشتی!"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {perfect ? "تمامِ شیشه‌ها را درست انتخاب کردی." : "تا انتهای پل رسیدی."}
      </p>
      <SummaryGrid summary={summary} />
      <ResultActionButtons {...actions} />
    </Enter>
  );
}

/** وقتی مرورگر یا دستگاه اصلاً WebGL ندارد. */
export function WebGLFallback() {
  return (
    <div dir="rtl" className="flex min-h-[50vh] items-center justify-center p-4">
      <div className={card}>
        <h2 className="mb-2 text-xl font-bold text-foreground">نسخهٔ سه‌بعدی اجرا نشد</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          مرورگر یا دستگاه شما امکان اجرای نسخهٔ سه‌بعدی این بازی را ندارد.
        </p>
        <Link href="/game" className={primaryButton + " inline-block"}>
          بازگشت به کهکشانِ بازی‌ها
        </Link>
      </div>
    </div>
  );
}

/** راهنمای چرخاندنِ گوشی — مسدودکننده نیست، فقط پیشنهاد. */
export function OrientationHint() {
  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center px-4 sm:bottom-10 landscape:hidden"
    >
      <p className="rounded-full border border-border/70 bg-card/85 px-3.5 py-1.5 text-[0.65rem] text-muted-foreground backdrop-blur-md">
        برای تجربهٔ بهتر گوشی را افقی کنید.
      </p>
    </div>
  );
}
