import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import AruzBridgeGame from "@/components/UI/aruz-bridge/AruzBridgeGame";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/aruz-bridge") },
  title: "پلِ وزن — بازی تشخیص وزن",
  description:
    "روی پلِ شیشه‌ای، وزنِ عروضیِ هر واژه را تشخیص بده و روی شیشهٔ امن بپر. اشتباه کنی، شیشه زیرِ پایت می‌شکند.",
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "پلِ وزن", path: "/game/aruz-bridge" },
        ])}
      />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="پلِ وزن" dense>
      <AruzBridgeGame />
    </GameShell>
    </>
  );
}
