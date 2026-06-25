import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import Header from "@/components/UI/Header";
import { GeometricPattern } from "@/components/persian-patterns";
import Footer from "@/components/UI/Footer";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "عروض‌آموز | آموزش وزن شعر فارسی",
  description:
    "پلتفرم آموزشی تعاملی برای یادگیری اوزان عروضی شعر فارسی - با الهام از زیبایی‌شناسی ایرانی",
  keywords: ["عروض", "شعر فارسی", "وزن شعر", "ادبیات فارسی", "آموزش شعر"],
  authors: [{ name: "عروض‌آموز" }],
  openGraph: {
    title: "عروض‌آموز | آموزش وزن شعر فارسی",
    description: "پلتفرم آموزشی تعاملی برای یادگیری اوزان عروضی شعر فارسی",
    locale: "fa_IR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" className={`${vazirmatn.variable} h-full antialiased dark`}>
      <body className=" text-right">
        <Header />
        {children}
        <Footer />
        <GeometricPattern
          className=" z-10 fixed text-gold h-screen"
          opacity={0.06}
        />
      </body>
    </html>
  );
}
