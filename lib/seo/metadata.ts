import type { Metadata } from "next";
import { absoluteUrl, isNoindexEnvironment } from "./site";

/**
 * ساختِ metadata یک صفحهٔ عمومی، با canonicalِ خودش.
 *
 * ⚠️ چرا لازم است: در `app/layout.tsx` مقدارِ `alternates.canonical = "/"`
 * نشسته بود. متادیتا در Next ارث می‌رسد، پس *هر* صفحه‌ای که canonicalِ خودش
 * را تعریف نکرده بود، خودش را نسخهٔ تکراریِ صفحهٔ خانه اعلام می‌کرد —
 * /aruz، /vazn-yab، /doroos و همهٔ زیرشاخه‌هایش، /exam، /game و همهٔ
 * بازی‌ها. برای موتور جست‌وجو یعنی «این صفحه محتوای تازه‌ای ندارد، خانه را
 * ببین»؛ یعنی هیچ‌کدام از آن صفحه‌ها شانسی برای دیده شدن نداشتند.
 *
 * ریشهٔ ایراد این بود که canonicalِ درست *اختیاری* بود. حالا این تابع آن را
 * اجباری می‌کند: مسیر ورودیِ لازم است.
 */
export function pageMetadata(input: {
  /** مسیرِ همین صفحه، با اسلشِ آغازین. مثلاً `/vazn-yab`. */
  path: string;
  title: string;
  description: string;
  /** برای صفحاتی که نباید ایندکس شوند (جلسهٔ آزمون، کارنامه، ورود). */
  noindex?: boolean;
  /** اگر صفحه تصویرِ اشتراک‌گذاریِ خودش را دارد. */
  image?: string;
  openGraphType?: "website" | "article";
}): Metadata {
  const { path, title, description, noindex, image, openGraphType } = input;
  const url = absoluteUrl(path);

  // ⚠️ `SEO_NOINDEX` روی همه چیز اثر می‌گذارد تا پیش‌نمایش و staging ایندکس
  // نشوند — ولی production این را به ارث نمی‌برد چون متغیر آنجا تنظیم نیست.
  const blocked = noindex || isNoindexEnvironment();

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: blocked
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      title,
      description,
      url,
      siteName: "سروا",
      locale: "fa_IR",
      type: openGraphType ?? "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
