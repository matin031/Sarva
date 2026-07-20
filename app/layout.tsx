import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
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

const siteUrl = "https://aruzino.ir";
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
  alternates: {
    canonical: "/",
  },
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
      className={`${vazirmatn.variable}  h-full antialiased dark`}
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
