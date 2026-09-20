import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import KimiaGame from "@/components/UI/kimia/KimiaGame";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/game/kimia") },
  title: "کیمیای وزن — ساختنِ وزنِ بیت با ارکان",
  description:
    "ریتمِ بیت را بشنو، ارکانِ عروضی را مثلِ جوهرِ رنگی به مخزن تزریق کن و وزنِ مصراع را بساز؛ ترکیبِ درست پایدار می‌شود.",
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "کیمیای وزن", path: "/game/kimia" },
        ])}
      />
      {/* ⚠️ `ownHeading` چون صفحهٔ معرفیِ بازی خودش H1 دارد؛ بدونش دو H1
          روی صفحه می‌نشست. */}
      <GameShell ownHeading title="کیمیای وزن" progressKeys={[]}>
        <KimiaGame />
      </GameShell>
    </>
  );
}
