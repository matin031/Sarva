"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChartColumnBig } from "lucide-react";
import styles from "../panel-design.module.css";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import { fa } from "@/lib/panel/format";

type Bucket = { label: string; total: number; correct: number };
const RANGES = [7, 30, 90] as const;

/** نمودارِ روند با انتخابِ بازه. سطل‌های ۹۰ روز یک بار از سرور می‌آیند و بازه فقط برشِ آخرشان است. */
export default function TrendCard({ buckets }: { buckets: Bucket[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const slice = buckets.slice(-range);
  const total = slice.reduce((n, d) => n + d.total, 0);
  const correct = slice.reduce((n, d) => n + d.correct, 0);

  return (
    <section className={`${styles.focus} h-full`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}>
            <ChartColumnBig aria-hidden className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold">روند تمرین</h2>
            <p className="panel-num mt-0.5 text-[13px] text-muted-foreground">
              {total ? `${fa(total)} پاسخ، ${fa(Math.round((correct / total) * 100))}٪ درست` : "بدون پاسخ در این بازه"}
            </p>
          </div>
        </div>
        <div role="radiogroup" aria-label="بازهٔ نمودار" className={styles.segmented}>
          {RANGES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}>
              {range === r && (
                <motion.span layoutId="trend-range" className={styles.segmentedPill} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="panel-num relative">{fa(r)} روز</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <PanelTrendChart buckets={slice} days={range} />
      </div>
    </section>
  );
}
