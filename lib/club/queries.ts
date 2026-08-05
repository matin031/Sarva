import "server-only";
import { createSupabaseServer } from "@/lib/supabase-server";
import type {
  ClubComment,
  ClubFeedSort,
  ClubPost,
  ClubPostForm,
  ClubStatus,
} from "@/lib/club/types";
import { poemExcerpt } from "@/lib/club/types";

/** Server-side reads for سروا کلاب.
 *
 *  Everything here goes through the session-bound (anon-key) client on
 *  purpose: RLS is what guarantees an unapproved سروده never reaches a reader,
 *  and using the service-role client would quietly switch that guarantee off.
 *  The only place the service key appears in this feature is the admin panel,
 *  whose whole job is to see the unapproved rows. */

export const FEED_PAGE_SIZE = 12;

export type ClubViewer = { id: string; name: string } | null;

/** Who is reading, and under what name they would post.
 *
 *  `profiles.full_name` is the name the student chose in تنظیمات حساب; the auth
 *  metadata copy is the fallback for accounts created before profiles existed. */
export async function getClubViewer(): Promise<ClubViewer> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    (profile?.full_name as string | null) ||
    (user.user_metadata?.full_name as string | undefined) ||
    "کاربر سروا";

  return { id: user.id, name: name.trim() };
}

type PostRow = {
  id: string;
  user_id: string;
  author_name: string;
  is_anonymous: boolean;
  title: string | null;
  body: string;
  form: string;
  tags: string[] | null;
  meter: string | null;
  status: string;
  review_note: string | null;
  featured: boolean;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const POST_COLUMNS =
  "id, user_id, author_name, is_anonymous, title, body, form, tags, meter, status, review_note, featured, like_count, comment_count, published_at, created_at, updated_at";

function toPost(row: PostRow, viewerId: string | null, liked: Set<string>): ClubPost {
  return {
    id: row.id,
    // For a بی‌نام poem this column holds the pen name, never the real one —
    // the account behind it is recoverable only through the admin panel, which
    // is the whole promise the بی‌نام switch makes.
    authorName: row.author_name,
    isAnonymous: row.is_anonymous,
    isMine: !!viewerId && row.user_id === viewerId,
    title: row.title,
    body: row.body,
    form: row.form as ClubPostForm,
    tags: row.tags ?? [],
    meter: row.meter,
    status: row.status as ClubStatus,
    reviewNote: row.review_note,
    featured: row.featured,
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    likedByMe: liked.has(row.id),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Which of these posts the reader has already پسندیده. One query for the
 *  whole page instead of a `likes(...)` embed per card. */
async function likedSet(postIds: string[], viewerId: string | null): Promise<Set<string>> {
  if (!viewerId || postIds.length === 0) return new Set();
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("club_likes")
    .select("post_id")
    .eq("user_id", viewerId)
    .in("post_id", postIds);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

export type FeedOptions = {
  sort?: ClubFeedSort;
  form?: string;
  tag?: string;
  page?: number;
};

/** The public feed. Only approved rows come back — not because of the
 *  `.eq("status", "approved")` below (which is there to keep the index in
 *  play) but because the RLS policy allows nothing else to an ordinary reader. */
export async function getClubFeed(
  viewer: ClubViewer,
  { sort = "recent", form, tag, page = 0 }: FeedOptions = {},
): Promise<{ posts: ClubPost[]; hasMore: boolean }> {
  const supabase = await createSupabaseServer();
  const from = page * FEED_PAGE_SIZE;

  let query = supabase
    .from("club_posts")
    .select(POST_COLUMNS)
    .eq("status", "approved");

  if (form) query = query.eq("form", form);
  if (tag) query = query.contains("tags", [tag]);

  // برگزیده‌ها ride at the top of every ordering — that is what featuring means
  query = query.order("featured", { ascending: false });
  if (sort === "popular") query = query.order("like_count", { ascending: false });
  else if (sort === "discussed") query = query.order("comment_count", { ascending: false });
  query = query.order("published_at", { ascending: false, nullsFirst: false });

  // one row past the page, purely to learn whether a "بیشتر" button is needed
  const { data, error } = await query.range(from, from + FEED_PAGE_SIZE);
  if (error) {
    console.error("getClubFeed:", error.message);
    return { posts: [], hasMore: false };
  }

  const rows = (data ?? []) as PostRow[];
  const pageRows = rows.slice(0, FEED_PAGE_SIZE);
  const liked = await likedSet(
    pageRows.map((r) => r.id),
    viewer?.id ?? null,
  );
  return {
    posts: pageRows.map((r) => toPost(r, viewer?.id ?? null, liked)),
    hasMore: rows.length > FEED_PAGE_SIZE,
  };
}

/** A single سروده. Returns null when it is not published *and* not the
 *  reader's own — RLS makes the two cases indistinguishable, which is exactly
 *  what a 404 should look like. */
export async function getClubPost(id: string, viewer: ClubViewer): Promise<ClubPost | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("club_posts")
    .select(POST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PostRow;
  const liked = await likedSet([row.id], viewer?.id ?? null);
  return toPost(row, viewer?.id ?? null, liked);
}

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  reply_to_id: string | null;
  author_name: string;
  body: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

const COMMENT_COLUMNS =
  "id, post_id, user_id, parent_id, reply_to_id, author_name, body, status, review_note, created_at";

function toComment(row: CommentRow, viewerId: string | null): ClubComment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    replyToId: row.reply_to_id,
    authorName: row.author_name,
    body: row.body,
    status: row.status as ClubStatus,
    reviewNote: row.review_note,
    isMine: !!viewerId && row.user_id === viewerId,
    createdAt: row.created_at,
  };
}

/** Comments under a poem: everything approved, plus the reader's own rows
 *  whatever their state — a student who just wrote a دیدگاه should see it
 *  sitting in review rather than wonder whether the button worked. RLS returns
 *  both sets from this one query. */
export async function getClubComments(
  postId: string,
  viewer: ClubViewer,
): Promise<ClubComment[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("club_comments")
    .select(COMMENT_COLUMNS)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getClubComments:", error.message);
    return [];
  }
  return ((data ?? []) as CommentRow[]).map((r) => toComment(r, viewer?.id ?? null));
}

// ------------------------------------------------------ پنل کاربری ----

export async function getMyPosts(viewer: ClubViewer): Promise<ClubPost[]> {
  if (!viewer) return [];
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("club_posts")
    .select(POST_COLUMNS)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMyPosts:", error.message);
    return [];
  }
  const rows = (data ?? []) as PostRow[];
  const liked = await likedSet(rows.map((r) => r.id), viewer.id);
  return rows.map((r) => toPost(r, viewer.id, liked));
}

