import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * ⚠️ متن و آدرسِ این صفحه هنوز مالِ برندِ قبلی («عروضینو») بود و
 * `openGraph.url` هم به دامنهٔ قدیم اشاره می‌کرد. هر دو اصلاح شد.
 *
 * ⚠️ آنچه عمداً *نوشته نشده*: هیچ ادعایی دربارهٔ سابقه، تألیفات یا سِمَتِ
 * کسی. توضیحِ زیر فقط چیزی را می‌گوید که خودِ صفحه نشان می‌دهد. اتصالِ
 * معرفیِ مدرس به تألیفاتِ واقعی‌اش کارِ مرحلهٔ محتواست و به دادهٔ تأییدشدهٔ
 * مالک نیاز دارد.
 */
export const metadata: Metadata = pageMetadata({
  path: "/about",
  title: "دربارهٔ سروا",
  description:
    "سروا برای آموزش ادبیات فارسی ساخته شده: درسنامه، عروض و وزن شعر، واژه‌ها و آرایه‌ها، و بازی‌های تمرینی. اینجا می‌خوانید سروا چیست و چه کسانی می‌سازندش.",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
