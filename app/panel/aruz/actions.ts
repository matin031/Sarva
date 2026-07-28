"use server";

import {
  getAruzActivity,
  getAruzAttempts,
  getAruzSummary,
  getBookmarks,
  getPanelUser,
} from "@/lib/panel/queries";
import type { AruzAttempt, Bookmark } from "@/lib/panel/types";

/** How many past attempts arrive per request. Each attempt carries all of its
 *  questions and every option, so this is the one number that decides how heavy
 *  the page is — the rest come from «بارگیری بیشتر». */
export const PAGE_SIZE = 5;

export type AruzPanelData = {
  attempts: AruzAttempt[];
  hasMore: boolean;
  summary: { attempts: number; best: number; questions: number; correct: number };
  activity: { at: string; ok: boolean }[];
  bookmarks: Bookmark[];
};

/** Everything `/panel/aruz` needs for the first paint, in one round trip.
 *
 *  The page itself is a Client Component (it uses `toFa`, which lives in a
 *  `"use client"` module and therefore cannot be called on the server), so the
 *  data comes back through a server action instead of through props. The action
 *  takes no arguments on purpose: the user id is read from the verified session
 *  inside `getPanelUser`, never from the caller. */
export async function loadAruzPanel(): Promise<AruzPanelData | null> {
  const user = await getPanelUser();
  if (!user) return null;

  const [page, summary, activity, bookmarks] = await Promise.all([
    getAruzAttempts(user.id, 0, PAGE_SIZE),
    getAruzSummary(user.id),
    getAruzActivity(user.id),
    getBookmarks(user.id, "aruz"),
  ]);

  return {
    attempts: page.attempts,
    hasMore: page.hasMore,
    summary,
    activity,
    bookmarks,
  };
}

/** The next page of past attempts. `offset` is how many are already on screen. */
export async function loadMoreAruzAttempts(
  offset: number,
): Promise<{ attempts: AruzAttempt[]; hasMore: boolean }> {
  const user = await getPanelUser();
  if (!user) return { attempts: [], hasMore: false };
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  return getAruzAttempts(user.id, safeOffset, PAGE_SIZE);
}
