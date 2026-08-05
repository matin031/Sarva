"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  poemExcerpt,
  type ActionResult,
  type ClubComment,
  type ClubCommentWithPost,
  type ClubPost,
  type ClubPostForm,
  type ClubReport,
  type ClubStatus,
  type ReportReason,
  type ReportStatus,
} from "@/lib/club/types";

/** Moderation for سروا کلاب.
 *
 *  This is the one part of the feature that uses the service-role client: its
 *  whole job is to read the rows RLS hides from everyone else. Every export
 *  therefore starts with `requireAdmin()` — that call, not the URL, is what
 *  keeps the queue private. */

function revalidateClub(postId?: string) {
  revalidatePath("/admin/club");
  revalidatePath("/sarvaclub");
  revalidatePath("/panel/club");
  if (postId) revalidatePath(`/sarvaclub/${postId}`);
}

const POST_COLUMNS =
  "id, user_id, author_name, is_anonymous, title, body, form, tags, meter, status, review_note, featured, like_count, comment_count, published_at, created_at, updated_at";

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

/** A سروده as the moderator sees it: the public row plus who really wrote it,
 *  which matters most on a بی‌نام poem — the byline says «ناشناس» but a
 *  reviewer still has to know whose account is behind a repeat offender. */
export type AdminClubPost = ClubPost & {
  userId: string;
  accountName: string;
  accountEmail: string | null;
  openReports: number;
};

export type AdminClubComment = ClubCommentWithPost & {
  userId: string;
  accountEmail: string | null;
  openReports: number;
};

/** Account name + email for a set of user ids, in one round trip.
 *
 *  `auth.users` is not exposed over PostgREST, so the email comes from the
 *  GoTrue admin API the same way `lib/admin/user-actions.ts` gets it. */
async function accountsById(userIds: string[]) {
  const supabase = createSupabaseAdmin();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map<string, { name: string; email: string | null }>();

  const [{ data: profiles }, { data: usersPage }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map(
    (usersPage?.users ?? []).map((u) => [u.id, u.email ?? null] as const),
  );
  const out = new Map<string, { name: string; email: string | null }>();
  for (const id of ids) {
    const profile = (profiles ?? []).find((p) => p.id === id);
    out.set(id, {
      name: (profile?.full_name as string | null) || "بدون نام",
      email: emailById.get(id) ?? null,
    });
  }
  return out;
}

/** How many open گزارش‌ها each of these targets has. */
async function openReportsFor(type: "post" | "comment", ids: string[]) {
  if (ids.length === 0) return new Map<string, number>();
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("club_reports")
    .select("target_id")
    .eq("target_type", type)
    .eq("status", "open")
    .in("target_id", ids);
  const counts = new Map<string, number>();
  for (const r of data ?? [])
    counts.set(r.target_id as string, (counts.get(r.target_id as string) ?? 0) + 1);
  return counts;
}

function toAdminPost(
  row: PostRow,
  accounts: Map<string, { name: string; email: string | null }>,
  reports: Map<string, number>,
): AdminClubPost {
  return {
    id: row.id,
    authorName: row.author_name,
    isAnonymous: row.is_anonymous,
    isMine: false,
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
    likedByMe: false,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    accountName: accounts.get(row.user_id)?.name ?? "بدون نام",
    accountEmail: accounts.get(row.user_id)?.email ?? null,
    openReports: reports.get(row.id) ?? 0,
  };
}

export async function clubAdminListPosts(
  status: ClubStatus | "all" = "pending",
): Promise<AdminClubPost[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  let query = supabase.from("club_posts").select(POST_COLUMNS);
  if (status !== "all") query = query.eq("status", status);
  // oldest first while reviewing: a queue is fair only if it is a queue
  const { data, error } = await query
    .order("created_at", { ascending: status === "pending" })
    .limit(300);
  if (error) throw new Error(`clubAdminListPosts: ${error.message}`);

  const rows = (data ?? []) as PostRow[];
  const [accounts, reports] = await Promise.all([
    accountsById(rows.map((r) => r.user_id)),
    openReportsFor("post", rows.map((r) => r.id)),
  ]);
  return rows.map((r) => toAdminPost(r, accounts, reports));
}

export async function clubAdminListComments(
  status: ClubStatus | "all" = "pending",
): Promise<AdminClubComment[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("club_comments")
    .select(
      "id, post_id, user_id, parent_id, author_name, body, status, review_note, created_at, club_posts ( title, body )",
    );
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query
    .order("created_at", { ascending: status === "pending" })
    .limit(300);
  if (error) throw new Error(`clubAdminListComments: ${error.message}`);

  type Row = {
    id: string;
    post_id: string;
    user_id: string;
    parent_id: string | null;
    author_name: string;
    body: string;
    status: string;
    review_note: string | null;
    created_at: string;
    club_posts: { title: string | null; body: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const [accounts, reports] = await Promise.all([
    accountsById(rows.map((r) => r.user_id)),
    openReportsFor("comment", rows.map((r) => r.id)),
  ]);

  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    parentId: r.parent_id,
    authorName: r.author_name,
    body: r.body,
    status: r.status as ClubStatus,
    reviewNote: r.review_note,
    isMine: false,
    createdAt: r.created_at,
    postTitle: r.club_posts?.title ?? null,
    postExcerpt: poemExcerpt(r.club_posts?.body ?? ""),
    userId: r.user_id,
    accountEmail: accounts.get(r.user_id)?.email ?? null,
    openReports: reports.get(r.id) ?? 0,
  }));
}

