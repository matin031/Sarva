import type { Metadata } from "next";
import { absoluteUrl, isNoindexEnvironment } from "./site";
import { SEO_PAGES, type SeoPath } from "./catalog";

/** نامِ برند در `og:site_name` و در JSON-LD. */
export const SITE_NAME = "سروا";

/**
 * کدِ تأییدِ مالکیت در Google Search Console.
 *
 * یک جا تعریف می‌شود چون دو جا لازم است: لایوتِ ریشه، و صفحهٔ خانه که
 * `verification`ِ خودش را دارد (Bing/Yandex از پنل) و بدونِ این، کدِ گوگل را
 * جایگزین و گم می‌کرد.
 */
export const GOOGLE_SITE_VERIFICATION = "44Gf_E9roc0H5qi8iWxWmEMyZXUJQRRZ0DQ6IDuhaZA";

/**
 * تصویرِ پیش‌فرضِ اشتراک‌گذاری — همان PNGی که `npm run seo:og` می‌سازد.
 *
 * ⚠️ چرا صریح و نه با قراردادِ فایلیِ Next: قراردادِ `app/opengraph-image.png`
 * فقط به صفحه‌ای می‌رسد که `openGraph`ِ خودش را *تعریف نکرده باشد*. هر صفحه‌ای
 * که `openGraph` داشت (یعنی هر صفحه‌ای که از همین تابع رد می‌شد: `/about`،
 * `/aruz`، `/vazn-yab`، `/guide`…) در HTMLِ واقعی هیچ `og:image`ی نداشت — لینکش
 * در تلگرام و واتساپ بی‌تصویر باز می‌شد.
 *
 * ⚠️ و صفحهٔ خانه بدتر بود: به `/opengraph-image` اشاره می‌کرد، یعنی Routeی
 * که مدت‌ها پیش حذف شده بود و ۴۰۴ می‌داد. پس نشانی اینجا به فایلِ ایستای
 * واقعی است (`/opengraph-image.png`) که Next همیشه سرو می‌کند.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "سروا — یادگیری ادبیات فارسی",
} as const;

export const DEFAULT_TWITTER_IMAGE = "/twitter-image.png";

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
 *
 * ⚠️ همین حرف دربارهٔ `openGraph` هم صادق است، و این یکی تا امروز باز مانده
 * بود: Next متادیتا را *سطحی* ادغام می‌کند، پس صفحه‌ای که `openGraph` نداشت
 * کلِ `openGraph`ِ ریشه را می‌گرفت — با `og:url`ِ صفحهٔ خانه و عنوانِ «آموزش
 * وزن و عروض…». هر بازی، هر درس و هر سرودهٔ کلاب وقتی در تلگرام فرستاده
 * می‌شد، خودش را صفحهٔ خانه معرفی می‌کرد. این تابع حالا هر دو را همیشه با هم
 * می‌سازد.
 */
export function pageMetadata(input: {
  /** مسیرِ همین صفحه، با اسلشِ آغازین. مثلاً `/vazn-yab`. */
  path: string;
  title: string;
  description: string;
  /** برای صفحاتی که نباید ایندکس شوند (جلسهٔ آزمون، کارنامه، ورود). */
  noindex?: boolean;
  /** `noindex` ولی لینک‌ها دنبال شوند (مثلاً فهرستِ فیلترشده). */
  follow?: boolean;
  /** اگر صفحه تصویرِ اشتراک‌گذاریِ خودش را دارد. */
  image?: string;
  openGraphType?: "website" | "article";
  /** عنوانِ کامل، بدونِ اینکه قالبِ ریشه « | سروا» را اضافه کند (صفحهٔ خانه). */
  absoluteTitle?: boolean;
  /** اگر نشانیِ canonical با `path` فرق دارد (مثلاً شمارهٔ نرمال‌شدهٔ درس). */
  canonicalPath?: string;
}): Metadata {
  const { path, title, description, noindex, follow, image, openGraphType, absoluteTitle } = input;
  const url = absoluteUrl(input.canonicalPath ?? path);

  // ⚠️ `SEO_NOINDEX` روی همه چیز اثر می‌گذارد تا پیش‌نمایش و staging ایندکس
  // نشوند — ولی production این را به ارث نمی‌برد چون متغیر آنجا تنظیم نیست.
  const blocked = noindex || isNoindexEnvironment();

  /* عنوانِ شبکه‌های اجتماعی نامِ برند را خودش ندارد (قالبِ ریشه فقط روی
     `<title>` اثر می‌گذارد)، پس اینجا اضافه می‌شود — مگر اینکه عنوان خودش
     با «سروا» شروع شده باشد. */
  const socialTitle = absoluteTitle || title.startsWith(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  const images = image ? [{ url: image }] : [DEFAULT_OG_IMAGE];

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: blocked
      ? { index: false, follow: Boolean(follow) && !isNoindexEnvironment() }
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
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fa_IR",
      type: openGraphType ?? "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image ?? DEFAULT_TWITTER_IMAGE],
    },
  };
}

/**
 * متادیتای یکی از صفحه‌های فهرستِ `lib/seo/catalog.ts`.
 *
 * عنوان و توضیح فقط در آن فهرست نوشته می‌شوند؛ صفحه فقط مسیرِ خودش را
 * می‌گوید. پس همان متنی که در نتیجهٔ جست‌وجو دیده می‌شود، در `llms.txt` و در
 * پیش‌نمایشِ پنلِ مدیریت هم هست.
 */
export function catalogMetadata(path: SeoPath, extra?: { noindex?: boolean }): Metadata {
  const page = SEO_PAGES[path];
  return pageMetadata({
    path: page.path,
    title: page.title,
    description: page.description,
    absoluteTitle: page.path === "/",
    noindex: extra?.noindex,
  });
}
