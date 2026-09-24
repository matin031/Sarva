import type { Metadata } from "next";
import { siteOrigin } from "@/lib/seo/site";
import { SEO_PAGES } from "@/lib/seo/catalog";
import { siteGraph } from "@/lib/seo/entity";
import { safeJsonLd } from "@/lib/seo/jsonld";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
  GOOGLE_SITE_VERIFICATION,
} from "@/lib/seo/metadata";
import { Vazirmatn, Noto_Naskh_Arabic } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/UI/NavigationProgress";
import SiteChrome from "@/components/SiteChrome";
import LogoReveal from "@/components/UI/LogoReveal";
import { DEFAULT_PALETTE, PALETTE_INIT_SCRIPT } from "@/lib/theme/palette";
import { READING_FONT_INIT_SCRIPT } from "@/lib/theme/reading-font";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

/* The poem is set in `font-serif`, which pointed at "Noto Naskh Arabic" — a
   font nothing ever loaded. On a machine without it installed (i.e. almost
   every one) the بیت fell all the way through to the OS serif. Self-host it
   so the couplet is set in the face it was designed for. */
const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-naskh",
  display: "swap",
});

/* مربّع — قلمِ عنوان‌هایِ پنل.

   ⚠️ فقط متغیّرش اینجا تعریف می‌شود و هیچ عنصری در سایت خودبه‌خود آن را
   نمی‌گیرد: مصرفِ واقعی‌اش یک قاعده در `globals.css` است که فقط زیرِ
   `.panel-scope` را هدف می‌گیرد. وزیرمتن قلمِ متنِ روانِ کلِ سایت
   می‌ماند و مربّع فقط به عنوان‌ها حالت می‌دهد — یک قلمِ نمایشی در
   متنِ دوازده پیکسلی خوانایی را پایین می‌آورد.

   ⚠️ `display: "swap"` عمدی است: عنوان باید با وزیرمتن دیده شود و بعد
   جایش را بدهد، نه اینکه تا رسیدنِ فایل نادیده بماند. */
