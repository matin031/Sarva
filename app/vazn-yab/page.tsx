import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { SEO_PAGES } from "@/lib/seo/catalog";
import { toolJsonLd } from "@/lib/seo/entity";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import VaznYabHero3D from "@/components/UI/vazn-yab/VaznYabHero3D";
import MasterChallenge from "@/components/UI/vazn-yab/MasterChallenge";

// Static page; the client verifies known couplets through /api/vazn-yab before local inference.
export const metadata: Metadata = catalogMetadata("/vazn-yab");

function page() {
  return (
    <div dir="rtl" className="container relative z-20">
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "وزن‌یاب", path: "/vazn-yab" },
        ])}
      />
      {/* ابزارِ آنلاین — برای موتورهای پاسخ‌گو که دنبالِ «ابزار تشخیص وزن شعر»اند. */}
      <JsonLd data={toolJsonLd(SEO_PAGES["/vazn-yab"])} />
      {/* the old flat hero is still at components/UI/HeroSectionVaznYab.tsx —
          swapping these two lines back reverts the redesign */}
      <VaznYabHero3D />

      <MasterChallenge />

      <VaznYabSection />
    </div>
  );
}

export default page;
