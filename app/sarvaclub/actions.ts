"use server";

import { getClubFeed, getClubViewer, type FeedOptions } from "@/lib/club/queries";
import type { ClubPost } from "@/lib/club/types";

/** The next page of the feed. The first one is rendered by the route itself;
 *  this is what «سروده‌های بیشتر» calls. Same shape, same filters — the client
 *  hands back the options it is already showing. */
export async function loadMoreClubPosts(
  options: FeedOptions,
): Promise<{ posts: ClubPost[]; hasMore: boolean }> {
  const viewer = await getClubViewer();
  const page = Number.isFinite(options.page) ? Math.max(0, Math.floor(options.page ?? 0)) : 0;
  return getClubFeed(viewer, { ...options, page });
}
