"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import { groupIntoSessions, jalali, relativeDay, scoreColor } from "@/lib/panel/format";
import { VOCAB_GRADES } from "@/lib/vocab-data";
import { vocabImageUrl } from "@/lib/vocab-image";
import type { VocabAnswer } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const GRADE_TITLE: Record<string, string> = Object.fromEntries(
  VOCAB_GRADES.map((g) => [g.id, g.title]),
);

/** «دهم · درس ۱۱ و ۱۳» — what this round was actually about. */
function scopeLabel(items: VocabAnswer[]): string {
  const grades = [...new Set(items.map((a) => a.grade).filter(Boolean))].map(
    (g) => GRADE_TITLE[g] ?? g,
  );
  const lessons = [
    ...new Set(items.map((a) => a.lesson).filter((n): n is number => !!n)),
  ].sort((a, b) => a - b);
  const left = grades.join(" و ");
  const right = lessons.length
    ? `درس ${lessons.map((n) => toFa(n)).join(" و ")}`
    : "";
  return [left, right].filter(Boolean).join(" · ");
}

/** آزمون‌های پیشینِ واژه‌یاب.
 *
 *  واژه‌یاب logs one row per answer with no round id, so a "test" is recovered
 *  from the timestamps: answers minutes apart belong together, a gap of half an
 *  hour starts a new one. Grouping happens over the whole loaded list rather
 *  than per page, so a round split across a page boundary still comes back as
 *  one round after «بارگیری بیشتر». */
export default function VocabSessionList({
  answers,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  answers: VocabAnswer[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sessions = useMemo(
    () => groupIntoSessions(answers, (a) => a.answeredAt),
    [answers],
  );

  if (!sessions.length) {
    return (
      <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
        <p className=" text-muted-foreground">
          هنوز واژه‌یاب بازی نکرده‌ای. اولین دستِ کاملت که تمام شود، همین‌جا با
          همهٔ واژه‌هایش می‌آید.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-3 flex flex-col gap-y-3">
      {sessions.map((items) => (
        <SessionRow
          key={items[0].id}
          items={items}
          open={openId === items[0].id}
          onToggle={() =>
            setOpenId((id) => (id === items[0].id ? null : items[0].id))
          }
        />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className={`mx-auto mt-2 inline-flex items-center gap-x-2 rounded-2xl border border-border
            bg-card px-5 py-3 text-sm font-bold transition-all sm:px-6 ${
              loadingMore
                ? "cursor-not-allowed text-muted-foreground"
                : "cursor-pointer hover:border-primary/50 hover:text-primary active:scale-95"
            }`}
        >
          {loadingMore ? "...در حال بارگیری" : "بارگیری آزمون‌های بیشتر"}
        </button>
      )}
    </div>
  );
}

function SessionRow({
  items,
  open,
  onToggle,
}: {
  items: VocabAnswer[];
  open: boolean;
  onToggle: () => void;
}) {
  // the query reads newest-first; a round reads better in the order it was played
  const ordered = useMemo(() => [...items].reverse(), [items]);
  const correct = items.filter((a) => a.isCorrect).length;
  const percent = Math.round((correct / items.length) * 100);
  const color = scoreColor(percent);
  const when = ordered[0].answeredAt;

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
            className=" flex size-14 shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold transition-colors sm:size-16 sm:text-base"
          >
            {toFa(percent)}%
          </div>
          <div className=" min-w-0">
            <p className=" truncate text-sm font-bold sm:text-base">
              {toFa(correct)} از {toFa(items.length)} واژه درست
            </p>
            <p className=" truncate text-xs text-muted-foreground">
              {scopeLabel(items)}
            </p>
            <p className=" mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{relativeDay(when)}</span>
              <span className=" opacity-60">{jalali(when)}</span>
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
              <SessionReview items={ordered} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The round, replayed one card at a time — same picture card, same progress
 *  bar and same green/red answer chips the game itself uses. */
function SessionReview({ items }: { items: VocabAnswer[] }) {
  const [index, setIndex] = useState(0);
  const at = Math.min(index, items.length - 1);
  const a = items[at];
  const goTo = (i: number) => setIndex(Math.max(0, Math.min(i, items.length - 1)));

  return (
    <div dir="rtl">
      <div className=" mb-2 flex items-center justify-between gap-2 text-xs">
        <span className=" rounded-full bg-card px-3 py-1 font-bold">
          {toFa(at + 1)} / {toFa(items.length)}
        </span>
        {a.lesson && (
          <span className=" truncate text-muted-foreground">
            {(GRADE_TITLE[a.grade] ?? a.grade) + " · درس " + toFa(a.lesson)}
          </span>
        )}
      </div>

      <div className=" mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className=" h-full rounded-full bg-primary"
          animate={{ width: `${((at + 1) / items.length) * 100}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>

      {/* jump to any word — green right, red wrong */}
      <div className=" mb-4 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => goTo(i)}
            aria-current={i === at}
            title={it.word}
            className={`size-7 cursor-pointer rounded-lg border-2 text-[11px] font-bold transition-all sm:size-8 sm:text-xs ${
              it.isCorrect
                ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
                : "border-destructive bg-destructive/15 text-destructive"
            } ${i === at ? "scale-110 ring-2 ring-primary" : "hover:scale-105"}`}
          >
            {toFa(i + 1)}
          </button>
        ))}
      </div>

      <motion.div
        key={a.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className=" relative z-20 mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
      >
        {a.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vocabImageUrl(a.image)}
            alt={a.word}
            loading="lazy"
            className=" absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className=" absolute inset-0 flex items-center justify-center text-3xl">
            🖼️
          </div>
        )}
      </motion.div>

      <div
        className={`mx-auto mt-4 max-w-sm rounded-2xl border-2 px-4 py-3 text-center text-lg font-bold ${
          a.isCorrect
            ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-400"
            : "border-destructive bg-destructive/15 text-destructive"
        }`}
      >
        {a.word}
      </div>

      <p className=" mx-auto mt-2 max-w-sm text-center text-xs text-muted-foreground">
        {a.isCorrect ? "✓ درست زدی" : "✕ آن‌بار اشتباه زدی"}
      </p>

      {a.meaning && (
        <p className=" mx-auto mt-3 max-w-sm rounded-2xl border border-border bg-card p-3 text-sm leading-relaxed">
          {a.meaning}
        </p>
      )}

      <div className=" mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(at - 1)}
          disabled={at === 0}
          className={`inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold transition-all ${
            at === 0
              ? "cursor-not-allowed opacity-40"
              : "cursor-pointer hover:border-primary/50 hover:text-primary active:scale-95"
          }`}
        >
          واژهٔ قبلی
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => goTo(at + 1)}
          disabled={at + 1 >= items.length}
          className={`inline-flex items-center gap-1 rounded-full px-5 py-2 text-xs font-bold text-primary-foreground transition-all ${
            at + 1 >= items.length
              ? "cursor-not-allowed bg-primary/50"
              : "cursor-pointer bg-primary hover:brightness-90 active:scale-95"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
          </svg>
          واژهٔ بعدی
        </button>
      </div>
    </div>
  );
}
