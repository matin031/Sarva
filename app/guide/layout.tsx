import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "راهنمای آموزش عروض",
  description:
    "راهنمای گام‌به‌گام یادگیری وزن و تقطیع شعر فارسی؛ با مثال‌های صوتی و تصویری، اصول عروض را از پایه تا پیشرفته یاد بگیرید",
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: "راهنمای آموزش عروض | عروضینو",
    description:
      "راهنمای گام‌به‌گام یادگیری وزن و تقطیع شعر فارسی؛ با مثال‌های صوتی و تصویری، اصول عروض را از پایه تا پیشرفته یاد بگیرید",
    url: "https://aruzino.ir/guide",
  },
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
