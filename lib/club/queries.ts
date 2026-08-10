import "server-only";
import { query, queryOne } from "@/lib/db";
import { isUuid } from "@/lib/api/action-input";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { ClubComment, ClubFeedSort, ClubPost, ClubPostForm, ClubStatus } from "@/lib/club/types";
import { poemExcerpt } from "@/lib/club/types";

/**
 * خواندنِ سمت‌سرورِ سروا کلاب.
 *
 * ⚠️ مهم‌ترین نکتهٔ این فایل:
 *
 * پیش از مهاجرت از Supabase، تضمینِ «هیچ سرودهٔ بررسی‌نشده‌ای به خواننده
 * نمی‌رسد» در predicate یک RLS policy زندگی می‌کرد. یعنی حتی اگر یک کوئری فیلتر
 * status را جا می‌انداخت، دیتابیس باز هم چیزی بیرون نمی‌داد.
 *
 * آن تور ایمنی دیگر وجود ندارد. حالا هر کوئریِ عمومی در این فایل *خودش* باید
 * status = 'approved' را داشته باشد، وگرنه شعرِ تأییدنشده منتشر می‌شود. به
 * همین دلیل شرط‌ها اینجا صریح و تکراری نوشته شده‌اند و در یک تابع کمکیِ
 * «هوشمند» جمع نشده‌اند: تکرارِ دیدنی بهتر از انتزاعی است که یک نفر روزی
 * فراموش می‌کند صدایش بزند.
 */

export const FEED_PAGE_SIZE = 12;

export type ClubViewer = { id: string; name: string } | null;

