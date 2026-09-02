import { handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { siteContent } from "@/lib/site/content";

/**
 * GET /api/v1/site-content — نوار اعلان و بخش حامیان.
 *
 * تنها endpoint عمومیِ سایت که «محتوای قابل‌ویرایش از پنل» را می‌دهد.
 *
 * ⚠️ چرا اصلاً وجود دارد و چرا این دو با هم: توضیح کامل بالای
 * lib/site/content.ts است. خلاصه‌اش اینکه صفحه‌های سایت باید ایستا بمانند و
 * یک کوئری دیتابیس در layout همه‌شان را dynamic می‌کند.
 *
 * هیچ سشنی لازم ندارد و هیچ دادهٔ خصوصی‌ای برنمی‌گرداند: نامِ حامیان و متن
 * اعلان از ابتدا برای دیده شدن نوشته شده‌اند.
 */
export const GET = withRoute("/api/v1/site-content", async () => {
  try {
    const content = await siteContent();

    const response = ok(content);

    // ⚠️ اینجا هدرِ پیش‌فرضِ no-store عمداً کنار گذاشته می‌شود.
    //
    // آن هدر برای پاسخ‌هایی است که به کوکی سشن وابسته‌اند و کشِ اشتراکی
    // می‌تواند پاسخِ کاربر الف را به کاربر ب بدهد. اینجا هیچ چیزی به کاربر
    // بستگی ندارد — همه یک اعلان و یک فهرست حامی می‌بینند — پس کشِ کوتاه هم
    // بی‌خطر است و هم لازم: بدون آن، هر ناوبری در سایت یک کوئری دیتابیس
    // اضافه می‌شود.
    response.headers.set("cache-control", "public, max-age=30, stale-while-revalidate=300");
    response.headers.delete("pragma");
    return response;
  } catch (err) {
    // اگر دیتابیس در دسترس نباشد، سایت نباید بشکند — فقط نوار اعلان و بخش
    // حامیان دیده نمی‌شوند. کامپوننت‌ها با پاسخِ ناموفق ساکت می‌مانند.
    return handleError(err, "GET /api/v1/site-content");
  }
});

export const dynamic = "force-dynamic";
