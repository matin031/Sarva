import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import RangAraGame from "@/components/UI/rang-ara/RangAraGame";
import { loadRangAraLevels } from "@/lib/rang-ara/source";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/game/rang-ara") },
  title: "رنگ‌آرا — بازی آرایه‌های ادبی",
  description:
    "مشبّه، مشبّه‌به، استعاره، مجاز و کنایه را در بیت‌های درس‌های فارسی پیدا کن و با رنگِ همان آرایه رنگشان کن.",
};

// بیت‌ها از پنلِ مدیریت می‌آیند؛ صفحهٔ کش‌شده یعنی مدیری که تغییرش را نمی‌بیند.
export const dynamic = "force-dynamic";

export default async function Page() {
  const { levels } = await loadRangAraLevels();
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "رنگ‌آرا", path: "/game/rang-ara" },
        ])}
      />
      {/* بازی نوارِ خودش را دارد؛ H1 را پوسته به‌صورتِ sr-only می‌سازد. */}
      <GameShell ownBar title="رنگ‌آرا" progressKeys={[]}>
        <RangAraGame levels={levels} />
      </GameShell>
    </>
  );
}
