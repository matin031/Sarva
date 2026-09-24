"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { GradeKey } from "@/lib/doroos/types";
import {
  GRAMMAR_CIRCUIT_GRADES,
  selectableLessons,
} from "@/lib/grammar-circuit/curriculum";
import type { GrammarCircuitAvailability } from "@/lib/grammar-circuit";
import { GRAMMAR_CIRCUIT_CONFIG } from "@/lib/grammar-circuit/config";

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
  onStart: (grade: GradeKey, lessons: number[], length: number) => void;
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
  const [length, setLength] = useState<number>(GRAMMAR_CIRCUIT_CONFIG.questionsPerSession);

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

  /* «۰» یعنی همهٔ پرسش‌های درس‌های انتخابی. در هر حال بیشتر از آنچه هست
     نمی‌شود تمرین کرد، پس عددِ نمایش‌داده‌شده همان چیزی است که واقعاً می‌آید. */
  const plannedCount = length === 0 ? totalQuestions : Math.min(length, totalQuestions);

  return (
    <div dir="rtl" className="gc-root gc-setup-page">
      <div className="gc-setup">
        <header className="gc-setup-head">
          <SetupArt />
          <h1 className="game-title gc-setup-title">مدار دستور</h1>
          <p className="gc-setup-sub">نقش هر واژه را در خانه‌اش بگذار تا لامپ روشن شود.</p>
        </header>

        <section className="gc-field">
          <h2 className="gc-field-label">پایه</h2>
          <div className="gc-seg gc-seg-grade" role="radiogroup" aria-label="انتخاب پایه">
            {GRAMMAR_CIRCUIT_GRADES.map((g) => (
              <button
                key={g.key}
                type="button"
                role="radio"
                aria-checked={grade === g.key}
                className="gc-seg-item"
                data-selected={grade === g.key || undefined}
                onClick={() => changeGrade(g.key)}
              >
                <span className="gc-seg-main">{g.label}</span>
                <span className="gc-seg-meta">{g.book}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="gc-field">
          <div className="gc-field-head">
            <h2 className="gc-field-label">درس</h2>
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
                {selected.length === availableLessons.length ? "برداشتن همه" : "انتخاب همه"}
              </button>
            )}
          </div>

          {loading && (
            <div className="gc-lesson-grid" aria-busy="true" aria-label="در حال بارگذاری">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="gc-lesson-skeleton" />
              ))}
            </div>
          )}

          {error && (
            <div className="gc-setup-error">
              <p>{error}</p>
              <button type="button" className="gc-btn gc-btn-ghost" onClick={onRetry}>
                تلاش دوباره
              </button>
            </div>
          )}

          {!loading && !error && availableLessons.length === 0 && (
            <p className="gc-setup-note">برای این پایه هنوز پرسشی آماده نیست.</p>
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
                  aria-label={`درس ${fa(lesson)}، ${available ? `${fa(questionCount)} پرسش` : "به‌زودی"}`}
                  data-selected={selected.includes(lesson) || undefined}
                  onClick={() => toggle(lesson)}
                >
                  <span className="gc-lesson-num">{fa(lesson)}</span>
                  <span className="gc-lesson-meta">
                    {available ? `${fa(questionCount)} پرسش` : "به‌زودی"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected.length > 0 && (
          <section className="gc-field">
            <div className="gc-field-head">
              <h2 className="gc-field-label">تعداد پرسش</h2>
              <span className="gc-field-hint">از {fa(totalQuestions)}</span>
            </div>
            <div className="gc-seg" role="radiogroup" aria-label="تعداد پرسش">
              {GRAMMAR_CIRCUIT_CONFIG.sessionLengthOptions.map((option) => {
                const disabled = option !== 0 && option > totalQuestions;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={length === option}
                    disabled={disabled}
                    data-selected={length === option || undefined}
                    className="gc-seg-item"
                    onClick={() => setLength(option)}
                  >
                    <span className="gc-seg-main">{option === 0 ? "همه" : fa(option)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {startError && <p className="gc-setup-error-inline">{startError}</p>}

        <footer className="gc-setup-actions">
          <span className="gc-setup-count" data-empty={selected.length === 0 || undefined}>
            {selected.length > 0
              ? `${fa(selected.length)} درس، ${fa(plannedCount)} پرسش`
              : "یک درس انتخاب کن"}
          </span>
          <Link href="/game" className="gc-btn gc-btn-ghost">
            بازگشت
          </Link>
          <button
            type="button"
            className="gc-btn gc-btn-primary gc-btn-lg"
            disabled={!canStart}
            data-busy={starting || undefined}
            onClick={() => onStart(grade, selected, length)}
          >
            شروع
          </button>
        </footer>
      </div>
    </div>
  );
}

/** مدارِ کوچکِ سرِ صفحه: باتری، سه خانهٔ پر، لامپِ روشن، و یک تپشِ جریان
 *  که مدام از باتری تا لامپ می‌رود. تزئینی است و با کاهشِ حرکت می‌ایستد. */
function SetupArt() {
  return (
    <svg className="gc-setup-art" viewBox="0 0 320 72" fill="none" aria-hidden>
      <circle className="gc-art-glow" cx="30" cy="30" r="30" />
      <path className="gc-art-wire" d="M272 36H250M200 36H186M136 36H122M72 36H44" />
      <path className="gc-art-pulse" pathLength="100" d="M272 36H44" />
      <rect className="gc-art-chip" x="200" y="23" width="50" height="26" rx="8" />
      <rect className="gc-art-chip" x="136" y="23" width="50" height="26" rx="8" />
      <rect className="gc-art-chip" x="72" y="23" width="50" height="26" rx="8" />
      <rect className="gc-art-cell" x="211" y="33" width="28" height="6" rx="3" />
      <rect className="gc-art-cell" x="147" y="33" width="28" height="6" rx="3" />
      <rect className="gc-art-cell" x="83" y="33" width="28" height="6" rx="3" />
      <rect className="gc-art-body" x="276" y="22" width="40" height="28" rx="6" />
      <rect className="gc-art-body" x="272" y="31" width="4" height="10" rx="1.5" />
      <rect className="gc-art-fill" x="281" y="27" width="8" height="18" rx="2" />
      <rect className="gc-art-fill" x="292" y="27" width="8" height="18" rx="2" />
      <rect className="gc-art-fill" x="303" y="27" width="8" height="18" rx="2" />
      <path
        className="gc-art-bulb"
        d="M30 12a14 14 0 0 0-8.5 25.1c1.6 1.3 2.5 3 2.5 5.1V45h12v-2.8c0-2.1.9-3.8 2.5-5.1A14 14 0 0 0 30 12Z"
      />
      <path className="gc-art-base" d="M25 50h10M26 55h8" />
    </svg>
  );
}
