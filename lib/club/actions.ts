"use server";

import { revalidatePath } from "next/cache";
import { queryOne, execute, transaction } from "@/lib/db";
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

/**
 * آنچه یک دانش‌آموزِ واردشده در سروا کلاب می‌تواند بکند.
 *
 * ⚠️ این فایل بیشترین تغییرِ معناییِ کل مهاجرت را دارد.
 *
 * قبلاً هر نوشتن روی کلاینتِ سشن‌دار اجرا می‌شد و RLS حرف آخر را می‌زد: یک
 * شاعر فقط می‌توانست ردیفِ 'pending' بنویسد، و فقط مالِ خودش. علاوه بر آن، دو
 * تریگرِ security definer در دیتابیس ستون‌هایی مثل author_name و status را
 * بازنویسی می‌کردند تا هر چه کلاینت فرستاده بود بی‌اثر شود.
 *
 * هیچ‌کدام دیگر وجود ندارند. حالا هر قاعده‌ای که آن‌ها اعمال می‌کردند باید در
 * همین فایل باشد:
 *
 *   • status همیشه صریحاً 'pending' نوشته می‌شود، هرگز از ورودی.
 *   • author_name از سشن ساخته می‌شود، نه از چیزی که فراخوان فرستاده.
 *   • هر update و delete شرط user_id دارد.
 *   • «دیدگاه فقط روی سرودهٔ منتشرشده» و «لایک فقط روی سرودهٔ منتشرشده» که
 *     قبلاً در with check سیاست‌ها بودند، حالا چکِ صریح‌اند.
 */

const SIGN_IN = "برای این کار باید وارد حساب کاربری‌ات شوی.";

function revalidateClub(postId?: string) {
  revalidatePath("/sarvaclub");
  revalidatePath("/panel/club");
  revalidatePath("/admin/club");
  if (postId) revalidatePath(`/sarvaclub/${postId}`);
}

/** پاک‌سازی شعرِ چسبانده‌شده: خط‌های ویندوزی صاف، فاصله‌های انتهایی حذف، و
 *  چند خط خالی پشت سر هم به یکی تبدیل — پس فاصلهٔ بند می‌ماند ولی چهل خط
 *  خالی چهل خط خالی نمی‌شود. */
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
  /** تخلص، فقط وقتی isAnonymous روشن است */
  alias?: string;
};

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
    // نامی که زیر شعر می‌نشیند — تخلص، «ناشناس»، یا نام خودِ حساب. همین حالا
    // عکس‌برداری می‌شود تا تغییر نام بعدی در تنظیمات حساب، سرودهٔ قدیمی را
    // بی‌سروصدا به کس دیگری نسبت ندهد.
    //
    // برای حالت غیرِبی‌نام، realName از سشن می‌آید نه از ورودی. این همان کاری
    // است که تریگر club_posts_guard انجام می‌داد.
    author_name: isAnonymous ? alias || "ناشناس" : realName,
  };
}

/** ارسال سرودهٔ تازه. مستقیم به صف بررسی می‌رود؛ هیچ ورودی‌ای نمی‌تواند
 *  کاری کند که خودش منتشر شود. */
export async function createClubPost(input: PostInput): Promise<ActionResult<{ id: string }>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const valid = validatePost(input, viewer.name);
  if (typeof valid === "string") return { ok: false, error: valid };

  // دو سقف جدا: یکی برای انفجار ناگهانی، یکی برای صف. دومی مهم‌تر است — مدیر
  // نباید پنل را باز کند و چهل شعر از یک حساب ببیند و هیچ از بقیه.
  const limits = await queryOne<{ today_count: number; pending_count: number }>(
    `select count(*) filter (where created_at > now() - interval '24 hours') as today_count,
            count(*) filter (where status = 'pending')                       as pending_count
       from club_posts where user_id = $1`,
    [viewer.id],
  );

  if ((limits?.today_count ?? 0) >= DAILY_POST_LIMIT) {
    return {
      ok: false,
      error: `در هر شبانه‌روز حداکثر ${DAILY_POST_LIMIT.toLocaleString("fa-IR")} سروده می‌توانی بفرستی. فردا دوباره سر بزن.`,
    };
  }
  if ((limits?.pending_count ?? 0) >= PENDING_POST_LIMIT) {
    return {
      ok: false,
      error: `${PENDING_POST_LIMIT.toLocaleString("fa-IR")} سرودهٔ بررسی‌نشده داری. تا تعیین تکلیف آن‌ها صبر کن.`,
    };
  }

  try {
    // status/featured/published_at/reviewed_* صریحاً مقدار امن می‌گیرند و از
    // ورودی نمی‌آیند — همان چیزی که سیاست insert در RLS تضمین می‌کرد.
    const row = await queryOne<{ id: string }>(
      `insert into club_posts
         (user_id, author_name, is_anonymous, title, body, form, tags, meter, status, featured)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', false)
       returning id`,
      [
        viewer.id,
        valid.author_name,
        valid.is_anonymous,
        valid.title,
        valid.body,
        valid.form,
        valid.tags,
        valid.meter,
      ],
    );

    revalidateClub();
    return { ok: true, data: { id: row!.id } };
  } catch (err) {
    console.error("[club] ثبت سروده ناموفق بود:", err);
    return { ok: false, error: "ثبت سروده ممکن نشد." };
  }
}

