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

const overlay =
  "absolute inset-0 z-40 flex items-center justify-center bg-[#04080f]/80 p-4 backdrop-blur-md";
const card =
  "w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 text-center shadow-2xl sm:p-8";
const primaryButton =
  "w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95";
const ghostButton =
  "w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition-all hover:brightness-110 active:scale-95";

function Enter({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 260 }}
      className={card}
    >
      {children}
    </motion.div>
  );
}

export function IntroScreen({
  onStart,
  loading,
  error,
}: {
  onStart: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div dir="rtl" className={overlay}>
      <Enter>
        <h1 className="mb-1 text-2xl font-black text-foreground sm:text-3xl">پلِ وزن</h1>
        <p className="mb-5 text-sm text-muted-foreground sm:text-base">
          وزنِ درست را پیدا کن و روی شیشهٔ امن بپر!
        </p>

        <div className="mb-5 space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-4 text-right text-sm">
          <p className="text-muted-foreground">
            یک واژه برای لحظه‌ای نشان داده می‌شود. تشخیص بده وزنش کدام است و
            روی همان شیشه بپر. شیشهٔ اشتباه زیرِ پایت می‌شکند.
          </p>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
            <span className="text-muted-foreground">روی رایانه</span>
            <span className="font-mono text-xs text-foreground" dir="ltr">
              ← → &nbsp;یا&nbsp; A D
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">روی موبایل</span>
            <span className="text-xs text-foreground">روی شیشهٔ درست بزن</span>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive-foreground">
            {error}
          </p>
        )}

        <button type="button" onClick={onStart} disabled={loading} className={primaryButton}>
          {loading ? "در حالِ آماده‌سازی…" : "شروع"}
        </button>
        <p className="mt-3 text-[0.65rem] text-muted-foreground">
          صدا پس از زدنِ «شروع» فعال می‌شود.
        </p>
      </Enter>
    </div>
  );
}

function SummaryGrid({ summary }: { summary: RunSummary }) {
  const cells = [
    { label: "امتیاز", value: fa.format(summary.score) },
    { label: "پاسخِ درست", value: `${fa.format(summary.correctCount)} از ${fa.format(summary.totalQuestions)}` },
    { label: "بهترین زنجیره", value: fa.format(summary.bestStreak) },
    { label: "دقت", value: `${fa.format(Math.round(summary.accuracy * 100))}٪` },
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-2">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl border border-border/70 bg-background/60 p-3">
          <p className="text-[0.65rem] text-muted-foreground">{c.label}</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function GameOverScreen({
  summary,
  reason,
  step,
  onRestart,
}: {
  summary: RunSummary;
  reason: "wrong" | "timeout" | null;
  step: PreparedStep | null;
  onRestart: () => void;
}) {
  return (
    <div dir="rtl" className={overlay}>
      <Enter>
        <h2 className="mb-1 text-2xl font-black text-destructive sm:text-3xl">شیشه شکست!</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {reason === "timeout"
            ? "زمان تمام شد و شیشهٔ زیرِ پایت تاب نیاورد."
            : "روی شیشهٔ نادرست فرود آمدی."}
        </p>

        {step && (
          <div className="mb-5 rounded-xl border border-primary/45 bg-primary/10 p-4">
            <p className="text-xs text-muted-foreground">پاسخِ درست</p>
            <p className="mt-0.5 text-xl font-black text-primary">
              {step.question.correctPattern}
            </p>
            {step.question.promptText && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                برای «{step.question.promptText}»
              </p>
            )}
            {step.question.explanation && (
              <p className="mt-2.5 border-t border-primary/25 pt-2.5 text-right text-xs leading-relaxed text-muted-foreground">
                {step.question.explanation}
              </p>
            )}
          </div>
        )}

        <SummaryGrid summary={summary} />

        <div className="flex flex-col gap-2">
          <button type="button" onClick={onRestart} className={primaryButton}>
            دوباره
          </button>
          <Link href="/game" className={ghostButton}>
            بازگشت به کهکشانِ بازی‌ها
          </Link>
        </div>
      </Enter>
    </div>
  );
}

export function FinishedScreen({
  summary,
  onRestart,
}: {
  summary: RunSummary;
  onRestart: () => void;
}) {
  const perfect = summary.correctCount === summary.totalQuestions;
  return (
    <div dir="rtl" className={overlay}>
      <Enter>
        <h2 className="mb-1 text-2xl font-black text-primary sm:text-3xl">
          {perfect ? "بی‌نقص!" : "از پل گذشتی!"}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {perfect
            ? "تمامِ شیشه‌ها را درست انتخاب کردی."
            : "تا انتهای پل رسیدی."}
        </p>

        <SummaryGrid summary={summary} />

        <div className="flex flex-col gap-2">
          <button type="button" onClick={onRestart} className={primaryButton}>
            یک دورِ دیگر
          </button>
          <Link href="/game" className={ghostButton}>
            بازگشت به کهکشانِ بازی‌ها
          </Link>
        </div>
      </Enter>
    </div>
  );
}

/** وقتی مرورگر یا دستگاه اصلاً WebGL ندارد. */
export function WebGLFallback() {
  return (
    <div dir="rtl" className="flex min-h-[60vh] items-center justify-center p-4">
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
