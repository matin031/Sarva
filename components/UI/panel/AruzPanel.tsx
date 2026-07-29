"use client";

import { useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";
import AruzAttemptList from "@/components/UI/panel/AruzAttemptList";
import AruzWeights from "@/components/UI/panel/AruzWeights";
import BookmarkedQuestions from "@/components/UI/panel/BookmarkedQuestions";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import StatRing from "@/components/UI/panel/StatRing";
import PanelSection from "@/components/UI/panel/PanelSection";
import { loadMoreAruzAttempts } from "@/app/panel/aruz/actions";
import { streak } from "@/lib/panel/format";
import type { AruzAttempt, AruzPanelData, Bookmark } from "@/lib/panel/types";

/** The عروض page's whole body. The page itself is a Server Component that
 *  awaits the data, so the router does not swap to this route until the numbers
 *  exist — no spinner inside the panel, and no half-empty first paint. */
export default function AruzPanel({
  initialAttempts,
  initialHasMore,
  summary,
  activity,
  bookmarks,
  weights,
}: {
  initialAttempts: AruzAttempt[];
  initialHasMore: boolean;
  summary: AruzPanelData["summary"];
  activity: { at: string; ok: boolean }[];
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
  const answered = activity.length || summary.questions;
  const correct = activity.length
    ? activity.filter((x) => x.ok).length
    : summary.correct;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const days = streak(activity.map((x) => x.at));

  return (
    <div>
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        عروض سماعی
      </span>

      <div className=" glass rounded-xl p-4 sm:p-6">
        <div className=" mt-2 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-7">
          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-4 sm:gap-x-6">
            <StatRing percent={accuracy} />
            <span className=" text-base sm:text-lg">دقت عروض سماعی</span>
          </div>

          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-4 sm:gap-x-6">
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
                d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-gold text-2xl sm:text-3xl">
                {toFa(answered)}
              </span>{" "}
              تست پاسخ دادی
            </div>
          </div>

          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-4 sm:gap-x-6">
            <StatRing percent={summary.best} />
            <span className=" text-base sm:text-lg">بهترین عملکرد</span>
          </div>

          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-4 sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                fillRule="evenodd"
                d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-gold text-2xl sm:text-3xl">{toFa(days)}</span>{" "}
              روز زنجیرۀ تلاش
            </div>
          </div>
        </div>
      </div>

      <PanelSection title="روند پیشرفت" icon="chart">
        <PanelTrendChart history={activity} />
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
