import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import KimiaGame from "@/components/UI/kimia/KimiaGame";

export const metadata: Metadata = catalogMetadata("/game/kimia");

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "کیمیای وزن", path: "/game/kimia" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/kimia"])} />
      {/* ⚠️ `ownHeading` چون صفحهٔ معرفیِ بازی خودش H1 دارد؛ بدونش دو H1
          روی صفحه می‌نشست. */}
      <GameShell ownHeading title="کیمیای وزن" progressKeys={[]}>
        <KimiaGame />
      </GameShell>
    </>
  );
}
