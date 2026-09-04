import type { Metadata } from "next";
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
    <GameShell title="مدار دستور" progressKeys={[]}>
      <GrammarCircuitGame />
    </GameShell>
  );
}
