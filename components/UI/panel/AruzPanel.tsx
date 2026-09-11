"use client";

import Link from "next/link";
import PanelPageHeader from "./PanelPageHeader";
import PracticeSummary from "./PracticeSummary";
import styles from "./panel-design.module.css";

import { useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";
import AruzAttemptList from "@/components/UI/panel/AruzAttemptList";
import AruzWeights from "@/components/UI/panel/AruzWeights";
import BookmarkedQuestions from "@/components/UI/panel/BookmarkedQuestions";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import PanelSection from "@/components/UI/panel/PanelSection";
import { loadMoreAruzAttempts } from "@/app/panel/aruz/actions";
import {
  bucketsFromDayCounts,
  correctFromDayCounts,
  streakFromDayCounts,
  totalFromDayCounts,
  type DayCount,
} from "@/lib/panel/day-counts";
import type { AruzAttempt, AruzPanelData, Bookmark } from "@/lib/panel/types";

/** The عروض page's whole body. The page itself is a Server Component that
 *  awaits the data, so the router does not swap to this route until the numbers
 *  exist — no spinner inside the panel, and no half-empty first paint. */
export default function AruzPanel({
  initialAttempts,
  initialHasMore,
  summary,
  dayCounts,
  bookmarks,
  weights,
}: {
  initialAttempts: AruzAttempt[];
  initialHasMore: boolean;
  summary: AruzPanelData["summary"];
  /** شمارشِ روزانه از دیتابیس — جای فهرستِ خامِ پاسخ‌ها.
   *  دلیلش در lib/panel/day-counts.ts نوشته شده. */
  dayCounts: DayCount[];
  bookmarks: Bookmark[];
  weights: { weight: string; total: number; correct: number }[];
}) {
  const [attempts, setAttempts] = useState(initialAttempts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await loadMoreAruzAttempts(attempts.length);
      setAttempts((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...next.attempts.filter((a) => !seen.has(a.id))];
      });
      setHasMore(next.hasMore);
    } catch (err) {
      console.error("loadMoreAruzAttempts:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // `user_answers` is the per-question record, so it is the honest basis for
  // accuracy; the attempt totals are the fallback for older histories.
  // `user_answers` is the per-question record, so it is the honest basis for
  // accuracy; the attempt totals are the fallback for older histories.
  const answeredInRange = totalFromDayCounts(dayCounts);
  const answered = answeredInRange || summary.questions;
  const correct = answeredInRange ? correctFromDayCounts(dayCounts) : summary.correct;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const days = streakFromDayCounts(dayCounts);

  return (
    <div className={styles.pageStack}>
      <PanelPageHeader title="عروض سماعی" description="گوش‌هایت را به وزن شعر بسپار؛ مسیر پیشرفتت اینجاست." tone="lilac" action={<Link href="/aruz" className={styles.resumeCta}>بریم تمرین کنیم <span aria-hidden>←</span></Link>} />
      <PracticeSummary items={[{ label: "دقت عروض سماعی", value: `${toFa(accuracy)}٪` }, { label: "پاسخ‌های تو", value: toFa(answered) }, { label: "بهترین عملکرد", value: `${toFa(summary.best)}٪` }, { label: "زنجیرهٔ تلاش", value: `${toFa(days)} روز` }]} />

      <PanelSection title="روند پیشرفت" icon="chart">
        <PanelTrendChart buckets={bucketsFromDayCounts(dayCounts, 30)} />
      </PanelSection>

      <PanelSection
        title="وزن‌ها"
        icon="scale"
        hint="هر وزنی که از آن تست داده‌ای، با درصد درستش. از ضعیف‌ترین به قوی‌ترین."
      >
        <AruzWeights weights={weights} />
      </PanelSection>

      <PanelSection title="آزمون‌های پیشین" icon="clipboard">
        <AruzAttemptList
          attempts={attempts}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </PanelSection>

      <PanelSection title="سؤال‌های نشان‌شده" icon="bookmark">
        <BookmarkedQuestions bookmarks={bookmarks} />
      </PanelSection>
    </div>
  );
}
