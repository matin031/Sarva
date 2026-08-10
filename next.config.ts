import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * ⚠️ هر چیزی که در این فایل خوانده می‌شود، در زمان **build** خوانده می‌شود و
 * نه در زمان اجرا. `headers()` یک بار هنگام `next build` اجرا و نتیجه‌اش در
 * routes-manifest ذخیره می‌شود.
 *
 * این نکته اینجا اهمیت عملی دارد: در Dockerfile، مرحلهٔ build هیچ `.env` ای
 * ندارد (فایل .env تازه در زمان اجرا با env_file به کانتینر می‌رسد). پس هر
 * چیزی که اینجا به process.env وابسته باشد، روی سرور همیشه مقدار خالی
 * می‌گیرد — بی‌آنکه خطایی بدهد.
 *
 * به همین دلیل همهٔ هدرهای پایین رشتهٔ ثابت‌اند و به محیط وابسته نیستند.
 * `upgrade-insecure-requests` عمداً حذف شده: تنها دستوری بود که به دانستن
 * پروتکل نیاز داشت، و کاری که می‌کرد را HSTS (که Caddy روی TLS می‌فرستد)
 * کامل‌تر انجام می‌دهد — ضمن اینکه همهٔ زیرمنابع این سایت هم‌مبدأ و نسبی‌اند.
 */

/**
 * میزبان‌هایی که تصویر واژه‌یاب از آن‌ها می‌آید.
 *
 * در حالت عادی تصویرها از /api/vocab-image (هم‌مبدأ) می‌آیند، ولی وقتی
 * واترمارک زدن شکست بخورد آن route به منبع اصلی redirect می‌کند — و بدون این
 * فهرست، مرورگر همان‌جا جلویش را می‌گیرد. عمداً همان فهرستی است که
 * ALLOWED_HOSTS در آن route دارد.
 */
const IMAGE_HOSTS = [
  "https://raw.githubusercontent.com",
  "https://objects.githubusercontent.com",
  "https://user-images.githubusercontent.com",
  "https://camo.githubusercontent.com",
  "https://avatars.githubusercontent.com",
].join(" ");

/** ویجت کپچا. اسکریپت، فریم و درخواست تأیید هر سه از این دامنه‌اند. */
const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Content-Security-Policy.
 *
 * ⚠️ یک انتخاب آگاهانه اینجا هست که باید بدانید: `script-src` شامل
 * `'unsafe-inline'` است.
 *
 * جایگزینِ امن‌ترش nonce است — یک رشتهٔ تصادفی به ازای هر درخواست که در
 * proxy.ts ساخته می‌شود. مستندات خودِ Next آن را توصیه می‌کند، ولی یک شرط
 * دارد که در مستندات هم پررنگ نوشته شده: **با nonce، همهٔ صفحه‌ها اجباراً
 * dynamic می‌شوند.** یعنی تولید ایستا، ISR و کشِ CDN از کار می‌افتند و هر بار
 * که کسی صفحهٔ اصلی یا /doroos را باز می‌کند، سرور باید از نو رندرش کند.
 *
 * برای این پروژه آن معامله نمی‌ارزد:
 *
 *   • صفحه‌های ایستا (صفحهٔ اصلی، /about، /guide، /aruz، و /doroos که
 *     generateStaticParams دارد) بخش بزرگی از ترافیک‌اند و روی یک سرور
 *     معمولی، dynamic کردنشان کاملاً محسوس است.
 *
 *   • سودِ واقعیِ nonce، گرفتنِ اسکریپتِ inline تزریق‌شده است — و این پروژه
 *     هیچ نقطه‌ای برای چنین تزریقی ندارد: کل خروجی از React می‌گذرد که
 *     خودش escape می‌کند، و تنها dangerouslySetInnerHTML موجود
 *     (app/layout.tsx) یک شیء ثابتِ JSON-LD است، نه دادهٔ کاربر.
 *
 * پس این CSP جلوی این‌ها را می‌گیرد: بارگذاری اسکریپت از دامنهٔ بیگانه،
 * قرار گرفتن سایت در iframe (clickjacking)، دزدیدن فرم با form-action،
 * تزریق <base>، و افزونه‌های object/embed. جلوی اسکریپتِ inline را نمی‌گیرد.
 *
 * اگر روزی جایی HTML خامِ کاربر رندر شد، این تصمیم باید دوباره بررسی شود.
 */
