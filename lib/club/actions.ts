"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getClubViewer } from "@/lib/club/queries";
import {
  DAILY_COMMENT_LIMIT,
  DAILY_POST_LIMIT,
  MAX_BODY,
  MAX_COMMENT,
  MAX_TAGS,
  MAX_TITLE,
  PENDING_POST_LIMIT,
  POST_FORMS,
  POST_TAGS,
  REPORT_REASONS,
  type ActionResult,
  type ClubPostForm,
  type ReportReason,
} from "@/lib/club/types";

/** What a signed-in student can do in سروا کلاب.
 *
 *  Every write runs on the session-bound client, so the RLS policies from
 *  `20260805_sarvaclub.sql` are the last word: a poet can only ever write a
 *  'pending' row, and only their own. The checks in this file are there to
 *  turn a rejection into a sentence of Persian rather than a Postgres error,
 *  and to add the rules RLS cannot express (length limits, the daily cap). */

const SIGN_IN = "برای این کار باید وارد حساب کاربری‌ات شوی.";

function revalidateClub(postId?: string) {
  revalidatePath("/sarvaclub");
  revalidatePath("/panel/club");
  revalidatePath("/admin/club");
  if (postId) revalidatePath(`/sarvaclub/${postId}`);
}

/** Normalises a pasted poem: Windows newlines flattened, trailing spaces
 *  dropped, and a run of blank lines collapsed to one — so a stanza break
 *  survives but forty empty lines do not become forty empty lines on the page. */
function cleanPoem(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanTags(tags: string[] | undefined): string[] {
  const allowed = new Set(POST_TAGS.map((t) => t.id));
  return [...new Set(tags ?? [])].filter((t) => allowed.has(t)).slice(0, MAX_TAGS);
}

export type PostInput = {
  title?: string;
  body: string;
  form: string;
  tags?: string[];
  meter?: string;
  isAnonymous?: boolean;
  /** pen name, used only when isAnonymous is on */
  alias?: string;
};

/** Column-shaped, ready to hand to `insert`/`update` as-is. */
type ValidPost = {
  title: string | null;
  body: string;
  form: ClubPostForm;
  tags: string[];
  meter: string | null;
  is_anonymous: boolean;
  author_name: string;
};

function validatePost(input: PostInput, realName: string): ValidPost | string {
  const body = cleanPoem(input.body ?? "");
  if (body.length < 5) return "متن سروده را بنویس — دست‌کم یک بیت.";
  if (body.length > MAX_BODY)
    return `سروده نباید بیش از ${MAX_BODY.toLocaleString("fa-IR")} نویسه باشد.`;

  const title = (input.title ?? "").trim();
  if (title.length > MAX_TITLE)
    return `عنوان نباید بیش از ${MAX_TITLE.toLocaleString("fa-IR")} نویسه باشد.`;

  if (!POST_FORMS.some((f) => f.id === input.form)) return "قالب شعر نامعتبر است.";

  const meter = (input.meter ?? "").trim().slice(0, 120);
  const isAnonymous = !!input.isAnonymous;
  const alias = (input.alias ?? "").trim().slice(0, 40);

  return {
    title: title || null,
    body,
    form: input.form as ClubPostForm,
    tags: cleanTags(input.tags),
    meter: meter || null,
    is_anonymous: isAnonymous,
    // the name that will sit under the poem — a pen name, «ناشناس», or the
    // account's own name. Snapshotted now so a later rename in تنظیمات حساب
    // does not silently re-attribute an old سروده.
    author_name: isAnonymous ? alias || "ناشناس" : realName,
  };
}

/** Submit a new سروده. It goes straight into the moderation queue; nothing the
 *  caller can send makes it publish itself. */
export async function createClubPost(input: PostInput): Promise<ActionResult<{ id: string }>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const valid = validatePost(input, viewer.name);
  if (typeof valid === "string") return { ok: false, error: valid };

  const supabase = await createSupabaseServer();

  // two separate caps: a burst limit and a queue limit. The queue one matters
  // most — a reviewer should never open the panel to forty poems from one
  // account and none from anyone else.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: todayCount }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("club_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewer.id)
      .gte("created_at", since),
    supabase
      .from("club_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewer.id)
      .eq("status", "pending"),
  ]);

  if ((todayCount ?? 0) >= DAILY_POST_LIMIT)
    return {
      ok: false,
      error: `در هر شبانه‌روز حداکثر ${DAILY_POST_LIMIT.toLocaleString("fa-IR")} سروده می‌توانی بفرستی. فردا دوباره سر بزن.`,
    };
  if ((pendingCount ?? 0) >= PENDING_POST_LIMIT)
    return {
      ok: false,
      error: `${PENDING_POST_LIMIT.toLocaleString("fa-IR")} سرودهٔ بررسی‌نشده داری. تا تعیین تکلیف آن‌ها صبر کن.`,
    };

  const { data, error } = await supabase
    .from("club_posts")
    .insert({ ...valid, user_id: viewer.id, status: "pending" })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidateClub();
  return { ok: true, data: { id: data.id as string } };
}