/** ویرایش سرودهٔ خودت. شعرِ منتشرشده به صف برمی‌گردد.
 *
 *  قبلاً بند `with check` در سیاست RLS این را اجباری می‌کرد، پس فراموش‌شدنی
 *  نبود. حالا فقط همین چند خط است که نگهش می‌دارد. */
export async function updateClubPost(id: string, input: PostInput): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const valid = validatePost(input, viewer.name);
  if (typeof valid === "string") return { ok: false, error: valid };

  const updated = await execute(
    `update club_posts
        set title = $1, body = $2, form = $3, tags = $4, meter = $5,
            is_anonymous = $6, author_name = $7,
            status = 'pending', review_note = null, featured = false
      where id = $8 and user_id = $9`,
    [
      valid.title,
      valid.body,
      valid.form,
      valid.tags,
      valid.meter,
      valid.is_anonymous,
      valid.author_name,
      id,
      viewer.id,
    ],
  );

  // «پیدا نشد» هم شامل «مال تو نیست» می‌شود — عمداً، چون تفکیکشان به کسی که
  // شناسه‌ها را حدس می‌زند می‌گوید کدام‌ها وجود دارند.
  if (!updated) return { ok: false, error: "این سروده پیدا نشد." };

  revalidateClub(id);
  return { ok: true, data: null };
}

export async function deleteClubPost(id: string): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const deleted = await execute("delete from club_posts where id = $1 and user_id = $2", [
    id,
    viewer.id,
  ]);
  if (!deleted) return { ok: false, error: "این سروده پیدا نشد." };

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
  if (text.length > MAX_COMMENT) {
    return {
      ok: false,
      error: `دیدگاه نباید بیش از ${MAX_COMMENT.toLocaleString("fa-IR")} نویسه باشد.`,
    };
  }

  const todayCount = await queryOne<{ n: number }>(
    `select count(*) as n from club_comments
      where user_id = $1 and created_at > now() - interval '24 hours'`,
    [viewer.id],
  );
  if ((todayCount?.n ?? 0) >= DAILY_COMMENT_LIMIT) {
    return { ok: false, error: "امروز دیدگاه‌های زیادی نوشته‌ای. فردا ادامه بده." };
  }

  // این چک قبلاً در `with check` سیاست insert بود: دیدگاه فقط روی سروده‌ای که
  // واقعاً منتشر شده. بدون آن، کسی می‌توانست روی شعرِ در صف یا ردشده نظر بگذارد.
  const post = await queryOne<{ id: string }>(
    "select id from club_posts where id = $1 and status = 'approved'",
    [postId],
  );
  if (!post) {
    return { ok: false, error: "ثبت دیدگاه ممکن نشد. شاید این سروده منتشر نشده باشد." };
  }

  // می‌شود به یک پاسخ، پاسخ داد؛ ولی نخ فقط یک بار تورفتگی می‌گیرد: ردیف تازه
  // به همان ریشه وصل می‌شود و یادش می‌ماند به *چه کسی* جواب داده — همان کاری
  // که یوتیوب و اینستاگرام هم می‌کنند. تورفتگی سوم روی موبایل خوانا نیست.
  let parent: string | null = null;
  let replyTo: string | null = null;

  if (parentId) {
    const target = await queryOne<{ id: string; parent_id: string | null }>(
      `select id, parent_id from club_comments
        where id = $1 and post_id = $2 and status = 'approved'`,
      [parentId, postId],
    );
    if (target) {
      parent = target.parent_id ?? target.id;
      // فقط وقتی ارزش برچسب زدن دارد که سرِ نخ نباشد
      replyTo = parent === target.id ? null : target.id;
    }
  }

  try {
    await execute(
      `insert into club_comments
         (post_id, user_id, author_name, parent_id, reply_to_id, body, status)
       values ($1, $2, $3, $4, $5, $6, 'pending')`,
      [
        postId,
        viewer.id,
        // «نظرشون با اسمی که برای اکانتشون گذاشتن باید باشه» — دیدگاه همیشه با
        // نام خودِ حساب امضا می‌شود؛ گزینهٔ بی‌نام اینجا وجود ندارد. از سشن
        // می‌آید، نه از ورودی.
        viewer.name,
        parent,
        replyTo,
        text,
      ],
    );
  } catch (err) {
    console.error("[club] ثبت دیدگاه ناموفق بود:", err);
    return { ok: false, error: "ثبت دیدگاه ممکن نشد." };
  }

  revalidateClub(postId);
  return { ok: true, data: null };
}

