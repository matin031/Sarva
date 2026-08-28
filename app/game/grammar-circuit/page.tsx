import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import GrammarCircuitGame from "@/components/UI/grammar-circuit/GrammarCircuitGame";

export const metadata: Metadata = {
  title: "مدار دستور | بازی‌های سروا",
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
