"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { boolArg, enumArg, optionalTextArg, uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
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

/**
 * بررسی و مدیریت سروا کلاب.
 *
 * قبلاً این تنها بخشی از فیچر بود که از کلاینت service-role استفاده می‌کرد،
 * چون کارش دقیقاً دیدنِ ردیف‌هایی است که RLS از بقیه پنهان می‌کرد. حالا که
 * RLS ای در کار نیست، تنها چیزی که صف را خصوصی نگه می‌دارد همان
 * `requireAdmin()` ابتدای هر تابع است — نه آدرس صفحه، نه چیز دیگر.
 *
 * یک ساده‌سازی بزرگ هم اتفاق افتاده: نام و ایمیل حساب قبلاً از دو منبع می‌آمد
 * (جدول profiles و GoTrue admin API) و یک تابع کمکیِ accountsById لازم داشت که
 * برای هر فهرست، *همهٔ* کاربران را از GoTrue می‌کشید. حالا هر دو ستونِ همان
 * جدول users هستند و یک JOIN کافی است.
 */

function revalidateClub(postId?: string) {
  revalidatePath("/admin/club");
  revalidatePath("/sarvaclub");
  revalidatePath("/panel/club");
  if (postId) revalidatePath(`/sarvaclub/${postId}`);
}

/** سروده آن‌طور که مدیر می‌بیند: ردیف عمومی، به‌علاوهٔ اینکه واقعاً چه کسی
 *  نوشته — که روی شعر بی‌نام بیشترین اهمیت را دارد: امضا می‌گوید «ناشناس» ولی
 *  بررسی‌کننده باید بداند پشت یک متخلفِ تکراری کدام حساب است. */
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

type AdminPostRow = {
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
  account_name: string | null;
  account_email: string | null;
  open_reports: number;
};

function toAdminPost(row: AdminPostRow): AdminClubPost {
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
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: false,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    accountName: row.account_name || "بدون نام",
    accountEmail: row.account_email,
    openReports: row.open_reports,
  };
}

/** فارسیِ وضعیت‌ها، برای خلاصهٔ لاگ فعالیت. */
const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "منتشرشده",
  rejected: "ردشده",
};

export async function clubAdminListPosts(
  status: ClubStatus | "all" = "pending",
): Promise<AdminClubPost[]> {
  await requireAdmin();
  status = enumArg(status, ["pending", "approved", "rejected", "all"], "وضعیت نامعتبر است.");

  const rows = await query<AdminPostRow>(
    `select p.id, p.user_id, p.author_name, p.is_anonymous, p.title, p.body, p.form,
            p.tags, p.meter, p.status, p.review_note, p.featured, p.like_count,
            p.comment_count, p.published_at, p.created_at, p.updated_at,
            u.full_name as account_name, u.email as account_email,
            (select count(*) from club_reports r
              where r.target_type = 'post' and r.target_id = p.id and r.status = 'open')
              as open_reports
       from club_posts p
       left join users u on u.id = p.user_id
      where (? = 'all' or p.status = ?)
      -- در حالت بررسی، قدیمی‌ترین اول: صف فقط وقتی منصفانه است که صف باشد
      order by case when ? = 'pending' then p.created_at end asc,
               case when ? <> 'pending' then p.created_at end desc,
               p.id
      limit 300`,
    [status, status, status, status],
  );

  return rows.map(toAdminPost);
}

export async function clubAdminListComments(
  status: ClubStatus | "all" = "pending",
): Promise<AdminClubComment[]> {
  await requireAdmin();
  status = enumArg(status, ["pending", "approved", "rejected", "all"], "وضعیت نامعتبر است.");

  const rows = await query<{
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
    post_title: string | null;
    post_body: string | null;
    account_email: string | null;
    open_reports: number;
  }>(
    `select c.id, c.post_id, c.user_id, c.parent_id, c.reply_to_id, c.author_name,
            c.body, c.status, c.review_note, c.created_at,
            p.title as post_title, p.body as post_body,
            u.email as account_email,
            (select count(*) from club_reports r
              where r.target_type = 'comment' and r.target_id = c.id and r.status = 'open')
              as open_reports
       from club_comments c
       left join club_posts p on p.id = c.post_id
       left join users u on u.id = c.user_id
      where (? = 'all' or c.status = ?)
      order by case when ? = 'pending' then c.created_at end asc,
               case when ? <> 'pending' then c.created_at end desc,
               c.id
      limit 300`,
    [status, status, status, status],
  );

  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    parentId: r.parent_id,
    replyToId: r.reply_to_id,
    authorName: r.author_name,
    body: r.body,
    status: r.status as ClubStatus,
    reviewNote: r.review_note,
    isMine: false,
    createdAt: r.created_at,
    postTitle: r.post_title,
    postExcerpt: poemExcerpt(r.post_body ?? ""),
    userId: r.user_id,
    accountEmail: r.account_email,
    openReports: r.open_reports,
  }));
}

