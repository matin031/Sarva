import { redirect } from "next/navigation";
import AruzPanel from "@/components/UI/panel/AruzPanel";
import {
  getAruzActivity,
  getAruzAttempts,
  getAruzSummary,
  getAruzWeightStats,
  getBookmarks,
  getPanelUser,
} from "@/lib/panel/queries";

/** Rendered on the server so the router only enters this route once the
 *  numbers are in hand — the panel never shows a spinner where a figure
 *  belongs. Everything below the fetch is a Client Component. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [page, summary, activity, bookmarks, weights] = await Promise.all([
    getAruzAttempts(user.id, 0, PAGE_SIZE),
    getAruzSummary(user.id),
    getAruzActivity(user.id),
    getBookmarks(user.id, "aruz"),
    getAruzWeightStats(user.id),
  ]);

  return (
    <AruzPanel
      initialAttempts={page.attempts}
      initialHasMore={page.hasMore}
      summary={summary}
      activity={activity}
      bookmarks={bookmarks}
      weights={weights}
    />
  );
}
