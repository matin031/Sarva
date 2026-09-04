import type { NextRequest } from "next/server";
import { z } from "zod";
import { boundedRecord } from "@/lib/api/bounded-record";
import { query, queryOne, execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";

/**
 * نشان‌شده‌ها.
 *
 * چهار عمل روی یک مسیر، چون همه دربارهٔ یک منبع‌اند و کلاینت هر چهار را لازم
 * دارد. هر کدام با requireUser() شروع می‌شود و هر کوئری شرط user_id دارد —
 * قبلاً چهار سیاست RLS این کار را می‌کردند.
 */

const AREAS = ["aruz", "vocab", "exam", "jasoos"] as const;

const upsertSchema = z.object({
  area: z.enum(AREAS),
  refId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  subtitle: z.string().trim().max(300).optional(),
  payload: boundedRecord().optional(),
});

const deleteSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({ area: z.enum(AREAS), refId: z.string().trim().min(1).max(200) }),
]);

const patchSchema = z.object({
  id: z.uuid(),
  note: z.string().max(2000),
});

/**
 * سقفِ نوشتن روی نشان‌شده‌ها.
 *
 * GET عمداً بیرون است: خواندنِ فهرست خودش را در پنل چند بار در دقیقه اتفاق
 * می‌افتد و سقفِ سراسریِ /api در proxy.ts پوششش می‌دهد. آنچه اینجا مهم است
 * نوشتن است — هر ردیف تا همیشه می‌ماند.
 */
function writeLimit(userId: string) {
  return rateLimit(`bookmarks:${userId}`, 120, 10 * 60);
}

/** سقفِ شناسه‌ها در یک درخواستِ دسته‌ای.
 *
 * ⚠️ چرا سقف: بدونِ آن، یک درخواست با ده‌هزار شناسه یک کوئریِ سنگین می‌سازد
 * و batch به راهِ دور زدنِ سقفِ نرخ تبدیل می‌شود. ۲۰۰ از بلندترین دورِ ممکن
 * (۲۰ سؤال) خیلی بیشتر است و جای رشد دارد. */
const MAX_REF_IDS = 200;

/**
 * GET /api/v1/bookmarks            — همه
 * GET /api/v1/bookmarks?area=aruz  — یک حوزه
 * GET /api/v1/bookmarks?area=aruz&refId=x — فقط بررسی وجود (برای دکمهٔ نشان)
 * GET /api/v1/bookmarks?area=aruz&refIds=a,b,c — دسته‌ای، برای یک دورِ کامل
 *
 * ⚠️ حالتِ دسته‌ای چرا اضافه شد: هر دکمهٔ نشان وضعیتِ خودش را جدا می‌پرسید.
 * روی دورِ هشت‌سؤالی اندازه گرفته شد و دقیقاً هشت درخواستِ جدا بود؛ روی دورِ
 * بیست‌سؤالی می‌شود بیست تا. حالا یک درخواست برای کلِ دور کافی است.
 *
 * عمداً *فقط شناسه‌های نشان‌شده* برمی‌گردد، نه کلِ ردیف‌ها: پاسخ کوچک می‌ماند
 * و چیزی که دکمه لازم دارد همین است. و عمداً «همهٔ نشان‌های کاربر» هم
 * نیست — یک دورِ ده‌سؤالی نباید نشان‌های چندسالهٔ کاربر را دانلود کند.
 */
