"use client";

import Link from "next/link";
import type { QuestionResult } from "@/lib/grammar-circuit/reducer";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function SessionResults({
  results,
  onRestart,
}: {
  results: readonly QuestionResult[];
  onRestart: () => void;
}) {
  const totals = results.reduce(
    (acc, r) => ({
      correct: acc.correct + r.correctPlacements,
      wrong: acc.wrong + r.wrongAttempts,
      firstTry: acc.firstTry + r.firstTryPlacements,
      slots: acc.slots + r.requiredSlots,
      time: acc.time + r.activeTimeMs,
    }),
    { correct: 0, wrong: 0, firstTry: 0, slots: 0, time: 0 },
  );

  const accuracy =
    totals.slots === 0 ? 0 : Math.round((totals.firstTry / totals.slots) * 100);

  return (
    <div dir="rtl" className="gc-root container mx-auto max-w-2xl py-10">
      <div className="glass rounded-3xl p-6 text-center sm:p-9">
        <h1 className="text-2xl font-extrabold sm:text-3xl">مدارها کامل شد</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {fa(results.length)} مدار را بستی؛ {fa(accuracy)}٪ از نقش‌ها را بارِ اول
          درست وصل کردی.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="اتصالِ درست" value={fa(totals.correct)} />
          <Stat label="بارِ اول درست" value={fa(totals.firstTry)} />
          <Stat label="تلاشِ نادرست" value={fa(totals.wrong)} />
          <Stat label="زمانِ فعال" value={`${fa(Math.round(totals.time / 1000))} ثانیه`} />
        </div>

        <ul className="mt-6 flex flex-col gap-2 text-right">
          {results.map((r, i) => (
            <li
              key={`${r.questionId}-${i}`}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm"
            >
              <span className="font-semibold">مدارِ {fa(i + 1)}</span>
              <span className="text-muted-foreground">
                {fa(r.firstTryPlacements)} از {fa(r.requiredSlots)} بارِ اول •{" "}
                {fa(r.wrongAttempts)} تلاشِ نادرست •{" "}
                {fa(Math.round(r.activeTimeMs / 1000))} ثانیه
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onRestart}
            className="rounded-xl bg-primary px-7 py-3 text-base font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
          >
            یک دورِ دیگر
          </button>
          <Link
            href="/game"
            className="rounded-xl border border-border px-7 py-3 text-base font-medium transition-all hover:brightness-110 active:scale-95"
          >
            بازگشت به کهکشانِ بازی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 px-3 py-4">
      <div className="text-xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