/** Edit one of your own سروده‌ها. A published poem returns to the queue — the
 *  RLS `with check` clause insists on it, so this cannot be forgotten. */
export async function updateClubPost(
  id: string,
  input: PostInput,
): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const valid = validatePost(input, viewer.name);
  if (typeof valid === "string") return { ok: false, error: valid };

  const supabase = await createSupabaseServer();
  const { error, count } = await supabase
    .from("club_posts")
    .update(
      {
        ...valid,
        status: "pending",
        review_note: null,
        featured: false,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("user_id", viewer.id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "این سروده پیدا نشد." };

  revalidateClub(id);
  return { ok: true, data: null };
}

export async function deleteClubPost(id: string): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("club_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", viewer.id);
  if (error) return { ok: false, error: error.message };

  revalidateClub(id);
  return { ok: true, data: null };
}

// ------------------------------------------------------------ دیدگاه‌ها ----

export async function createClubComment(
  postId: string,
  body: string,
  parentId?: string | null,
): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const text = cleanPoem(body ?? "");
  if (text.length < 2) return { ok: false, error: "دیدگاهت را بنویس." };
  if (text.length > MAX_COMMENT)
    return {
      ok: false,
      error: `دیدگاه نباید بیش از ${MAX_COMMENT.toLocaleString("fa-IR")} نویسه باشد.`,
    };

  const supabase = await createSupabaseServer();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("club_comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_COMMENT_LIMIT)
    return { ok: false, error: "امروز دیدگاه‌های زیادی نوشته‌ای. فردا ادامه بده." };

  // one level of nesting: a reply to a reply is attached to its grandparent so
  // the thread cannot walk off the right edge of a phone
  let parent: string | null = null;
  if (parentId) {
    const { data } = await supabase
      .from("club_comments")
      .select("id, parent_id, post_id, status")
      .eq("id", parentId)
      .maybeSingle();
    if (data && data.post_id === postId && data.status === "approved") {
      parent = (data.parent_id as string | null) ?? (data.id as string);
    }
  }

  const { error } = await supabase.from("club_comments").insert({
    post_id: postId,
    user_id: viewer.id,
    // «نظرشون با اسمی که برای اکانتشون گذاشتن باید باشه» — a دیدگاه is always
    // signed with the account's own name; there is no anonymous option here.
    author_name: viewer.name,
    parent_id: parent,
    body: text,
    status: "pending",
  });
  if (error) {
    // the RLS insert policy also refuses a comment on an unpublished سروده
    return { ok: false, error: "ثبت دیدگاه ممکن نشد. شاید این سروده منتشر نشده باشد." };
  }

  revalidateClub(postId);
  return { ok: true, data: null };
}

export async function deleteClubComment(
  id: string,
  postId: string,
): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("club_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", viewer.id);
  if (error) return { ok: false, error: error.message };

  revalidateClub(postId);
  return { ok: true, data: null };
}

// ------------------------------------------------------------- پسندیدن ----

/** Toggle a پسند. Returns the state the button should show; the total comes
 *  from the counter the database keeps, so it is right even when two readers
 *  like the same poem at once. */
export async function toggleClubLike(
  postId: string,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from("club_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("club_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", viewer.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("club_likes")
      .insert({ post_id: postId, user_id: viewer.id });
    if (error) return { ok: false, error: "این سروده در دسترس نیست." };
  }

  const { data: post } = await supabase
    .from("club_posts")
    .select("like_count")
    .eq("id", postId)
    .maybeSingle();

  revalidatePath("/sarvaclub");
  revalidatePath(`/sarvaclub/${postId}`);
  return {
    ok: true,
    data: { liked: !existing, likeCount: Number(post?.like_count ?? 0) },
  };
}

// -------------------------------------------------------------- گزارش ----

export async function reportClubContent(
  targetType: "post" | "comment",
  targetId: string,
  reason: string,
  note?: string,
): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };
  if (!REPORT_REASONS.some((r) => r.id === reason))
    return { ok: false, error: "دلیل گزارش نامعتبر است." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("club_reports").insert({
    reporter_id: viewer.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason as ReportReason,
    note: (note ?? "").trim().slice(0, 500) || null,
    status: "open",
  });
  // the unique constraint fires when the same person reports the same thing
  // twice — from the reporter's side that is a success, not an error
  if (error && !error.message.includes("duplicate key"))
    return { ok: false, error: error.message };

  revalidatePath("/admin/club");
  return { ok: true, data: null };
}
