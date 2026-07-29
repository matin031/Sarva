"use server";

import { getAruzAttempts, getPanelUser } from "@/lib/panel/queries";
import type { AruzAttempt } from "@/lib/panel/types";

const PAGE_SIZE = 5;

/** The next page of past attempts. `offset` is how many are already on screen.
 *  The first page comes from the route itself; this only exists for the
 *  «بارگیری بیشتر» button. */
export async function loadMoreAruzAttempts(
  offset: number,
): Promise<{ attempts: AruzAttempt[]; hasMore: boolean }> {
  const user = await getPanelUser();
  if (!user) return { attempts: [], hasMore: false };
  const safe = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  return getAruzAttempts(user.id, safe, PAGE_SIZE);
}
