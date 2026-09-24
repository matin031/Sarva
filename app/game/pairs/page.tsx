import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import PairsGame from "@/components/UI/pairs/PairsGame";
import { loadMemoryDecks } from "@/lib/pairs-content";

export const metadata: Metadata = catalogMetadata("/game/pairs");

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
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/pairs"])} />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="جفت‌های ادبی" progressKeys={[]}>
      <PairsGame decks={decks} />
    </GameShell>
    </>
  );
}
