import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import DoroosHome from "@/components/UI/doroos/DoroosHome";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/doroos") },
  title: "درسنامهٔ فارسی",
  description:
    "شرح و تحلیلِ بیت‌به‌بیتِ درس‌های فارسیِ دهم، یازدهم و دوازدهم؛ به تفکیکِ قلمرو زبانی، ادبی و فکری.",
};

export default function Page() {
  return <DoroosHome />;
}
