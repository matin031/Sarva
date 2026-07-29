import { redirect } from "next/navigation";
import VocabPanel from "@/components/UI/panel/VocabPanel";
import {
  getBookmarks,
  getPanelUser,
  getVocabAnswers,
  getVocabSummary,
} from "@/lib/panel/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 150;

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [page, summary, bookmarks] = await Promise.all([
    getVocabAnswers(user.id, 0, PAGE_SIZE),
    getVocabSummary(user.id),
    getBookmarks(user.id, "vocab"),
  ]);

  return (
    <VocabPanel
      initialAnswers={page.answers}
      initialHasMore={page.hasMore}
      history={summary}
      bookmarks={bookmarks}
    />
  );
}
