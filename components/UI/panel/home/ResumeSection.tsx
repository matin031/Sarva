import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import styles from "../panel-design.module.css";
import { Button } from "@/components/UI/kit/button";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { fa, scoreColor } from "@/lib/panel/format";
import type { ResumeItem } from "@/lib/panel/derive";

/**
 * تمرکزِ اصلیِ صفحهٔ خانه.
 *
 * ⚠️ جای یک دکمهٔ «ادامهٔ تمرین» را گرفته است، و دلیلش این است که سروا یک
 * تمرین ندارد: عروض، واژه‌یاب، جاسوس و آزمون چهار مسیرِ جدا هستند و یک
 * دکمهٔ عمومی مجبور بود یکی را خودسرانه انتخاب کند.
 *
 * ⚠️ هر سطر **دلیلِ خودش** را می‌نویسد و هر دلیل از یک عددِ واقعی می‌آید
 * (آخرین روزِ فعالیت، دقتِ همان بخش). سطری که دلیلش را نگوید، پیشنهادِ
 * تبلیغاتی به نظر می‌رسد و کاربر یاد می‌گیرد نادیده‌اش بگیرد.
 *
 * ── حلقه به‌جای نوار ──────────────────────────────────────────────────────
 * ⚠️ درصدِ دقت تا دیروز یک نوارِ افقیِ دست‌ساز بود (یک `div` با
 * `style={{ width: … }}`) که کنارِ یک مربعِ گلیف می‌نشست — یعنی همین صفحه
 * دو زبانِ متفاوت برای یک چیز داشت: پایین‌تر، `AreaCards` دقیقاً همین عدد
 * را با حلقهٔ `AnimatedCircularProgress` نشان می‌داد.
 *
 * حالا همان حلقه اینجا هم هست و نوار حذف شده. نتیجه‌اش سه چیز است که نوار
 * نداشت: انیمیشنِ پر شدن با همان منحنیِ بقیهٔ پنل، رنگی که از `scoreColor`
 * می‌آید (پس ۳۰٪ و ۹۰٪ یک رنگ نیستند)، و گلیفِ بخش به‌عنوان حالتِ «هنوز
 * داده‌ای نیست» — به‌جای یک نوارِ خالی که شبیهِ صفر خوانده می‌شد.
 */
export default function ResumeSection({ items }: { items: ResumeItem[] }) {
  return (
    <section className={styles.focus}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}><Play aria-hidden className="size-4" /></span>
          <div>
          <h2 className="text-base font-bold">ادامهٔ تمرین</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            بر پایهٔ آخرین تمرین‌هایت
          </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/game">همهٔ تمرین‌ها</Link>
        </Button>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.area}>
            <Link
              href={item.href}
              className={`group flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 transition-colors duration-150 hover:border-primary/40 sm:flex-nowrap ${styles.resumeLink}`}
            >
              {/* ⚠️ همان قراردادِ `AreaCards`: تا وقتی داده‌ای نیست حلقه
                  عدد نمی‌نویسد و گلیفِ بخش را نشان می‌دهد. «۰٪» به کسی که
                  هنوز چیزی امتحان نکرده، یک قضاوت است و نه یک گزارش. */}
              <AnimatedCircularProgress
                value={item.percent ?? 0}
                ready={item.percent !== null}
                glyph={item.glyph}
                color={
                  item.percent !== null
                    ? [scoreColor(item.percent), scoreColor(Math.min(100, item.percent + 18))]
                    : undefined
                }
                valueColor={item.percent !== null ? scoreColor(item.percent) : undefined}
                label={
                  item.percent !== null
                    ? `${item.title}: دقت ${fa(item.percent)} درصد`
                    : `${item.title}: بدون تمرین`
                }
                className="size-12"
              />

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{item.title}</span>
                <span className="block text-[11px] text-muted-foreground">{item.reason}</span>
              </span>

              {/* دکمه داخلِ لینک است، پس خودش لینک نیست — وگرنه لینکِ تودرتو
                  می‌شد. ظاهرِ دکمه را دارد و کلیک روی کلِ سطر کار می‌کند. */}
              <span
                aria-hidden
                className={`shrink-0 ${styles.resumeCta}`}
              >
                {item.cta}
                <ArrowLeft className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
