import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import JasoosGame from "@/components/UI/jasoos/JasoosGame";
import { loadJasoosLevels } from "@/lib/jasoos-content";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/jasoos") },
  title: "جاسوسِ نقش‌ها — بازی نقش دستوری",
  description: "یک بیت، چهار مظنون، یک دروغگو؛ نقش‌های دستوری و آرایه‌های ادبی را با جاسوس‌یابی تمرین کن.",
};

// پرونده‌ها از پنل مدیریت می‌آیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { levels } = await loadJasoosLevels();

  return (
    <GameShell title="جاسوسِ نقش‌ها" progressKeys={["jasoos-progress"]}>
      <JasoosGame levels={levels} />
    </GameShell>
  );
}
