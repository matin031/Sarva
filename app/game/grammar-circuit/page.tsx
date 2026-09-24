import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import GrammarCircuitGame from "@/components/UI/grammar-circuit/GrammarCircuitGame";

export const metadata: Metadata = catalogMetadata("/game/grammar-circuit");

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "مدار دستور", path: "/game/grammar-circuit" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/grammar-circuit"])} />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="مدار دستور" progressKeys={[]}>
      <GrammarCircuitGame />
    </GameShell>
    </>
  );
}
