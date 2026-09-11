"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fa, jalaliLong } from "@/lib/panel/format";

/**
 * «تمرینت نتیجه داد؟» — دقتِ کلی به تفکیکِ هفته.
 *
 * ⚠️ نمودارِ *مساحتی* و نه ستونی، چون پرسشِ این بخش «چقدر تمرین کردی» نیست،
 * «رو به بالا می‌روی یا نه» است؛ و شیبِ یک خط، جوابِ همان است.
 *
 * ⚠️ محور عمودی از صفر شروع نمی‌شود بلکه روی بازهٔ دادهٔ خودِ کاربر تنظیم
 * می‌شود (با کفِ ۲۵ درصد فاصله)، چون تفاوتِ ۷۲٪ و ۷۹٪ روی محورِ ۰ تا ۱۰۰
 * یک خطِ صاف به نظر می‌رسد در حالی که پیشرفتِ واقعی است. خطِ چین، میانگینِ
 * همین بازه است تا «بالاتر از معمول» معنا داشته باشد.
 */
export default function WeeklyTrendChart({
  points,
}: {
  points: { week: string; total: number; correct: number }[];
}) {
  const data = points.map((p) => ({
    week: p.week,
    label: jalaliLong(p.week),
    percent: p.total ? Math.round((p.correct / p.total) * 100) : 0,
    total: p.total,
  }));

  const values = data.map((d) => d.percent);
  const min = Math.max(0, Math.min(...values) - 8);
  const max = Math.min(100, Math.max(...values) + 8);
  const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="sarva-trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="4 6" className="stroke-border" opacity={0.45} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            orientation="right"
            domain={[min, max]}
            tickLine={false}
            axisLine={false}
            width={36}
            tickCount={4}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) => `${fa(Math.round(v))}٪`}
          />
          <ReferenceLine
            y={average}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 5"
            opacity={0.6}
            label={{
              value: `میانگین ${fa(average)}٪`,
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 11,
            }}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--primary)", strokeOpacity: 0.35 }} />
          <Area
            type="monotone"
            dataKey="percent"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#sarva-trend)"
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { label: string; percent: number; total: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const { label, percent, total } = payload[0].payload;

  return (
    <div
      dir="rtl"
      className="panel-num rounded-xl border border-border bg-popover px-3 py-2 text-[12px] leading-7 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)]"
    >
      <p className="font-semibold">هفتهٔ {label}</p>
      <p className="text-primary">{fa(percent)}٪ دقت</p>
      <p className="text-muted-foreground">از {fa(total)} تمرین</p>
    </div>
  );
}
