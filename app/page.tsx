import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import HomePage from "@/components/home/HomePage";

const title = "سروا | یادگیری ادبیات فارسی، درسنامه و بازی‌های تعاملی";
const description = "ادبیات فارسی را در سروا با درسنامه‌های دهم تا دوازدهم، بازی‌های ادبی، امتحانات نهایی، وزن‌یاب و عروض سماعی یاد بگیر؛ همراه با سروا کلاب و پنل شخصی.";

// Keep the homepage's broader introduction and canonical local to this route.
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title, description, url: absoluteUrl("/"), siteName: "سروا", locale: "fa_IR", type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "سروا؛ یادگیری ادبیات فارسی" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

export default function Home() {
  return <HomePage />;
}
