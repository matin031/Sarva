import { buildLlmsTxt } from "@/lib/seo/llms";
import { readBrandProfile } from "@/lib/seo/settings";
import { isNoindexEnvironment } from "@/lib/seo/site";

/**
 * `/llms.txt` — نقشهٔ سروا برای مدل‌های زبانی. توضیحِ کامل در lib/seo/llms.ts.
 *
 * ساعتی یک بار از نو ساخته می‌شود (معرفیِ برند و صفحه‌های اجتماعی از پنلِ
 * مدیریت می‌آیند) و ذخیرهٔ تنظیماتِ سئو هم فوراً تازه‌اش می‌کند.
 */
export const revalidate = 3600;

export async function GET() {
  // پیش‌نمایش و staging چیزی به مدل‌ها معرفی نمی‌کنند.
  if (isNoindexEnvironment()) return new Response("Not found", { status: 404 });

  const body = buildLlmsTxt(await readBrandProfile());
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // برای مدل‌هاست، نه برای نتیجهٔ جست‌وجوی گوگل.
      "X-Robots-Tag": "noindex",
    },
  });
}
