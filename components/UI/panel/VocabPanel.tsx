"use client";

import { useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";
import PanelSection from "@/components/UI/panel/PanelSection";
import StatRing from "@/components/UI/panel/StatRing";
import VocabBookmarks from "@/components/UI/panel/VocabBookmarks";
import VocabSessionList from "@/components/UI/panel/VocabSessionList";
import VocabTrend from "@/components/UI/panel/VocabTrend";
import { loadMoreVocabAnswers } from "@/app/panel/vocab/actions";
import { groupIntoSessions, streak } from "@/lib/panel/format";
import type { Bookmark, VocabAnswer } from "@/lib/panel/types";

type History = { grade: string; ok: boolean; at: string }[];

export default function VocabPanel({
  initialAnswers,
  initialHasMore,
  history,
  bookmarks,
}: {
  initialAnswers: VocabAnswer[];
  initialHasMore: boolean;
  history: History;
  bookmarks: Bookmark[];
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await loadMoreVocabAnswers(answers.length);
      setAnswers((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...next.answers.filter((a) => !seen.has(a.id))];
      });
      setHasMore(next.hasMore);
    } catch (err) {
      console.error("loadMoreVocabAnswers:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const total = history.length;
  const correct = history.filter((h) => h.ok).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  // «بهترین دست» is measured over the whole history, not the loaded page
  const best = groupIntoSessions(history, (h) => h.at).reduce((m, s) => {
    const p = Math.round((s.filter((h) => h.ok).length / s.length) * 100);
    return Math.max(m, p);
  }, 0);

  return (
    <div>
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        بازی واژه‌یاب
      </span>

      <div className=" glass rounded-xl p-4 sm:p-6">
        <div className=" mt-2 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-7">
          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={accuracy} />
            <span className=" text-base sm:text-lg">دقت در واژه‌یاب</span>
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
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">
                {toFa(total)}
              </span>{" "}
              واژه پاسخ دادی
            </div>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={best} />
            <span className=" text-base sm:text-lg">بهترین دست</span>
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
                d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">
                {toFa(streak(history.map((h) => h.at)))}
              </span>{" "}
              روز زنجیرۀ تلاش
            </div>
          </div>
        </div>
      </div>

      <PanelSection title="روند پیشرفت" icon="chart">
        <VocabTrend history={history} />
      </PanelSection>

      <PanelSection title="آزمون‌های پیشین" icon="clipboard">
        <VocabSessionList
          answers={answers}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </PanelSection>

      <PanelSection title="واژه‌های نشان‌شده" icon="bookmark">
        <VocabBookmarks bookmarks={bookmarks} />
      </PanelSection>
    </div>
  );
}
