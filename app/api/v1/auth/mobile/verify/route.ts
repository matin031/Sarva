import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { z } from "zod";
import { execute } from "@/lib/db";
import {
  AUTH_USER_COLUMNS,
  createSession,
  findUserByPhone,
  toAuthUser,
  type UserRow,
} from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { withRoute } from "@/lib/api/route";
import { normalizePhone } from "@/lib/auth/phone";
import { firstNameField, lastNameField } from "@/lib/profile/name";
import { checkPhoneOtp } from "@/lib/auth/phone-otp";
import { queryOne } from "@/lib/db";
import { attachUserId, logger } from "@/lib/observability";
import { sendWelcome } from "@/lib/notify/welcome";

/**
 * POST /api/v1/auth/mobile/verify — تأییدِ کد، و ورود یا ثبت‌نام.
 *
 * ⚠️ **اینجا تصمیمِ «ورود یا ثبت‌نام» گرفته می‌شود و نه در مسیرِ ارسالِ کد.**
 *
 * دلیلش در `send-code` توضیح داده شده: اگر آنجا معلوم می‌شد شماره حساب دارد
 * یا نه، هر کسی می‌توانست با امتحان کردنِ شماره‌ها کاربرانِ سایت را فهرست کند.
 * اینجا امن است، چون رسیدن به این نقطه یعنی کاربر کدِ پیامک‌شده را دارد —
 * یعنی صاحبِ آن خط است.
 *
 * پس:
 *   • شماره حساب دارد   → ورود
 *   • شماره حساب ندارد  → حسابِ تازه با همان شماره، و ورود
 *
 * ⚠️ حسابِ ساخته‌شده **ایمیل و رمز ندارد**. این از مهاجرت ۰۰۶ ممکن شد
 * (`email` دیگر NOT NULL نیست) و `users_identity_check` تضمین می‌کند که
 * دست‌کم یکی از ایمیل/موبایل هست. چنین کاربری با کدِ پیامکی وارد می‌شود؛
 * اگر بعداً ایمیل و رمز اضافه کند، هر دو راه برایش باز است.
 */

/**
 * ⚠️ نام **اختیاری** است و فقط از فرمِ ثبت‌نام می‌آید.
 *
 * همین یک مسیر هم ورود است و هم ثبت‌نام (چرایی‌اش بالای همین فایل). فرمِ
 * *ورود* نامی نمی‌فرستد چون حسابی که قرار است واردش شود از قبل نامی دارد؛
 * فرمِ *ثبت‌نام* می‌فرستد تا حسابِ تازه همان لحظه کامل ساخته شود و کاربر
 * بعدش به صفحهٔ «تکمیل حساب» پرت نشود.
 */
const schema = z.object({
  phone: z.string().trim().min(1, "شمارهٔ موبایل را وارد کنید."),
  code: z.string().trim().min(4).max(8),
  firstName: firstNameField.optional(),
  lastName: lastNameField.optional(),
});

/** ارقامِ فارسی به لاتین — کاربر با کیبورد فارسی «۱۲۳۴۵۶» می‌نویسد. */
function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

export const POST = withRoute("/api/v1/auth/mobile/verify", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const phone = normalizePhone(body.data.phone);
    if (!phone) return fail("شمارهٔ موبایل معتبر نیست.", 400);

    /* ⚠️ سقفِ حدس، مستقل از سقفِ `attempts` روی خودِ کد.
       آن یکی کدِ *فعلی* را می‌سوزاند؛ این یکی جلوی کسی را می‌گیرد که پشتِ سرِ
       هم کدِ تازه بگیرد و هر بار پنج حدس بزند. بدونِ این، فضای یک‌میلیونیِ کد
       با صبر و حوصله قابلِ گشتن بود. */
    const guessLimit = await rateLimitDb(`sms-verify:${phone}`, 12, 60 * 60);
    if (!guessLimit.allowed) {
      return fail(`تلاش‌های زیاد. ${guessLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const checked = await checkPhoneOtp(phone, "login", toLatinDigits(body.data.code));
    if (!checked.ok) return fail(checked.error, 400);

    /* ── از اینجا به بعد: صاحبِ شماره اثبات شده ───────────────────────── */

    let user = await findUserByPhone(phone);
    let created = false;

    if (!user) {
      const userId = randomUUID();

      /* ⚠️ `phone_verified_at` همین حالا پر می‌شود و نه بعداً.
         شماره با همین کد تأیید شد؛ گذاشتنش برای «بعد» یعنی کاربری که تازه
         کدِ پیامکی‌اش را زده، در پنل ببیند شماره‌اش تأیید نشده. */
      /* ⚠️ نام فقط در **ساختِ** حساب به کار می‌رود.
         اگر در شاخهٔ «حساب از قبل هست» هم نوشته می‌شد، این مسیر به راهی
         برای عوض کردنِ نامِ یک حسابِ موجود تبدیل می‌شد — و بدتر، فرمِ
         ثبت‌نام بی‌سروصدا نامِ کسی را که فقط می‌خواست وارد شود بازنویسی
         می‌کرد.
         خالی بودنشان هم کاملاً مجاز است: ورود با کدِ پیامکی نامی نمی‌فرستد
         و آن حساب از گیتِ `lib/auth/onboarding.ts` رد می‌شود تا نامش را
         بنویسد. */
      await execute(
        `insert into users (id, phone, phone_verified_at, role, first_name, last_name)
         values (?, ?, now(6), 'student', ?, ?)`,
        [userId, phone, body.data.firstName ?? null, body.data.lastName ?? null],
      );

      const row = await queryOne<UserRow>(
        `select ${AUTH_USER_COLUMNS} from users where id = ?`,
        [userId],
      );
      if (!row) throw new Error("حساب ساخته شد ولی خوانده نشد.");

      user = toAuthUser(row);
      created = true;

      logger.info("حساب تازه با موبایل ساخته شد", {
        event: "auth.mobile.register.succeeded",
        user_id: user.id,
      });
    } else if (!user.phoneVerified) {
      // حسابی که شماره داشت ولی تأییدنشده (مثلاً از تنظیمات اضافه شده و
      // نیمه‌کاره مانده) — همین ورود، تأییدش هم هست.
      await execute("update users set phone_verified_at = now(6) where id = ?", [user.id]);
      user = { ...user, phoneVerified: true };
    }

    // ⚠️ بررسیِ مسدود بودن *بعد* از ساختِ حساب ولی *قبل* از ساختِ سشن.
    if (user.isBanned) {
      return fail("حساب شما مسدود شده است. با پشتیبانی تماس بگیرید.", 403);
    }

    const tokens = await createSession(user, meta);

    attachUserId(user.id);
    logger.info("ورود با موبایل موفق", {
      event: "auth.mobile.login.succeeded",
      user_id: user.id,
    });

    /* ⚠️ فقط وقتی حساب همین حالا ساخته شد. این مسیر هم ورود است و هم
       ثبت‌نام (چرایی‌اش بالای همین فایل)، و بدونِ این شرط هر ورودِ روزمره
       یک «خوش آمدی» می‌فرستاد. `dedupeKey` نگهبانِ دومش است. */
    if (created) {
      await sendWelcome(user.id);
    }

    return withCookies(ok({ user, created }), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/mobile/verify");
  }
});

export const dynamic = "force-dynamic";
