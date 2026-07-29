"use client";

import { motion } from "motion/react";
import { fa, scoreColor } from "@/lib/panel/format";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Where the ear is strong and where it is not, metre by metre.
 *
 *  Sorted worst first on purpose: the row a student needs is the one they keep
 *  missing, and burying it under four green bars is how progress pages end up
 *  being decorative. */
export default function AruzWeights({
  weights,
}: {
  weights: { weight: string; total: number; correct: number }[];
}) {
  if (!weights.length) {
    return (
      <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
        <p className=" text-muted-foreground">
          هنوز از سؤال‌های وزن‌دار چیزی پاسخ نداده‌ای. سؤال‌های «وزن به صوت» که
          بزنی، کارنامهٔ هر وزن همین‌جا می‌آید.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-3 flex flex-col gap-3">
      {weights.map((w, i) => {
        const percent = Math.round((w.correct / w.total) * 100);
        const color = scoreColor(percent);
        const verdict =
          percent >= 80
            ? "خیلی خوب"
            : percent >= 60
              ? "قابل قبول"
              : percent >= 35
                ? "بیشتر تمرین کن"
                : "نیاز به تلاش";
        return (
          <motion.div
            key={w.weight}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03, ease: EASE }}
            className=" rounded-2xl bg-card p-4 shadow"
          >
            <div className=" mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className=" font-bold" dir="rtl">
                {w.weight}
              </span>
              <span className=" flex items-center gap-x-2 text-xs text-muted-foreground">
                <span>
                  {fa(w.correct)} از {fa(w.total)}
                </span>
                <span style={{ color }} className=" font-bold">
                  {fa(percent)}٪ — {verdict}
                </span>
              </span>
            </div>
            <div className=" h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE }}
                style={{ backgroundColor: color }}
                className=" h-full rounded-full"
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
