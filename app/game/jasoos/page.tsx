import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import JasoosGame from "@/components/UI/jasoos/JasoosGame";

export const metadata: Metadata = {
  title: "جاسوسِ نقش‌ها | بازی‌های سروا",
  description: "یک بیت، چهار مظنون، یک دروغگو؛ نقش‌های دستوری و آرایه‌های ادبی را با جاسوس‌یابی تمرین کن.",
};

export default function Page() {
  return (
    <GameShell title="جاسوسِ نقش‌ها" progressKeys={["jasoos-progress"]}>
      <JasoosGame />
    </GameShell>
  );
}
