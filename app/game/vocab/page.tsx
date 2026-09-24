import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import VocabGame from "@/components/UI/vocab/VocabGame";

export const metadata: Metadata = catalogMetadata("/game/vocab");

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "واژه‌یاب", path: "/game/vocab" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/vocab"])} />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="واژه‌یاب" progressKeys={[]}>
      <VocabGame />
    </GameShell>
    </>
  );
}
