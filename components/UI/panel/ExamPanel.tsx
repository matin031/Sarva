"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import PanelSection from "@/components/UI/panel/PanelSection";
import StatRing from "@/components/UI/panel/StatRing";
import { jalali, relativeDay, scoreColor } from "@/lib/panel/format";
import type { ExamAttempt } from "@/lib/panel/types";

/** Just enough of a paper to caption a stored result: the panel needs the
 *  صورت‌سؤال, not the whole question tree. */
export type ExamPaper = {
  questions: { number: number; section: string; instruction: string }[];
};

/** One graded part, as `question_results` stores it. */
type StoredPart = {
  label?: string;
  score?: number;
  maxScore?: number;
  status?: "correct" | "incorrect" | "partial" | "needs_review";
  correctAnswerText?: string;
  feedback?: string;
  selfGrade?: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;

type Entry = {
  key: string;
  n: number;
  score: number;
  max: number;
  parts: StoredPart[];
};

function kindOf(score: number, max: number): "full" | "partial" | "zero" | "none" {
  if (max <= 0) return "none";
  if (score >= max) return "full";
  return score > 0 ? "partial" : "zero";
}

const STATUS_LABEL: Record<string, string> = {
  correct: "درست",
  incorrect: "نادرست",
  partial: "نیمه‌درست",
  needs_review: "خودارزیابی",
};

/** Render whatever the student put in that box. Answers come back from jsonb,
 *  so they can be a string, a picked index, or a list. */
function answerText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(answerText).filter(Boolean).join("، ");
  return "";
}

/** One question of a past paper: what was asked, what the student answered and
 *  what the answer key says — the same shape as the عروض and واژه‌یاب reviews. */