/** Comments under one سروده, whatever their state — shown inline while the
 *  moderator is reading the poem itself. */
export async function clubAdminPostComments(postId: string): Promise<ClubComment[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("club_comments")
    .select("id, post_id, user_id, parent_id, author_name, body, status, review_note, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`clubAdminPostComments: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    postId: r.post_id as string,
    parentId: (r.parent_id as string | null) ?? null,
    authorName: r.author_name as string,
    body: r.body as string,
    status: r.status as ClubStatus,
    reviewNote: (r.review_note as string | null) ?? null,
    isMine: false,
    createdAt: r.created_at as string,
  }));
}

// ------------------------------------------------------------- decisions ----

/** Approve or send back a سروده.
 *
 *  `published_at` is set the first time a poem is approved and then left
 *  alone, so a poem that was edited and re-approved keeps its place in the
 *  feed's chronology instead of jumping to the top again. */
export async function clubAdminSetPostStatus(
  id: string,
  status: ClubStatus,
  note?: string,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data: current } = await supabase
    .from("club_posts")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    status,
    review_note: (note ?? "").trim() || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: admin.id,
  };
  if (status === "approved") {
    patch.published_at = current?.published_at ?? new Date().toISOString();
  } else {
    // a poem pulled back off the feed must not stay pinned to the top of it
    patch.featured = false;
  }

  const { error } = await supabase.from("club_posts").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateClub(id);
  return { ok: true, data: null };
}

export async function clubAdminSetPostFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("club_posts")
    .update({ featured })
    .eq("id", id)
    .eq("status", "approved");
  if (error) return { ok: false, error: error.message };
  revalidateClub(id);
  return { ok: true, data: null };
}

export async function clubAdminDeletePost(id: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("club_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateClub(id);
  return { ok: true, data: null };
}

export async function clubAdminSetCommentStatus(
  id: string,
  status: ClubStatus,
  note?: string,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("club_comments")
    .update({
      status,
      review_note: (note ?? "").trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("id", id)
    .select("post_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  revalidateClub((data?.post_id as string) ?? undefined);
  return { ok: true, data: null };
}

export async function clubAdminDeleteComment(id: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("club_comments")
    .delete()
    .eq("id", id)
    .select("post_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  revalidateClub((data?.post_id as string) ?? undefined);
  return { ok: true, data: null };
}

// -------------------------------------------------------------- گزارش‌ها ----

export async function clubAdminListReports(
  status: ReportStatus | "all" = "open",
): Promise<ClubReport[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("club_reports")
    .select("id, reporter_id, target_type, target_id, reason, note, status, created_at");
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`clubAdminListReports: ${error.message}`);

  type Row = {
    id: string;
    reporter_id: string;
    target_type: "post" | "comment";
    target_id: string;
    reason: string;
    note: string | null;
    status: string;
    created_at: string;
  };
  const rows = (data ?? []) as Row[];

  const postIds = rows.filter((r) => r.target_type === "post").map((r) => r.target_id);
  const commentIds = rows.filter((r) => r.target_type === "comment").map((r) => r.target_id);

  const [accounts, posts, comments] = await Promise.all([
    accountsById(rows.map((r) => r.reporter_id)),
    postIds.length
      ? supabase.from("club_posts").select("id, body, status").in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase.from("club_comments").select("id, body, status").in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const targets = new Map<string, { excerpt: string; status: ClubStatus }>();
  for (const p of (posts.data ?? []) as { id: string; body: string; status: string }[])
    targets.set(p.id, { excerpt: poemExcerpt(p.body), status: p.status as ClubStatus });
  for (const c of (comments.data ?? []) as { id: string; body: string; status: string }[])
    targets.set(c.id, { excerpt: c.body.slice(0, 160), status: c.status as ClubStatus });

  return rows.map((r) => ({
    id: r.id,
    reporterName: accounts.get(r.reporter_id)?.name ?? "بدون نام",
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason as ReportReason,
    note: r.note,
    status: r.status as ReportStatus,
    createdAt: r.created_at,
    targetExcerpt: targets.get(r.target_id)?.excerpt ?? null,
    targetStatus: targets.get(r.target_id)?.status ?? null,
  }));
}

export async function clubAdminResolveReport(
  id: string,
  status: Exclude<ReportStatus, "open">,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("club_reports")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: admin.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/club");
  return { ok: true, data: null };
}

// --------------------------------------------------------------- overview ----

export type ClubAdminStats = {
  pendingPosts: number;
  pendingComments: number;
  openReports: number;
  publishedPosts: number;
  poets: number;
};

export async function clubAdminStats(): Promise<ClubAdminStats> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const head = { count: "exact" as const, head: true };
  const [pendingPosts, pendingComments, openReports, publishedPosts, poets] =
    await Promise.all([
      supabase.from("club_posts").select("id", head).eq("status", "pending"),
      supabase.from("club_comments").select("id", head).eq("status", "pending"),
      supabase.from("club_reports").select("id", head).eq("status", "open"),
      supabase.from("club_posts").select("id", head).eq("status", "approved"),
      supabase.from("club_posts").select("user_id"),
    ]);

  return {
    pendingPosts: pendingPosts.count ?? 0,
    pendingComments: pendingComments.count ?? 0,
    openReports: openReports.count ?? 0,
    publishedPosts: publishedPosts.count ?? 0,
    poets: new Set((poets.data ?? []).map((r) => r.user_id as string)).size,
  };
}