/** دیدگاه‌های یک سروده، در هر وضعیتی — کنار خودِ شعر نمایش داده می‌شوند تا
 *  مدیر هنگام خواندن شعر آن‌ها را هم ببیند. */
export async function clubAdminPostComments(postId: string): Promise<ClubComment[]> {
  await requireAdmin();
  postId = uuidArg(postId, "شناسهٔ سروده نامعتبر است.");

  const rows = await query<{
    id: string;
    post_id: string;
    parent_id: string | null;
    reply_to_id: string | null;
    author_name: string;
    body: string;
    status: string;
    review_note: string | null;
    created_at: string;
  }>(
    `select id, post_id, parent_id, reply_to_id, author_name, body, status,
            review_note, created_at
       from club_comments where post_id = ? order by created_at, id`,
    [postId],
  );

  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    parentId: r.parent_id,
    replyToId: r.reply_to_id,
    authorName: r.author_name,
    body: r.body,
    status: r.status as ClubStatus,
    reviewNote: r.review_note,
    isMine: false,
    createdAt: r.created_at,
  }));
}

// ------------------------------------------------------------- تصمیم‌ها ----

/** تأیید یا بازگرداندن یک سروده.
 *
 *  published_at فقط بار اولِ تأیید ست می‌شود و بعد دست‌نخورده می‌ماند، تا شعری
 *  که ویرایش و دوباره تأیید شده جای خودش را در ترتیب زمانی فید نگه دارد و
 *  دوباره به بالا نپرد.
 *
 *  کل کار در یک دستور انجام می‌شود: قبلاً اول published_at خوانده می‌شد و بعد
 *  در دستور دوم نوشته — با coalesce، همان منطق در خودِ update است. */
export async function clubAdminSetPostStatus(
  id: string,
  status: ClubStatus,
  note?: string,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  id = uuidArg(id, "شناسهٔ سروده نامعتبر است.");
  status = enumArg(status, ["pending", "approved", "rejected"], "وضعیت نامعتبر است.");
  const reviewNote = optionalTextArg(note, 1000, "یادداشت بررسی خیلی بلند است.");

  const updated = await execute(
    // ⚠️ $1 سه بار می‌آمد و یک مقدار می‌گرفت؛ در MySQL هر ? یک جای مستقل
    // است، پس status سه بار فرستاده می‌شود.
    `update club_posts
        set status       = ?,
            review_note  = ?,
            reviewed_at  = now(6),
            reviewed_by  = ?,
            published_at = case when ? = 'approved'
                                then coalesce(published_at, now(6))
                                else published_at end,
            -- شعری که از فید برداشته می‌شود نباید بالای همان فید سنجاق بماند
            featured     = case when ? = 'approved' then featured else false end
      where id = ?`,
    [status, reviewNote, admin.id, status, status, id],
  );

  if (!updated) return { ok: false, error: "این سروده پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "club.post_status",
    targetType: "club_post",
    targetId: id,
    summary: `یک سروده «${STATUS_LABEL[status] ?? status}» شد`,
    metadata: { status, note: reviewNote },
  });

  revalidateClub(id);
  return { ok: true, data: null };
}

export async function clubAdminSetPostFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  id = uuidArg(id, "شناسهٔ سروده نامعتبر است.");
  featured = boolArg(featured, "مقدار برگزیده نامعتبر است.");

  const updated = await execute(
    `update club_posts set featured = ? where id = ? and status = 'approved'`,
    [featured, id],
  );
  if (!updated) return { ok: false, error: "فقط سرودهٔ منتشرشده می‌تواند برگزیده شود." };

  await recordAudit({
    actor: admin,
    action: "club.post_feature",
    targetType: "club_post",
    targetId: id,
    summary: featured ? "یک سروده برگزیده شد" : "یک سروده از برگزیده‌ها برداشته شد",
  });

  revalidateClub(id);
  return { ok: true, data: null };
}

