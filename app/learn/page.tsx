import type { Metadata } from "next";
import LearnHub from "@/components/learn/hub/LearnHub";
import JsonLd from "@/components/seo/JsonLd";
import { LESSONS, LESSON_GROUPS, lessonCard } from "@/lib/learn";
import { SEO_PAGES } from "@/lib/seo/catalog";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import { collectionJsonLd } from "@/lib/seo/entity";

export const metadata: Metadata = catalogMetadata("/learn");

/** فهرستِ درسنامه‌های تعاملی. فقط خلاصهٔ هر درس (`lessonCard`) به مرورگر
 *  می‌رود، نه قدم‌هایش. */
export default function LearnPage() {
  return (
    <>
      <JsonLd data={breadcrumbList([{ name: "خانه", path: "/" }, { name: "درسنامهٔ تعاملی", path: "/learn" }])} />
      <JsonLd data={collectionJsonLd(SEO_PAGES["/learn"], LESSONS.map(lesson => ({ name: `درسنامهٔ تعاملی ${lesson.title}`, path: `/learn/${lesson.slug}` })))} />
      <LearnHub groups={LESSON_GROUPS} cards={LESSONS.map(lessonCard)} />
    </>
  );
}
