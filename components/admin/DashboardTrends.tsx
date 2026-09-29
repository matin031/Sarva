"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyTrends, TrendDay } from "@/lib/admin/overview-actions";
import { rialsToTomans } from "@/lib/plus/money";

const fa = (n: number) => n.toLocaleString("fa-IR");

type Metric = {
  key: "signups" | "attempts" | "revenue";
  title: string;
  unit: string;
  value: (d: TrendDay) => number;
  /** قالبِ عدد در تیتر و راهنما. */
  format: (n: number) => string;
};

/** فروش به تومان — همان واحدی که بقیهٔ سایت نشان می‌دهد. */
const toman = (d: TrendDay) => rialsToTomans(d.revenueRials);

/**
 * فشرده‌سازیِ عددِ بزرگ برای محور — «۱٫۳ میلیون» به‌جای هفت رقم که محور را
 * پهن می‌کند و برچسب‌ها را به هم می‌چسباند.
 */
const compactFormat = new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 });
const compact = (n: number) => compactFormat.format(n);

const METRICS: Metric[] = [
  { key: "signups", title: "ثبت‌نام", unit: "نفر", value: (d) => d.signups, format: fa },
  { key: "attempts", title: "آزمون و بازیِ کامل‌شده", unit: "بار", value: (d) => d.attempts, format: fa },
  { key: "revenue", title: "فروش سروا پلاس", unit: "تومان", value: toman, format: fa },
];

/**
 * روندِ سی‌روزهٔ داشبورد — سه نمودارِ کوچک، هرکدام یک سنجه.
 *
 * ⚠️ سه نمودار و نه یک نمودار با سه سری: «نفر»، «بار» و «تومان» سه مقیاسِ
 * بی‌ربط‌اند و روی یک محور، فروش بقیه را صاف می‌کرد. محورِ دوم هم راه‌حل
 * نیست — دو محور یعنی خواننده نمی‌داند کدام ستون را با کدام عدد بخواند.
 *
 * هرکدام تک‌سری است، پس راهنمای رنگ ندارد: تیتر خودش می‌گوید چیست.
 */
export default function DashboardTrends({ trends }: { trends: DailyTrends }) {
  if (trends.state === "unavailable") {
    return (
      <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        نمودارِ روزانه در دسترس نیست: جدول‌های منطقهٔ زمانیِ دیتابیس بارگذاری نشده‌اند و بدونِ آن‌ها
        روزِ تهران درست حساب نمی‌شود. راهنمای رفعش در «فعالیت و خطاها» و در{" "}
        <code dir="ltr">npm run db:check-tz</code> است.
      </p>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {METRICS.map((m) => (
        <TrendCard key={m.key} metric={m} days={trends.days} />
      ))}
    </div>
  );
}

function TrendCard({ metric, days }: { metric: Metric; days: TrendDay[] }) {
  const [showTable, setShowTable] = useState(false);
  const data = days.map((d) => ({ label: d.label, value: metric.value(d), orders: d.orders }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const last7 = data.slice(-7).reduce((s, d) => s + d.value, 0);
  const prev7 = data.slice(-14, -7).reduce((s, d) => s + d.value, 0);
  const change = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;
  const titleId = `trend-${metric.key}`;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id={titleId} className="text-xs font-medium text-muted-foreground">
            {metric.title} · ۳۰ روز
          </h3>
          <p className="mt-1 text-2xl font-bold">
            {metric.format(total)} <span className="text-xs font-normal text-muted-foreground">{metric.unit}</span>
          </p>
        </div>
        {change !== null && (
          /* ⚠️ جهتِ تغییر با علامت و متن هم گفته می‌شود، نه فقط با رنگ. */
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              change >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}
            title="هفتهٔ اخیر نسبت به هفتهٔ قبلش"
          >
            {change >= 0 ? "▲" : "▼"} {fa(Math.abs(change))}٪ این هفته
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          در این سی روز چیزی ثبت نشده.
        </p>
      ) : (
        <div className="h-32 w-full" role="img" aria-label={`${metric.title}: ${metric.format(total)} ${metric.unit} در سی روزِ گذشته`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} strokeDasharray="4 6" className="stroke-border" opacity={0.45} />
              {/* ⚠️ `reversed`: همان قاعدهٔ نمودارِ پنلِ کاربر — زمان از راست
                  به چپ جلو می‌رود و امروز سمتِ چپ است. */}
              <XAxis
                reversed
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={56}
                allowDecimals={false}
                tickCount={3}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) => compact(v)}
              />
              <Tooltip
                cursor={{ fill: "var(--foreground)", opacity: 0.05 }}
                content={<TrendTooltip metric={metric} />}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={18} minPointSize={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* جدولِ همان داده — برای صفحه‌خوان، و برای کسی که عددِ دقیقِ یک روز
          را می‌خواهد بی‌آنکه روی ستونِ باریک نشانه برود. */}
      {total > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-expanded={showTable}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {showTable ? "بستنِ جدول" : "نمایشِ جدول"}
          </button>
          {showTable && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 text-right text-muted-foreground">
                    <th className="px-3 py-1.5 font-medium">روز</th>
                    <th className="px-3 py-1.5 font-medium">{metric.unit}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((d) => (
                    <tr key={d.label} className="border-t border-border">
                      <td className="px-3 py-1.5">{d.label}</td>
                      <td className="px-3 py-1.5">{metric.format(d.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TrendTooltip({
  metric,
  active,
  payload,
  label,
}: {
  metric: Metric;
  active?: boolean;
  payload?: { payload: { value: number; orders: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const { value, orders } = payload[0].payload;
  return (
    <div dir="rtl" className="rounded-xl border border-border bg-popover px-3 py-2 text-[12px] leading-6 shadow-lg">
      <p className="font-semibold">{label}</p>
      <p>
        {metric.format(value)} {metric.unit}
      </p>
      {metric.key === "revenue" && orders > 0 && (
        <p className="text-muted-foreground">{fa(orders)} سفارش</p>
      )}
    </div>
  );
}
