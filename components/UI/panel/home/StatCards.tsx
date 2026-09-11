import { Flame, ChartNoAxesCombined } from "lucide-react";
import styles from "../panel-design.module.css";
import StatRing from "@/components/UI/panel/StatRing";
import { Card } from "@/components/UI/kit/card";
import { fa } from "@/lib/panel/format";
import type { StreakDay } from "@/lib/panel/derive";

/**
 * سه عدد، نه چهار.
 *
 * ⚠️ چهارمی («نشان‌شده‌ها») به سایدبار رفت. یک شمارنده که فقط یک لینک است،
 * جای یک کارتِ هم‌اندازه با «دقتِ کل» را نمی‌گیرد؛ چشم باید بین سه چیزِ
 * واقعاً مهم انتخاب کند، نه چهار چیزِ هم‌وزن.
 *
 * ترتیب هم تصادفی نیست: زنجیره اول است چون تنها عددی است که *امروز* با یک
 * کارِ کوچک عوض می‌شود.
 */
export default function StatCards({
  streak,
  best,
  week,
  accuracy,
  correct,
  total,
  weekTotal,
  prevWeekTotal,
}: {
  streak: number;
  best: number;
  week: StreakDay[];
  accuracy: number;
  correct: number;
  total: number;
  weekTotal: number;
  prevWeekTotal: number;
}) {
  const todayDone = week[week.length - 1]?.done ?? false;
  const diff = weekTotal - prevWeekTotal;

  return (
    <section aria-label="خلاصهٔ پیشرفت" className={`grid md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr] ${styles.stats}`}>
      {/* ── زنجیرهٔ تلاش ── */}
      <Card className="p-5">
        <div className="flex items-center gap-3.5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-gold/12 text-gold">
            <Flame aria-hidden className="size-7" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">زنجیرهٔ تلاش</p>
            <p className="panel-num text-[32px] font-bold text-gold">
              {fa(streak)}
              <span className="ms-1.5 text-base font-medium text-muted-foreground">
                روز پیاپی
              </span>
            </p>
          </div>
        </div>

        {/* هفت روزِ گذشته. نوار، خودِ زنجیره را *نشان* می‌دهد؛ عددِ تنها
            نمی‌گوید کدام روز جا افتاده. */}
        <ul className="mt-4 flex gap-2" aria-label="هفت روز گذشته">
          {week.map((day) => (
            <li key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={[
                  "grid h-9 w-full place-items-center rounded-xl border text-[13px] transition-colors",
                  day.done
                    ? "border-gold/40 bg-gold/12 text-gold"
                    : "border-border/70 bg-foreground/4 text-muted-foreground/60",
                  day.isToday ? "border-2 border-gold ring-3 ring-gold/15" : "",
                ].join(" ")}
              >
                {day.done ? "✓" : day.isToday ? "امروز" : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground/80">{day.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">
          {todayDone
            ? best > streak
              ? `امروز را ثبت کردی. تا رکوردت (${fa(best)} روز) ${fa(best - streak)} روز مانده.`
              : `امروز را ثبت کردی — این بلندترین زنجیرهٔ توست.`
            : streak > 0
              ? `یک تمرین امروز، زنجیره را به ${fa(streak + 1)} می‌رساند.`
              : "با یک تمرینِ امروز، زنجیره‌ات از نو شروع می‌شود."}
        </p>
      </Card>

      {/* ── دقتِ کل ── */}
      <Card className="flex items-center gap-4 p-5">
        <StatRing percent={accuracy} className="size-20 shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">دقت در همهٔ بخش‌ها</p>
          <p className="panel-num mt-0.5 text-sm">
            {fa(correct)} از {fa(total)} پاسخ درست
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            روی هر پاسخی که تا امروز داده‌ای حساب شده است.
          </p>
        </div>
      </Card>

      {/* ── هفتهٔ جاری ── */}
      <Card className="p-5">
        <span className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ChartNoAxesCombined aria-hidden className="size-5" /></span>
        <p className="text-[13px] text-muted-foreground">تمرین این هفته</p>
        <p className="panel-num text-[32px] font-bold">
          {fa(weekTotal)}
          <span className="ms-1.5 text-base font-medium text-muted-foreground">پاسخ</span>
        </p>
        {/* ⚠️ مقایسه با هفتهٔ پیش است و نه با یک «هدفِ هفتگی». هدف، عددی
            است که هیچ‌کس تعیینش نکرده؛ هفتهٔ پیش، عددِ خودِ کاربر است. */}
        <p className="mt-2 text-xs text-muted-foreground">
          {prevWeekTotal === 0 && weekTotal === 0
            ? "این هفته هنوز تمرینی ثبت نشده."
            : diff > 0
              ? `${fa(diff)} پاسخ بیشتر از هفتهٔ پیش.`
              : diff < 0
                ? `${fa(-diff)} پاسخ کمتر از هفتهٔ پیش (${fa(prevWeekTotal)}).`
                : "دقیقاً به‌اندازهٔ هفتهٔ پیش."}
        </p>
      </Card>
    </section>
  );
}
