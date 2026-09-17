import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import styles from "../panel-design.module.css";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
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
 *
 * ⚠️ گرادیانِ حلقه از رنگِ نمره به همان رنگِ روشن‌تر می‌رود و نه به رنگِ
 * برند — وگرنه حلقهٔ ۳۰٪ نوکش سبز می‌شد و پیامِ رنگ را پس می‌گرفت.
 */
export default function AreaCards({ overview }: { overview: PanelOverview }) {
  const { counts, exams } = overview;
  const areas: BookmarkArea[] = ["aruz", "vocab", "jasoos", "exam"];

  return (
    <section className={styles.areas}>
      <div className="mb-4">
        <h2 className="text-base font-bold">بخش‌های تمرین</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          کارنامهٔ هر بخش، جدا از بقیه
        </p>
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
            <Link key={area} href={`/panel/${area}`} className={styles.areaLink}>
              {/* ⚠️ وقتی هنوز داده‌ای نیست، گلیفِ بخش می‌آید و نه یک حلقهٔ
                  صفردرصد — «صفر» را به کسی نسبت می‌دهد که هنوز چیزی امتحان
                  نکرده است. */}
              <AnimatedCircularProgress
                value={percent}
                ready={has}
                glyph={AREA_GLYPH[area]}
                color={has ? [scoreColor(percent), scoreColor(Math.min(100, percent + 18))] : undefined}
                valueColor={has ? scoreColor(percent) : undefined}
                label={
                  has
                    ? `${AREA_TITLE[area]}: ${percent} درصد`
                    : `${AREA_TITLE[area]}: بدون تمرین`
                }
                className="size-14"
              />
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
