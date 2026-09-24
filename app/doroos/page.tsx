import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import DoroosHome from "@/components/UI/doroos/DoroosHome";
import JsonLd from "@/components/seo/JsonLd";
import { GRADES } from "@/lib/doroos";
import { SEO_PAGES } from "@/lib/seo/catalog";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { collectionJsonLd } from "@/lib/seo/entity";

export const metadata: Metadata = catalogMetadata("/doroos");

export default function Page() {
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "درسنامه", path: "/doroos" },
        ])}
      />
      {/* سه کتاب، هرکدام با صفحهٔ خودش — نقشهٔ درسنامه برای موتورِ جست‌وجو. */}
      <JsonLd
        data={collectionJsonLd(
          SEO_PAGES["/doroos"],
          GRADES.map((g) => ({ name: `درسنامهٔ ${g.book} (فارسی ${g.label})`, path: `/doroos/${g.key}` })),
        )}
      />
      <DoroosHome grades={GRADES} />
    </>
  );
}
