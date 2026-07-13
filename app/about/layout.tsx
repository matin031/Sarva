import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "درباره ما",
  description:
    "عروضینو با هدف پاسداری از میراث شعر پارسی ساخته شده تا وزن و آهنگ شعر فارسی را با زبانی امروزی و گام‌به‌گام به همه آموزش دهد.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "درباره عروضینو | آموزش وزن شعر فارسی",
    description:
      "عروضینو با هدف پاسداری از میراث شعر پارسی ساخته شده تا وزن و آهنگ شعر فارسی را با زبانی امروزی و گام‌به‌گام به همه آموزش دهد.",
    url: "https://aruzino.ir/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
