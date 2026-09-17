/**
 * تنها منبعِ معتبرِ «آدرسِ اصلیِ سایت».
 *
 * ⚠️ چرا این فایل ساخته شد: تا امروز دو منبعِ بی‌ارتباط وجود داشت.
 *
 *   • برای سئو، رشتهٔ `https://aruzino.ir` در چهار فایل *هارد‌کد* شده بود:
 *     app/layout.tsx، app/robots.ts، app/sitemap.ts، و لایوتِ about و guide.
 *   • برای احراز هویت، متغیرِ `NEXT_PUBLIC_SITE_URL` خوانده می‌شد
 *     (lib/auth/oauth/google.ts، lib/api/http.ts، مسیرِ بازیابیِ رمز).
 *
 * یعنی لینکِ بازیابیِ رمز می‌توانست به دامنهٔ تازه برود در حالی که canonical و
 * sitemap هنوز دامنهٔ قدیم را اعلام می‌کردند. با یک منبع، چنین واگرایی‌ای
 * ممکن نیست.
 *
 * ── چرا از هدرِ Host خوانده نمی‌شود ────────────────────────────────────────
 * `Host` را فرستندهٔ درخواست تعیین می‌کند. اگر canonical از روی آن ساخته شود،
 * هر کسی که با هدرِ دلخواه درخواست بزند می‌تواند صفحه‌ای بسازد که خودش را
 * canonicalِ دامنهٔ دیگری اعلام کند — و در حالتِ چند-دامنه‌ایِ همین مهاجرت،
 * صفحاتِ دامنهٔ قدیم خودشان را canonical اعلام می‌کردند و کلِ انتقال بی‌اثر
 * می‌شد. پس مقدار از پیکربندی می‌آید، نه از درخواست.
 *
 * ── چرا بدونِ www ─────────────────────────────────────────────────────────
 * مالک صریحاً `sarvaedu.ir` را به‌عنوان دامنهٔ اصلی انتخاب کرد.
 *
 * ⚠️ این یک تصمیمِ صرفاً کدی نیست و *به‌تنهایی اجرا نمی‌شود*. در بررسیِ
 * پیش از این کار، سایت برعکس رفتار می‌کرد: `sarvaedu.ir` به
 * `www.sarvaedu.ir` ریدایرکت می‌شد. اگر آن ریدایرکت سرِ جایش بماند، هر
 * canonicalِ این سایت به آدرسی اشاره می‌کند که خودش ریدایرکت می‌شود — یعنی
 * دقیقاً همان چیزی که canonical باید از آن جلوگیری کند.
 *
 * پس این تغییر باید *همزمان* با برگرداندنِ جهتِ ریدایرکت روی وب‌سرور اجرا
 * شود: از این پس `www.sarvaedu.ir` باید به `sarvaedu.ir` برود، نه برعکس.
 * جزئیاتش در docs/domain-migration.md.
 */

/** پیش‌فرضِ امن وقتی متغیرِ محیطی تنظیم نشده باشد. */
const FALLBACK_ORIGIN = "https://sarvaedu.ir";

/** دامنه‌ای که سایت از آن مهاجرت می‌کند — فقط برای برنامهٔ انتقال. */
export const LEGACY_ORIGIN = "https://aruzino.ir";

function normalize(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // فقط طرح و میزبان می‌ماند؛ مسیر و کوئری در origin جایی ندارند.
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * میزبان‌هایی که فقط روی همان ماشین معنی دارند.
 *
 * `localhost`، لوپ‌بک، شبکهٔ خصوصی (10/8، 172.16/12، 192.168/16)، لینک‌لوکال،
 * `*.local` و هر نامی که اصلاً نقطه ندارد (مثل نامِ کانتینرِ داکر).
 */
function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "[::1]" || h === "::1") return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  // نامِ بدونِ نقطه = نامِ داخلیِ شبکه، نه یک دامنهٔ عمومی.
  return !h.includes(".");
}

/**
 * ریشهٔ آدرسِ سایت، بدونِ اسلشِ پایانی. مثلاً `https://www.sarvaedu.ir`.
 *
 * در بیلد و در زمانِ اجرا یک مقدار می‌دهد چون هر دو از همین متغیر می‌خوانند.
 * پیش‌نمایش‌ها می‌توانند `NEXT_PUBLIC_SITE_URL` خودشان را بگذارند تا
 * canonicalهایشان به production اشاره نکند.
 */
