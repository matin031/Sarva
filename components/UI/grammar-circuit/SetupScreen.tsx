"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GradeKey } from "@/lib/doroos/types";
import {
  GRAMMAR_CIRCUIT_GRADES,
  selectableLessons,
} from "@/lib/grammar-circuit/curriculum";
import type { GrammarCircuitAvailability } from "@/lib/grammar-circuit";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** انتخابِ پایه و درس — نقطهٔ شروعِ هر تمرین.
 *
 *  «مدار دستور» یک مخزنِ یکدست نیست؛ هر درس محتوای خودش را دارد. پس پیش از
 *  بازی، دانش‌آموز یک پایه و یک یا چند درس *از همان پایه* انتخاب می‌کند.
 *
 *  درس‌های آزادِ هر پایه اصلاً در این شبکه نمی‌آیند (`selectableLessons`).
 *  درس‌هایی که هنوز محتوایی ندارند دیده می‌شوند ولی غیرفعال و با برچسبِ
 *  «به‌زودی» — پنهان‌کردنشان ساختارِ کتاب را از دانش‌آموز می‌گیرد. */
export interface SetupScreenProps {
  availability: GrammarCircuitAvailability | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onStart: (grade: GradeKey, lessons: number[]) => void;
  starting: boolean;
  startError: string | null;
}

export default function SetupScreen({
  availability,
  loading,
  error,
  onRetry,
  onStart,
  starting,
  startError,
}: SetupScreenProps) {
  const [grade, setGrade] = useState<GradeKey>("dahom");
  const [selected, setSelected] = useState<number[]>([]);

  const lessons = useMemo(() => {
    const listed = selectableLessons(grade);
    const info = availability?.grades.find((g) => g.grade === grade);
    return listed.map((lesson) => {
      const row = info?.lessons.find((l) => l.lesson === lesson);
      return {
        lesson,
        available: row?.available ?? false,
        questionCount: row?.questionCount ?? 0,
      };
    });
  }, [availability, grade]);

  const availableLessons = lessons.filter((l) => l.available);

  /* عوض‌کردنِ پایه انتخابِ قبلی را پاک می‌کند: شمارهٔ درسِ پایهٔ دهم در پایهٔ
     یازدهم معنای دیگری دارد و حمل‌کردنش فقط تولیدِ خطاست. */
  const changeGrade = (next: GradeKey) => {
    if (next === grade) return;
    setGrade(next);
    setSelected([]);
  };

  const toggle = (lesson: number) => {
    setSelected((prev) =>
      prev.includes(lesson) ? prev.filter((n) => n !== lesson) : [...prev, lesson].sort((a, b) => a - b),
    );
  };

  const canStart = selected.length > 0 && !starting;

  const totalQuestions = lessons
    .filter((l) => selected.includes(l.lesson))
    .reduce((sum, l) => sum + l.questionCount, 0);

  return (
    <div dir="rtl" className="gc-root gc-setup-page">
      <div className="gc-setup">
        <header className="gc-setup-head">
          <span className="gc-setup-badge">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
              <path
                d="M4 12h3l2-4 3 8 2.5-5 1.5 3h4"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            بازیِ نقشِ دستوری
          </span>
          <h1 className="gc-setup-title">مدار دستور</h1>
          <p className="gc-setup-sub">
            نقشِ هر واژه را در جای درست بگذار، مدار را ببند و لامپ را روشن کن.
          </p>
        </header>

        {/* ── پایه ── */}
        <section className="gc-setup-block">
          <div className="gc-setup-legend">
            <span className="gc-setup-step">۱</span>
            <h2 className="gc-setup-label">کتاب و پایه را انتخاب کن</h2>
          </div>
          <div className="gc-grade-row" role="radiogroup" aria-label="انتخابِ پایه">
            {GRAMMAR_CIRCUIT_GRADES.map((g) => (
              <button
                key={g.key}
                type="button"
                role="radio"
                aria-checked={grade === g.key}
                className="gc-grade-chip"
                data-selected={grade === g.key || undefined}
                onClick={() => changeGrade(g.key)}
              >
                <span className="gc-grade-name">{g.label}</span>
                <span className="gc-grade-book">{g.book}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── درس‌ها ── */}
        <section className="gc-setup-block">
          <div className="gc-setup-legend">
            <span className="gc-setup-step">۲</span>
            <h2 className="gc-setup-label">درس‌ها را انتخاب کن</h2>
            <span className="gc-setup-legend-note">می‌توانی چند درس را با هم تمرین کنی</span>
            {availableLessons.length > 0 && (
              <button
                type="button"
                className="gc-setup-link"
                onClick={() =>
                  setSelected(
                    selected.length === availableLessons.length
                      ? []
                      : availableLessons.map((l) => l.lesson),
                  )
                }
              >
                {selected.length === availableLessons.length
                  ? "برداشتنِ همه"
                  : "انتخابِ همه"}
              </button>
            )}
          </div>

          {loading && <p className="gc-setup-note">در حالِ خواندنِ فهرستِ درس‌ها…</p>}

          {error && (
            <div className="gc-setup-error">
              <p>{error}</p>
              <button type="button" className="gc-btn gc-btn-ghost" onClick={onRetry}>
                تلاشِ دوباره
              </button>
            </div>
          )}

          {!loading && !error && availableLessons.length === 0 && (
            <p className="gc-setup-note">
              برای این پایه هنوز محتوایی آمادهٔ تمرین نیست. پایهٔ دیگری را امتحان کن.
            </p>
          )}

          {!loading && !error && (
            <div className="gc-lesson-grid">
              {lessons.map(({ lesson, available, questionCount }) => (
                <button
                  key={lesson}
                  type="button"
                  className="gc-lesson-chip"
                  disabled={!available}
                  aria-pressed={selected.includes(lesson)}
                  data-selected={selected.includes(lesson) || undefined}
                  onClick={() => toggle(lesson)}
                  title={available ? `${fa(questionCount)} پرسش` : "به‌زودی"}
                >
                  <span className="gc-lesson-num">{fa(lesson)}</span>
                  <span className="gc-lesson-meta">
                    {available ? `${fa(questionCount)} پرسش` : "به‌زودی"}
                  </span>
                  {selected.includes(lesson) && (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="gc-lesson-tick">
                      <path
                        d="m5 13 4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {startError && <p className="gc-setup-error-inline">{startError}</p>}

        <div className="gc-setup-actions">
          <div className="gc-setup-summary">
            {selected.length > 0 ? (
              <>
                <span className="gc-setup-count">
                  {fa(selected.length)} درس · {fa(totalQuestions)} پرسش
                </span>
                <span className="gc-setup-chips">
                  {selected.map((n) => (
                    <span key={n} className="gc-setup-chip">
                      درس {fa(n)}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <span className="gc-setup-count gc-setup-count-empty">
                برای شروع، دستِ‌کم یک درس انتخاب کن
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/game" className="gc-btn gc-btn-ghost">
              بازگشت
            </Link>
            <button
              type="button"
              className="gc-btn gc-btn-primary gc-btn-lg"
              disabled={!canStart}
              onClick={() => onStart(grade, selected)}
            >
              {starting ? "در حالِ آماده‌سازی…" : "شروع تمرین"}
              {!starting && (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[18px]">
                  <path
                    d="M9 6 3 12l6 6M21 12H4"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
