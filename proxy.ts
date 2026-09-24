import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { refreshSession } from "@/lib/auth/session";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookie,
  refreshCookie,
  clearedCookies,
} from "@/lib/auth/cookies";
import { isCrossSiteRequest, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { REQUEST_ID_HEADER, logger, newRequestId } from "@/lib/observability";
import { ONBOARDING_PATH } from "@/lib/auth/onboarding";
import { cookieSecure } from "@/lib/auth/config";
import {
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_MAX_AGE,
  MAINTENANCE_BYPASS_PARAM,
  MAINTENANCE_PATH,
  RETRY_AFTER_SECONDS,
  bypassKeyMatches,
  maintenanceState,
} from "@/lib/site/maintenance";

/**
 * Proxy — در Next 16 نام تازهٔ middleware است.
 *
 * فایل قبلی middleware.ts بود و نامِ تابعش هم middleware. هر دو منسوخ شده‌اند.
 * یک تفاوت واقعی هم دارد که به نفع ماست: proxy روی runtime نودجی‌اس اجرا
 * می‌شود نه Edge (و قابل تنظیم هم نیست)، پس برخلاف middleware می‌تواند به
 * دیتابیس بزند — که همان چیزی است که تازه‌سازی توکن پایین به آن نیاز دارد.
 *
 * دو کار می‌کند:
 *
 *   ۱) تازه‌سازی توکن دسترسی. توکن ۱۵ دقیقه عمر دارد؛ بدون این، کاربری که
 *      نیم ساعت در سایت بوده ناگهان لاگین‌نشده به نظر می‌رسید. اینجا انجام
 *      می‌شود چون Server Component ها اجازهٔ نوشتن کوکی ندارند — همان
 *      محدودیتی که نسخهٔ Supabase هم با آن دست‌وپنجه نرم می‌کرد (توضیح مفصلش
 *      در lib/supabase-server.ts بود).
 *
 *   ۲) هدایت. دقیقاً همان دو قاعدهٔ قبلی، بدون تغییر.
 *
 *   ۳) دو گاردِ سراسری روی /api: ردِ درخواست‌های بین‌سایتی، و یک سقفِ نرخِ
 *      کلی. هر دو عمداً اینجا هستند و نه در تک‌تک route ها — چون گاردی که باید
 *      در بیست فایل تکرار شود، همان گاردی است که در فایل بیست‌ویکم فراموش
 *      می‌شود. محدودیت‌های دقیق‌ترِ هر endpoint سر جای خودشان می‌مانند؛ این
 *      فقط کفِ محافظت است.
 *
 * آنچه اینجا انجام *نمی‌شود*: تصمیمِ واقعیِ دسترسی. هدایتِ اینجا فقط برای
 * تجربهٔ کاربری است. requireUser()/requireAdmin() در لایهٔ داده هستند که
 * واقعاً جلوی کار را می‌گیرند — چون هرکسی می‌تواند مستقیم به یک Server Action
 * درخواست بزند و اصلاً از این مسیر رد نشود.
 */

/** سقفِ کلیِ درخواست به ازای هر IP روی /api.
 *
 *  عمداً بلند است — یک کاربر عادی که در پنل بین صفحه‌ها می‌چرخد یا وسط بازی
 *  است، در یک دقیقه ده‌ها درخواست می‌زند و نباید به دیوار بخورد. کارِ این سقف
 *  گرفتنِ اسکریپت است، نه آدم: هزار درخواست در دقیقه از یک IP، کاربر نیست. */
const API_RATE_LIMIT = Number(process.env.API_RATE_LIMIT ?? 240);
const API_RATE_WINDOW_SECONDS = 60;

function tooManyRequests(retryAfterSeconds: number, requestId: string): NextResponse {
  return NextResponse.json(
    { ok: false, errors: [`درخواست‌های زیاد. ${retryAfterSeconds} ثانیه دیگر تلاش کنید.`] },
    {
      status: 429,
      headers: {
        "retry-after": String(retryAfterSeconds),
        "cache-control": "no-store",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}

/**
 * مسیرهایی که ارزش لاگ کردن ندارند.
 *
 * درخواست‌های داخلیِ Next (`/_next/...`)، فایل‌های صوتی و تصویری و
 * `favicon.ico`. یک صفحهٔ معمولی ده‌ها از این‌ها می‌سازد و لاگ کردنشان فقط
 * چیزی است که باید بعداً از لاگ فیلتر شود.
 */
/**
 * آدرسِ `target` با `returnTo` = مسیرِ فعلیِ درخواست.
 *
 * ⚠️ فقط مسیر و query، بدونِ میزبان. پاک‌سازیِ نهایی با `safeReturnTo` در
 * صفحهٔ مقصد است؛ اینجا فقط چیزی که داشت گم می‌شد، همراه می‌رود.
 */
function withReturnTo(target: string, request: NextRequest): URL {
  const url = new URL(target, request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/" && !pathname.startsWith("/auth")) {
    url.searchParams.set("returnTo", `${pathname}${search}`);
  }
  return url;
}

/**
 * مسیرهایی که حالتِ «در حال بروزرسانی» هم بازشان می‌گذارد.
 *
 * ⚠️ هر کدام یک دلیلِ مشخص دارند و هیچ‌کدام از سرِ احتیاط اینجا نیست:
 *
 *   • `/maintenance` — خودِ صفحهٔ بروزرسانی. نبودش یعنی حلقهٔ بی‌پایان.
 *   • `/auth` و `/api/v1/auth/` — **مهم‌ترینشان.** مدیر باید بتواند وارد
 *     شود تا استثنای «مدیر رد می‌شود» اصلاً به کار بیاید. بستنِ این دو یعنی
 *     کلیدی که فقط از داخل باز می‌شود و در، از بیرون قفل است.
 *   • `/admin` — مقصدِ همان مدیر. گاردِ واقعی‌اش `requireAdmin()` است و نه
 *     این فهرست.
 *   • `/logo.png` — تنها تصویری که صفحهٔ بروزرسانی می‌خواهد.
 */
function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname === MAINTENANCE_PATH ||
    pathname === "/logo.png" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/v1/auth/")
  );
}

function isNoiseRequest(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/audio/") ||
    pathname.startsWith("/vocab/") ||
    pathname.startsWith("/uploads/") ||
    /\.(?:png|jpe?g|gif|svg|webp|ico|mp3|wav|ogg|m4a|woff2?|css|js|map|txt|xml)$/.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  // ------------------------------------------------------ شناسهٔ درخواست --
  //
  // اینجا ساخته می‌شود و نه در Route Handler، چون proxy تنها نقطه‌ای است که
  // *همهٔ* درخواست‌ها از آن رد می‌شوند — صفحه‌ها، Server Action ها و API.
  //
  // ⚠️ مقدارِ آمده از کلاینت عمداً خوانده نمی‌شود و **بازنویسی** می‌شود.
  // Caddy هدرهای ناشناخته را حذف نمی‌کند، پس هر کسی می‌تواند
  // `x-request-id: <هرچه>` بفرستد. پذیرفتنش یعنی دادنِ اختیارِ نوشتن در لاگ
  // به کلاینت: یک مقدار تکراری برای همهٔ درخواست‌ها، یا رشته‌ای که خواننده را
  // گمراه کند. جلوی هیچ‌کدام با «اعتبارسنجی» به‌تنهایی گرفته نمی‌شود، و
  // چیزی هم از دست نمی‌رود چون هیچ سرویس بالادستی‌ای اینجا شناسه تولید
  // نمی‌کند.
  const requestId = newRequestId();

  /** هدرهای درخواست + شناسه، برای رساندن به لایهٔ بعد.
   *
   *  عمداً بعد از هر `request.cookies.set()` صدا زده می‌شود: آن متد هدر
   *  `cookie` را روی همین شیء عوض می‌کند و کپیِ زودهنگام، کوکیِ تازه را
   *  نمی‌بیند. */
  const forward = (): NextResponse => {
    const headers = new Headers(request.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return NextResponse.next({ request: { headers } });
  };

  /** شناسه را روی پاسخ هم می‌گذارد تا در ابزار توسعهٔ مرورگر دیده شود —
   *  همان چیزی که کاربر می‌تواند برایتان بفرستد. */
  const stamp = <T extends NextResponse>(response: T): T => {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  };

  // ---------------------------------------------------------------- گاردها --
  // قبل از هر کار دیگری، چون هیچ‌کدام به سشن نیاز ندارند و یک درخواستِ رد شده
  // نباید هزینهٔ تازه‌سازی توکن یا کوئری دیتابیس را تحمیل کند.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const method = request.method.toUpperCase();

    // GET/HEAD هیچ چیزی را تغییر نمی‌دهند، پس CSRF برایشان بی‌معنی است.
    if (method !== "GET" && method !== "HEAD" && isCrossSiteRequest(request)) {
      logger.warn("درخواست بین‌سایتی رد شد", {
        event: "http.request.cross_site_rejected",
        request_id: requestId,
        route: request.nextUrl.pathname,
        method,
        status_code: 403,
      });
      return stamp(
        NextResponse.json(
          { ok: false, errors: ["این درخواست از مبدأ نامعتبری آمده است."] },
          { status: 403, headers: { "cache-control": "no-store" } },
        ),
      );
    }

    const { ip } = requestMeta(request);
    const limit = rateLimit(`api:${ip ?? "unknown"}`, API_RATE_LIMIT, API_RATE_WINDOW_SECONDS);
    if (!limit.allowed) {
      // ⚠️ IP لاگ نمی‌شود. برای فهمیدنِ «سقف کلی خورده شد» مسیر و شناسه کافی
      // است، و آدرس شبکهٔ کاربر داده‌ای است که لاگ عملیاتی نباید نگه دارد.
      logger.warn("سقف کلی نرخ درخواست خورده شد", {
        event: "http.request.rate_limited",
        request_id: requestId,
        route: request.nextUrl.pathname,
        method,
        status_code: 429,
        retry_after_seconds: limit.retryAfterSeconds,
      });
      return stamp(tooManyRequests(limit.retryAfterSeconds, requestId));
    }
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  /**
   * مسیرهایی که خودشان صاحبِ کوکی‌های سشن‌اند و proxy نباید در کارشان دخالت کند.
   *
   * ⚠️ این حصار از وقتی لازم شد که refresh token شروع به چرخیدن کرد. matcher
   * پایینِ همین فایل مسیرهای /api را هم می‌گیرد، پس یک POST به
   * /api/v1/auth/refresh دو بار refreshSession را صدا می‌زد: یک بار اینجا و
   * یک بار در خودِ route. پیش از چرخش بی‌ضرر بود (فقط یک کوئریِ اضافه)، ولی
   * حالا یعنی دو توکن در یک درخواست می‌سوزد و درستیِ کار به پنجرهٔ مدارا
   * وابسته می‌شود — یعنی همان چیزی که فقط باید تورِ ایمنیِ مسابقه باشد،
   * تبدیل به بخشی از مسیرِ عادی می‌شد.
   *
   * logout هم همین‌جاست: چرخاندنِ توکنی که یک لحظه بعد باطل می‌شود کارِ
   * بیهوده‌ای است.
   */
  const ownsSessionCookies =
    request.nextUrl.pathname === "/api/v1/auth/refresh" ||
    request.nextUrl.pathname === "/api/v1/auth/logout";

  let claims = accessToken ? await verifyAccessToken(accessToken) : null;
  let response: NextResponse | null = null;

  // توکن دسترسی نداریم ولی refresh داریم → یک بار تلاش برای تازه‌سازی.
  // این تنها مسیری است که به دیتابیس می‌زند و در حالت عادی هر ۱۵ دقیقه یک بار
  // برای هر کاربر فعال اتفاق می‌افتد.
  if (!claims && refreshToken && !ownsSessionCookies) {
    try {
      const refreshed = await refreshSession(refreshToken);

      if (refreshed) {
        const fresh = accessCookie(refreshed.tokens.accessToken);

        // کوکی باید هم روی *درخواست* بنشیند و هم روی *پاسخ*:
        //   • روی درخواست، تا صفحه‌ای که همین حالا رندر می‌شود کاربر را ببیند
        //     (وگرنه این رندر لاگین‌نشده می‌ماند و تازه رفرش بعدی درست می‌شود).
        //   • روی پاسخ، تا مرورگر نگهش دارد.
        request.cookies.set(fresh.name, fresh.value);
        response = forward();
        response.cookies.set(fresh.name, fresh.value, fresh.options);

        // refresh هم چرخیده و توکنِ ورودی سوخته است. اگر این کوکی روی پاسخ
        // ننشیند، مرورگر با رشتهٔ مرده می‌ماند و تازه‌سازیِ بعدی «استفادهٔ
        // مجدد» خوانده می‌شود — یعنی کاربر از همهٔ دستگاه‌هایش بیرون می‌افتد.
        // undefined بودنش فقط یعنی مسابقهٔ بی‌ضرر؛ آنجا کوکیِ فعلی درست است.
        if (refreshed.tokens.refreshToken) {
          const rolled = refreshCookie(refreshed.tokens.refreshToken);
          request.cookies.set(rolled.name, rolled.value);
          response.cookies.set(rolled.name, rolled.value, rolled.options);
        }

        claims = await verifyAccessToken(refreshed.tokens.accessToken);
      } else {
        // refresh token مرده است (باطل‌شده، منقضی، یا کاربر مسدود). کوکی‌ها پاک
        // می‌شوند تا مرورگر با هر درخواست یک کوئری دیتابیسِ بی‌فایده تحمیل نکند.
        response = forward();
        for (const c of clearedCookies()) response.cookies.set(c.name, c.value, c.options);
      }
    } catch (err) {
      // دیتابیس در دسترس نیست. کاربر را بیرون نمی‌اندازیم و صفحه را هم
      // نمی‌شکنیم — فقط این درخواست مهمان حساب می‌شود.
      //
      // ⚠️ خودِ توکن هرگز لاگ نمی‌شود؛ فقط اینکه تازه‌سازی شکست خورد.
      logger.error("تازه‌سازی سشن ناموفق بود", {
        event: "auth.session.refresh_failed",
        err,
        request_id: requestId,
        route: request.nextUrl.pathname,
      });
    }
  }

  const { pathname } = request.nextUrl;

  /* ─────────────────── حالتِ «در حال بروزرسانی» ────────────────────────────
   *
   * ⚠️ **بعد** از تازه‌سازیِ سشن و نه قبلش. این گیت به `claims.role` نیاز
   * دارد تا مدیر را رد کند، و مدیری که توکنِ دسترسی‌اش منقضی شده — یعنی
   * هر مدیری که بیش از ربع ساعت است صفحه‌ای باز نکرده — پیش از تازه‌سازی
   * از نگاهِ اینجا یک مهمان است. با ترتیبِ برعکس، مالک هم پشتِ درِ خودش
   * می‌ماند.
   *
   * ⚠️ و **قبل** از قواعدِ هدایتِ پایین: وقتی سایت بسته است، «برو به پنل»
   * و «برو به تکمیلِ پروفایل» معنایی ندارند.
   *
   * ⚠️ هزینه‌اش یک خواندنِ تنظیمات در هر درخواست است — که با کشِ یک‌دقیقه‌ای
   * `lib/settings` در عمل یک کوئری در دقیقه است، نه یکی در درخواست. */
  const bypassParam = request.nextUrl.searchParams.get(MAINTENANCE_BYPASS_PARAM);
  const hasBypassCookie = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value === "1";

  if (bypassParam !== null && (await bypassKeyMatches(bypassParam))) {
    /* کلید درست بود: کوکی می‌نشیند و کاربر به **همان آدرس بدونِ پارامتر**
       فرستاده می‌شود.
       ⚠️ پاک کردنِ پارامتر تزئینی نیست: بدونِ آن، کلید در نوارِ آدرس
       می‌ماند و با اولین اسکرین‌شات، لینکِ اشتراکی یا ارجاعِ بیرونی پخش
       می‌شود. */
    const clean = new URL(request.url);
    clean.searchParams.delete(MAINTENANCE_BYPASS_PARAM);
    /* ⚠️ نامِ متغیر عمداً `response` نیست: یک `response` در همین تابع بالاتر
       تعریف شده و سایه انداختن رویش، خواننده را به اشتباه می‌اندازد. */
    const granted = stamp(NextResponse.redirect(clean));
    granted.cookies.set(MAINTENANCE_BYPASS_COOKIE, "1", {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: MAINTENANCE_BYPASS_MAX_AGE,
    });
    logger.info("کلیدِ عبور از حالت بروزرسانی پذیرفته شد", {
      event: "site.maintenance.bypass_granted",
      request_id: requestId,
    });
    return granted;
  }

  if (
    claims?.role !== "admin" &&
    !hasBypassCookie &&
    !isMaintenanceExempt(pathname) &&
    !pathname.startsWith("/_next/")
  ) {
    const maintenance = await maintenanceState();

    if (maintenance.on) {
      /* ⚠️ `/api/` پاسخِ JSON می‌گیرد و نه HTML. کلاینتی که منتظرِ JSON
         است، با یک صفحهٔ HTML یک خطای تجزیهٔ بی‌ربط نشان می‌دهد؛ ۵۰۳ با
         پیامِ فارسی همان چیزی است که خودش بلد است نمایش بدهد. */
      if (pathname.startsWith("/api/")) {
        return stamp(
          NextResponse.json(
            { ok: false, errors: ["سروا در حال بروزرسانی است. کمی بعد دوباره تلاش کنید."] },
            {
              status: 503,
              headers: { "cache-control": "no-store", "retry-after": String(RETRY_AFTER_SECONDS) },
            },
          ),
        );
      }

      /* ⚠️ `rewrite` و نه `redirect`.
         با redirect، آدرسِ مرورگر عوض می‌شود و پاسخِ آن آدرس ۳۰۷ است —
         یعنی گوگل می‌فهمد «این صفحه به آنجا منتقل شده». با rewrite، آدرس
         دست‌نخورده می‌ماند و همان آدرس ۵۰۳ برمی‌گرداند (کدِ وضعیت را خودِ
         `app/maintenance/route.ts` می‌سازد — و همین که آنجا یک Route
         Handler است و نه یک صفحه، دقیقاً برای همین است). */
      return stamp(NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url)));
    }
  }

  const onOnboarding = pathname === ONBOARDING_PATH;
  /* ⚠️ خودِ `claims` نگه داشته می‌شود و نه فقط یک بولین: گیتِ پایین به
     `claims.needsProfile` نیاز دارد، و با یک `signedIn`ِ جدا کامپایلر
     نمی‌فهمد که non-null بودنش را قبلاً سنجیده‌ایم. */
  const signedIn = claims !== null;

  // اگه لاگینه و میخواد بره /auth، بفرستش پنل
  //
  // ⚠️ به‌جز خودِ صفحهٔ تکمیلِ پروفایل. آن صفحه عمداً زیرِ /auth است (چرایی‌اش
  // در lib/auth/onboarding.ts) و کاربرش **حتماً** وارد شده — بدونِ این
  // استثنا، این قاعده و گیتِ پایین یکدیگر را در یک حلقهٔ بی‌پایان ریدایرکت
  // می‌کردند.
  if (signedIn && pathname.startsWith("/auth") && !onOnboarding) {
    return stamp(NextResponse.redirect(new URL("/panel", request.url)));
  }

  // اگه لاگین نیست و میخواد بره /panel، بفرستش auth
  //
  // ⚠️ مقصد همراهش می‌رود. کسی که از یک اعلان یا لینکِ فاکتور به
  // `/panel/billing/…` آمده، بعد از ورود باید همان‌جا برسد و نه صفحهٔ اولِ
  // پنل. `/auth` خودش آن را از allowlist رد می‌کند.
  if (!signedIn && pathname.startsWith("/panel")) {
    return stamp(NextResponse.redirect(withReturnTo("/auth", request)));
  }

  /* ───────────────────────── گیتِ حسابِ نیمه‌ساخته ────────────────────────
   *
   * حسابی که با گوگل یا با کدِ پیامکی ساخته شده، نام و نام خانوادگی ندارد.
   * تا وقتی ننویسدشان، هر مسیرِ صفحه‌ای به صفحهٔ تکمیل می‌رود.
   *
   * ⚠️ **اینجا و نه در یک layout.** وسوسهٔ اول این بود که گیت در
   * `app/layout.tsx` بنشیند و با `redirect()` کار کند. آن کار *ظاهراً*
   * درست است و یک سوراخِ بزرگ دارد: layout ها در ناوبریِ سمتِ کلاینت دوباره
   * رندر نمی‌شوند. یعنی کاربری که روی صفحهٔ تکمیل است و «بازگشت به سروا» را
   * می‌زند، با یک ناوبریِ کلاینتی به `/` می‌رسد و layout اصلاً اجرا نمی‌شود.
   * proxy روی *هر* درخواست اجرا می‌شود — از جمله درخواست‌های RSCِ همان
   * ناوبری — و همین تنها چیزی است که «صفحه را ببندد و فردا بیاید»، «دکمهٔ
   * برگشت را بزند» و «دستی یک مسیر دیگر تایپ کند» را با هم پوشش می‌دهد.
   *
   * ⚠️ `/api/` عمداً بیرون است. این گیت **هدایت** است و نه دسترسی: بستنِ
   * API یعنی خودِ فرمِ تکمیل نتواند ذخیره کند، خروج کار نکند و صفحه
   * کاربرش را نشناسد. هر endpointی که واقعاً باید محدود باشد، گاردِ خودش را
   * در لایهٔ داده دارد.
   *
   * ⚠️ و `claims.needsProfile` یک ادعای تا-۱۵-دقیقه-کهنه است. تازه شدنش دو
   * راه دارد و هر دو لازم‌اند: چرخشِ عادیِ توکن، و توکنِ تازه‌ای که خودِ
   * مسیرِ ذخیره صادر می‌کند (وگرنه کاربر نامش را می‌نوشت و تا ربع ساعت
   * همان‌جا زندانی می‌ماند).
   */
  if (
    claims?.needsProfile &&
    !onOnboarding &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")
  ) {
    /* ⚠️ مقصد حفظ می‌شود. بدونِ آن، کسی که پلن انتخاب کرده و با پیامک
       تازه حساب ساخته، بعد از نوشتنِ نامش به خانهٔ پنل می‌رفت و انتخابش گم
       می‌شد. صفحهٔ تکمیل آن را با `safeReturnTo` پاک می‌کند. */
    return stamp(NextResponse.redirect(withReturnTo(ONBOARDING_PATH, request)));
  }

  // یک خطِ ردیابی برای ناوبریِ صفحه‌ها. در سطح trace است، پس در حالت عادی
  // چاپ نمی‌شود و فقط وقتی LOG_LEVEL=trace بگذارید دیده می‌شود.
  if (!isNoiseRequest(pathname) && logger.isLevelEnabled("trace")) {
    logger.trace("درخواست وارد شد", {
      event: "http.request.received",
      request_id: requestId,
      route: pathname,
      method: request.method.toUpperCase(),
    });
  }

  return stamp(response ?? forward());
}

export const config = {
  /**
   * همه‌جا، به‌جز دارایی‌های ایستا.
   *
   * ماچرِ قبلی فقط /panel و /auth را می‌گرفت. حالا باید همه‌جا اجرا شود وگرنه
   * تازه‌سازیِ بالا فقط در آن دو مسیر رخ می‌دهد — یعنی کسی که در /sarvaclub یا
   * وسط یک آزمون است، بعد از ۱۵ دقیقه مهمان می‌شود.
   *
   * هزینه‌اش ناچیز است: در حالت عادی فقط یک تأیید امضای JWT است، بدون I/O.
   *
   * فایل‌های public/audio (۳۱ فایل صوتی اوزان) و تصاویر عمداً بیرون‌اند —
   * اجرای این کد برای یک mp3 فقط تأخیر اضافه می‌کند.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|audio/|vocab/|uploads/|.*\\.(?:png|jpe?g|gif|svg|webp|ico|mp3|wav|ogg|m4a|woff2?)$).*)",
  ],
};
