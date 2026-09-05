import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import PairsGame from "@/components/UI/pairs/PairsGame";
import { loadMemoryDecks } from "@/lib/pairs-content";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/pairs") },
  title: "جفت‌های ادبی — بازی آرایه‌ها",
  description: "پایه و آزمونت را انتخاب کن و هر اثر را از حافظه به پدیدآورنده‌اش برسان.",
};

// کارت‌ها از پنل مدیریت می‌آیند؛ یک صفحهٔ کش‌شده یعنی مدیری که تغییرش را
// نمی‌بیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { decks } = await loadMemoryDecks();

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "جفت‌های ادبی", path: "/game/pairs" },
        ])}
      />
      <GameShell title="جفت‌های ادبی" progressKeys={[]}>
      <PairsGame decks={decks} />
    </GameShell>
    </>
  );
}
