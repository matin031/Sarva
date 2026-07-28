"use client";
import { useEffect, useMemo, useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";
import AruzAttemptList from "@/components/UI/panel/AruzAttemptList";
import BookmarkedQuestions from "@/components/UI/panel/BookmarkedQuestions";
import { loadAruzPanel, loadMoreAruzAttempts } from "./actions";
import type { AruzPanelData } from "./actions";
import { streak } from "@/lib/panel/format";
import type { AruzAttempt, Bookmark } from "@/lib/panel/types";

function page() {
  const [attempts, setAttempts] = useState<AruzAttempt[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<AruzPanelData["summary"]>({
    attempts: 0,
    best: 0,
    questions: 0,
    correct: 0,
  });
  const [activity, setActivity] = useState<{ at: string; ok: boolean }[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAruzPanel()
      .then((data) => {
        if (cancelled || !data) return;
        setAttempts(data.attempts);
        setHasMore(data.hasMore);
        setSummary(data.summary);
        setActivity(data.activity);
        setBookmarks(data.bookmarks);
      })
      .catch((err) => console.error("loadAruzPanel:", err))
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
      const next = await loadMoreAruzAttempts(attempts.length);
      // ids are unique per attempt, so a page fetched twice cannot duplicate a row
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

  const stats = useMemo(() => {
    // `user_answers` is the per-question record, so it is the honest basis for
    // accuracy; the attempt totals are the fallback for anyone whose answers
    // predate it. Both describe the whole history, not the loaded page.
    const answered = activity.length || summary.questions;
    const correct = activity.length
      ? activity.filter((x) => x.ok).length
      : summary.correct;

    return {
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      answered,
      best: summary.best,
      streak: streak(activity.map((x) => x.at)),
    };
  }, [summary, activity]);

  /** «—» until the real number arrives, so nothing on screen is ever a guess. */
  const show = (n: number) => (ready ? toFa(n) : "—");

  return (
    <div>
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        عروض سماعی
      </span>
      <div className=" glass rounded-xl p-6">
        <div className="  grid grid-cols-2 gap-7 mt-6">
          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-6">
            <div className=" size-22 rounded-full border-4 border-border flex items-center justify-center text-2xl">
              {show(stats.accuracy)}%
            </div>
            <span className=" text-lg">دقت عروض سماعی</span>
          </div>
          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-10"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"
              />
            </svg>

            <div className=" text-lg">
              <span className=" text-gold text-3xl">{show(stats.answered)}</span>{" "}
              تست پاسخ دادی
            </div>
          </div>
          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-6">
            <div className=" size-22 rounded-full border-4 border-border flex items-center justify-center text-2xl">
              {show(stats.best)}%
            </div>
            <span className=" text-lg">بهترین عملکرد</span>
          </div>
          <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-10"
            >
              <path
                fillRule="evenodd"
                d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z"
                clipRule="evenodd"
              />
            </svg>

            <div className=" text-lg">
              <span className=" text-gold text-3xl">{show(stats.streak)}</span>{" "}
              روز زنجیرۀ تلاش
            </div>
          </div>
        </div>
      </div>
      <div className=" glass mt-6 p-6 rounded-xl">
        <div className=" flex items-center gap-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-10"
          >
            <path
              fillRule="evenodd"
              d="M9 1.5H5.625c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5Zm6.61 10.936a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 14.47a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              clipRule="evenodd"
            />
            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
          </svg>
          <h2 className=" text-3xl">آزمون‌های پیشین</h2>
        </div>

        {ready ? (
          <AruzAttemptList
            attempts={attempts}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        ) : (
          <div className=" bg-card shadow rounded-xl p-8 mt-3 text-center text-muted-foreground">
            ...در حال بارگذاری آزمون‌ها
          </div>
        )}
      </div>

      <div className=" glass mt-6 p-6 rounded-xl">
        <div className=" flex items-center gap-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-10 text-gold"
          >
            <path
              fillRule="evenodd"
              d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className=" text-3xl">سؤال‌های نشان‌شده</h2>
        </div>

        {ready ? (
          <BookmarkedQuestions bookmarks={bookmarks} />
        ) : (
          <div className=" bg-card shadow rounded-xl p-8 mt-3 text-center text-muted-foreground">
            ...در حال بارگذاری
          </div>
        )}
      </div>
    </div>
  );
}

export default page;
