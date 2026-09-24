import type { MetadataRoute } from "next";
import { absoluteUrl, isNoindexEnvironment } from "@/lib/seo/site";
import { robotsRules } from "@/lib/seo/policy";
import { readAiPolicy } from "@/lib/seo/settings";

/**
 * robots.txt
 *
 * ⚠️ دو اصلاح نسبت به نسخهٔ قبل:
 *
 * ۱) آدرسِ sitemap به دامنهٔ قدیم اشاره می‌کرد. حالا از منبعِ مشترک می‌آید.
 *
 * ۲) `/quiz` و `/result` در `disallow` بودند، در حالی که خودشان
 *    `robots: noindex` هم دارند. این دو با هم جمع نمی‌شوند: وقتی خزنده
 *    اجازهٔ *خواندنِ* صفحه را ندارد، برچسبِ noindex را هم هرگز نمی‌بیند. پس
 *    آدرس می‌تواند بدونِ محتوا در نتایج بماند — دقیقاً برعکسِ چیزی که
 *    خواسته شده. مسدودسازی برداشته شد تا noindex واقعاً کار کند.
 *
 * ⚠️ و نکتهٔ اصلی: هیچ‌کدامِ این‌ها جای احراز هویت نیستند. `/panel` با
 *    بررسیِ سشن محافظت می‌شود؛ ردیفِ زیر فقط جلوی خرجِ بی‌فایدهٔ خزش را
 *    می‌گیرد، نه دسترسی را.
 */
/**
 * ⚠️ سیاستِ ربات‌های هوش مصنوعی از پنلِ مدیریت می‌آید (صفحهٔ «سئو»)، پس این
 * فایل دیگر کاملاً ایستا نیست: ساعتی یک بار از نو ساخته می‌شود و ذخیرهٔ آن
 * تنظیم هم فوراً بازسازی‌اش می‌کند (`revalidatePath`). اگر خواندنِ تنظیمات
 * شکست بخورد، پیش‌فرض «همه مجاز» است — یعنی بدترین حالت همان رفتارِ قبلی.
 * منطقِ قواعد در lib/seo/policy.ts.
 */
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  // پیش‌نمایش و staging نباید ایندکس شوند. production این را ارث نمی‌برد
  // چون متغیر آنجا تنظیم نیست.
  if (isNoindexEnvironment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: robotsRules(await readAiPolicy()),
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
