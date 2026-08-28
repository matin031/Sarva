"use client";

import Link from "next/link";
import {
  formatLessonList,
  gradeLabel,
} from "@/lib/grammar-circuit/curriculum";
import type { GrammarCircuitSessionConfig } from "@/lib/grammar-circuit";
import type { QuestionResult } from "@/lib/grammar-circuit/reducer";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function SessionResults({
  results,
  session,
  onRestart,
  onChangeLessons,
}: {
  results: readonly QuestionResult[];
  session: GrammarCircuitSessionConfig | null;
  onRestart: () => void;
  onChangeLessons: () => void;
}) {
  const totals = results.reduce(
    (acc, r) => ({
      attempts: acc.attempts + r.attempts,
      firstTry: acc.firstTry + (r.solvedOnFirstAttempt ? 1 : 0),
      slots: acc.slots + r.requiredSlots,
      time: acc.time + r.activeTimeMs,
    }),
    { attempts: 0, firstTry: 0, slots: 0, time: 0 },
  );

  const rate =
    results.length === 0 ? 0 : Math.round((totals.firstTry / results.length) * 100);

  return (
    <div dir="rtl" className="gc-root container mx-auto max-w-2xl py-10">
      <div className="gc-setup text-center">
        <h1 className="gc-setup-title">مدارها کامل شد</h1>
        {session && (
          <p className="gc-setup-sub">
            پایهٔ {gradeLabel(session.grade)} — درس‌های {formatLessonList(session.lessons)}
          </p>
        )}
        <p className="gc-setup-note">
          {fa(results.length)} مدار را بستی؛ {fa(rate)}٪ را در همان بررسیِ اول درست بستی.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="مدارِ کامل" value={fa(results.length)} />
          <Stat label="بارِ اول درست" value={fa(totals.firstTry)} />
          <Stat label="مجموعِ بررسی‌ها" value={fa(totals.attempts)} />
          <Stat label="زمانِ فعال" value={`${fa(Math.round(totals.time / 1000))} ثانیه`} />
        </div>

        <ul className="mt-6 flex flex-col gap-2 text-right">
          {results.map((r, i) => (
            <li key={`${r.questionId}-${i}`} className="gc-result-row">
              <span className="font-semibold">
                مدارِ {fa(i + 1)}
                {r.lesson !== undefined && (
                  <span className="text-[var(--gc-text-muted)]"> — درس {fa(r.lesson)}</span>
                )}
              </span>
              <span className="text-[var(--gc-text-muted)]">
                {fa(r.requiredSlots)} خانه •{" "}
                {r.solvedOnFirstAttempt
                  ? "بارِ اول"
                  : `${fa(r.attempts)} بار بررسی`}{" "}
                • {fa(Math.round(r.activeTimeMs / 1000))} ثانیه
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button onClick={onRestart} className="gc-btn gc-btn-primary">
            تمرین دوباره
          </button>
          <button onClick={onChangeLessons} className="gc-btn gc-btn-ghost">
            انتخابِ درس‌های دیگر
          </button>
          <Link href="/game" className="gc-btn gc-btn-ghost">
            کهکشانِ بازی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="gc-stat">
      <div className="gc-stat-value">{value}</div>
      <div className="gc-stat-label">{label}</div>
    </div>
  );
}
