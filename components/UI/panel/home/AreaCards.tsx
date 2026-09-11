import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import styles from "../panel-design.module.css";
import { fa, scoreColor } from "@/lib/panel/format";
import { AREA_GLYPH, AREA_TITLE } from "@/lib/panel/derive";
import type { BookmarkArea, PanelOverview } from "@/lib/panel/types";

/**
 * چهار بخشِ سروا، هرکدام با کارنامهٔ خودش.
 *
 * ⚠️ حلقهٔ دایره‌ای اینجا رنگِ نمره می‌گیرد (`scoreColor`) و نه رنگِ برند —
 * برعکسِ `StatRing` در بالای صفحه. تفاوتشان عمدی است و در خودِ StatRing هم
 * نوشته شده: بالا یک *هویت* است («دقتِ تو»)، اینجا یک *قضاوت* («این بخش
 * چطور است») و رنگ باید همان را بگوید.
 */
export default function AreaCards({ overview }: { overview: PanelOverview }) {
  const { counts, exams } = overview;
  const areas: BookmarkArea[] = ["aruz", "vocab", "jasoos", "exam"];

  return (
    <section className={styles.areas}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">مسیرهای یادگیری تو</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            کارنامه و نتیجهٔ تمرین‌ها، به تفکیک هر بخش
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        {areas.map((area) => {
          const c = counts[area];
          const isExam = area === "exam";
          const has = isExam ? exams.attempts > 0 : c.total > 0;
          const percent = isExam
            ? exams.average
            : c.total
              ? Math.round((c.correct / c.total) * 100)
              : 0;

          return (
            <Link
              key={area}
              href={`/panel/${area}`}
              className={styles.areaLink}
            >
              <Ring percent={has ? percent : null} glyph={AREA_GLYPH[area]} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{AREA_TITLE[area]}</p>
                <p className="panel-num text-[12.5px] text-muted-foreground">
                  {isExam
                    ? has
                      ? `${fa(exams.attempts)} کارنامه · بهترین ${fa(exams.best)}٪`
                      : "هنوز آزمونی نداده‌ای"
                    : has
                      ? `${fa(c.correct)} از ${fa(c.total)} پاسخ درست`
                      : "هنوز تمرینی نکرده‌ای"}
                </p>
              </div>
              <ArrowUpLeft aria-hidden className={`size-4 ${styles.areaArrow}`} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** حلقهٔ کوچکِ کنارِ نامِ بخش. وقتی هنوز داده‌ای نیست، گلیفِ بخش را نشان
 *  می‌دهد — یک حلقهٔ صفردرصد، «صفر» را به کاربر نسبت می‌دهد در حالی که
 *  او هنوز چیزی امتحان نکرده. */
function Ring({ percent, glyph }: { percent: number | null; glyph: string }) {
  const r = 43;
  const c = 2 * Math.PI * r;

  if (percent === null) {
    return (
      <span
        aria-hidden
        className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border/70 bg-foreground/5 text-xl"
      >
        {glyph}
      </span>
    );
  }

  return (
    <span className="relative size-14 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-border" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          stroke={scoreColor(percent)}
        />
      </svg>
      <span
        className="panel-num absolute inset-0 grid place-items-center text-sm font-bold"
        style={{ color: scoreColor(percent) }}
      >
        {fa(percent)}٪
      </span>
    </span>
  );
}
