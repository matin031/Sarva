import type { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, reissuedAccessToken } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/auth/session";
import { accessCookie } from "@/lib/auth/cookies";
import { fail, handleError, ok, readJson, withCookies } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { withRoute } from "@/lib/api/route";
import { firstNameField, lastNameField } from "@/lib/profile/name";
import { updateDisplayName } from "@/lib/profile/queries";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { logger } from "@/lib/observability";

/**
 * POST /api/v1/auth/complete-profile — نام و نام خانوادگیِ حسابِ نیمه‌ساخته.
 *
 * ⚠️ این مسیر عمداً از `PATCH /api/v1/auth/profile` جداست.
 *
 * آن یکی کلِ فرمِ پروفایل را می‌گیرد و `desiredRole` هم می‌پذیرد؛ یعنی
 * صفحهٔ تکمیل مجبور می‌شد فیلدهایی بفرستد که اصلاً نشان نمی‌دهد و برای
 * کاربرِ تازه هیچ معنایی ندارند. سطحِ حمله هم بی‌جهت بازتر می‌شد: این مسیر
 * **دو ستون** می‌نویسد و بس.
 *
 * ── چرا کوکیِ تازه برمی‌گردد ─────────────────────────────────────────────
 * گیتِ `proxy.ts` از ادعای `needsProfile` داخلِ توکنِ دسترسی می‌خواند و نه
 * از دیتابیس (چرایی‌اش آنجا نوشته شده). پس نوشتنِ نام در دیتابیس به‌تنهایی
 * کافی نیست: تا چرخشِ بعدیِ توکن — تا ربع ساعت — کاربر همچنان به صفحهٔ
 * تکمیل برمی‌گشت و هیچ راهی هم نداشت. توکن همین‌جا دوباره امضا می‌شود.
 *
 * ⚠️ کپچا ندارد و لازم هم ندارد: این مسیر `requireUser` دارد، پس ناشناس
 * نیست؛ سقفِ نرخ روی **شناسهٔ کاربر** است و نه IP، و هیچ پیامک یا ایمیلی
 * نمی‌فرستد. کپچا اینجا فقط یک مانع بود سرِ راهِ کسی که تازه وارد شده.
 */

const schema = z.object({
  firstName: firstNameField,
  lastName: lastNameField,
});

export const POST = withRoute("/api/v1/auth/complete-profile", async (request: Request) => {
  try {
    const user = await requireUser();

    /* سقف روی خودِ کاربر. عدد سخاوتمندانه است — کسی که املای نامش را چند
       بار درست می‌کند نباید به دیوار بخورد — ولی حلقه زدن روی این UPDATE
       را می‌بندد. در دیتابیس شمرده می‌شود و نه در حافظه، تا ری‌استارتِ اپ
       صفرش نکند. */
    const limit = await rateLimitDb(`complete-profile:${user.id}`, 15, 15 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    await updateDisplayName(user.id, body.data.firstName, body.data.lastName);

    /* ⚠️ کاربر دوباره از دیتابیس خوانده می‌شود و از ورودی ساخته نمی‌شود:
       `full_name` را تریگر ساخته و ادعای توکن باید از همان ردیفِ واقعی
       حساب شود، نه از چیزی که فرستاده شده. */
    const updated = await findUserById(user.id);
    if (!updated) return fail("حساب کاربری پیدا نشد.", 404);

    logger.info("حسابِ نیمه‌ساخته تکمیل شد", {
      event: "auth.onboarding.completed",
      user_id: updated.id,
      still_incomplete: needsOnboarding(updated),
    });

    const fresh = await reissuedAccessToken(updated);
    const response = ok({ user: updated });
    // null فقط وقتی است که کوکیِ دسترسی همین لحظه منقضی شده باشد؛ آن حالت
    // خودش را با یک چرخشِ refresh در درخواستِ بعدی درست می‌کند.
    return (fresh ? withCookies(response, [accessCookie(fresh)]) : response) as NextResponse;
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/complete-profile");
  }
});

export const dynamic = "force-dynamic";
