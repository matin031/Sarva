"use client";

import Link from "next/link";
import PanelPageHeader from "./PanelPageHeader";
import PracticeSummary from "./PracticeSummary";
import styles from "./panel-design.module.css";

import { useState } from "react";
import { toFa } from "@/components/UI/CircularProgress";
import PanelSection from "@/components/UI/panel/PanelSection";
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
    <div className={styles.pageStack}>
      <PanelPageHeader title="واژه‌یاب" description="هر واژه، یک کشف کوچک؛ بیا ببین چقدر جلو آمده‌ای." tone="gold" action={<Link href="/game/vocab" className={styles.resumeCta}>بریم تمرین کنیم <span aria-hidden>←</span></Link>} />
      <PracticeSummary items={[{ label: "دقت در واژه‌یاب", value: `${toFa(accuracy)}٪` }, { label: "واژه‌های پاسخ‌داده", value: toFa(total) }, { label: "بهترین دست", value: `${toFa(best)}٪` }, { label: "زنجیرهٔ تلاش", value: `${toFa(streak(history.map(h => h.at)))} روز` }]} />

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
