"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fa, scoreColor } from "@/lib/panel/format";

/** کارنامهٔ وزن‌ها — one horizontal bar per metre, worst first.
 *
 *  Horizontal on purpose: a metre's name is «مفاعیلن مفاعیلن مفاعیلن مفاعیلن»,
 *  and no vertical axis label survives that. Sorted weakest-first so the row a
 *  student actually needs is the first one they read, and coloured on the same
 *  red→amber→green scale as every other score in the panel. */
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

  const data = weights
    .map((w) => ({
      name: w.weight,
      percent: Math.round((w.correct / w.total) * 100),
      correct: w.correct,
      total: w.total,
    }))
    .sort((a, b) => a.percent - b.percent);

  // each bar needs room to breathe; the chart grows with the number of metres
  const height = Math.max(180, data.length * 56 + 40);

  return (
    <div className=" mt-3 rounded-2xl bg-card p-3 shadow sm:p-4">
      <div style={{ height }} className=" w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 6, right: 8, left: 48, bottom: 6 }}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={172}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickMargin={6}
              orientation="right"
            />
            <Tooltip
              cursor={{ opacity: 0.08 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
                direction: "rtl",
              }}
              formatter={(value, _name, item) => {
                const d = item?.payload as (typeof data)[number] | undefined;
                return [
                  `${fa(Number(value ?? 0))}٪ — ${fa(d?.correct ?? 0)} از ${fa(d?.total ?? 0)}`,
                  "درست",
                ];
              }}
            />
            <Bar dataKey="percent" radius={[6, 6, 6, 6]} barSize={18}>
              {data.map((d) => (
                <Cell key={d.name} fill={scoreColor(d.percent)} />
              ))}
              <LabelList
                dataKey="percent"
                position="left"
                formatter={(v: unknown) => `${fa(Number(v ?? 0))}٪`}
                style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className=" mt-1 px-2 text-[11px] text-muted-foreground sm:text-xs">
        از ضعیف‌ترین وزن به قوی‌ترین. روی هر میله نگه دار تا تعداد درست‌ها را
        ببینی.
      </p>
    </div>
  );
}
