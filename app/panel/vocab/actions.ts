"use server";

import { getPanelUser, getVocabAnswers } from "@/lib/panel/queries";
import type { VocabAnswer } from "@/lib/panel/types";

const PAGE_SIZE = 150;

/** The next window of answers. The first one comes from the route itself. */
export async function loadMoreVocabAnswers(
  offset: number,
): Promise<{ answers: VocabAnswer[]; hasMore: boolean }> {
  const user = await getPanelUser();
  if (!user) return { answers: [], hasMore: false };
  const safe = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  return getVocabAnswers(user.id, safe, PAGE_SIZE);
}
