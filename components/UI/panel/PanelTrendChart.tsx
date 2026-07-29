"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { dailyBuckets, fa } from "@/lib/panel/format";

/** روند پیشرفت — the same bar chart the panel home uses, but reading real
 *  answers instead of sample data. One bar per day: height is how much was
 *  answered, the darker part is how much was right. */
export default function PanelTrendChart({
  history,
  days = 14,
}: {
  history: { at: string; ok: boolean }[];
  days?: number;
}) {
  const data = dailyBuckets(history, days).map((d) => ({
    label: d.label,
    correct: d.correct,
    wrong: Math.max(d.total - d.correct, 0),
  }));

  const empty = data.every((d) => d.correct + d.wrong === 0);
  if (empty) {
    return (
      <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
        <p className=" text-muted-foreground">
          در دو هفتهٔ گذشته پاسخی ثبت نشده است.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-3 rounded-2xl bg-card p-3 shadow sm:p-4">
      <div className=" h-56 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              cursor={{ opacity: 0.08 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
              formatter={(value, name) => [
                fa(Number(value ?? 0)),
                name === "correct" ? "درست" : "نادرست",
              ]}
            />
            <Bar dataKey="correct" stackId="a" fill="var(--primary)" radius={[0, 0, 6, 6]} />
            <Bar
              dataKey="wrong"
              stackId="a"
              fill="var(--border)"
              radius={[6, 6, 0, 0]}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className=" mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className=" flex items-center gap-1.5">
          <span className=" size-2.5 rounded-full bg-primary" /> درست
        </span>
        <span className=" flex items-center gap-1.5">
          <span className=" size-2.5 rounded-full bg-border" /> نادرست
        </span>
      </div>
    </div>
  );
}
