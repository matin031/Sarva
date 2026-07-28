"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import { dailyBuckets, scoreColor } from "@/lib/panel/format";
import { VOCAB_GRADES } from "@/lib/vocab-data";

const EASE = [0.16, 1, 0.3, 1] as const;

/** روند پیشرفت: the last two weeks day by day, and how each book is going.
 *
 *  Both read from the same three-column history, so nothing here costs an extra
 *  round trip. The bars carry the same red→amber→green scale as the score rings
 *  so a glance across the page means one thing, not two. */
export default function VocabTrend({
  history,
}: {
  history: { grade: string; ok: boolean; at: string }[];
}) {
  const days = useMemo(
    () => dailyBuckets(history.map((h) => ({ at: h.at, ok: h.ok })), 14),
    [history],
  );
  const peak = Math.max(1, ...days.map((d) => d.total));

  const books = useMemo(
    () =>
      VOCAB_GRADES.map((g) => {
        const rows = history.filter((h) => h.grade === g.id);
        const correct = rows.filter((h) => h.ok).length;
        return {
          id: g.id,
          title: g.title,
          total: rows.length,
          correct,
          percent: rows.length ? Math.round((correct / rows.length) * 100) : 0,
        };
      }),
    [history],
  );

  if (!history.length) {
    return (
      <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
        <p className=" text-muted-foreground">
          هنوز داده‌ای برای نشان‌دادن روند نیست.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className=" rounded-2xl bg-card p-4 shadow">
        <p className=" mb-4 text-sm font-bold">دو هفتهٔ گذشته</p>
        <div className=" flex items-end gap-1">
          {days.map((d, i) => (
            <div key={i} className=" flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className=" flex h-20 w-full items-end justify-center">
                <motion.span
                  initial={{ height: 0 }}
                  animate={{
                    height: `${Math.max((d.total / peak) * 100, d.total ? 10 : 4)}%`,
                  }}
                  transition={{ duration: 0.5, delay: i * 0.02, ease: EASE }}
                  title={`${d.total} واژه، ${d.correct} درست`}
                  className={`w-full max-w-2 rounded-full ${
                    d.total ? "bg-primary" : "bg-border"
                  }`}
                />
              </div>
              {/* fourteen dates do not fit across a phone; every other one is
                  enough to read the shape of the fortnight */}
              <span
                className={`truncate text-[9px] text-muted-foreground ${
                  i % 2 ? "max-sm:opacity-0" : ""
                }`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className=" rounded-2xl bg-card p-4 shadow">
        <p className=" mb-4 text-sm font-bold">به تفکیک کتاب</p>
        <div className=" flex flex-col gap-4">
          {books.map((b) => (
            <div key={b.id}>
              <div className=" mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                <span className=" font-bold">{b.title}</span>
                <span className=" text-muted-foreground">
                  {b.total
                    ? `${toFa(b.correct)} از ${toFa(b.total)} — ${toFa(b.percent)}%`
                    : "هنوز بازی نکرده‌ای"}
                </span>
              </div>
              <div className=" h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.percent}%` }}
                  transition={{ duration: 0.6, ease: EASE }}
                  style={{ backgroundColor: scoreColor(b.percent) }}
                  className=" h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
