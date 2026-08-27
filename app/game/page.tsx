import GamesGalaxy from "@/components/UI/games/GamesGalaxy";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کهکشانِ بازی‌ها | سروا",
  description:
    "پنج بازی برای یادگیریِ ادبیات و دستور زبان فارسی: جاسوسِ نقش‌ها، نینجای دستور زبان، جفت‌های ادبی، تقطیعِ سریع و واژه‌یاب.",
};

export default function GamePage() {
  return <GamesGalaxy />;
}
