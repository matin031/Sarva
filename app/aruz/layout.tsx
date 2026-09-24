import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";

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
export const metadata: Metadata = catalogMetadata("/aruz");

export default function AruzLayout({ children }: { children: React.ReactNode }) {
  return children;
}
