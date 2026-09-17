import type { ReactNode } from "react";
import SarvaBuddy from "./SarvaBuddy";
import styles from "./panel-design.module.css";

/**
 * سرصفحهٔ هر صفحهٔ پنل — **یک** قالب، برای همهٔ صفحه‌ها.
 *
 * ── چه چیزی عوض شد و چرا ───────────────────────────────────────────────────
 * ⚠️ نسخهٔ قبلی یک کارتِ بزرگ با گوشه‌های نامتقارن (`28px 28px 12px 28px`) و
 * یک نهالِ ۱۰۶ پیکسلی بود که با هیچ سطحِ دیگری در سایت هم‌خوان نبود: نه
 * شعاعش، نه حاشیه‌اش، نه ارتفاعش. صفحهٔ خانه هم *نسخهٔ سوم* داشت با رنگ‌های
 * هاردکدِ فیروزه‌ای (`#102d38`) که با عوض شدنِ پالتِ سایت اصلاً عوض نمی‌شد.
 *
 * حالا هر سه یکی‌اند و همه‌شان از توکن‌های خودِ سایت رنگ می‌گیرند، پس با
 * کلیدِ پالت و کلیدِ تم هم‌راه می‌شوند.
 *
 * ⚠️ `title` **همیشه** متنِ ماست و هرگز متنِ کاربر.
 *
 * صفحهٔ تیکت عنوانِ خودِ تیکت را اینجا می‌گذاشت. یک عنوانِ ۱۶۰ نویسه‌ای
 * سرصفحه را سه برابر می‌کرد و نهال را به لبه می‌چسباند — و بدتر از آن،
 * نوشتهٔ کاربر را در جایگاهی می‌نشاند که خواننده آن را حرفِ *سایت*
 * می‌فهمد. متنِ کاربر حالا داخلِ خودِ گفت‌وگوست، با `line-clamp`.
 */
export default function PanelPageHeader({
  title,
  description,
  eyebrow,
  tone = "mint",
  action,
  art = true,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  tone?: "mint" | "gold" | "lilac" | "rose";
  action?: ReactNode;
  /** نهالِ کنارِ سرصفحه. صفحه‌های پشتِ سرِ هم بهتر است بی‌نهال بمانند. */
  art?: boolean;
}) {
  return (
    <header className={styles.pageHeader} data-tone={tone}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className={styles.pageEyebrow}>
            <span aria-hidden className={styles.pageEyebrowDot} />
            {eyebrow}
          </p>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
      </div>
      {art && (
        <div aria-hidden className={styles.pageArt}>
          <SarvaBuddy small />
        </div>
      )}
    </header>
  );
}