export async function clubAdminDeletePost(id: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ سروده نامعتبر است.");

  // قبل از حذف خوانده می‌شود: بعدش ردیفی نمانده که لاگ بتواند به آن اشاره کند.
  const target = await queryOne<{ author_name: string; title: string | null }>(
    "select author_name, title from club_posts where id = ?",
    [id],
  );

  const deleted = await execute("delete from club_posts where id = ?", [id]);
  if (!deleted) return { ok: false, error: "این سروده پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "club.post_delete",
    targetType: "club_post",
    targetId: id,
    summary: target
      ? `سرودهٔ «${target.title || "بی‌عنوان"}» از ${target.author_name} حذف شد`
      : "یک سروده حذف شد",
  });

  revalidateClub(id);
  return { ok: true, data: null };
}

export async function clubAdminSetCommentStatus(
  id: string,
  status: ClubStatus,
  note?: string,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  id = uuidArg(id, "شناسهٔ دیدگاه نامعتبر است.");
  status = enumArg(status, ["pending", "approved", "rejected"], "وضعیت نامعتبر است.");
  const reviewNote = optionalTextArg(note, 1000, "یادداشت بررسی خیلی بلند است.");

  // post_id فقط برای revalidate لازم است و این update عوضش نمی‌کند، پس
  // خواندنش قبل از update همان مقدار را می‌دهد. هر دو در یک تراکنش تا
  // «پیدا نشد» یک جواب بدهد.
  //
  // ⚠️ تریگرِ شمارندهٔ دیدگاه‌ها روی همین UPDATE اجرا می‌شود (تأیید/رد کردن
  // یک دیدگاه، comment_count را عوض می‌کند) — پس ترتیب اهمیت دارد و
  // update باید داخل همان تراکنش بماند.
  const row = await transaction(async (tx) => {
    const found = await tx.queryOne<{ post_id: string }>(
      "select post_id from club_comments where id = ? for update",
      [id],
    );
    if (!found) return null;
    await tx.execute(
      `update club_comments
          set status = ?, review_note = ?, reviewed_at = now(6), reviewed_by = ?
        where id = ?`,
      [status, reviewNote, admin.id, id],
    );
    return found;
  });

  if (!row) return { ok: false, error: "این دیدگاه پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "club.comment_status",
    targetType: "club_comment",
    targetId: id,
    summary: `یک دیدگاه «${STATUS_LABEL[status] ?? status}» شد`,
    metadata: { status, note: reviewNote },
  });

  revalidateClub(row.post_id);
  return { ok: true, data: null };
}

export async function clubAdminDeleteComment(id: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ دیدگاه نامعتبر است.");

  // ⚠️ حذف باید بعد از خواندن بیاید و هر دو در یک تراکنش: خودِ ردیف بعد از
  // حذف دیگر خواندنی نیست، و post_id برای revalidate و author_name برای
  // متنِ audit لازم‌اند.
  const row = await transaction(async (tx) => {
    const found = await tx.queryOne<{ post_id: string; author_name: string }>(
      "select post_id, author_name from club_comments where id = ? for update",
      [id],
    );
    if (!found) return null;
    // ⚠️ حذفِ این دیدگاه، فرزندانش را هم با cascade می‌برد — و تریگرِ
    // شمارنده روی آن فرزندان اجرا *نمی‌شود* (در MySQL cascade تریگر را صدا
    // نمی‌زند). پس شمارنده صریحاً بازسازی می‌شود.
    await tx.execute("delete from club_comments where id = ?", [id]);
    await tx.execute("call club_recount(?)", [found.post_id]);
    return found;
  });
  if (!row) return { ok: false, error: "این دیدگاه پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "club.comment_delete",
    targetType: "club_comment",
    targetId: id,
    summary: `یک دیدگاه از ${row.author_name} حذف شد`,
  });

  revalidateClub(row.post_id);
  return { ok: true, data: null };
}

// -------------------------------------------------------------- گزارش‌ها ----

