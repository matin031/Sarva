import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import VocabGame from "@/components/UI/vocab/VocabGame";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/vocab") },
  title: "واژه‌یاب — بازی واژگان",
  description: "تصویر را ببین، واژه‌اش را بشناس و معنی کامل را یاد بگیر.",
};

export default function Page() {
  return (
    <GameShell title="واژه‌یاب" progressKeys={[]}>
      <VocabGame />
    </GameShell>
  );
}
