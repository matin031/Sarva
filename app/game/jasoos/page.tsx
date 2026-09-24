import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import JasoosGame from "@/components/UI/jasoos/JasoosGame";
import { loadJasoosLevels } from "@/lib/jasoos-content";

export const metadata: Metadata = catalogMetadata("/game/jasoos");

// پرونده‌ها از پنل مدیریت می‌آیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { levels } = await loadJasoosLevels();

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "جاسوسِ نقش‌ها", path: "/game/jasoos" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/jasoos"])} />
      <GameShell title="جاسوسِ نقش‌ها" progressKeys={["jasoos-progress"]}>
      <JasoosGame levels={levels} />
    </GameShell>
    </>
  );
}
