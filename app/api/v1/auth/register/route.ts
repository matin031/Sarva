import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { queryOne, execute, isUniqueViolation } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_USER_COLUMNS, createSession, toAuthUser, type UserRow } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { registerSchema } from "@/lib/auth/schemas";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { attachUserId, logger } from "@/lib/observability";
import { withRoute } from "@/lib/api/route";
import { sendWelcome } from "@/lib/notify/welcome";

/**
 * POST /api/v1/auth/register — ساخت حساب.
 *
 * حساب بلافاصله وارد می‌شود و `emailVerified: false` برمی‌گردد. کد تأیید ایمیل
 * جداگانه فرستاده می‌شود (فاز ۴) و ورودِ روزمره با رمز است، نه با کد — همان
 * چیزی که تصمیم گرفته شد.
 *
 * چرا ورود بلافاصله و نه بعد از تأیید: ایمیل ممکن است نرسد (فیلترینگ، اسپم،
 * سرویس ایمیل قطع). قفل کردن حساب پشت ایمیلی که شاید هرگز نیاید یعنی
 * دانش‌آموزی که ثبت‌نام کرده وارد سایت نمی‌شود. تأیید ایمیل چیزی است که اپ
 * می‌تواند بعداً برایش اصرار کند.
 */
export const POST = withRoute("/api/v1/auth/register", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    // جلوی ساخت انبوه حساب با اسکریپت. سخت‌گیرانه نیست — یک کلاس واقعی
    // ثبت‌نام می‌کند و ممکن است همه پشت یک IP مدرسه باشند.
    const limit = await rateLimitDb(`register:${meta.ip ?? "unknown"}`, 10, 15 * 60);
    if (!limit.allowed) {
      logger.warn("ثبت‌نام به‌خاطر سقف نرخ رد شد", {
        event: "auth.register.rate_limited",
        limit_scope: "ip",
        retry_after_seconds: limit.retryAfterSeconds,
      });
      return fail(`تعداد تلاش‌ها زیاد بود. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, registerSchema);
    if (!body.ok) return body.response;

    const { firstName, lastName, email, password, turnstileToken } = body.data;

    const captcha = await verifyTurnstile(turnstileToken, meta.ip);
    if (!captcha.ok) return fail(captcha.error, 400);

    // سقف دوم، روی خودِ ایمیل.
    //
    // این endpoint وجود یا نبودِ یک حساب را عمداً فاش می‌کند (توضیحش پایین‌تر
    // کنار پاسخ ۴۰۹). آن تصمیم درست است، ولی معنایش این است که ثبت‌نام یک
    // ابزار پرسش «آیا فلانی اینجا حساب دارد؟» هم هست. سقفِ IP به‌تنهایی جلویش
    // را نمی‌گیرد، چون مهاجم می‌تواند از چند IP بپرسد. با این سقف، هر ایمیل
    // در ربع ساعت فقط چند بار قابل پرسش است — بی‌فایده برای ساختن فهرست،
    // بی‌اثر برای کسی که واقعاً دارد ثبت‌نام می‌کند.
    const emailLimit = await rateLimitDb(`register-email:${email}`, 5, 15 * 60);
    if (!emailLimit.allowed) {
      return fail(
        `تعداد تلاش‌ها زیاد بود. ${emailLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
        429,
      );
    }

    const passwordHash = await hashPassword(password);

    // insert و بعد گرفتنِ خطای تکراری، و نه «اول select بعد insert»: آن روش
    // یک مسابقه دارد که دو درخواست همزمان می‌توانند هر دو از چکِ تکراری رد
    // شوند. اینجا هم مثل قبل خودِ unique index داور است.
    //
    // ⚠️ عمداً INSERT IGNORE نیست. آن دستور *هر* خطایی را به هشدار تبدیل
    // می‌کند — نقض CHECK، دادهٔ بریده‌شده، ستونِ بدون مقدار — و همه را شبیه
    // «ایمیل تکراری» نشان می‌داد. اینجا فقط ۱۰۶۲ تکراری حساب می‌شود و هر
    // خطای دیگری بالا می‌رود، همان‌طور که on conflict (email) هم فقط روی
    // همان یک قید کار می‌کرد.
    const userId = randomUUID();
    try {
      /* ⚠️ `full_name` نوشته نمی‌شود و این عمدی است: تریگرِ
         `users_full_name_bi` (مهاجرت ۰۰۹) خودش از نام و نام خانوادگی
         می‌سازدش. نوشتنش از اینجا فقط یک مقدارِ موقتی بود که همان لحظه
         بازنویسی می‌شد — و بدتر، یک مسیرِ دومِ نوشتنِ نام که روزی با
         تریگر اختلاف پیدا می‌کرد. */
      await execute(
        `insert into users (id, email, password_hash, first_name, last_name)
         values (?, ?, ?, ?, ?)`,
        [userId, email, passwordHash, firstName, lastName],
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;

      /* ردیفی ساخته نشد یعنی ایمیل از قبل هست — `users_email_key` تنها
         کلیدِ یکتایی است که این insert می‌تواند نقض کند.

         بله، این وجودِ حساب را فاش می‌کند. عمدی است: جایگزینش («کد تأیید
         فرستادیم») کاربری را که ایمیلش را فراموش کرده در حلقهٔ بی‌پایان
         می‌اندازد. صفحهٔ ورود هم همین اطلاعات را از راه «رمز را فراموش
         کرده‌اید» می‌دهد، پس پنهان‌کاری اینجا چیزی اضافه نمی‌کرد. */
      logger.info("ثبت‌نام تکراری", { event: "auth.register.duplicate" });
      return fail("این ایمیل قبلاً ثبت شده است. وارد شوید یا رمز را بازیابی کنید.", 409);
    }

    // ستون‌های role و created_at و … از DEFAULT می‌آیند، پس ردیف باید خوانده
    // شود؛ ساختنش از روی مقادیرِ ورودی یعنی تکرارِ پیش‌فرض‌ها در دو جا.
    /* ⚠️ ستون‌ها دیگر اینجا نوشته نمی‌شوند.
       تا دیروز این select دستی بود و مهاجرت ۰۰۶ که دو ستون اضافه کرد، از
       قلم انداختنش را ممکن کرد. حالا `AUTH_USER_COLUMNS` تنها جایی است که
       این فهرست وجود دارد — توضیحِ کامل کنارِ `authUserColumns` در
       `lib/auth/session.ts`. */
    const row = await queryOne<UserRow>(
      `select ${AUTH_USER_COLUMNS} from users where id = ?`,
      [userId],
    );

    if (!row) {
      // insert موفق بود ولی ردیف پیدا نشد — یعنی چیزی در همین فاصله حذفش
      // کرده. حالتِ «ایمیل تکراری» نیست (آن بالا و با خطای ۱۰۶۲ گرفته شد)،
      // پس نباید ۴۰۹ بدهد.
      throw new Error("حساب ساخته شد ولی خوانده نشد.");
    }

    const user = toAuthUser(row);
    const tokens = await createSession(user, meta);

    attachUserId(user.id);
    logger.info("حساب تازه ساخته شد", { event: "auth.register.succeeded", user_id: user.id });

    /* پیامِ خوش‌آمد: اعلانِ پنل + ایمیل (و پیامک، اگر روزی شماره‌اش را
       تأیید کند).
       ⚠️ `catch` ندارد و لازم هم ندارد: `sendWelcome` هرگز throw نمی‌کند.
       ⚠️ و عمداً `await` است و نه یک وعدهٔ رهاشده — همان تصمیمی که
       `forgot-password` برای ایمیلش گرفته. وعده‌ای که بعد از `return` رها
       شود، هیچ‌کس شکستش را نمی‌بیند و در هر محیطی هم اجرا نمی‌شود. */
    await sendWelcome(user.id);

    return withCookies(ok({ user }, 201), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
});
