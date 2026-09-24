import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import NinjaGame from "@/components/UI/ninja/NinjaGame";
import { loadNinjaRounds } from "@/lib/ninja-content";

export const metadata: Metadata = catalogMetadata("/game/ninja");

// نقش‌ها و کلماتشان از پنل مدیریت می‌آیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { rounds } = await loadNinjaRounds();

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "نینجای دستور زبان", path: "/game/ninja" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/ninja"])} />
      <GameShell title="نینجای دستور زبان" progressKeys={["ninja-progress"]}>
      <NinjaGame rounds={rounds} />
    </GameShell>
    </>
  );
}
