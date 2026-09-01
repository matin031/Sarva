import type { Instrumentation } from "next";

/**
 * instrumentation.ts — تنها قلابِ رسمیِ Next برای «کدی که یک بار در شروع سرور
 * اجرا شود» و «خطاهایی که هیچ‌کس نگرفته».
 *
 * چرا لازم است، وقتی handleError از قبل بود: handleError فقط خطاهای داخلِ
 * try/catch خودِ route ها را می‌گیرد. اما یک خطا در رندرِ Server Component،
 * در یک Server Action، در layout، یا در generateMetadata از هیچ try/catch ای
 * رد نمی‌شود — و تا امروز فقط یک صفحهٔ خطای خام به کاربر می‌داد و در
 * /admin/activity هیچ ردی نداشت.
 *
 * ⚠️ import ها همه پویا و مشروط‌اند.
 *
 * Next این فایل را در *هر* runtime بار می‌کند (nodejs و edge). کدِ ما به
 * `pg` و `node:async_hooks` وابسته است که در Edge وجود ندارند؛ اگر بالای فایل
 * import می‌شدند، خودِ build می‌شکست. مستندات همین نسخه هم دقیقاً همین را
 * می‌گوید: با `process.env.NEXT_RUNTIME` شرطی import کنید.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}

/**
 * هر خطای سمت سرور که Next خودش گرفته باشد.
 *
 * `await` کردن عمدی است و قرارداد خودِ Next: «اگر کارِ ناهمگام می‌کنید، حتماً
 * await کنید». بدون آن، پروسه می‌تواند قبل از نوشتنِ ردیف، پاسخ را ببندد.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { reportRequestError } = await import("./instrumentation.node");
    await reportRequestError(err, request, context);
  } catch {
    // اگر خودِ ماژول گزارش بار نشد، این تابع نباید خطا بدهد: خطای داخلِ
    // onRequestError در Next به یک خطای ثانویه تبدیل می‌شود و اصلِ ماجرا را
    // پنهان می‌کند.
  }
};
