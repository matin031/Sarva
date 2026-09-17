import type { Metadata } from "next";
import { siteOrigin } from "@/lib/seo/site";
import { Vazirmatn, Noto_Naskh_Arabic } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/UI/NavigationProgress";
import SiteChrome from "@/components/SiteChrome";
import LogoReveal from "@/components/UI/LogoReveal";
import { DEFAULT_PALETTE, PALETTE_INIT_SCRIPT } from "@/lib/theme/palette";

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

/* ⚠️ آدرس دیگر اینجا هارد‌کد نیست. تا امروز رشتهٔ دامنهٔ قدیم در چهار فایل
   جدا تکرار شده بود و عوض کردنش یعنی پیدا کردنِ هر چهار تا. حالا یک منبع
   دارد: lib/seo/site.ts */
const siteUrl = siteOrigin();
const siteTitle = "سروا | آموزش وزن و عروض شعر فارسی به صورت آنلاین و رایگان";
const siteDescription =
  "سروا پلتفرم آموزشی تعاملی برای یادگیری وزن، عروض و تقطیع شعر فارسی است. با آموزش گام‌به‌گام، آزمون‌های تعاملی و راهنمای صوتی، اوزان عروضی شعر پارسی را به سادگی یاد بگیرید.";

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
    google: "44Gf_E9roc0H5qi8iWxWmEMyZXUJQRRZ0DQ6IDuhaZA",
  },
  description: siteDescription,
  keywords: [
    "عروض",
    "سروا",
    "وزن شعر فارسی",
    "آموزش عروض",
    "تقطیع شعر",
    "اوزان عروضی",
    "شعر فارسی",
    "ادبیات فارسی",
    "آموزش شعر آنلاین",
    "بحرهای عروضی",
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
  /* ⚠️ نه `openGraph.images` دارد و نه `twitter.images` — و این عمدی است.

     تا امروز هر دو به `/opengraph-image` اشاره می‌کردند: یک Route با
     `runtime = "edge"` که در هر درخواست فونت را از گوگل می‌گرفت و تصویر
     را می‌ساخت. لاگِ production سی‌وسه بار این را ثبت کرده بود:

         Error: failed to pipe response
             at pipeToNodeResponse (…/server/pipe-readable.js:135:37)
             at async NextNodeServer.runEdgeFunction (…)
         route: /opengraph-image/route

     یعنی هر کسی لینکِ سایت را در پیام‌رسان می‌فرستاد، پیش‌نمایشِ
     خالی می‌گرفت. حالا تصویر یک PNGِ ثابت است که `npm run seo:og`
     می‌سازد و در `app/opengraph-image.png` و `app/twitter-image.png` می‌نشیند.

     ⚠️ نوشتنِ `images` در همین شیء جلویِ قراردادِ فایلی را می‌گیرد —
     مقدارِ صریح برنده است. پس نبودنش لازم است، وگرنه Next تگِ
     تصویر را از آن دو فایل نمی‌سازد و به مسیری اشاره می‌کند که
     دیگر وجود ندارد (همان Route حذف شده). */
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "سروا",
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "سروا",
      description: siteDescription,
      inLanguage: "fa-IR",
    },
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "سروا",
      url: siteUrl,
      description: siteDescription,
      sameAs: [],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      /* پالتِ پیش‌فرض در HTMLِ سرور؛ اسکریپتِ اولِ <body> اگر کاربر چیزِ
         دیگری انتخاب کرده باشد، پیش از اولین رنگ‌آمیزی عوضش می‌کند. */
      data-palette={DEFAULT_PALETTE}
      className={`${vazirmatn.variable} ${naskh.variable} ${morabba.variable} ${pofak.variable} h-full antialiased dark`}
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
