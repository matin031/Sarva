import { readIndexNowKey } from "@/lib/seo/settings";

/**
 * کلیدِ IndexNow — اثباتِ اینکه فهرستی که پنلِ مدیریت برای Bing و Yandex
 * می‌فرستد واقعاً از صاحبِ همین دامنه است.
 *
 * ⚠️ کلید راز نیست؛ پروتکل همین را می‌خواهد که عمومی باشد. تا وقتی مدیر از
 * صفحهٔ «سئو» اولین بار «خبر بده» را نزده، کلیدی ساخته نشده و این نشانی ۴۰۴
 * است. نشانی با `keyLocation` در هر ارسال اعلام می‌شود (lib/seo/indexnow.ts).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const key = await readIndexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "no-store",
    },
  });
}
