import GamesHub from "@/components/UI/games/GamesHub";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "بازی | جاسوسِ نقش‌ها و نینجای دستور زبان",
  description:
    "نقش‌های دستوری، آرایه‌های ادبی و اجزای دستور زبان فارسی را با دو بازیِ جاسوس‌یابی و برش‌زدنِ کلمات یاد بگیر.",
};

function BaziPage() {
  return <GamesHub />;
}

export default BaziPage;
