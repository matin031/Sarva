import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { refreshSession } from "@/lib/auth/session";
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookie, clearedCookies } from "@/lib/auth/cookies";
import { isCrossSiteRequest, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { REQUEST_ID_HEADER, logger, newRequestId } from "@/lib/observability";

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

  let claims = accessToken ? await verifyAccessToken(accessToken) : null;
  let response: NextResponse | null = null;

  // توکن دسترسی نداریم ولی refresh داریم → یک بار تلاش برای تازه‌سازی.
  // این تنها مسیری است که به دیتابیس می‌زند و در حالت عادی هر ۱۵ دقیقه یک بار
  // برای هر کاربر فعال اتفاق می‌افتد.
  if (!claims && refreshToken) {
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
  const signedIn = claims !== null;

  // اگه لاگینه و میخواد بره /auth، بفرستش پنل
  if (signedIn && pathname.startsWith("/auth")) {
    return stamp(NextResponse.redirect(new URL("/panel", request.url)));
  }

  // اگه لاگین نیست و میخواد بره /panel، بفرستش auth
  if (!signedIn && pathname.startsWith("/panel")) {
    return stamp(NextResponse.redirect(new URL("/auth", request.url)));
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