/** گزارش‌ها، با گزیده‌ای از چیزی که دربارهٔ آن است.
 *
 *  target_id عمداً کلید خارجی نیست (گزارش باید از حذفِ هدفش جان سالم به در
 *  ببرد)، پس اتصال به هدف با یک left join روی شرطِ target_type انجام می‌شود —
 *  و اگر هدف حذف شده باشد، ستون‌ها null می‌مانند و گزارش سر جایش. */
export async function clubAdminListReports(
  status: ReportStatus | "all" = "open",
): Promise<ClubReport[]> {
  await requireAdmin();
  status = enumArg(status, ["open", "resolved", "dismissed", "all"], "وضعیت نامعتبر است.");

  const rows = await query<{
    id: string;
    target_type: "post" | "comment";
    target_id: string;
    reason: string;
    note: string | null;
    status: string;
    created_at: string;
    reporter_name: string | null;
    target_body: string | null;
    target_status: string | null;
  }>(
    `select r.id, r.target_type, r.target_id, r.reason, r.note, r.status, r.created_at,
            u.full_name as reporter_name,
            coalesce(p.body, c.body)     as target_body,
            coalesce(p.status, c.status) as target_status
       from club_reports r
       left join users u on u.id = r.reporter_id
       left join club_posts p    on r.target_type = 'post'    and p.id = r.target_id
       left join club_comments c on r.target_type = 'comment' and c.id = r.target_id
      where (? = 'all' or r.status = ?)
      order by r.created_at desc, r.id
      limit 200`,
    [status, status],
  );

  return rows.map((r) => ({
    id: r.id,
    reporterName: r.reporter_name || "بدون نام",
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason as ReportReason,
    note: r.note,
    status: r.status as ReportStatus,
    createdAt: r.created_at,
    // شعر با گزیدهٔ چندبیتی، دیدگاه با ۱۶۰ نویسهٔ اول — همان تفکیک قبلی
    targetExcerpt: r.target_body
      ? r.target_type === "post"
        ? poemExcerpt(r.target_body)
        : r.target_body.slice(0, 160)
      : null,
    targetStatus: (r.target_status as ClubStatus | null) ?? null,
  }));
}

export async function clubAdminResolveReport(
  id: string,
  status: Exclude<ReportStatus, "open">,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  id = uuidArg(id, "شناسهٔ گزارش نامعتبر است.");
  status = enumArg(status, ["resolved", "dismissed"], "وضعیت گزارش نامعتبر است.");

  const updated = await execute(
    `update club_reports set status = ?, resolved_at = now(6), resolved_by = ? where id = ?`,
    [status, admin.id, id],
  );
  if (!updated) return { ok: false, error: "این گزارش پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "club.report_resolve",
    targetType: "club_report",
    targetId: id,
    summary: status === "resolved" ? "به یک گزارش رسیدگی شد" : "یک گزارش رد شد",
    metadata: { status },
  });

  revalidatePath("/admin/club");
  return { ok: true, data: null };
}

// --------------------------------------------------------------- خلاصه ----

export type ClubAdminStats = {
  pendingPosts: number;
  pendingComments: number;
  openReports: number;
  publishedPosts: number;
  poets: number;
};

/** پنج عددِ داشبورد، در یک کوئری.
 *
 *  نسخهٔ قبلی پنج درخواست جدا می‌فرستاد و برای شمردن شاعران، ستون user_id همهٔ
 *  سروده‌ها را می‌کشید تا در جاوااسکریپت Set بسازد. */
export async function clubAdminStats(): Promise<ClubAdminStats> {
  await requireAdmin();

  const row = await queryOne<ClubAdminStats & Record<string, number>>(
    `select
       (select count(*) from club_posts    where status = 'pending')  as "pendingPosts",
       (select count(*) from club_comments where status = 'pending')  as "pendingComments",
       (select count(*) from club_reports  where status = 'open')     as "openReports",
       (select count(*) from club_posts    where status = 'approved') as "publishedPosts",
       (select count(distinct user_id) from club_posts)               as "poets"`,
  );

  return {
    pendingPosts: row?.pendingPosts ?? 0,
    pendingComments: row?.pendingComments ?? 0,
    openReports: row?.openReports ?? 0,
    publishedPosts: row?.publishedPosts ?? 0,
    poets: row?.poets ?? 0,
  };
}
