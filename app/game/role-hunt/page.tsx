import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import RoleHuntGame from "@/components/UI/role-hunt/RoleHuntGame";

export const metadata: Metadata = catalogMetadata("/game/role-hunt");

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
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/role-hunt"])} />
      {/* ⚠️ `dense` برای گوشیِ افقی است و نه یک ترجیحِ سلیقه‌ای: آنجا کلِ
          ارتفاع ۳۹۰ پیکسل است و نوارِ بالا با فاصله‌اش نزدیکِ ۵۰ پیکسل از
          آن را می‌گرفت. با این پرچم فقط *متنِ* پیوندِ بازگشت جمع می‌شود؛
          خودِ دکمه و دکمهٔ گزارش سرِ جایشان می‌مانند، پس راهِ خروج و
          گزارشِ اشکال از دست نمی‌رود. رفتارِ گزارش هیچ تغییری نمی‌کند. */}
      <GameShell ownHeading dense title="شکار نقش‌ها" progressKeys={[]}>
        <RoleHuntGame />
      </GameShell>
    </>
  );
}
