import type { Metadata } from "next";
import { catalogMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import ExamNightHub from "@/components/UI/shab-emtehan/ExamNightHub";
import { reviewGrades } from "@/lib/doroos/exam-night";

export const metadata: Metadata = catalogMetadata("/shab-emtehan");

/** شب امتحان — فهرستِ برگه‌های مرورِ فشرده.
 *
 *  همه‌چیزش از محتوای درسنامه ساخته می‌شود (`lib/doroos/exam-night.ts`) و
 *  چیزی از دیتابیس نمی‌خواند، پس ایستا ساخته می‌شود. تیک‌های «مرور کردم» در
 *  مرورگر می‌مانند و روی همین HTML ایستا سوار می‌شوند. */
export default async function Page() {
  const grades = await reviewGrades();

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "شب امتحان", path: "/shab-emtehan" },
        ])}
      />
      <ExamNightHub grades={grades} />
    </>
  );
}
