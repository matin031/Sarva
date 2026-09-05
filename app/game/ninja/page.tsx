import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import NinjaGame from "@/components/UI/ninja/NinjaGame";
import { loadNinjaRounds } from "@/lib/ninja-content";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/ninja") },
  title: "نینجای دستور زبان — بازی نقش کلمه",
  description: "کلمه‌ها در هوا پرتاب می‌شوند و فقط باید دستهٔ درست را برش بزنی.",
};

// نقش‌ها و کلماتشان از پنل مدیریت می‌آیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { rounds } = await loadNinjaRounds();

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "نینجای دستور زبان", path: "/game/ninja" },
        ])}
      />
      <GameShell title="نینجای دستور زبان" progressKeys={["ninja-progress"]}>
      <NinjaGame rounds={rounds} />
    </GameShell>
    </>
  );
}
