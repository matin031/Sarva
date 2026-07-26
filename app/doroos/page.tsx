import type { Metadata } from "next";
import DoroosHome from "@/components/UI/doroos/DoroosHome";

export const metadata: Metadata = {
  title: "درسنامهٔ فارسی",
  description:
    "شرح و تحلیلِ بیت‌به‌بیتِ درس‌های فارسیِ دهم، یازدهم و دوازدهم؛ به تفکیکِ قلمرو زبانی، ادبی و فکری.",
};

export default function Page() {
  return <DoroosHome />;
}