export async function deleteClubComment(id: string, postId: string): Promise<ActionResult<null>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  const deleted = await execute("delete from club_comments where id = $1 and user_id = $2", [
    id,
    viewer.id,
  ]);
  if (!deleted) return { ok: false, error: "این دیدگاه پیدا نشد." };

  revalidateClub(postId);
  return { ok: true, data: null };
}

// ------------------------------------------------------------- پسندیدن ----

/** تغییر وضعیت پسند. حالتی که دکمه باید نشان بدهد برمی‌گردد؛ عدد کل از
 *  شمارنده‌ای می‌آید که دیتابیس نگه می‌دارد، پس حتی وقتی دو خواننده هم‌زمان یک
 *  شعر را می‌پسندند درست است. */
export async function toggleClubLike(
  postId: string,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const viewer = await getClubViewer();
  if (!viewer) return { ok: false, error: SIGN_IN };

  try {
    const result = await transaction(async (tx) => {
      // delete ... returning هم حذف می‌کند هم می‌گوید چیزی برای حذف بود یا نه —
      // یعنی «اول بخوان بعد تصمیم بگیر» حذف شد و با آن، مسابقهٔ دو کلیک سریع.
      const removed = await tx.queryOne<{ post_id: string }>(
        `delete from club_likes where post_id = $1 and user_id = $2 returning post_id`,
        [postId, viewer.id],
      );

      if (!removed) {
        // این شرط قبلاً در سیاست insert بود: لایک فقط روی سرودهٔ منتشرشده.
        const post = await tx.queryOne<{ id: string }>(
          "select id from club_posts where id = $1 and status = 'approved'",
          [postId],
        );
        if (!post) return null;

        await tx.execute("insert into club_likes (post_id, user_id) values ($1, $2)", [
          postId,
          viewer.id,
        ]);
      }

      // شمارنده را تریگر club_likes_count در همین تراکنش به‌روز کرده
      const post = await tx.queryOne<{ like_count: number }>(
        "select like_count from club_posts where id = $1",
        [postId],
      );

      return { liked: !removed, likeCount: post?.like_count ?? 0 };
    });

    if (!result) return { ok: false, error: "این سروده در دسترس نیست." };

    revalidatePath("/sarvaclub");
    revalidatePath(`/sarvaclub/${postId}`);
    return { ok: true, data: result };
  } catch (err) {
    console.error("[club] پسندیدن ناموفق بود:", err);
    return { ok: false, error: "این سروده در دسترس نیست." };
  }
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

  if (!REPORT_REASONS.some((r) => r.id === reason)) {
    return { ok: false, error: "دلیل گزارش نامعتبر است." };
  }

  try {
    // گزارش دوبارهٔ یک چیز، از دید گزارش‌دهنده موفقیت است نه خطا — پس به‌جای
    // گرفتن خطای کلید تکراری و بررسی متنش، خودِ دیتابیس بی‌صدا ردش می‌کند.
    await execute(
      `insert into club_reports (reporter_id, target_type, target_id, reason, note, status)
       values ($1, $2, $3, $4, $5, 'open')
       on conflict (reporter_id, target_type, target_id) do nothing`,
      [
        viewer.id,
        targetType,
        targetId,
        reason as ReportReason,
        (note ?? "").trim().slice(0, 500) || null,
      ],
    );
  } catch (err) {
    console.error("[club] ثبت گزارش ناموفق بود:", err);
    return { ok: false, error: "ثبت گزارش ممکن نشد." };
  }

  revalidatePath("/admin/club");
  return { ok: true, data: null };
}
