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
      time: acc.time + r.activeTimeMs,
    }),
    { attempts: 0, firstTry: 0, time: 0 },
  );

  const rate =
    results.length === 0 ? 0 : Math.round((totals.firstTry / results.length) * 100);
  const seconds = Math.round(totals.time / 1000);
  const time =
    seconds >= 60 ? `${fa(Math.floor(seconds / 60))}:${fa(seconds % 60).padStart(2, "۰")}` : `${fa(seconds)} ثانیه`;

  return (
    <div dir="rtl" className="gc-root gc-setup-page">
      <div className="gc-setup gc-result">
        <header className="gc-setup-head">
          {/* حلقهٔ درصدِ «بار اول درست» — تنها عددی که واقعاً مهارت را نشان می‌دهد. */}
          <div
            className="gc-result-ring"
            style={{ "--gc-rate": `${rate}` } as React.CSSProperties}
            role="img"
            aria-label={`${fa(rate)} درصد بار اول درست`}
          >
            <svg viewBox="0 0 120 120" aria-hidden>
              <circle className="gc-result-ring-track" cx="60" cy="60" r="52" />
              <circle className="gc-result-ring-fill" cx="60" cy="60" r="52" pathLength="100" />
            </svg>
            <span className="gc-result-rate">
              {fa(rate)}
              <small>٪</small>
            </span>
          </div>
          <h1 className="game-title gc-setup-title">مدارها کامل شد</h1>
          {session && (
            <p className="gc-setup-sub">
              پایه {gradeLabel(session.grade)}، درس {formatLessonList(session.lessons)}
            </p>
          )}
        </header>

        <dl className="gc-stats">
          <div className="gc-stat">
            <dt>مدار</dt>
            <dd>{fa(results.length)}</dd>
          </div>
          <div className="gc-stat">
            <dt>بار اول درست</dt>
            <dd>{fa(totals.firstTry)}</dd>
          </div>
          <div className="gc-stat">
            <dt>بررسی</dt>
            <dd>{fa(totals.attempts)}</dd>
          </div>
          <div className="gc-stat">
            <dt>زمان</dt>
            <dd>{time}</dd>
          </div>
        </dl>

        <ol className="gc-result-list">
          {results.map((r, i) => (
            <li key={`${r.questionId}-${i}`} className="gc-result-row">
              <span className="gc-result-mark" data-first={r.solvedOnFirstAttempt || undefined} aria-hidden />
              <span className="gc-result-name">
                مدار {fa(i + 1)}
                {r.lesson !== undefined && <span className="gc-result-dim"> · درس {fa(r.lesson)}</span>}
              </span>
              <span className="gc-result-dim">
                {r.solvedOnFirstAttempt ? "بار اول" : `${fa(r.attempts)} بار بررسی`} ·{" "}
                {fa(Math.round(r.activeTimeMs / 1000))} ثانیه
              </span>
            </li>
          ))}
        </ol>

        <footer className="gc-setup-actions">
          <Link href="/game" className="gc-btn gc-btn-ghost">
            بازی‌ها
          </Link>
          <button type="button" onClick={onChangeLessons} className="gc-btn gc-btn-ghost">
            درس‌های دیگر
          </button>
          <button type="button" onClick={onRestart} className="gc-btn gc-btn-primary gc-btn-lg">
            دوباره
          </button>
        </footer>
      </div>
    </div>
  );
}
