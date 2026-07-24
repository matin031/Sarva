import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import NinjaGame from "@/components/UI/ninja/NinjaGame";

export const metadata: Metadata = {
  title: "نینجای دستور زبان | بازی‌های سروا",
  description: "کلمه‌ها در هوا پرتاب می‌شوند و فقط باید دستهٔ درست را برش بزنی.",
};

export default function Page() {
  return (
    <GameShell title="نینجای دستور زبان" progressKeys={["ninja-progress"]}>
      <NinjaGame />
    </GameShell>
  );
}
