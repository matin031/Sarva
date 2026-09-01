import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import PairsGame from "@/components/UI/pairs/PairsGame";
import { loadMemoryDecks } from "@/lib/pairs-content";

export const metadata: Metadata = {
  title: "جفت‌های ادبی | بازی‌های سروا",
  description: "پایه و آزمونت را انتخاب کن و هر اثر را از حافظه به پدیدآورنده‌اش برسان.",
};

// کارت‌ها از پنل مدیریت می‌آیند؛ یک صفحهٔ کش‌شده یعنی مدیری که تغییرش را
// نمی‌بیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { decks } = await loadMemoryDecks();

  return (
    <GameShell title="جفت‌های ادبی" progressKeys={[]}>
      <PairsGame decks={decks} />
    </GameShell>
  );
}