export const GET = withRoute("/api/v1/bookmarks", async (request: NextRequest) => {
  try {
    const user = await requireUser();
    const params = request.nextUrl.searchParams;
    const area = params.get("area");
    const refId = params.get("refId");

    if (area && !(AREAS as readonly string[]).includes(area)) {
      return fail("حوزهٔ نامعتبر است.", 400);
    }

    // حالتِ دسته‌ای — یک درخواست برای کلِ دور
    const refIdsRaw = params.get("refIds");
    if (area && refIdsRaw !== null) {
      const refIds = [
        ...new Set(
          refIdsRaw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.length <= 200),
        ),
      ];
      if (refIds.length === 0) return ok({ marked: [] });
      if (refIds.length > MAX_REF_IDS) {
        return fail(`حداکثر ${MAX_REF_IDS} شناسه در هر درخواست.`, 400);
      }
      const rows = await query<{ ref_id: string }>(
        // = any($3) و نه IN با رشته‌سازی: یک پارامتر، بدونِ ساختنِ SQL از
        // ورودیِ کاربر.
        `select ref_id from user_bookmarks
          where user_id = $1 and area = $2 and ref_id = any($3::text[])`,
        [user.id, area, refIds],
      );
      return ok({ marked: rows.map((r) => r.ref_id) });
    }

    // حالت «آیا این نشان شده؟» — یک بولی، نه فهرست
    if (area && refId) {
      const row = await queryOne<{ id: string }>(
        `select id from user_bookmarks where user_id = $1 and area = $2 and ref_id = $3`,
        [user.id, area, refId],
      );
      return ok({ bookmarked: row !== null, id: row?.id ?? null });
    }

    const rows = await query<{
      id: string;
      area: string;
      ref_id: string;
      title: string;
      subtitle: string | null;
      payload: Record<string, unknown> | null;
      note: string | null;
      created_at: string;
    }>(
      `select id, area, ref_id, title, subtitle, payload, note, created_at
         from user_bookmarks
        where user_id = $1 and ($2::text is null or area = $2)
        order by created_at desc`,
      [user.id, area],
    );

    return ok({
      bookmarks: rows.map((r) => ({
        id: r.id,
        area: r.area,
        refId: r.ref_id,
        title: r.title,
        subtitle: r.subtitle,
        payload: r.payload ?? {},
        note: r.note,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
});

/** POST — نشان کردن. تکراری، بازنویسی است نه خطا (ایندکس یکتا). */
export const POST = withRoute("/api/v1/bookmarks", async (request: Request) => {
  try {
    const user = await requireUser();

    const limit = writeLimit(user.id);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, upsertSchema);
    if (!body.ok) return body.response;

    const b = body.data;

    const row = await queryOne<{ id: string }>(
      `insert into user_bookmarks (user_id, area, ref_id, title, subtitle, payload)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, area, ref_id) do update
         set title = excluded.title,
             subtitle = excluded.subtitle,
             payload = excluded.payload
       returning id`,
      [user.id, b.area, b.refId, b.title, b.subtitle ?? null, JSON.stringify(b.payload ?? {})],
    );

    return ok({ id: row!.id, bookmarked: true }, 201);
  } catch (err) {
    return handleError(err);
  }
});

/** DELETE — با شناسه، یا با (حوزه، مرجع) برای حالت toggle. */
export const DELETE = withRoute("/api/v1/bookmarks", async (request: Request) => {
  try {
    const user = await requireUser();

    const limit = writeLimit(user.id);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, deleteSchema);
    if (!body.ok) return body.response;

    const b = body.data;

    // حذفی که چیزی را پیدا نکند خطا نیست: نتیجهٔ مطلوب («نشان نشده») حاصل شده.
    if ("id" in b) {
      await execute("delete from user_bookmarks where id = $1 and user_id = $2", [b.id, user.id]);
    } else {
      await execute(
        "delete from user_bookmarks where user_id = $1 and area = $2 and ref_id = $3",
        [user.id, b.area, b.refId],
      );
    }

    return ok({ bookmarked: false });
  } catch (err) {
    return handleError(err);
  }
});

/** PATCH — یادداشت شخصی روی یک نشان‌شده. */
export const PATCH = withRoute("/api/v1/bookmarks", async (request: Request) => {
  try {
    const user = await requireUser();

    const limit = writeLimit(user.id);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, patchSchema);
    if (!body.ok) return body.response;

    const updated = await execute(
      "update user_bookmarks set note = $1 where id = $2 and user_id = $3",
      [body.data.note.trim() || null, body.data.id, user.id],
    );

    if (!updated) return fail("این نشان‌شده پیدا نشد.", 404);
    return ok({ saved: true });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
