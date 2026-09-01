import type { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, findUserByEmail } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { loginSchema } from "@/lib/auth/schemas";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimit, resetRateLimit } from "@/lib/api/rate-limit";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { attachUserId, logger } from "@/lib/observability";
import { withRoute } from "@/lib/api/route";

/** هشِ argon2id یک رمزِ دورریختنی، با همان پارامترهای lib/auth/password.ts.
 *  فقط برای برابر کردن زمانِ پاسخ استفاده می‌شود — پایین‌تر توضیح داده شده. */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$l8qhhlvCofyLfnNJu8rUpg$6df+TIi4hOHiFBM1R7Bwv0cmfyy7xfA7+U/kUxbWAmo";

/** POST /api/v1/auth/login — ورود با ایمیل و رمز. */
export const POST = withRoute("/api/v1/auth/login", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    const body = await readJson(request, loginSchema);
    if (!body.ok) return body.response;

    const { email, password, turnstileToken } = body.data;

    // کپچا قبل از هر کار دیگری — و ترتیبش نسبت به محدودیت نرخِ پایین عمدی است:
    //
    //   • قبل از کوئری کاربر و argon2، وگرنه مهاجم با توکنِ بی‌اعتبار هم سرور
    //     را وادار به کارِ گران می‌کرد و کپچا جلوی هزینه را نگرفته بود.
    //
    //   • قبل از سهمیهٔ `login:${email}`، وگرنه هر کسی می‌توانست با چند
    //     درخواستِ بی‌توکن، سهمیهٔ ورودِ حساب دیگری را بسوزاند و صاحبش را
    //     پانزده دقیقه بیرون نگه دارد — یعنی خودِ محافظ به ابزار حمله تبدیل
    //     می‌شد.
    //
    // هزینه‌اش یک درخواست بیرونی به ازای هر تلاش است، که سقفِ سراسریِ /api در
    // proxy.ts محدودش می‌کند.
    const captcha = await verifyTurnstile(turnstileToken, meta.ip);
    if (!captcha.ok) return fail(captcha.error, 400);

    // دو سهمیهٔ جدا، چون دو حملهٔ متفاوت را می‌گیرند:
    //   • per-email جلوی حدس زدن رمزِ یک حسابِ مشخص را می‌گیرد، حتی اگر مهاجم
    //     IP عوض کند.
    //   • per-IP جلوی امتحان کردن یک رمز روی هزاران ایمیل را می‌گیرد
    //     (password spraying)، که سهمیهٔ per-email اصلاً نمی‌بیندش.
    const emailLimit = rateLimit(`login:${email}`, 8, 15 * 60);
    const ipLimit = rateLimit(`login-ip:${meta.ip ?? "unknown"}`, 40, 15 * 60);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const wait = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
      // ⚠️ نه ایمیل، نه IP. فقط اینکه *کدام* سهمیه پر شده — که برای فهمیدن
      // «حملهٔ حدس رمز روی یک حساب» یا «پاشیدنِ رمز روی چند حساب» کافی است.
      logger.warn("ورود به‌خاطر سقف نرخ رد شد", {
        event: "auth.login.rate_limited",
        limit_scope: !emailLimit.allowed ? "email" : "ip",
        retry_after_seconds: wait,
      });
      return fail(`تلاش‌های ناموفق زیاد بود. ${wait} ثانیه دیگر تلاش کنید.`, 429);
    }

    const user = await findUserByEmail(email);

    // پیام یکسان برای «ایمیل وجود ندارد» و «رمز غلط است» — وگرنه صفحهٔ ورود به
    // یک ابزار برای فهمیدن اینکه چه کسی در این سایت حساب دارد تبدیل می‌شود.
    const invalid = () => {
      // ⚠️ یک رخداد، یک دلیل — برای هر دو حالتِ «ایمیل نبود» و «رمز غلط بود».
      //
      // همان استدلالِ پیامِ یکسانِ بالا، این بار برای لاگ: اگر لاگ دو رخدادِ
      // متفاوت می‌نوشت، هر کسی که به لاگ دسترسی پیدا کند (یا هر ابزاری که
      // روزی لاگ را جایی می‌فرستد) می‌توانست بگوید کدام ایمیل‌ها در این سایت
      // حساب دارند. ایمیل هم عمداً نوشته نمی‌شود.
      logger.info("ورود ناموفق", {
        event: "auth.login.failed",
        reason: "invalid_credentials",
      });
      return fail("ایمیل یا رمز عبور اشتباه است.", 401);
    };

    if (!user) {
      // حتی وقتی کاربر وجود ندارد هم یک تأیید انجام می‌شود.
      //
      // بدون این، پاسخ برای ایمیلِ ناموجود در ~۰.۲ms برمی‌گردد و برای ایمیلِ
      // موجود بعد از ~۲۳ms کارِ argon2. آن اختلافِ صدبرابری با یک اسکریپت
      // ساده قابل اندازه‌گیری است و می‌گوید کدام ایمیل‌ها در این سایت حساب
      // دارند — یعنی همان چیزی که پیامِ یکسانِ بالا می‌خواست پنهان کند.
      //
      // هش باید *واقعی* باشد. یک رشتهٔ بی‌معنی با فرمت argon2 در همان ۰.۲ms
      // رد می‌شود چون تجزیه‌اش شکست می‌خورد و هرگز به کار اصلی نمی‌رسد —
      // اندازه‌گیری شد و همین‌طور بود. این هشِ یک رمزِ دورریختنی است.
      await verifyPassword(DUMMY_HASH, password);
      return invalid();
    }

    const passwordOk = await verifyPassword(user.passwordHash, password);
    if (!passwordOk) return invalid();

    // بن بعد از بررسی رمز چک می‌شود، نه قبلش: اگر قبلش بود، «این حساب مسدود
    // است» به هرکسی که ایمیل را حدس بزند گفته می‌شد، بدون اینکه رمز را بداند.
    if (user.isBanned) {
      // اینجا رمز *درست* بوده، پس رخدادِ جدایی است و uuid کاربر هم می‌ارزد:
      // مدیر باید ببیند حسابِ مسدود همچنان تلاش می‌کند. (بازهم بدون ایمیل.)
      logger.warn("ورودِ حساب مسدود", {
        event: "auth.login.blocked",
        reason: "banned",
        user_id: user.id,
      });
      return fail("حساب شما مسدود شده است. با پشتیبانی تماس بگیرید.", 403);
    }

    // ورودِ موفق سهمیه را آزاد می‌کند — کسی که رمزش را درست زده نباید به خاطر
    // چند غلطِ قبلی قفل بماند.
    resetRateLimit(`login:${email}`);

    const { passwordHash: _passwordHash, ...safeUser } = user;
    const tokens = await createSession(safeUser, meta);

    // از این به بعد هر لاگی در همین درخواست user_id را هم دارد.
    attachUserId(safeUser.id);
    logger.info("ورود موفق", { event: "auth.login.succeeded", user_id: safeUser.id });

    return withCookies(ok({ user: safeUser }), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
});
