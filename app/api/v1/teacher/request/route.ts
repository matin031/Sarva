import { requireUser } from "@/lib/auth/current-user";
import {
  crossSiteRejection,
  fail,
  handleError,
  isCrossSiteRequest,
  ok,
} from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { withRoute } from "@/lib/api/route";
import { teacherRequestSchema } from "@/lib/profile/schemas";
import {
  MAX_DOCUMENT_BYTES,
  detectTeacherDocument,
  removeTeacherDocument,
  storeTeacherDocument,
} from "@/lib/teacher/documents";
import {
  getTeacherAccountState,
  submitTeacherRequest,
  teacherRequestReadiness,
} from "@/lib/teacher/requests";
import { logger } from "@/lib/observability";

/**
 * درخواستِ فعال‌سازیِ حسابِ دبیر — بند ۵.
 *
 *   GET  → وضعیتِ فعلی (بند ۶)
 *   POST → ثبتِ درخواستِ تازه، با فایلِ حکم
 *
 * ⚠️ POST بدنهٔ `multipart/form-data` می‌گیرد و نه JSON، چون فایل همراهش
 * است. یعنی `readJson` اینجا به کار نمی‌آید و فیلدها دستی از `FormData`
 * بیرون کشیده و به `teacherRequestSchema` داده می‌شوند — همان شِمایی که
 * فرم هم در مرورگر استفاده می‌کند.
 */

export const dynamic = "force-dynamic";

export const GET = withRoute("/api/v1/teacher/request", async () => {
  try {
    const user = await requireUser();
    const state = await getTeacherAccountState(user);
    return ok({ state, readiness: teacherRequestReadiness(user) });
  } catch (err) {
    return handleError(err, "GET /api/v1/teacher/request");
  }
});

export const POST = withRoute("/api/v1/teacher/request", async (request: Request) => {
  try {
    /* ⚠️ لایهٔ دومِ CSRF، و اینجا بیشتر از هر مسیرِ دیگری می‌ارزد.
       یک `multipart/form-data` از فرمِ HTML یک «درخواستِ ساده» است و
       preflight نمی‌خورد — یعنی `SameSite=lax` تنها چیزی است که جلوی یک
       فرمِ مخفی در سایتِ دیگری را می‌گیرد. توضیحِ کاملش بالای
       `isCrossSiteRequest`. */
    if (isCrossSiteRequest(request)) return crossSiteRejection();

    const user = await requireUser();

    /* ⚠️ سقفِ نرخ *پیش از* خواندنِ بدنه.
       بدنه تا ۸ مگابایت است؛ خواندنش و بعد رد کردنِ درخواست، یعنی همان
       پهنای باند و همان حافظه خرج شده. */
    const limit = await rateLimitDb(`teacher-request:${user.id}`, 5, 24 * 60 * 60);
    if (!limit.allowed) {
      return fail("درخواست‌های زیاد. فردا دوباره تلاش کنید.", 429);
    }

    /* ⚠️ پیش‌شرط‌ها *قبل* از دست زدن به فایل بررسی می‌شوند.
       کاربری که شماره‌اش تأیید نشده، نباید هشت مگابایت آپلود کند و بعد
       بفهمد از اول نمی‌شده. (`submitTeacherRequest` هم همین‌ها را دوباره
       می‌سنجد — آنجا دروازه است، اینجا ادب.) */
    const readiness = teacherRequestReadiness(user);
    if (!readiness.profileCompleted) {
      return fail("اول نام و نام خانوادگی‌تان را در «تکمیل پروفایل» ثبت کنید.", 400);
    }
    if (!readiness.phoneVerified) {
      return fail("برای ارسال درخواست، اول شمارهٔ موبایلتان را تأیید کنید.", 400);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return fail("بدنهٔ درخواست خوانده نشد.", 400);
    }

    const parsed = teacherRequestSchema.safeParse({
      nationalId: formData.get("nationalId"),
      provinceId: formData.get("provinceId"),
      cityId: formData.get("cityId"),
      school: formData.get("school"),
    });
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message), 400);
    }

    const file = formData.get("document");
    if (!(file instanceof File) || file.size === 0) {
      return fail("فایل حکم کارگزینی یا مدرک اثبات دبیر بودن را پیوست کنید.", 400);
    }

    // حجم پیش از خواندنِ محتوا — همان استدلالِ `lib/admin/upload-actions.ts`.
    if (file.size > MAX_DOCUMENT_BYTES) {
      return fail("حجم فایل نباید بیشتر از ۸ مگابایت باشد.", 400);
    }

    // نوعِ واقعی از بایت‌های خودِ فایل و نه از هدرِ مرورگر.
    const detected = await detectTeacherDocument(file);
    if (!detected.ok) {
      logger.info("فایل حکم رد شد: محتوا معتبر نبود", {
        event: "teacher.document.rejected",
        user_id: user.id,
        size_bytes: file.size,
        // ⚠️ نامِ فایلِ کاربر لاگ نمی‌شود — می‌تواند خودش دادهٔ شخصی باشد.
        declared_mime: (file.type || "").slice(0, 60) || null,
      });
      return fail(detected.error, 400);
    }

    const stored = await storeTeacherDocument(file, detected);

    let result;
    try {
      result = await submitTeacherRequest({
        user,
        nationalId: parsed.data.nationalId,
        provinceId: parsed.data.provinceId,
        cityId: parsed.data.cityId,
        school: parsed.data.school,
        document: {
          key: stored.key,
          name: file.name || "document",
          contentType: stored.contentType,
          size: stored.size,
        },
      });
    } catch (err) {
      /* ⚠️ فایل نوشته شد ولی ردیف ساخته نشد → فایلِ یتیم.
         بدونِ این پاکسازی، هر خطای دیتابیس یک سندِ هویتی روی دیسک جا
         می‌گذاشت که هیچ ردیفی به آن اشاره نمی‌کند — یعنی نه کسی می‌بیندش
         و نه کسی می‌داند می‌شود پاکش کرد. */
      await removeTeacherDocument(stored.key);
      throw err;
    }

    if (!result.ok) {
      await removeTeacherDocument(stored.key);
      return fail(result.error, 409);
    }

    return ok({ request: result.request }, 201);
  } catch (err) {
    return handleError(err, "POST /api/v1/teacher/request");
  }
});