const morabba = localFont({
  src: [
    { path: "./fonts/morabba/Morabba-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/morabba/Morabba-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/morabba/Morabba-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/morabba/Morabba-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-morabba",
  display: "swap",
  /* همان وزیرمتن، تا جایگزینیِ قلم طولِ عنوان را نپراند. */
  fallback: ["Vazirmatn", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

/* پفک — قلمِ بازیگوشِ ناحیهٔ بازی‌ها.

   ⚠️ عمداً «قلمِ سایت» نمی‌شود و هیچ عنصری خودبه‌خود نمی‌گیردش. پفک یک قلمِ
   نمایشیِ گرد و شوخ است: روی «شکار نقش‌ها»، امتیاز، رکورد و «آفرین!» جان
   می‌دهد، و روی یک پاراگرافِ توضیح یا جدولِ تحلیل، متن را از جدی بودن
   می‌اندازد. مخاطبِ سروا دبیرستانی است، نه کودکِ پیش‌دبستانی.

   پس مثلِ مربّع فقط یک متغیّر تعریف می‌شود و مصرفش یک قاعدهٔ صریح در
   `globals.css` است (`.game-display`) که هر جا خواستیم دستی می‌گذاریم.

   ⚠️ هر دو قالب داده شده و ترتیب مهم است: مرورگر اولین قالبی را برمی‌دارد
   که می‌شناسد، پس woff2 اول می‌آید و woff فقط برای مرورگرهای قدیمی‌تری
   می‌ماند که هنوز روی گوشی‌های ارزان دیده می‌شوند.

   ⚠️ رقم‌های پفک عرضِ ثابت ندارند، پس عدد با آن نوشته نمی‌شود — همان درسی
   که مربّع داد و `.panel-num` از آن آمد. معادلش اینجا `.game-num` است. */
const pofak = localFont({
  src: [
    { path: "./fonts/pofak/woff2/Pofak-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/pofak/woff/Pofak-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/pofak/woff2/Pofak-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/pofak/woff/Pofak-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-pofak",
  display: "swap",
  fallback: ["Vazirmatn", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

/* قلم‌های اختیاریٔ درسنامه — پیدا، لحظه، درنا.

   کاربر در درسنامه می‌تواند قلمِ خواندن را عوض کند
   (`components/UI/doroos/ReadingFontDock.tsx`). فهرستِ گزینه‌ها در
   `lib/theme/reading-font.ts` است و اعمالش یک قاعدهٔ CSS زیرِ
   `.reading-scope`. اینجا فقط متغیّرشان ساخته می‌شود.

   ⚠️ `preload: false` عمدی است. این سه قلم در حالتِ پیش‌فرض هیچ
   کجا دیده نمی‌شوند؛ با preloadِ پیش‌فرضِ next/font هر صفحهٔ سایت
   شش فایلِ woff2 را پیشاپیش می‌کشید که برای ۹۹٪ِ بازدیدها دورِ
   ریختنِ تمام است. بدونِ preload، مرورگر فقط وقتی فایل را
   می‌گیرد که قاعده‌ای واقعاً آن را به متنی بچسباند.

   ⚠️ وزن‌ها بازه‌اند و نه عددِ تک، و این دقیقاً به خاطرِ درسنامه
   است: متنِ درس پر است از `font-bold` و `font-black`، ولی این سه قلم
   فقط دو وزن دارند. اگر وزنِ ۷۰۰ را به هیچ فایلی نسبت
   ندهیم، مرورگر خودش سیاهِ جعلی می‌سازد (synthetic bold) که روی
   فارسی فاجعه است: اتّصال‌ها پر می‌شوند و نقطه‌ها به هم می‌چسبند.
   با بازه، هر وزنِ درخواستی به نزدیک‌ترین فایلِ واقعی می‌رسد. */
const peyda = localFont({
  src: [
    { path: "./fonts/peyda/PeydaWeb-Regular.woff2", weight: "100 500", style: "normal" },
    { path: "./fonts/peyda/PeydaWeb-Medium.woff2", weight: "600 900", style: "normal" },
  ],
  variable: "--font-peyda",
  display: "swap",
  preload: false,
  fallback: ["Vazirmatn", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

const lahzeh = localFont({
  src: [
    { path: "./fonts/lahzeh/Lahzeh-Regular.woff2", weight: "100 500", style: "normal" },
    { path: "./fonts/lahzeh/Lahzeh-Medium.woff2", weight: "600 900", style: "normal" },
  ],
  variable: "--font-lahzeh",
  display: "swap",
  preload: false,
  fallback: ["Vazirmatn", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

const dorna = localFont({
  src: [
    { path: "./fonts/dorna/Dorna Light.woff2", weight: "100 300", style: "normal" },
    { path: "./fonts/dorna/Dorna Regular.woff2", weight: "400 900", style: "normal" },
  ],
  variable: "--font-dorna",
  display: "swap",
  preload: false,
  fallback: ["Vazirmatn", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

/* ⚠️ آدرس دیگر اینجا هارد‌کد نیست. تا امروز رشتهٔ دامنهٔ قدیم در چهار فایل
   جدا تکرار شده بود و عوض کردنش یعنی پیدا کردنِ هر چهار تا. حالا یک منبع
   دارد: lib/seo/site.ts */
const siteUrl = siteOrigin();
/* ⚠️ عنوان و توضیحِ پیش‌فرض از همان فهرستِ صفحه‌ها (`lib/seo/catalog.ts`)
   می‌آیند. پیش از این اینجا «آموزش وزن و عروض شعر فارسی…» نوشته شده بود —
   معرفیِ سروایی که فقط عروض داشت — و هر صفحه‌ای که توضیحِ خودش را نداشت
   (مثلاً /exam) همان را در نتیجهٔ جست‌وجو نشان می‌داد. */
const siteTitle = SEO_PAGES["/"].title;
const siteDescription = SEO_PAGES["/"].description;

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    /* ⚠️ قالب عمداً فقط «سروا» می‌گذارد و نه چیز بیشتر. ولی چند صفحه خودشان
       عنوانی می‌دادند که به «سروا» ختم می‌شد («مدار دستور | بازی‌های سروا»)
       و نتیجه‌اش «… | بازی‌های سروا | سروا» می‌شد. آن عنوان‌ها اصلاح شدند؛
       قاعده این است که عنوانِ صفحه هرگز خودش نامِ برند را تکرار نکند. */
    template: "%s | سروا",
  },
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
  description: siteDescription,
  /* گوگل این فهرست را سال‌هاست نمی‌خواند؛ ولی بی‌ضرر است و بعضی موتورهای
     دیگر هنوز نگاهش می‌کنند. */
  keywords: [
    "سروا",
    "معنی درس فارسی",
    "درسنامه فارسی دهم",
    "درسنامه فارسی یازدهم",
    "درسنامه فارسی دوازدهم",
    "آرایه‌های ادبی",
    "عروض",
    "وزن شعر فارسی",
    "تقطیع شعر",
    "امتحان نهایی فارسی",
    "ادبیات فارسی",
  ],
  authors: [{ name: "سروا", url: siteUrl }],
  creator: "سروا",
  publisher: "سروا",
  /* ⚠️ اینجا عمداً `alternates` نیست.
     پیش‌تر `canonical: "/"` بود و چون متادیتا در Next ارث می‌رسد، هر صفحه‌ای
     که canonicalِ خودش را نداشت خودش را تکراریِ صفحهٔ خانه اعلام می‌کرد.
     canonical حالا وظیفهٔ خودِ هر صفحه است (lib/seo/metadata.ts) و صفحهٔ خانه
     هم در app/page.tsx مالِ خودش را دارد. */
  robots: {
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
  /* ⚠️ تصویرِ اشتراک‌گذاری یک PNGِ ثابت است که `npm run seo:og` می‌سازد
     (`app/opengraph-image.png`). تا امروز یک Routeِ edge بود که در هر
     درخواست فونت را از گوگل می‌گرفت و در لاگِ production سی‌وسه بار با
     «failed to pipe response» افتاده بود.

     ⚠️ و حالا صریح نوشته می‌شود، برخلافِ نسخهٔ قبل که به قراردادِ فایلی
     تکیه می‌کرد: آن قرارداد فقط به صفحه‌ای می‌رسد که `openGraph`ِ خودش را
     ندارد — یعنی عملاً هیچ صفحهٔ مهمی. توضیحِ کامل کنارِ `DEFAULT_OG_IMAGE`
     در lib/seo/metadata.ts. */
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "سروا",
    locale: "fa_IR",
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [DEFAULT_TWITTER_IMAGE],
  },
};

/* گرافِ پایهٔ همهٔ صفحه‌ها — `WebSite` و سازمان، با لوگو و حوزه‌های تخصص.
   چرایی‌اش در lib/seo/entity.ts. */
const jsonLd = siteGraph(siteDescription);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      /* ⚠️ `dir="rtl"` روی خودِ <html> و نه فقط `text-right` روی <body>.
         این دو یکی نیستند و تفاوتشان یک باگِ دیدنی می‌ساخت: `text-right`
         فقط *تراز* است، ولی جهتِ دوسویهٔ متن (bidi) همچنان چپ‌به‌راست
         می‌ماند. نتیجه‌اش این بود که هر نویسهٔ خنثی در انتهای یک جملهٔ
         فارسی — سه‌نقطه، پرانتز، علامتِ تعجب — به آن سرِ دیگر می‌پرید:
         «در حال ورود…» روی صفحه «…در حال ورود» دیده می‌شد.

         تا امروز هر جایی که این را می‌دید، خودش یک `dir="rtl"` محلی
         می‌گذاشت (پنل، چند مودال، چند پاراگراف) — یعنی همان قاعده ده‌ها
         بار تکرار شده بود و هر جای تازه‌ای که یادش می‌رفت، دوباره همان
         باگ را داشت.

         ⚠️ بی‌خطر بودنش آزموده شد و حدس نیست: صفحهٔ اصلی، بازی‌ها،
         راهنما، وزن‌یاب و دربارهٔ ما پیش و پس از این تغییر پیکسل‌به‌پیکسل
         مقایسه شدند و تنها تفاوت، جهتِ کشیده‌شدنِ خط‌کشِ
         `rough-notation` بود که حالا از راست شروع می‌شود. */
      dir="rtl"
      /* پالتِ پیش‌فرض در HTMLِ سرور؛ اسکریپتِ اولِ <body> اگر کاربر چیزِ
         دیگری انتخاب کرده باشد، پیش از اولین رنگ‌آمیزی عوضش می‌کند. */
      data-palette={DEFAULT_PALETTE}
      className={`${vazirmatn.variable} ${naskh.variable} ${morabba.variable} ${pofak.variable} ${peyda.variable} ${lahzeh.variable} ${dorna.variable} h-full antialiased dark`}
      /* Browser extensions (dark-mode ones especially) write an inline style
         onto <html> before React hydrates, which React then reports as a
         mismatch nobody can act on. This suppresses the warning for this one
         element only — every component inside is still checked normally. */
      suppressHydrationWarning
    >
      <body className="text-right  flex flex-col min-h-screen">
        {/* ⚠️ باید اولین چیزِ داخلِ <body> بماند. یک اسکریپتِ همگامِ کوچک که
            پیش از رنگ‌آمیزیِ بقیهٔ صفحه اجرا می‌شود و پالتِ ذخیره‌شده را روی
            <html> می‌نشاند. اگر پایین‌تر می‌رفت — یا به یک useEffect سپرده
            می‌شد — کاربر در هر بار باز کردنِ هر صفحه یک پرشِ رنگ می‌دید. */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_INIT_SCRIPT }} />
        {/* همان داستان، برای قلمِ درسنامه: اگر خواننده قلمی انتخاب
            کرده باشد، باید پیش از اولین چیدمان روی <html> بنشیند، وگرنه
            کلِ متنِ درس یک بار با وزیرمتن چیده و بلافاصله بازچیده می‌شود. */}
        <script dangerouslySetInnerHTML={{ __html: READING_FONT_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
      window.NAJVA = {};
      var s = document.createElement("script");
      s.src = "https://van.najva.com/static/js/main-script.js";
      s.defer = true;
      s.id = "najva-mini-script";
      s.setAttribute(
        "data-najva-id",
        "c414675f-2c42-4b1c-add0-7e64e4a580da"
      );
      document.head.appendChild(s);
    `,
          }}
        />

        {/* ⚠️ تورِ ایمنیِ محتوا وقتی جاوااسکریپت اجرا نمی‌شود.
            
            بخشِ زیادی از محتوای آموزشی با motion و `whileInView` ظاهر
            می‌شود، یعنی سرور آن را با `opacity:0` می‌فرستد و جاوااسکریپت
            رویتش می‌کند. اندازه‌گیری: یک صفحهٔ درس ۱۷۶ عنصرِ `opacity:0`
            در HTMLِ اولیه دارد.

            متن *در* HTML هست، پس خزنده آن را می‌بیند. مسئله آدمی است که
            جاوااسکریپتش اجرا نمی‌شود — افزونه، شبکهٔ قطع‌شده، مرورگرِ
            قدیمی: او یک صفحهٔ درسِ کاملاً سفید می‌بیند و فکر می‌کند سایت
            خراب است.

            این چند خط همان حالت را می‌پوشاند. داخلِ `<noscript>` است، پس
            وقتی جاوااسکریپت هست هیچ اثری ندارد و انیمیشن‌ها دست‌نخورده
            می‌مانند. */}
        <noscript>
          <style>{`
            [style*="opacity:0"] { opacity: 1 !important; }
            [style*="opacity: 0"] { opacity: 1 !important; }
            [style*="transform:translate"] { transform: none !important; }
            [style*="transform: translate"] { transform: none !important; }
          `}</style>
        </noscript>
        <LogoReveal />
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
