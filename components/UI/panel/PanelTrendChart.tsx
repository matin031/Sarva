"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dailyBuckets, fa } from "@/lib/panel/format";

type Bucket = { label: string; total: number; correct: number };

/**
 * روند تمرین — یک ستون برای هر روز، بخشِ پررنگ همان‌قدر که درست بوده.
 *
 * ⚠️ در طرحِ تازه این نمودار **تمرکزِ صفحه نیست**؛ زیرِ «از همین‌جا ادامه
 * بده» و نشان‌ها می‌نشیند و لحنِ آرام‌تری دارد: ارتفاعِ کمتر، شبکهٔ کم‌رنگ‌تر
 * و رنگِ نادرست به‌جای خاکستریِ بی‌معنا، قرمزِ کم‌اشباع. دلیلش این است که
 * دانش‌آموز با «امروز چه کار کنم» به پنل می‌آید، نه با «تاریخچه‌ام را
 * تحلیل کن» — آن کار جای خودش را در «برنامهٔ من» دارد.
 */
export default function PanelTrendChart({
  history,
  buckets,
  days = 30,
}: {
  history?: { at: string; ok: boolean }[];
  /** سطل‌های ازپیش‌آماده — وقتی دیتابیس خودش روزها را شمرده باشد. */
  buckets?: Bucket[];
  days?: number;
}) {
  const source = buckets ?? dailyBuckets(history ?? [], days);
  const data = source.map((d) => ({
    label: d.label,
    correct: d.correct,
    wrong: Math.max(d.total - d.correct, 0),
    total: d.total,
  }));

  const busiest = Math.max(...data.map((d) => d.total), 0);

  if (busiest === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        در این بازه پاسخی ثبت نشده است. اولین تمرین، همین‌جا ستونِ خودش را
        می‌سازد.
      </p>
    );
  }

  return (
    <div className="-mx-1">
      <div className="h-44 w-full sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} strokeDasharray="4 6" className="stroke-border" opacity={0.45} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            {/* ⚠️ محور عمودی *عمداً* هست. بدونِ آن، ستونِ بلند فقط «زیاد»
                معنی می‌داد؛ با آن، «۲۶ پاسخ» معنی می‌دهد.
                `orientation="right"` چون صفحه راست‌به‌چپ است و Recharts
                خودش جهت را از dir نمی‌گیرد. */}
            <YAxis
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
              tickCount={4}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => fa(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--foreground)", opacity: 0.05 }}
              content={<TrendTooltip />}
            />
            <Bar dataKey="correct" stackId="a" radius={[0, 0, 4, 4]}>
              {data.map((d) => (
                <Cell key={d.label} fill="var(--primary)" />
              ))}
            </Bar>
            <Bar dataKey="wrong" stackId="a" radius={[4, 4, 0, 0]} animationDuration={700}>
              {data.map((d) => (
                <Cell
                  key={d.label}
                  fill="color-mix(in oklch, var(--destructive) 45%, var(--border))"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-5 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary" /> درست
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[color-mix(in_oklch,var(--destructive)_45%,var(--border))]" />
          نادرست
        </span>
      </div>
    </div>
  );
}

/**
 * راهنمای شناور.
 *
 * ⚠️ دستی نوشته شده و نه با `formatter` پیش‌فرضِ Recharts، چون آن نسخه
 * ارقام را لاتین می‌گذاشت و ترتیبِ «برچسب: مقدار» را در راست‌به‌چپ وارونه
 * نشان می‌داد.
 */
function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: { correct: number; wrong: number; total: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const { correct, wrong, total } = payload[0].payload;

  return (
    <div
      dir="rtl"
      className="panel-num rounded-xl border border-border bg-popover px-3 py-2 text-[12px] leading-7 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)]"
    >
      <p className="font-semibold">{label}</p>
      {total === 0 ? (
        <p className="text-muted-foreground">پاسخی ثبت نشده</p>
      ) : (
        <>
          <p className="text-primary">{fa(correct)} درست</p>
          <p className="text-muted-foreground">{fa(wrong)} نادرست</p>
        </>
      )}
    </div>
  );
}
