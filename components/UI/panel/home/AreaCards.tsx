import Link from "next/link";
import { ArrowUpLeft, LayoutGrid } from "lucide-react";
import styles from "../panel-design.module.css";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { fa, scoreColor } from "@/lib/panel/format";
import { AREA_GLYPH, AREA_PANEL_HREF, AREA_TITLE } from "@/lib/panel/derive";
import type { PanelOverview, PracticeArea } from "@/lib/panel/types";

/**
 * بخش‌های سروا، هرکدام با حلقهٔ دقتِ خودش.
 *
 * ⚠️ حلقه رنگِ نمره می‌گیرد (`scoreColor`) و نه رنگِ برند: اینجا عدد یک
 * *قضاوت* است («این بخش چطور است») و رنگ باید همان را بگوید.
 *
 * ⚠️ وقتی هنوز داده‌ای نیست حلقه «—» نشان می‌دهد و نه «۰٪»؛ صفر را به کسی
 * نسبت می‌دهد که هنوز چیزی امتحان نکرده است.
 */
export default function AreaCards({ overview }: { overview: PanelOverview }) {
  const { counts, exams } = overview;
  const areas: PracticeArea[] = ["aruz", "vocab", "jasoos", "rangAra", "exam"];

  return (
    <section className={styles.areas}>
      <div className={`mb-4 ${styles.sectionHeading}`}>
        <span className={styles.sectionIcon}>
          <LayoutGrid aria-hidden className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold">بخش‌های تمرین</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">دقت در هر بخش</p>
        </div>
      </div>

      <div className="flex flex-col">
        {areas.map((area) => {
          const c = counts[area];
          const isExam = area === "exam";
          const has = isExam ? exams.attempts > 0 : c.total > 0;
          const percent = isExam ? exams.average : c.total ? Math.round((c.correct / c.total) * 100) : 0;

          return (
            <Link key={area} href={AREA_PANEL_HREF[area]} className={styles.areaLink}>
              <span aria-hidden className={styles.areaGlyph}>
                {AREA_GLYPH[area]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">{AREA_TITLE[area]}</p>
                <p className="panel-num mt-0.5 text-[12px] text-muted-foreground">
                  {isExam
                    ? has
                      ? `${fa(exams.attempts)} کارنامه · بهترین ${fa(exams.best)}٪`
                      : "هنوز آزمونی نداده‌ای"
                    : has
                      ? `${fa(c.correct)} از ${fa(c.total)} پاسخ درست`
                      : "هنوز تمرینی نکرده‌ای"}
                </p>
              </div>
              <AnimatedCircularProgress
                value={percent}
                ready={has}
                color={scoreColor(percent)}
                label={has ? `${AREA_TITLE[area]}: ${percent} درصد` : `${AREA_TITLE[area]}: بدون داده`}
                className="size-11"
              />
              <ArrowUpLeft aria-hidden className={`size-4 ${styles.areaArrow}`} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
