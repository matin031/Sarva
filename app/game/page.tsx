import GamesGalaxy from "@/components/UI/games/GamesGalaxy";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game") },
  title: "کهکشانِ بازی‌ها",
  description:
    "هفت بازی برای یادگیریِ ادبیات و دستور زبان فارسی: جاسوسِ نقش‌ها، نینجای دستور زبان، جفت‌های ادبی، واژه‌یاب، تقطیعِ سریع، پلِ وزن و مدار دستور.",
};

export default function GamePage() {
  return <GamesGalaxy />;
}
