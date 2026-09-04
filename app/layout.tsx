import type { Metadata } from "next";
import { siteOrigin } from "@/lib/seo/site";
import { Vazirmatn, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/UI/NavigationProgress";
import SiteChrome from "@/components/SiteChrome";
import LogoReveal from "@/components/UI/LogoReveal";
import { ToastContainer } from "react-toastify";

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
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "سروا",
    locale: "fa_IR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "سروا | آموزش وزن شعر فارسی",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
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
      className={`${vazirmatn.variable} ${naskh.variable} h-full antialiased dark`}
      /* Browser extensions (dark-mode ones especially) write an inline style
         onto <html> before React hydrates, which React then reports as a
         mismatch nobody can act on. This suppresses the warning for this one
         element only — every component inside is still checked normally. */
      suppressHydrationWarning
    >
      <body className="text-right  flex flex-col min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LogoReveal />
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <SiteChrome>{children}</SiteChrome>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={true}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}
