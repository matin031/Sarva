"use server";

import { getAruzActivity, getAruzAttempts, getPanelUser } from "@/lib/panel/queries";
import type { AruzAttempt } from "@/lib/panel/types";

/** Everything `/panel/aruz` needs, in one round trip.
 *
 *  The page itself is a Client Component (it uses `toFa`, which lives in a
 *  `"use client"` module and therefore cannot be called on the server), so the
 *  data comes back through a server action instead of through props. The action
 *  takes no arguments on purpose: the user id is read from the verified session
 *  inside `getPanelUser`, never from the caller. */
export async function loadAruzPanel(): Promise<{
  attempts: AruzAttempt[];
  activity: { at: string; ok: boolean }[];
} | null> {
  const user = await getPanelUser();
  if (!user) return null;

  const [attempts, activity] = await Promise.all([
    getAruzAttempts(user.id),
    getAruzActivity(user.id),
  ]);

  return { attempts, activity };
}
