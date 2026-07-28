"use server";

import {
  getBookmarks,
  getPanelUser,
  getVocabAnswers,
  getVocabSummary,
} from "@/lib/panel/queries";
import type { VocabAnswer } from "@/lib/panel/types";

/** How many answered words arrive per request. A round is usually ten to twenty
 *  answers, so one page is roughly the last ten sessions. */
const PAGE_SIZE = 150;

export async function loadVocabPanel() {
  const user = await getPanelUser();
  if (!user) return null;

  const [page, summary, bookmarks] = await Promise.all([
    getVocabAnswers(user.id, 0, PAGE_SIZE),
    getVocabSummary(user.id),
    getBookmarks(user.id, "vocab"),
  ]);

  return {
    answers: page.answers,
    hasMore: page.hasMore,
    summary,
    bookmarks,
  };
}

/** The next window of answers. `offset` is how many are already on screen. */
export async function loadMoreVocabAnswers(
  offset: number,
): Promise<{ answers: VocabAnswer[]; hasMore: boolean }> {
  const user = await getPanelUser();
  if (!user) return { answers: [], hasMore: false };
  const safe = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  return getVocabAnswers(user.id, safe, PAGE_SIZE);
}
