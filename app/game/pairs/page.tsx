import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import PairsGame from "@/components/UI/pairs/PairsGame";

export const metadata: Metadata = {
  title: "جفت‌های ادبی | بازی‌های سروا",
  description: "هر اثر را از حافظه به پدیدآورنده‌اش برسان.",
};

export default function Page() {
  return (
    <GameShell title="جفت‌های ادبی" progressKeys={[]}>
      <PairsGame />
    </GameShell>
  );
}
