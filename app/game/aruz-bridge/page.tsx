import type { Metadata } from "next";
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
    <GameShell title="پلِ وزن" dense>
      <AruzBridgeGame />
    </GameShell>
  );
}
