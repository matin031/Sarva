import type { Metadata } from "next";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import GameShell from "@/components/UI/games/GameShell";
import VocabGame from "@/components/UI/vocab/VocabGame";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/game/vocab") },
  title: "واژه‌یاب — بازی واژگان",
  description: "تصویر را ببین، واژه‌اش را بشناس و معنی کامل را یاد بگیر.",
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "بازی‌ها", path: "/game" },
          { name: "واژه‌یاب", path: "/game/vocab" },
        ])}
      />
      <GameShell
        /* این بازی تیترِ دیداریِ خودش را دارد؛ پوسته H1 دوم نسازد. */
        ownHeading title="واژه‌یاب" progressKeys={[]}>
      <VocabGame />
    </GameShell>
    </>
  );
}
