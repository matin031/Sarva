import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import RangAraGame from "@/components/UI/rang-ara/RangAraGame";
import { loadRangAraLevels } from "@/lib/rang-ara/source";

export const metadata: Metadata = catalogMetadata("/game/rang-ara");

// بیت‌ها از پنلِ مدیریت می‌آیند؛ صفحهٔ کش‌شده یعنی مدیری که تغییرش را نمی‌بیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { levels } = await loadRangAraLevels();
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "رنگ‌آرا", path: "/game/rang-ara" },
        ])}
      />
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/rang-ara"])} />
      {/* بازی نوارِ خودش را دارد؛ H1 را پوسته به‌صورتِ sr-only می‌سازد. */}
      <GameShell ownBar title="رنگ‌آرا" progressKeys={[]}>
        <RangAraGame levels={levels} />
      </GameShell>
    </>
  );
}
