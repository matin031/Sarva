import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import GrammarCircuitGame from "@/components/UI/grammar-circuit/GrammarCircuitGame";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/grammar-circuit") },
  title: "مدار دستور — بازی نقش دستوری",
  description:
    "نقشِ دستوریِ هر واژه را به سوکتِ خودش وصل کن، مدار را ببند و لامپ را روشن کن.",
};

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
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="مدار دستور" progressKeys={[]}>
      <GrammarCircuitGame />
    </GameShell>
    </>
  );
}
