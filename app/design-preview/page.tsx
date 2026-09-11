import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import PanelLayout from "@/app/panel/layout";
import HomePanel from "@/components/UI/panel/HomePanel";
import { tehranDayKey } from "@/lib/panel/day-counts";
import type { BookmarkArea, PanelOverview } from "@/lib/panel/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پیش‌نمایش طراحی پنل سروا", robots: { index: false, follow: false } };

/** Local visual review only: synthetic data, no database access or auth bypass. */
export default async function DesignPreview({ searchParams }: {
  searchParams: Promise<{ empty?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const empty = (await searchParams).empty === "1";
  const areas: BookmarkArea[] = ["aruz", "vocab", "jasoos", "exam"];
  const dayCounts: PanelOverview["dayCounts"] = empty ? [] : Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const total = i % 8 === 7 ? 0 : 15 + (i * 7) % 30;
    return { day: tehranDayKey(date), area: areas[i % 4], total, correct: Math.round(total * .83) };
  });
  const counts = Object.fromEntries(areas.map(area => [area, dayCounts.filter(d => d.area === area).reduce(
    (sum, day) => ({ total: sum.total + day.total, correct: sum.correct + day.correct }), { total: 0, correct: 0 },
  )])) as PanelOverview["counts"];
  const overview: PanelOverview = { dayCounts, counts, bookmarks: empty ? 0 : 12, exams: empty ? { attempts: 0, best: 0, average: 0 } : { attempts: 8, best: 95, average: 86 } };
  return (
    <PanelLayout>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>پیش‌نمایش طراحی · اطلاعات این صفحه نمونه است</span>
        <Link href={empty ? "/design-preview" : "/design-preview?empty=1"} className="text-primary underline underline-offset-4">
          {empty ? "نمایش حساب فعال" : "نمایش حساب تازه"}
        </Link>
      </div>
      <HomePanel name="همراه سروا" memberSince={null} overview={overview} />
    </PanelLayout>
  );
}
