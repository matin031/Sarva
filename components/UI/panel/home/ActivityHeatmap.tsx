import { CalendarDays } from "lucide-react";
import styles from "../panel-design.module.css";
import { fa } from "@/lib/panel/format";
import { tehranDayKey, type DayCount } from "@/lib/panel/day-counts";

const WEEKS = 18;
const DAY = 86_400_000;
/** شنبه = ۰. */
const WEEKDAY: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };

/**
 * نقشهٔ فعالیت — هر خانه یک روز، هر ستون یک هفته (شنبه تا جمعه).
 *
 * ⚠️ ستون‌ها در `dir=rtl` از راست چیده می‌شوند، پس قدیمی‌ترین هفته سمتِ
 * راست است و امروز سمتِ چپ — همان جهتی که متنِ فارسی خوانده می‌شود.
 *
 * ⚠️ روزها با کم کردنِ ۲۴ ساعت ساخته می‌شوند. ایران از ۲۰۲۲ ساعتِ تابستانی
 * ندارد، پس هیچ روزی دو بار یا صفر بار نمی‌آید.
 */
export default function ActivityHeatmap({ dayCounts, now }: { dayCounts: DayCount[]; now: Date }) {
  const byDay = new Map<string, number>();
  for (const c of dayCounts) byDay.set(c.day, (byDay.get(c.day) ?? 0) + c.total);

  const weekday = WEEKDAY[new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" }).format(now)] ?? 0;
  const cellCount = (WEEKS - 1) * 7 + weekday + 1;
  const label = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", day: "numeric", month: "long" });

  const cells = Array.from({ length: cellCount }, (_, i) => {
    const d = new Date(now.getTime() - (cellCount - 1 - i) * DAY);
    const total = byDay.get(tehranDayKey(d)) ?? 0;
    return { key: i, total, label: label.format(d) };
  });

  const peak = Math.max(1, ...cells.map((c) => c.total));
  const busiest = cells.reduce((b, c) => (c.total > b.total ? c : b), cells[0]);
  const active = cells.filter((c) => c.total > 0).length;
  const level = (t: number) => (t === 0 ? 0 : Math.min(4, Math.ceil((t / peak) * 4)));

  return (
    <section className={`${styles.focus} flex h-full flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}>
            <CalendarDays aria-hidden className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-bold">نقشهٔ فعالیت</h2>
            <p className="panel-num mt-0.5 text-[13px] text-muted-foreground">
              {fa(active)} روز فعال در {fa(WEEKS)} هفتهٔ اخیر
            </p>
          </div>
        </div>
      </div>

      <div className={styles.heatWrap}>
        <div className={styles.heatDays} aria-hidden>
          <span>ش</span>
          <span />
          <span>د</span>
          <span />
          <span>چ</span>
          <span />
          <span>ج</span>
        </div>
        <ol className={styles.heat} aria-label="تعداد پاسخ در هر روز">
          {cells.map((c) => (
            <li
              key={c.key}
              data-level={level(c.total)}
              title={`${c.label}: ${c.total ? `${fa(c.total)} پاسخ` : "بدون تمرین"}`}
            >
              <span className="sr-only">
                {c.label}: {fa(c.total)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4 text-[11px] text-muted-foreground">
        {busiest.total > 0 ? (
          <p className="panel-num">
            پرکارترین روز: <span className="font-semibold text-foreground">{busiest.label}</span> با {fa(busiest.total)} پاسخ
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5" aria-hidden>
          کمتر
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={styles.heatSwatch} data-level={l} />
          ))}
          بیشتر
        </div>
      </div>
    </section>
  );
}
