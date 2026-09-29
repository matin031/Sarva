import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { gameJsonLd } from "@/lib/seo/entity";
import { SEO_PAGES } from "@/lib/seo/catalog";
import JsonLd from "@/components/seo/JsonLd";
import GameShell from "@/components/UI/games/GameShell";
import NinjaGame from "@/components/UI/ninja/NinjaGame";
import { loadNinjaRounds } from "@/lib/ninja-content";

export const metadata: Metadata = catalogMetadata("/game/ninja");

/* نقش‌ها و کلمه‌ها از پنلِ مدیریت می‌آیند، ولی برای *همهٔ* بازدیدکننده‌ها یکی‌اند.

   ⚠️ تا امروز `force-dynamic` بود، یعنی هر بازدید صفحه را از صفر رندر می‌کرد
   و یک کوئری می‌زد. زیرِ بار اندازه گرفته شد: صفحهٔ پویا حدود ۱۲۵ درخواست در
   ثانیه و صفحهٔ ایستای مشابه حدود ۴۵۰ (۵۰ کاربرِ هم‌زمان، یک پروسه).

   حالا ISR است: HTMLِ آماده سرو می‌شود و حداکثر هر ۶۰ ثانیه یک بار در
   پس‌زمینه تازه می‌شود. ذخیرهٔ مدیر با `refreshPublicContent("ninja")` همان
   لحظه صفحه را باطل می‌کند، پس «مدیری که تغییرش را نمی‌بیند» برنمی‌گردد.

   ⚠️ در `next build` دیتابیس نیست؛ loader آن را می‌گیرد و دادهٔ ثابت
   برمی‌گرداند (همان قراردادِ صفحهٔ خانه). پس صفحهٔ ساخته‌شده در build حداکثر
   ۶۰ ثانیه پس از بالا آمدن عمر دارد و بعد با دادهٔ دیتابیس جایگزین می‌شود. */
export const revalidate = 60;

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
      <JsonLd data={gameJsonLd(SEO_PAGES["/game/ninja"])} />
      <GameShell title="نینجای دستور زبان" progressKeys={["ninja-progress"]}>
      <NinjaGame rounds={rounds} />
    </GameShell>
    </>
  );
}
