import type { Metadata } from "next";
import GuideView from "@/components/UI/guide/GuideView";

/**
 * راهنمای سروا.
 *
 * ⚠️ این صفحه تا امروز از بالا تا پایین `"use client"` بود، و یک صفحهٔ کلاینت
 * نمی‌تواند `metadata` صادر کند. یعنی صفحه‌ای که کارش دقیقاً *معرفیِ* سایت
 * است، هیچ عنوان و توضیحی نداشت — نه در تبِ مرورگر، نه در نتیجهٔ جست‌وجو، نه
 * وقتی لینکش در تلگرام یا واتساپ فرستاده می‌شد.
 *
 * حالا مثل بقیهٔ صفحه‌های سایت است: یک سرور-کامپوننتِ نازک که فقط metadata
 * می‌دهد، و بخشِ متحرک در یک کلاینت-کامپوننت جدا.
 */
export const metadata: Metadata = {
  title: "راهنمای سروا | با هر بخش آشنا شو",
  description:
    "راهنمای کاملِ سروا: عروضِ سماعی، وزن‌یاب، بازی‌های ادبی و دستوری، آزمون‌های نهایی و پنلِ پیشرفت — هر بخش کوتاه و کاربردی.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "راهنمای سروا",
    description: "هر بخشِ سروا در چند خط: از عروضِ سماعی تا پنلِ پیشرفت.",
    url: "/guide",
  },
};

export default function GuidePage() {
  return <GuideView />;
}
