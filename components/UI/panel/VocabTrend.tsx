"use client";

import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";

/** روند پیشرفتِ واژه‌یاب — the same day-by-day chart the rest of the panel uses,
 *  given the whole width. The per-book breakdown that used to sit beside it was
 *  answering a question nobody asked; the daily shape is the one people read. */
export default function VocabTrend({
  history,
}: {
  history: { grade: string; ok: boolean; at: string }[];
}) {
  return (
    <PanelTrendChart
      history={history.map((h) => ({ at: h.at, ok: h.ok }))}
      days={30}
    />
  );
}
