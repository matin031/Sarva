import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import VocabGame from "@/components/UI/vocab/VocabGame";

export const metadata: Metadata = {
  title: "واژه‌یاب | بازی‌های سروا",
  description: "تصویر را ببین، واژه‌اش را بشناس و معنی کامل را یاد بگیر.",
};

export default function Page() {
  return (
    <GameShell title="واژه‌یاب" progressKeys={[]}>
      <VocabGame />
    </GameShell>
  );
}
