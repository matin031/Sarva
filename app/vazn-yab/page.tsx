import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import VaznYabHero3D from "@/components/UI/vazn-yab/VaznYabHero3D";
import MasterChallenge from "@/components/UI/vazn-yab/MasterChallenge";

// Static page; the client verifies known couplets through /api/vazn-yab before local inference.
export const metadata: Metadata = pageMetadata({
  path: "/vazn-yab",
  title: "وزن‌یاب — تشخیص وزن شعر فارسی",
  description:
    "یک مصرع را بنویسید تا وزن عروضی و تقطیع آن را ببینید. وزن‌یاب سروا ابتدا موارد شناخته‌شده را بررسی می‌کند و سپس از موتور عروض برای تشخیص استفاده می‌کند.",
});

function page() {
  return (
    <div dir="rtl" className="container relative z-20">
      {/* the old flat hero is still at components/UI/HeroSectionVaznYab.tsx —
          swapping these two lines back reverts the redesign */}
      <VaznYabHero3D />

      <MasterChallenge />

      <VaznYabSection />
    </div>
  );
}

export default page;