/** خواننده کیست، و با چه نامی می‌نویسد. */
export async function getClubViewer(): Promise<ClubViewer> {
  const user = await getCurrentUser();
  if (!user) return null;

  return { id: user.id, name: (user.fullName || "کاربر سروا").trim() };
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

const POST_COLUMNS = `id, user_id, author_name, is_anonymous, title, body, form, tags, meter,
                      status, review_note, featured, like_count, comment_count,
                      published_at, created_at, updated_at`;

/** همان ستون‌ها با پیشوند جدول، برای کوئری‌هایی که JOIN دارند.
 *  صریح نوشته شده و نه با split/join روی ثابت بالا: آن ترفند کار می‌کند ولی
 *  خواندنش سخت است و اگر ستونی اضافه شود، سکوت می‌کند. */
const POST_COLUMNS_P = `p.id, p.user_id, p.author_name, p.is_anonymous, p.title, p.body, p.form,
                        p.tags, p.meter, p.status, p.review_note, p.featured, p.like_count,
                        p.comment_count, p.published_at, p.created_at, p.updated_at`;

function toPost(row: PostRow, viewerId: string | null, liked: Set<string>): ClubPost {
  return {
    id: row.id,
    // برای سرودهٔ بی‌نام، این ستون تخلص را دارد نه نام واقعی را — حسابِ پشتش
    // فقط از پنل مدیریت قابل بازیابی است، و همین قولی است که کلید «بی‌نام»
    // می‌دهد.
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
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: liked.has(row.id),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** کدام‌یک از این سروده‌ها را خواننده پسندیده. یک کوئری برای کل صفحه. */
async function likedSet(postIds: string[], viewerId: string | null): Promise<Set<string>> {
  if (!viewerId || postIds.length === 0) return new Set();

  const rows = await query<{ post_id: string }>(
    `select post_id from club_likes where user_id = $1 and post_id = any($2::uuid[])`,
    [viewerId, postIds],
  );

  return new Set(rows.map((r) => r.post_id));
}

export type FeedOptions = {
  sort?: ClubFeedSort;
  form?: string;
  tag?: string;
  page?: number;
};

/** فید عمومی. فقط سروده‌های تأییدشده. */
export async function getClubFeed(
  viewer: ClubViewer,
  { sort = "recent", form, tag, page = 0 }: FeedOptions = {},
): Promise<{ posts: ClubPost[]; hasMore: boolean }> {
  const offset = page * FEED_PAGE_SIZE;

  const values: unknown[] = [];
  const conditions = ["status = 'approved'"];

  if (form) {
    values.push(form);
    conditions.push(`form = $${values.length}`);
  }
  if (tag) {
    values.push([tag]);
    conditions.push(`tags @> $${values.length}::text[]`);
  }

  // برگزیده‌ها بالای هر مرتب‌سازی می‌نشینند — معنیِ برگزیده بودن همین است.
  const sortColumn =
    sort === "popular" ? "like_count desc," : sort === "discussed" ? "comment_count desc," : "";

  values.push(FEED_PAGE_SIZE + 1);
  const limitParam = `$${values.length}`;
  values.push(offset);
  const offsetParam = `$${values.length}`;

  // `, id` آخرِ ترتیب اختیاری نیست. وقتی مدیر چند سروده را پشت سر هم تأیید
  // می‌کند، published_at همه‌شان عملاً یکی می‌شود و بقیهٔ کلیدها (featured،
  // like_count، comment_count) هم برای سروده‌های تازه صفر است. آن‌وقت ترتیبِ
  // ردیف‌های هم‌ارز را Postgres آزاد است هر بار جور دیگری بدهد، و چون
  // صفحه‌بندی با offset کار می‌کند، یک سروده در صفحهٔ ۲ تکرار می‌شود و یکی
  // دیگر اصلاً دیده نمی‌شود. با ۶۰ سرودهٔ هم‌زمان همین اتفاق در آزمون دیده شد:
  // ۵۹ یکتا از ۶۰، در هر سه مرتب‌سازی.
  const rows = await query<PostRow>(
    `select ${POST_COLUMNS}
       from club_posts
      where ${conditions.join(" and ")}
      order by featured desc, ${sortColumn} published_at desc nulls last, id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

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

/**
 * یک سروده.
 *
 * تأییدشده برای همه، یا هر وضعیتی برای صاحبش. اگر هیچ‌کدام، null — و null
 * دقیقاً همان چیزی است که یک ۴۰۴ باید باشد: خواننده نمی‌فهمد شعر وجود ندارد
 * یا وجود دارد و هنوز تأیید نشده.
 */
export async function getClubPost(id: string, viewer: ClubViewer): Promise<ClubPost | null> {
  // شناسه از آدرس می‌آید، پس هر رشته‌ای می‌تواند باشد. بدون این بررسی،
  // `/sarvaclub/abc` به پستگرس می‌رسید و `invalid input syntax for type uuid`
  // می‌گرفت — یعنی صفحهٔ خطای ۵۰۰ برای چیزی که فقط «وجود ندارد» است.
  if (!isUuid(id)) return null;

  const row = await queryOne<PostRow>(
    `select ${POST_COLUMNS}
       from club_posts
      where id = $1
        and (status = 'approved' or ($2::uuid is not null and user_id = $2))`,
    [id, viewer?.id ?? null],
  );

  if (!row) return null;

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

const COMMENT_COLUMNS = `id, post_id, user_id, parent_id, reply_to_id, author_name,
                         body, status, review_note, created_at`;

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

/** دیدگاه‌های زیر یک شعر: هرچه تأییدشده، به‌علاوهٔ ردیف‌های خودِ خواننده در هر
 *  وضعیتی — دانش‌آموزی که همین الان دیدگاه نوشته باید ببیندش که در صف بررسی
 *  است، نه اینکه شک کند دکمه کار کرد یا نه. */
export async function getClubComments(postId: string, viewer: ClubViewer): Promise<ClubComment[]> {
  if (!isUuid(postId)) return [];

  const rows = await query<CommentRow>(
    `select ${COMMENT_COLUMNS}
       from club_comments
      where post_id = $1
        and (status = 'approved' or ($2::uuid is not null and user_id = $2))
      order by created_at, id`,
    [postId, viewer?.id ?? null],
  );

  return rows.map((r) => toComment(r, viewer?.id ?? null));
}

// ------------------------------------------------------ پنل کاربری ----

export async function getMyPosts(viewer: ClubViewer): Promise<ClubPost[]> {
  if (!viewer) return [];

  const rows = await query<PostRow>(
    `select ${POST_COLUMNS} from club_posts where user_id = $1 order by created_at desc, id`,
    [viewer.id],
  );

  const liked = await likedSet(
    rows.map((r) => r.id),
    viewer.id,
  );

  return rows.map((r) => toPost(r, viewer.id, liked));
}

export type MyComment = ClubComment & { postTitle: string | null; postExcerpt: string };

export async function getMyComments(viewer: ClubViewer): Promise<MyComment[]> {
  if (!viewer) return [];

  const rows = await query<CommentRow & { post_title: string | null; post_body: string | null }>(
    `select c.id, c.post_id, c.user_id, c.parent_id, c.reply_to_id, c.author_name,
            c.body, c.status, c.review_note, c.created_at,
            p.title as post_title, p.body as post_body
       from club_comments c
       left join club_posts p on p.id = c.post_id
      where c.user_id = $1
      order by c.created_at desc, c.id
      limit 200`,
    [viewer.id],
  );

  return rows.map((row) => ({
    ...toComment(row, viewer.id),
    postTitle: row.post_title,
    postExcerpt: poemExcerpt(row.post_body ?? ""),
  }));
}

/** سه عددِ زیر سربرگ.
 *
 *  فقط کارِ منتشرشده را توصیف می‌کنند — صف بررسی به کسی جز مدیر مربوط نیست.
 *
 *  شاعران را با user_id می‌شماریم و نه با author_name. نام نویسنده یکتا نیست:
 *  هر سرودهٔ بی‌نام «ناشناس» ثبت می‌شود، پس شمارش بر اساس نام، همهٔ بی‌نام‌ها را
 *  یک نفر حساب می‌کرد؛ دو همنام هم همین‌طور. در آزمون با سه شاعر (که یکی‌شان
 *  بی‌نام نوشته بود) عدد ۲ برمی‌گشت. user_id هویت واقعی است و کوچک‌شماری ندارد
 *  — و چون هرگز بیرون نمی‌رود، بی‌نامی هم نمی‌شکند. */
export async function getClubStats(): Promise<{ poems: number; poets: number; comments: number }> {
  const row = await queryOne<{ poems: number; poets: number; comments: number }>(
    `select
       (select count(*) from club_posts where status = 'approved')                as poems,
       (select count(distinct user_id) from club_posts where status = 'approved') as poets,
       (select count(*) from club_comments where status = 'approved')             as comments`,
  );

  return { poems: row?.poems ?? 0, poets: row?.poets ?? 0, comments: row?.comments ?? 0 };
}

/** سروده‌هایی که خواننده پسندیده، برای تب «پسندیده‌های من».
 *
 *  شرط status = 'approved' اینجا حیاتی است: قبلاً RLS شعرِ لغو انتشار شده را
 *  به‌صورت null برمی‌گرداند و کد از رویش رد می‌شد. بدون این شرط، لایکِ قدیمیِ
 *  کاربر روی شعری که مدیر بعداً پس فرستاده، آن شعر را دوباره نمایان می‌کرد. */
export async function getMyLikedPosts(viewer: ClubViewer): Promise<ClubPost[]> {
  if (!viewer) return [];

  const rows = await query<PostRow>(
    `select ${POST_COLUMNS_P}
       from club_likes l
       join club_posts p on p.id = l.post_id
      where l.user_id = $1
        and p.status = 'approved'
      order by l.created_at desc, p.id
      limit 100`,
    [viewer.id],
  );

  const liked = new Set(rows.map((r) => r.id));
  return rows.map((r) => toPost(r, viewer.id, liked));
}
