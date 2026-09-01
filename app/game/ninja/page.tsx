import type { Metadata } from "next";
import GameShell from "@/components/UI/games/GameShell";
import NinjaGame from "@/components/UI/ninja/NinjaGame";
import { loadNinjaRounds } from "@/lib/ninja-content";

export const metadata: Metadata = {
  title: "نینجای دستور زبان | بازی‌های سروا",
  description: "کلمه‌ها در هوا پرتاب می‌شوند و فقط باید دستهٔ درست را برش بزنی.",
};

// نقش‌ها و کلماتشان از پنل مدیریت می‌آیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { rounds } = await loadNinjaRounds();

  return (
    <GameShell title="نینجای دستور زبان" progressKeys={["ninja-progress"]}>
      <NinjaGame rounds={rounds} />
    </GameShell>
  );
}
