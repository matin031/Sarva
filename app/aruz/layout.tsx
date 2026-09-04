import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * ⚠️ `/aruz` تا امروز هیچ متادیتایی نداشت.
 *
 * یعنی عنوانِ صفحهٔ خانه را می‌گرفت («سروا | آموزش وزن و عروض شعر فارسی…») و
 * `canonical: "/"` را هم به ارث می‌برد. دومی بدترین بخشش است: صفحهٔ اصلیِ
 * عروض به موتور جست‌وجو می‌گفت «من تکراریِ خانه‌ام، مرا ایندکس نکن» — درست
 * همان صفحه‌ای که باید برای «آموزش عروض» دیده شود.
 *
 * خودِ صفحه client component است، پس متادیتا اینجا می‌نشیند.
 */
export const metadata: Metadata = pageMetadata({
  path: "/aruz",
  title: "آموزش عروض سماعی",
  description:
    "عروض سماعی را با گوش یاد بگیرید: آموزش گام‌به‌گام وزن شعر فارسی، تمرین شنیداری با نمونه‌های صوتی، و بازی‌هایی برای تشخیص وزن و تقطیع.",
});

export default function AruzLayout({ children }: { children: React.ReactNode }) {
  return children;
}
