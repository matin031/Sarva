import GamesGalaxy from "@/components/UI/games/GamesGalaxy";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کهکشانِ بازی‌ها | سروا",
  description:
    "شش بازی برای یادگیریِ ادبیات و دستور زبان فارسی: جاسوسِ نقش‌ها، نینجای دستور زبان، جفت‌های ادبی، واژه‌یاب، تقطیعِ سریع و پلِ وزن.",
};

export default function GamePage() {
  return <GamesGalaxy />;
}
