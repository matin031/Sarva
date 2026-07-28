"use client";
import { useEffect, useMemo, useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";
import VocabSessionList from "@/components/UI/panel/VocabSessionList";
import VocabBookmarks from "@/components/UI/panel/VocabBookmarks";
import VocabTrend from "@/components/UI/panel/VocabTrend";
import StatRing from "@/components/UI/panel/StatRing";
import SarvaLoader from "@/components/UI/SarvaLoader";
import { loadMoreVocabAnswers, loadVocabPanel } from "./actions";
import { groupIntoSessions, streak } from "@/lib/panel/format";
import type { Bookmark, VocabAnswer } from "@/lib/panel/types";

type History = { grade: string; ok: boolean; at: string }[];

function page() {
  const [answers, setAnswers] = useState<VocabAnswer[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [history, setHistory] = useState<History>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadVocabPanel()
      .then((data) => {
        if (cancelled || !data) return;
        setAnswers(data.answers);
        setHasMore(data.hasMore);
        setHistory(data.summary);
        setBookmarks(data.bookmarks);
      })
      .catch((err) => console.error("loadVocabPanel:", err))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const stats = useMemo(() => {
    const total = history.length;
    const correct = history.filter((h) => h.ok).length;
    // «بهترین دست» is measured over the whole history, not the loaded page, so
    // it cannot drift as more rounds are pulled in
    const best = groupIntoSessions(history, (h) => h.at).reduce((m, s) => {
      const p = Math.round((s.filter((h) => h.ok).length / s.length) * 100);
      return Math.max(m, p);
    }, 0);
    return {
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      total,
      best,
      streak: streak(history.map((h) => h.at)),
    };
  }, [history]);

  /** «—» until the real number arrives, so nothing on screen is ever a guess. */
  const show = (n: number) => (ready ? toFa(n) : "—");

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
            <StatRing percent={stats.accuracy} ready={ready} />
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
                {show(stats.total)}
              </span>{" "}
              واژه پاسخ دادی
            </div>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={stats.best} ready={ready} />
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
                {show(stats.streak)}
              </span>{" "}
              روز زنجیرۀ تلاش
            </div>
          </div>
        </div>
      </div>

      <div className=" glass mt-6 rounded-xl p-4 sm:p-6">
        <div className=" flex items-center gap-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className=" size-8 shrink-0 sm:size-10"
          >
            <path
              fillRule="evenodd"
              d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className=" text-2xl sm:text-3xl">روند پیشرفت</h2>
        </div>

        {ready ? (
          <VocabTrend history={history} />
        ) : (
          <div className=" mt-3 rounded-2xl bg-card p-8 shadow">
            <SarvaLoader label="در حال بارگذاری" />
          </div>
        )}
      </div>

      <div className=" glass mt-6 rounded-xl p-4 sm:p-6">
        <div className=" flex items-center gap-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className=" size-8 shrink-0 sm:size-10"
          >
            <path
              fillRule="evenodd"
              d="M9 1.5H5.625c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5Zm6.61 10.936a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 14.47a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              clipRule="evenodd"
            />
            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
          </svg>
          <h2 className=" text-2xl sm:text-3xl">آزمون‌های پیشین</h2>
        </div>

        {ready ? (
          <VocabSessionList
            answers={answers}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        ) : (
          <div className=" mt-3 rounded-2xl bg-card p-8 shadow">
            <SarvaLoader label="در حال بارگذاری آزمون‌ها" />
          </div>
        )}
      </div>

      <div className=" glass mt-6 rounded-xl p-4 sm:p-6">
        <div className=" flex items-center gap-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className=" size-8 shrink-0 text-gold sm:size-10"
          >
            <path
              fillRule="evenodd"
              d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className=" text-2xl sm:text-3xl">واژه‌های نشان‌شده</h2>
        </div>

        {ready ? (
          <VocabBookmarks bookmarks={bookmarks} />
        ) : (
          <div className=" mt-3 rounded-2xl bg-card p-8 shadow">
            <SarvaLoader label="در حال بارگذاری" />
          </div>
        )}
      </div>
    </div>
  );
}

export default page;
