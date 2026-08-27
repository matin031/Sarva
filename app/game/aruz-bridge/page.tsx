import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import AruzBridgeGame from "@/components/UI/aruz-bridge/AruzBridgeGame";

export const metadata: Metadata = {
  title: "پلِ وزن | بازی‌های سروا",
  description:
    "روی پلِ شیشه‌ای، وزنِ عروضیِ هر واژه را تشخیص بده و روی شیشهٔ امن بپر. اشتباه کنی، شیشه زیرِ پایت می‌شکند.",
};

export default function Page() {
  return (
    <GameShell title="پلِ وزن">
      <AruzBridgeGame />
    </GameShell>
  );
}