function QuestionReview({
  entry,
  paper,
  answers,
}: {
  entry: Entry;
  paper?: ExamPaper;
  answers: Record<string, unknown> | null;
}) {
  const meta = paper?.questions.find((q) => q.number === entry.n);
  const kind = kindOf(entry.score, entry.max);

  return (
    <div dir="rtl" className=" rounded-2xl border border-border bg-card p-4">
      <div className=" flex flex-wrap items-center justify-between gap-2">
        <span className=" text-sm font-bold">
          سؤال {toFa(entry.n)}
          {meta?.section ? ` — ${meta.section}` : ""}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            kind === "full"
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : kind === "partial"
                ? "bg-gold/15 text-gold"
                : kind === "zero"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-secondary text-muted-foreground"
          }`}
        >
          {toFa(Math.round(entry.score * 100) / 100)} از {toFa(entry.max)}
        </span>
      </div>

      {meta?.instruction && (
        <p className=" mt-3 rounded-xl bg-secondary p-3 text-sm leading-relaxed">
          {meta.instruction}
        </p>
      )}

      {!entry.parts.length ? (
        <p className=" mt-3 text-sm text-muted-foreground">
          ریزِ این سؤال ذخیره نشده است؛ فقط نمره‌اش را داریم.
        </p>
      ) : (
        <div className=" mt-3 flex flex-col gap-3">
          {entry.parts.map((part, i) => {
            const mine = answerText(answers?.[`${entry.n}:${i}`]);
            const right = (part.correctAnswerText ?? "").trim();
            const status = part.status ?? "needs_review";
            return (
              <div
                key={i}
                className={`rounded-xl border-2 p-3 ${
                  status === "correct"
                    ? "border-green-500/60 bg-green-500/5"
                    : status === "partial"
                      ? "border-gold/60 bg-gold/5"
                      : status === "incorrect"
                        ? "border-destructive/60 bg-destructive/5"
                        : "border-border"
                }`}
              >
                <div className=" flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className=" font-bold">
                    {part.label || `بخش ${toFa(i + 1)}`}
                  </span>
                  <span className=" flex items-center gap-2">
                    <span className=" text-muted-foreground">
                      {toFa(Number(part.score ?? 0))} از{" "}
                      {toFa(Number(part.maxScore ?? 0))}
                    </span>
                    <span
                      className={
                        status === "correct"
                          ? "text-green-600 dark:text-green-400"
                          : status === "partial"
                            ? "text-gold"
                            : status === "incorrect"
                              ? "text-destructive"
                              : "text-muted-foreground"
                      }
                    >
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </span>
                </div>

                <div className=" mt-2 flex flex-col gap-2 text-sm">
                  <p className=" rounded-lg bg-secondary p-2.5">
                    <span className=" text-xs text-muted-foreground">
                      پاسخِ تو:{" "}
                    </span>
                    {mine || (
                      <span className=" text-muted-foreground">
                        {answers
                          ? "بی‌پاسخ"
                          : "برای این آزمون ذخیره نشده است"}
                      </span>
                    )}
                  </p>
                  {right && (
                    <p className=" rounded-lg bg-green-500/10 p-2.5 text-green-800 dark:text-green-300">
                      <span className=" text-xs opacity-80">پاسخِ درست: </span>
                      {right}
                    </p>
                  )}
                  {part.feedback && (
                    <p className=" rounded-lg border border-border p-2.5 text-xs leading-relaxed text-muted-foreground">
                      {part.feedback}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** کارنامهٔ امتحان‌های نهایی.
 *
 *  A final exam is not a quiz: questions are worth different marks and can be
 *  half-right, so the review is a grid of marks per question rather than a
 *  right/wrong list. The grid scales — a 12-question paper and a 40-question
 *  one both stay readable because each question is a chip, not a row. */
export default function ExamPanel({
  attempts,
  papers = {},
}: {
  attempts: ExamAttempt[];
  papers?: Record<string, ExamPaper>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const score = attempts.reduce((s, a) => s + a.totalScore, 0);
    const max = attempts.reduce((s, a) => s + a.maxScore, 0);
    const best = attempts.reduce(
      (m, a) =>
        Math.max(m, a.maxScore ? Math.round((a.totalScore / a.maxScore) * 100) : 0),
      0,
    );
    return {
      average: max ? Math.round((score / max) * 100) : 0,
      best,
      count: attempts.length,
      lastAt: attempts[0]?.createdAt ?? null,
    };
  }, [attempts]);

  return (
    <div>
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        امتحان نهایی
      </span>

      <div className=" glass rounded-xl p-4 sm:p-6">
        <div className=" mt-2 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-7">
          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={stats.average} />
            <span className=" text-base sm:text-lg">میانگین کارنامه‌ها</span>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">
                {toFa(stats.count)}
              </span>{" "}
              آزمون داده‌ای
            </div>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={stats.best} />
            <span className=" text-base sm:text-lg">بهترین کارنامه</span>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                fillRule="evenodd"
                d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              {stats.lastAt ? (
                <>
                  آخرین آزمون{" "}
                  <span className=" text-gold">{relativeDay(stats.lastAt)}</span>
                </>
              ) : (
                <span className=" text-muted-foreground">هنوز آزمونی نداده‌ای</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <PanelSection
        title="کارنامه‌ها"
        icon="award"
        hint="روی هر کارنامه بزن تا نمرهٔ تک‌تکِ سؤال‌ها را ببینی."
      >
        {!attempts.length ? (
          <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
            <p className=" text-muted-foreground">
              هنوز امتحان نهایی نداده‌ای. اولین آزمونت که تمام شود، کارنامه‌اش
              همین‌جا می‌آید.
            </p>
          </div>
        ) : (
          <div className=" mt-3 flex flex-col gap-3">
            {attempts.map((a) => (
              <AttemptCard
                key={a.id}
                attempt={a}
                paper={a.examKey ? papers[a.examKey] : undefined}
                open={openId === a.id}
                onToggle={() => setOpenId((id) => (id === a.id ? null : a.id))}
              />
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function AttemptCard({
  attempt,
  paper,
  open,
  onToggle,
}: {
  attempt: ExamAttempt;
  paper?: ExamPaper;
  open: boolean;
  onToggle: () => void;
}) {
  const [at, setAt] = useState(0);
  const percent = attempt.maxScore
    ? Math.round((attempt.totalScore / attempt.maxScore) * 100)
    : 0;
  const color = scoreColor(percent);

  const entries = useMemo(
    () =>
      Object.entries(attempt.results)
        .map(([key, v]) => {
          const raw = v as unknown as {
            score?: number;
            max?: number;
            number?: number;
            parts?: StoredPart[];
          };
          const parts = Array.isArray(raw?.parts) ? raw.parts : [];
          // older rows stored {score,max}; newer ones store the graded parts,
          // so the totals are summed from whichever is actually there
          const score = parts.length
            ? parts.reduce((t, p) => t + Number(p.score ?? 0), 0)
            : Number(raw?.score ?? 0);
          const max = parts.length
            ? parts.reduce((t, p) => t + Number(p.maxScore ?? 0), 0)
            : Number(raw?.max ?? 0);
          return {
            key,
            n: Number(raw?.number ?? key),
            score,
            max,
            parts,
          };
        })
        .sort((a, b) =>
          Number.isFinite(a.n) && Number.isFinite(b.n) ? a.n - b.n : 0,
        ),
    [attempt.results],
  );

  const full = entries.filter((e) => e.max > 0 && e.score >= e.max).length;
  const zero = entries.filter((e) => e.max > 0 && e.score === 0).length;
  const partial = entries.length - full - zero;

  return (
    <div className=" rounded-2xl bg-card p-3 shadow sm:p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className=" flex w-full cursor-pointer items-center justify-between gap-3 text-right"
      >
        <div className=" flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div
            style={{ borderColor: color, color }}
            className=" flex size-14 shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold sm:size-16 sm:text-base"
          >
            {toFa(percent)}%
          </div>
          <div className=" min-w-0">
            <p className=" truncate text-sm font-bold sm:text-base">
              {attempt.examTitle}
            </p>
            <p className=" truncate text-xs text-muted-foreground">
              نمره {toFa(Math.round(attempt.totalScore * 10) / 10)} از{" "}
              {toFa(attempt.maxScore)}
            </p>
            <p className=" mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{relativeDay(attempt.createdAt)}</span>
              <span className=" opacity-60">{jalali(attempt.createdAt)}</span>
            </p>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div className=" mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ backgroundColor: color }}
          className=" h-full rounded-full"
        />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" overflow-hidden"
          >
            <div className=" mt-3 rounded-2xl bg-secondary p-3 sm:p-4">
              {!entries.length ? (
                <p className=" py-4 text-center text-sm text-muted-foreground">
                  ریزِ نمرهٔ این آزمون ذخیره نشده است.
                </p>
              ) : (
                <>
                  <div className=" mb-4 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className=" rounded-full bg-green-500/15 px-2.5 py-1 text-green-700 dark:text-green-400">
                      کامل: {toFa(full)}
                    </span>
                    <span className=" rounded-full bg-gold/15 px-2.5 py-1 text-gold">
                      نیمه: {toFa(partial)}
                    </span>
                    <span className=" rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">
                      بی‌نمره: {toFa(zero)}
                    </span>
                  </div>

                  {/* jump between questions, same as عروض and واژه‌یاب */}
                  <div className=" mb-4 flex flex-wrap gap-1.5">
                    {entries.map((e, i) => {
                      const kind = kindOf(e.score, e.max);
                      return (
                        <button
                          key={e.key}
                          type="button"
                          onClick={() => setAt(i)}
                          aria-current={i === at}
                          className={`size-7 cursor-pointer rounded-lg border-2 text-[11px] font-bold transition-all sm:size-8 ${
                            kind === "full"
                              ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                              : kind === "partial"
                                ? "border-gold bg-gold/15 text-gold"
                                : kind === "zero"
                                  ? "border-destructive bg-destructive/15 text-destructive"
                                  : "border-border bg-card text-muted-foreground"
                          } ${i === at ? "scale-110 ring-2 ring-primary" : "hover:scale-105"}`}
                        >
                          {toFa(e.n)}
                        </button>
                      );
                    })}
                  </div>

                  <QuestionReview
                    entry={entries[Math.min(at, entries.length - 1)]}
                    paper={paper}
                    answers={attempt.answers ?? null}
                  />

                  <div className=" mt-5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAt(Math.max(0, at - 1))}
                      disabled={at === 0}
                      className={`rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-all ${
                        at === 0
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer hover:border-primary/50 hover:text-primary active:scale-95"
                      }`}
                    >
                      سؤال قبلی
                    </button>
                    <button
                      type="button"
                      onClick={() => setAt(Math.min(entries.length - 1, at + 1))}
                      disabled={at + 1 >= entries.length}
                      className={`rounded-full px-5 py-2 text-xs font-bold text-primary-foreground transition-all ${
                        at + 1 >= entries.length
                          ? "cursor-not-allowed bg-primary/50"
                          : "cursor-pointer bg-primary hover:brightness-90 active:scale-95"
                      }`}
                    >
                      سؤال بعدی
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
