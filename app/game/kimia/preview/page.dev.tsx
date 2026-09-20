import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KimiaPreview from "./KimiaPreview";

/**
 * پیش‌نمایشِ توسعهٔ «کیمیای وزن» — بدونِ دیتابیس.
 *
 * ⚠️ در production اصلاً وجود ندارد: `notFound()` پیش از هر رندری. یعنی
 * نه در سایت دیده می‌شود، نه در نقشهٔ سایت، نه از راهِ حدسِ آدرس.
 *
 * ⚠️ و بازیِ *واقعی* را رندر می‌کند و نه یک کپیِ دوم: همان `KimiaGame` با
 * همان کامپوننت‌ها و همان خطِ زمانی، فقط با منبعی که به‌جای سرور جواب
 * می‌دهد. کپیِ دوم یعنی چیزی که اینجا تنظیم می‌شود، در بازیِ واقعی فرق
 * داشته باشد.
 */
export const metadata: Metadata = {
  title: "پیش‌نمایشِ کیمیای وزن",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KimiaPreview />;
}