export type MyComment = ClubComment & { postTitle: string | null; postExcerpt: string };

export async function getMyComments(viewer: ClubViewer): Promise<MyComment[]> {
  if (!viewer) return [];
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("club_comments")
    .select(`${COMMENT_COLUMNS}, club_posts ( title, body )`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("getMyComments:", error.message);
    return [];
  }
  return (data ?? []).map((raw) => {
    const row = raw as unknown as CommentRow & {
      club_posts: { title: string | null; body: string } | null;
    };
    return {
      ...toComment(row, viewer.id),
      postTitle: row.club_posts?.title ?? null,
      postExcerpt: poemExcerpt(row.club_posts?.body ?? ""),
    };
  });
}

/** The three numbers under the hero.
 *
 *  Counted through the same RLS the feed reads, so they can only ever describe
 *  published work — the queue is nobody's business but the moderator's. The
 *  poet tally comes from a column of ids rather than a `count(distinct)`,
 *  which PostgREST has no way to express; at this size that is a few hundred
 *  uuids, not a table scan worth optimising. */
export async function getClubStats(): Promise<{
  poems: number;
  poets: number;
  comments: number;
}> {
  const supabase = await createSupabaseServer();
  const [poems, authors, comments] = await Promise.all([
    supabase
      .from("club_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase.from("club_posts").select("author_name").eq("status", "approved"),
    supabase
      .from("club_comments")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
  ]);
  return {
    poems: poems.count ?? 0,
    poets: new Set((authors.data ?? []).map((r) => r.author_name as string)).size,
    comments: comments.count ?? 0,
  };
}

/** The reader's own liked poems, for the «پسندیده‌های من» tab. */
export async function getMyLikedPosts(viewer: ClubViewer): Promise<ClubPost[]> {
  if (!viewer) return [];
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("club_likes")
    .select(`post_id, created_at, club_posts ( ${POST_COLUMNS} )`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("getMyLikedPosts:", error.message);
    return [];
  }
  const liked = new Set<string>();
  const posts: ClubPost[] = [];
  for (const raw of data ?? []) {
    const row = (raw as unknown as { club_posts: PostRow | null }).club_posts;
    // the poem may have been unpublished since; RLS then returns it as null
    if (!row) continue;
    liked.add(row.id);
    posts.push(toPost(row, viewer.id, liked));
  }
  return posts;
}