const csp = [
  `default-src 'self'`,
  // 'unsafe-eval' فقط در dev: React برای بازسازی stack trace سمت سرور در
  // مرورگر از eval استفاده می‌کند. در production هیچ‌کدام از Next و React
  // eval نمی‌زنند.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
  // Tailwind v4 و خودِ Next استایل inline تزریق می‌کنند؛ بدون این، صفحه بدون
  // هیچ استایلی بالا می‌آید.
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${IMAGE_HOSTS}`,
  // فایل‌های صوتیِ اوزان (public/audio) و آپلودی‌ها (/uploads) هر دو هم‌مبدأاند.
  `media-src 'self'`,
  // next/font فونت‌ها را خودش میزبانی می‌کند، پس دامنهٔ بیرونی لازم نیست.
  `font-src 'self' data:`,
  // در dev، وب‌سوکتِ HMR لازم است وگرنه رفرش خودکار کار نمی‌کند.
  `connect-src 'self' ${TURNSTILE}${isDev ? " ws: wss:" : ""}`,
  // three.js و wavesurfer برای کارِ سنگین، worker از blob می‌سازند.
  `worker-src 'self' blob:`,
  `frame-src ${TURNSTILE}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // معادلِ مدرنِ X-Frame-Options: DENY (و برخلاف آن، به زیرمسیرها هم می‌رسد).
  `frame-ancestors 'none'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // مرورگرهای قدیمی frame-ancestors را نمی‌فهمند؛ این برایشان است.
  { key: "X-Frame-Options", value: "DENY" },
  // بدون این، مرورگر می‌تواند یک فایل را برخلاف Content-Type اش «حدس» بزند و
  // مثلاً چیزی را که ما متن اعلام کرده‌ایم به‌عنوان اسکریپت اجرا کند.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // آدرس کامل صفحه (که می‌تواند شناسه یا توکن داشته باشد) به سایت مقصد
  // فرستاده نمی‌شود — فقط دامنه، و آن هم فقط وقتی مقصد https باشد.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // این سایت به هیچ‌کدام نیاز ندارد؛ بستنشان یعنی یک اسکریپت تزریق‌شده هم
  // نمی‌تواند درخواست دسترسی بدهد.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // منابع این سایت نباید از سایت دیگری قابل جاسازی باشند.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // پنجره‌ای که سایت را باز می‌کند نباید بتواند به آن دست بزند.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // X-XSS-Protection عمداً نیست: در مرورگرهای امروزی حذف شده و در نسخه‌های
  // قدیمی خودش یک بردار حمله بود.
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // خروجیِ خودبسنده برای داکر: به‌جای کلِ node_modules، فقط فایل‌هایی که
  // ردیابیِ import واقعاً به آن‌ها رسیده کپی می‌شوند. تفاوتش صدها مگابایت است.
  output: "standalone",

  // sharp با import معمولی وارد می‌شود (lib/vocab-watermark.ts) ولی باینریِ
  // نیتیوش را ردیاب نمی‌بیند — چیزی که می‌بیند یک require از روی رشته است.
  // بدون این خط، /api/vocab-image در کانتینر با «Could not load the sharp
  // module» می‌افتد، در حالی که لوکال بی‌عیب کار می‌کند.
  outputFileTracingIncludes: {
    "/api/vocab-image": ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
  },

  /**
   * هدرهای امنیتی روی همهٔ مسیرها.
   *
   * اینجا و نه در Caddyfile، به دو دلیل: در `npm run dev` هم اعمال می‌شوند
   * (Caddy آنجا اصلاً در مدار نیست، پس یک مشکل CSP تازه در production کشف
   * نمی‌شود)، و چون بخشی از کد است، با همان بازبینی‌ای می‌آید که بقیهٔ تغییرها.
   *
   * تنها استثنا Strict-Transport-Security است که در Caddyfile نشسته — چون
   * فقط باید روی اتصال TLS فرستاده شود و اینجا راهی برای فهمیدن پروتکل نیست.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
