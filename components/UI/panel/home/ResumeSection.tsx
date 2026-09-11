import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import styles from "../panel-design.module.css";
import { Button } from "@/components/UI/kit/button";
import { fa } from "@/lib/panel/format";
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
 */
export default function ResumeSection({ items }: { items: ResumeItem[] }) {
  return (
    <section className={styles.focus}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon}><Play aria-hidden className="size-4" /></span>
          <div>
          <h2 className="text-base font-bold">از همین‌جا ادامه بده</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            بر پایهٔ آخرین تمرین‌های خودت
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
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/8 text-xl"
              >
                {item.glyph}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{item.title}</span>
                <span className="block text-[11px] text-muted-foreground">{item.reason}</span>
                {item.percent !== null && (
                  <span className="mt-2 flex items-center gap-2.5">
                    <span
                      className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/8"
                      role="img"
                      aria-label={`دقت ${fa(item.percent)} درصد`}
                    >
                      <span
                        className="block h-full rounded-full bg-linear-to-l from-primary to-primary-deep"
                        style={{ width: `${item.percent}%` }}
                      />
                    </span>
                    <span className="panel-num shrink-0 text-[11.5px] text-muted-foreground">
                      {fa(item.percent)}٪ دقت
                    </span>
                  </span>
                )}
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
