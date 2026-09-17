import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import RoleHuntGame from "@/components/UI/role-hunt/RoleHuntGame";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/game/role-hunt") },
  title: "شکار نقش‌ها — بازی نقش دستوری",
  description:
    "نقشی که نمایشگر رو می‌کند را ببین و واژه‌ای که آن نقش را دارد از میانِ واژه‌های در حالِ چرخش انتخاب کن.",
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "شکار نقش‌ها", path: "/game/role-hunt" },
        ])}
      />
      {/* بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */}
      <GameShell ownHeading title="شکار نقش‌ها" progressKeys={[]}>
        <RoleHuntGame />
      </GameShell>
    </>
  );
}
