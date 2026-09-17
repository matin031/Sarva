import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import PoetsShelfGame from "@/components/UI/poets-shelf/PoetsShelfGame";

export const metadata: Metadata = {
  /* canonicalِ خودش — وگرنه از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/poets-shelf") },
  title: "قفسهٔ شاعران — بازی شناختِ آثار ادبی",
  description:
    "نامِ شاعر یا نویسنده را ببین و از میانِ کتاب‌های قفسه، اثرِ او را انتخاب کن. اشتباه کنی، کتاب از طاقچه روی سرت می‌افتد.",
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "قفسهٔ شاعران", path: "/game/poets-shelf" },
        ])}
      />
      <GameShell title="قفسهٔ شاعران" dense>
        <PoetsShelfGame />
      </GameShell>
    </>
  );
}
