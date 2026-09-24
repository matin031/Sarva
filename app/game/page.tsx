import GamesGalaxy from "@/components/UI/games/GamesGalaxy";
import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { catalogMetadata } from "@/lib/seo/metadata";
import { SEO_PAGES, SEO_PAGE_LIST } from "@/lib/seo/catalog";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { collectionJsonLd } from "@/lib/seo/entity";

export const metadata: Metadata = catalogMetadata("/game");

/* فهرستِ بازی‌ها برای موتورِ جست‌وجو: همان ده بازی‌ای که کهکشان نشان
   می‌دهد، از همان فهرستی که متادیتای هر بازی را می‌سازد. */
const GAMES = SEO_PAGE_LIST.filter((page) => page.schema === "game");

export default function GamePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
        ])}
      />
      <JsonLd data={collectionJsonLd(SEO_PAGES["/game"], GAMES)} />
      <GamesGalaxy />
    </>
  );
}
