import { Flame, TrendingUp, TrendingDown, Target } from "lucide-react";
import styles from "../panel-design.module.css";
import StatRing from "@/components/UI/panel/StatRing";
import DailyGoal from "@/components/UI/panel/home/DailyGoal";
import { MagicCard } from "@/components/UI/kit/magic/magic-card";
import { NumberTicker } from "@/components/UI/kit/magic/number-ticker";
import { fa } from "@/lib/panel/format";
import type { StreakDay } from "@/lib/panel/derive";
import { DAILY_UNAVAILABLE_NOTE } from "@/lib/analytics/daily";

/**
 * چهار کارتِ خلاصه: زنجیره، دقت، این هفته، هدفِ امروز.
 *
 * ⚠️ وقتی گروه‌بندیِ روز در دسترس نیست (`daysUsable = false`)، سه کارتِ
 * روزمحور **نمایش داده نمی‌شوند**: زنجیرهٔ «۰ روز» و «این هفته ۰ پاسخ» به
 * کسی که صدها پاسخ داده غلط است. به‌جایشان کلِ پاسخ‌ها می‌آید که از
 * `counts` است و به منطقهٔ زمانی ربطی ندارد.
 */
export default function StatCards({
  daysUsable,
  streak,
  best,
  week,
  accuracy,
  correct,
  total,
  today,
  weekTotal,
  prevWeekTotal,
  weekBuckets,
  todayKey,
}: {
  daysUsable: boolean;
  streak: number;
  best: number;
  week: StreakDay[];
  accuracy: number;
  correct: number;
  total: number;
  today: number;
  weekTotal: number;
  prevWeekTotal: number;
  weekBuckets: { label: string; total: number; correct: number }[];
  todayKey: string;
}) {
  const accuracyCard = (
    <MagicCard className={styles.statCard}>
      <div className="flex h-full items-center gap-4">
        <StatRing
          percent={accuracy}
          ready={total > 0}
          label={total > 0 ? `دقت کل: ${accuracy} درصد` : "هنوز پاسخی ثبت نشده"}
          className="size-22 shrink-0"
        />
        <div className="min-w-0">
          <p className={styles.statLabel}>دقت کل</p>
          {total > 0 ? (
            <p className="panel-num mt-1 text-sm">
              {fa(correct)} از {fa(total)} پاسخ درست
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">هنوز پاسخی ثبت نشده.</p>
          )}
        </div>
      </div>
    </MagicCard>
  );

  if (!daysUsable) {
    return (
      <section aria-label="خلاصهٔ پیشرفت" className={`grid md:grid-cols-2 ${styles.stats}`}>
        <MagicCard className={styles.statCard}>
          <p className={styles.statLabel}>همهٔ پاسخ‌ها</p>
          <p className={styles.statValue}>
            <NumberTicker value={total} />
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{DAILY_UNAVAILABLE_NOTE}</p>
        </MagicCard>
        {accuracyCard}
      </section>
    );
  }

  const todayDone = week[week.length - 1]?.done ?? false;
  const diff = weekTotal - prevWeekTotal;
  const peak = Math.max(1, ...weekBuckets.map((d) => d.total));

  return (
    <section aria-label="خلاصهٔ پیشرفت" className={`grid sm:grid-cols-2 xl:grid-cols-4 ${styles.stats}`}>
      {/* ── زنجیرهٔ تلاش ── */}
      <MagicCard className={styles.statCard}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={styles.statLabel}>زنجیرهٔ تلاش</p>
            <p className={`${styles.statValue} text-gold`}>
              <NumberTicker value={streak} />
              <span className={styles.statUnit}>روز</span>
            </p>
          </div>
          <span className={styles.statIcon} data-tone="gold" data-live={streak > 0 || undefined}>
            <Flame aria-hidden className="size-5" strokeWidth={2} />
          </span>
        </div>

        {/* هفت روزِ گذشته — عددِ تنها نمی‌گوید کدام روز جا افتاده. */}
        <ul className="mt-4 flex gap-1.5" aria-label="هفت روز گذشته">
          {week.map((day) => (
            <li key={day.key} className="flex flex-1 flex-col items-center gap-1">
              <span
                aria-hidden
                className={styles.streakDot}
                data-done={day.done || undefined}
                data-today={day.isToday || undefined}
              >
                {day.done ? "✓" : ""}
              </span>
              <span className="text-[10.5px] text-muted-foreground/80">{day.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">
          {todayDone
            ? best > streak
              ? `${fa(best - streak)} روز تا رکوردت (${fa(best)} روز).`
              : streak > 1
                ? "این رکورد توست."
                : "امروز تمرین کردی."
            : streak > 0
              ? "امروز تمرین کن تا زنجیره نشکند."
              : "امروز هنوز تمرین نکرده‌ای."}
        </p>
      </MagicCard>

      {accuracyCard}

      {/* ── این هفته ── */}
      <MagicCard className={styles.statCard}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={styles.statLabel}>این هفته</p>
            <p className={styles.statValue}>
              <NumberTicker value={weekTotal} />
              <span className={styles.statUnit}>پاسخ</span>
            </p>
          </div>
          {/* ⚠️ مقایسه با هفتهٔ پیش است و نه با یک «هدفِ هفتگی» که کسی تعیینش نکرده. */}
          {prevWeekTotal > 0 && diff !== 0 && (
            <span className={styles.delta} data-up={diff > 0 || undefined}>
              {diff > 0 ? <TrendingUp aria-hidden className="size-3.5" /> : <TrendingDown aria-hidden className="size-3.5" />}
              <span className="panel-num">{fa(Math.round((Math.abs(diff) / prevWeekTotal) * 100))}٪</span>
            </span>
          )}
        </div>
        <div className={styles.spark} aria-hidden>
          {weekBuckets.map((d, i) => (
            <span
              key={i}
              title={`${d.label}: ${fa(d.total)} پاسخ`}
              style={{ height: `${Math.max((d.total / peak) * 100, d.total ? 10 : 4)}%`, animationDelay: `${i * 50}ms` }}
              data-empty={d.total === 0 || undefined}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {prevWeekTotal === 0 && weekTotal === 0
            ? "این هفته هنوز تمرینی ثبت نشده."
            : diff > 0
              ? `${fa(diff)} پاسخ بیشتر از هفتهٔ پیش.`
              : diff < 0
                ? `${fa(-diff)} پاسخ کمتر از هفتهٔ پیش.`
                : "برابر با هفتهٔ پیش."}
        </p>
      </MagicCard>

      {/* ── هدفِ امروز ── */}
      <MagicCard className={styles.statCard}>
        <div className="flex items-center justify-between gap-3">
          <p className={styles.statLabel}>هدف امروز</p>
          <span className={styles.statIcon}>
            <Target aria-hidden className="size-5" strokeWidth={2} />
          </span>
        </div>
        <DailyGoal today={today} todayKey={todayKey} />
      </MagicCard>
    </section>
  );
}
