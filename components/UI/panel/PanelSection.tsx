import type { ReactNode } from "react";
import styles from "./panel-design.module.css";
import {
  Award,
  BookMarked,
  ClipboardCheck,
  Scale,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * قابِ تکرارشوندهٔ بخش‌های پنل — همان کامپوننتِ قبلی، با سه تغییر:
 *
 *   ۱. ⚠️ کلاسِ شیشه‌ایِ سایت برداشته شد. وقتی *همه‌چیز* شیشه‌ای است، شیشه دیگر چیزی
 *      را از چیزی جدا نمی‌کند؛ در پوستهٔ تازه فقط سایدبار و نوارِ بالا
 *      شیشه‌اند و محتوا روی سطحِ مات می‌نشیند.
 *
 *   ۲. عنوان از `text-2xl sm:text-3xl` به ۱۷/۱۹ پیکسل آمد. آن اندازه در
 *      صفحه‌ای که پنج بخش دارد، پنج عنوانِ هم‌وزنِ عنوانِ صفحه می‌ساخت.
 *
 *   ۳. آیکن‌های SVGِ دستی جای خود را به lucide دادند — همان مجموعه‌ای که
 *      سایدبار استفاده می‌کند، پس وزنِ خط در کلِ پنل یکی است.
 */

const ICONS: Record<string, LucideIcon> = {
  chart: TrendingUp,
  scale: Scale,
  clipboard: ClipboardCheck,
  bookmark: BookMarked,
  spy: Search,
  award: Award,
};

export default function PanelSection({
  title,
  hint,
  icon = "chart",
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  icon?: keyof typeof ICONS | string;
  className?: string;
  children: ReactNode;
}) {
  const Icon = ICONS[icon] ?? ICONS.chart;

  return (
    <section data-panel-card="" className={`rounded-2xl border border-border/70 bg-surface p-5 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={styles.sticker}
        >
          <Icon className="size-4.5" strokeWidth={1.8} />
        </span>
        <h2 className="text-[17px] font-bold sm:text-[19px]">{title}</h2>
      </div>
      {hint && <p className="mt-2 text-[13px] text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}
