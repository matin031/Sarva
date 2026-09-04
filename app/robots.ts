import type { MetadataRoute } from "next";
import { absoluteUrl, isNoindexEnvironment } from "@/lib/seo/site";

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
export default function robots(): MetadataRoute.Robots {
  // پیش‌نمایش و staging نباید ایندکس شوند. production این را ارث نمی‌برد
  // چون متغیر آنجا تنظیم نیست.
  if (isNoindexEnvironment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/panel",
        // نتیجهٔ شخصیِ یک جلسه — محتوای عمومی نیست.
        "/result",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
