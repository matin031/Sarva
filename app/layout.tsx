import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import Header from "@/components/UI/Header";
import { GeometricPattern } from "@/components/persian-patterns";

import { ToastContainer } from "react-toastify";
import Footer from "@/components/UI/Footer";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/UI/NavigationProgress";
import LogoReveal from "@/components/UI/LogoReveal";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

const siteUrl = "https://aruzino.ir";
const siteTitle =
  "عروضینو | آموزش وزن و عروض شعر فارسی به صورت آنلاین و رایگان";
const siteDescription =
  "عروضینو پلتفرم آموزشی تعاملی برای یادگیری وزن، عروض و تقطیع شعر فارسی است. با آموزش گام‌به‌گام، آزمون‌های تعاملی و راهنمای صوتی، اوزان عروضی شعر پارسی را به سادگی یاد بگیرید.";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | عروضینو",
  },
  verification: {
    google: "44Gf_E9roc0H5qi8iWxWmEMyZXUJQRRZ0DQ6IDuhaZA",
  },
  description: siteDescription,
  keywords: [
    "عروض",
    "عروضینو",
    "وزن شعر فارسی",
    "آموزش عروض",
    "تقطیع شعر",
    "اوزان عروضی",
    "شعر فارسی",
    "ادبیات فارسی",
    "آموزش شعر آنلاین",
    "بحرهای عروضی",
  ],
  authors: [{ name: "عروضینو", url: siteUrl }],
  creator: "عروضینو",
  publisher: "عروضینو",
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
    siteName: "عروضینو",
    locale: "fa_IR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "عروضینو | آموزش وزن شعر فارسی",
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
      name: "عروضینو",
      description: siteDescription,
      inLanguage: "fa-IR",
    },
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "عروضینو",
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <GeometricPattern
          className="z-10 fixed text-gold h-screen"
          opacity={0.06}
        />
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
