import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import ExamBrowser from "@/components/exam/ExamBrowser";
import { listExamSummaries } from "@/lib/exam/db-exam";

export const metadata: Metadata = {
  /* canonicalِ خودش — پیش از این از لایوتِ ریشه «/» را ارث می‌برد. */
  alternates: { canonical: absoluteUrl("/exam") },
  title: "آزمون‌های آنلاین",
};

/** The exam bank lives in Supabase and is edited from the admin panel, so this
 *  list has to be read per request. Without it Next prerenders the page at
 *  build time: locally you always see the newest exams because dev renders on
 *  every request, but on Vercel the page is frozen at the last deploy and an
 *  exam added afterwards never shows up. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const exams = await listExamSummaries();
  return <ExamBrowser exams={exams} />;
}
