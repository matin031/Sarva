"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import PanelSection from "@/components/UI/panel/PanelSection";
import StatRing from "@/components/UI/panel/StatRing";
import { jalali, relativeDay, scoreColor } from "@/lib/panel/format";
import type { ExamAttempt } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/** کارنامهٔ امتحان‌های نهایی.
 *
 *  A final exam is not a quiz: questions are worth different marks and can be
 *  half-right, so the review is a grid of marks per question rather than a
 *  right/wrong list. The grid scales — a 12-question paper and a 40-question
 *  one both stay readable because each question is a chip, not a row. */
export default function ExamPanel({ attempts }: { attempts: ExamAttempt[] }) {
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
  open,
  onToggle,
}: {
  attempt: ExamAttempt;
  open: boolean;
  onToggle: () => void;
}) {
  const percent = attempt.maxScore
    ? Math.round((attempt.totalScore / attempt.maxScore) * 100)
    : 0;
  const color = scoreColor(percent);

  const entries = useMemo(
    () =>
      Object.entries(attempt.results)
        .map(([key, v]) => ({
          key,
          n: Number(key),
          score: Number(v?.score ?? 0),
          max: Number(v?.max ?? 0),
        }))
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
                  <div className=" mb-3 flex flex-wrap gap-2 text-[11px] font-bold">
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

                  <div className=" grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                    {entries.map((e) => {
                      const kind =
                        e.max <= 0
                          ? "none"
                          : e.score >= e.max
                            ? "full"
                            : e.score > 0
                              ? "partial"
                              : "zero";
                      return (
                        <span
                          key={e.key}
                          title={`سؤال ${e.n + 1}: ${e.score} از ${e.max}`}
                          className={`flex aspect-square items-center justify-center rounded-lg border-2 text-[11px] font-black ${
                            kind === "full"
                              ? "border-green-500/60 bg-green-500/15 text-green-700 dark:text-green-400"
                              : kind === "partial"
                                ? "border-gold/60 bg-gold/15 text-gold"
                                : kind === "zero"
                                  ? "border-destructive/60 bg-destructive/15 text-destructive"
                                  : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {toFa(Number.isFinite(e.n) ? e.n + 1 : e.key)}
                        </span>
                      );
                    })}
                  </div>
                  <p className=" mt-3 text-[11px] text-muted-foreground">
                    روی هر خانه نگه دار تا نمرهٔ آن سؤال را ببینی.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
