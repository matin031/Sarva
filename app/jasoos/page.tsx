import JasoosGame from "@/components/UI/jasoos/JasoosGame";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "جاسوسِ نقش‌ها | بازی نقش‌های دستوری و آرایه‌های ادبی",
  description:
    "در این بازی وارد مدرسه‌ی جاسوس‌یاب شو، بیت‌ها را بخوان و جاسوسی را که مدعیِ نقشی دستوری یا آرایه‌ای است که در بیت وجود ندارد، پیدا و شکار کن.",
};

function JasoosPage() {
  return <JasoosGame />;
}

export default JasoosPage;