export function siteOrigin(): string {
  const configured = normalize(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  if (!configured) return FALLBACK_ORIGIN;

  /* ⚠️ نگهبانِ «هیچ بیلدِ production حق ندارد localhost اعلام کند».

     این نگهبان با یک خرابیِ واقعی اضافه شد و ماجرایش باید بماند:

     `NEXT_PUBLIC_*` را Next در زمانِ **build** داخلِ کد جاگذاری می‌کند و نه
     در زمانِ اجرا — هم در باندلِ مرورگر و هم در کدِ سرور. بستهٔ هاست روی
     همین ماشینِ توسعه ساخته می‌شود و `.env.local` کنارش نشسته، با
     `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. پس آن رشته *داخلِ بسته*
     به هاست می‌رفت و مقدارِ درستِ `.env`ِ روی هاست هیچ‌وقت خوانده نمی‌شد.

     نتیجه‌اش خاموش بود و نه یک خطا. روی خودِ سایتِ زنده:

         GET /robots.txt   →  Sitemap: http://localhost:3000/sitemap.xml
         GET /sitemap.xml  →  <loc>http://localhost:3000</loc>  (هر صفحه)

     یعنی گوگل برای کلِ سایت آدرسی را می‌خواند که وجودِ خارجی ندارد، هر
     `canonical` به همان‌جا اشاره می‌کرد، و لینکِ دعوتِ کلاس که دبیر کپی
     می‌کرد `http://localhost:3000/panel/classes?join=…` بود.

     ⚠️ چرا کدی و نه فقط «مقدارِ .env را درست کن»: چون فراموش کردنِ آن
     مقدار هیچ نشانهٔ بیرونی ندارد. یک بیلدِ production که خودش را
     localhost معرفی کند *هرگز* درست نیست، پس همین‌جا رد می‌شود.

     در dev دست‌نخورده می‌ماند — آنجا localhost دقیقاً همان چیزی است که
     باید باشد. و برای کسی که عمداً یک بیلدِ production را روی شبکهٔ محلی
     اجرا می‌کند، `ALLOW_LOCAL_SITE_URL=true` راهِ فرار است. */
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_LOCAL_SITE_URL !== "true" &&
    isLocalHost(new URL(configured).hostname)
  ) {
    return FALLBACK_ORIGIN;
  }

  return configured;
}

/**
 * آدرسِ مطلقِ یک مسیر.
 *
 * ورودی همیشه با `/` شروع می‌شود. خروجی برای ریشه `https://host` است و نه
 * `https://host/` — چون Next خودش برای canonicalِ ریشه اسلش را مدیریت می‌کند
 * و دو شکلِ متفاوت از یک آدرس دقیقاً همان چیزی است که canonical باید جلویش
 * را بگیرد.
 */
export function absoluteUrl(path = "/"): string {
  const origin = siteOrigin();
  if (path === "/" || path === "") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * آیا این نصب باید از ایندکس شدن جلوگیری کند؟
 *
 * ⚠️ لازم است چون پیش‌نمایش و staging روی همان کد اجرا می‌شوند. بدونِ این،
 * یا پیش‌نمایش ایندکس می‌شود، یا کسی برای جلوگیری‌اش چیزی در کدِ مشترک
 * می‌گذارد و production هم آن را به ارث می‌برد — که بدترین حالت است، چون
 * بی‌صدا کلِ سایت را از نتایج بیرون می‌اندازد.
 *
 * پس تصمیم صریح و محیطی است: فقط `SEO_NOINDEX=true` جلوی ایندکس را می‌گیرد.
 */
export function isNoindexEnvironment(): boolean {
  return process.env.SEO_NOINDEX === "true";
}

/* ─────────────────────── آدرس برای لینک‌های ایمیل ─────────────────────── */

/**
 * ریشهٔ آدرس برای لینک‌هایی که **داخلِ ایمیل** می‌روند.
 *
 * ⚠️ چرا جدا از `siteOrigin()`: لینکِ بازیابیِ رمز روی ماشینِ توسعه با
 * `NEXT_PUBLIC_SITE_URL=http://localhost:3000` ساخته می‌شد و همان
 * `http://localhost:3000/reset-password?token=…` به صندوقِ کاربر می‌رفت —
 * آدرسی که روی دستگاهِ *گیرنده* یا هیچ‌چیز نیست یا برنامهٔ خودش. کاربر عملاً
 * هیچ راهی برای بازنشانیِ رمز نداشت.
 *
 * یک canonical می‌تواند در پیش‌نمایش به خودِ پیش‌نمایش اشاره کند و درست باشد؛
 * یک لینکِ ایمیل نمی‌تواند، چون از مرزِ آن ماشین بیرون می‌رود. پس اینجا
 * میزبانِ محلی/خصوصی رد می‌شود و به دامنهٔ اصلی برمی‌گردیم.
 */
export function emailOrigin(): string {
  const configured = normalize(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  if (!configured) return FALLBACK_ORIGIN;
  if (isLocalHost(new URL(configured).hostname)) return FALLBACK_ORIGIN;
  return configured;
}

/** آدرسِ مطلقِ یک مسیر، مناسبِ قرار گرفتن در ایمیل. */
export function emailUrl(path = "/"): string {
  const origin = emailOrigin();
  if (path === "/" || path === "") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
