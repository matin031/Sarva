"use server";

import { getClubFeed, getClubViewer, type FeedOptions } from "@/lib/club/queries";
import { POST_FORMS, POST_TAGS, type ClubPost } from "@/lib/club/types";

/** The next page of the feed. The first one is rendered by the route itself;
 *  this is what «سروده‌های بیشتر» calls. Same shape, same filters — the client
 *  hands back the options it is already showing.
 *
 *  فیلترها دقیقاً همان‌طور که در `app/sarvaclub/page.tsx` پالوده می‌شوند اینجا
 *  هم پالوده می‌شوند: یک Server Action در عمل یک endpoint است و هر کسی
 *  می‌تواند مستقیم صدایش بزند، پس نباید به این تکیه کرد که فراخوان همان
 *  کامپوننتِ خودمان است. سقفِ صفحه هم هست تا `offset` نجومی به دیتابیس نرسد. */
export async function loadMoreClubPosts(
  options: FeedOptions,
): Promise<{ posts: ClubPost[]; hasMore: boolean }> {
  const viewer = await getClubViewer();

  const sort =
    options.sort === "popular" || options.sort === "discussed" ? options.sort : "recent";
  const form = POST_FORMS.some((f) => f.id === options.form) ? options.form : undefined;
  const tag = POST_TAGS.some((t) => t.id === options.tag) ? options.tag : undefined;
  const page = Number.isFinite(options.page)
    ? Math.min(500, Math.max(0, Math.floor(options.page ?? 0)))
    : 0;

  return getClubFeed(viewer, { sort, form, tag, page });
}
