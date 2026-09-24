import "server-only";
import { absoluteUrl, siteOrigin } from "./site";

/**
 * IndexNow — «این صفحه‌ها تازه‌اند، بیا ببین».
 *
 * ── چرا ────────────────────────────────────────────────────────────────────
 *
 * Bing، Yandex، Seznam و Naver این پروتکل را می‌فهمند و با یک درخواست، خبرِ
 * تغییر به همه‌شان می‌رسد. برای سروا مهم‌ترینش Bing است: **جست‌وجوی ChatGPT
 * و Copilot بخشِ بزرگی از نتایجشان را از نمایهٔ Bing می‌گیرند**. یعنی درسی که
 * زودتر در Bing ثبت شود، زودتر در پاسخ‌های ChatGPT هم می‌تواند دیده شود.
 *
 * ⚠️ گوگل IndexNow را پشتیبانی نمی‌کند (و «ping»ِ sitemapش را هم در ۲۰۲۳
 * بست). برای گوگل راهش همان Search Console است؛ پنل برای هر نشانی لینکِ
 * مستقیمِ «بررسیِ نشانی» را می‌دهد.
 *
 * ⚠️ این فقط یک *خبر* است، نه دستورِ ایندکس. موتور خودش تصمیم می‌گیرد.
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";
const TIMEOUT_MS = 15_000;

export type IndexNowResult = { ok: boolean; status: number; message: string };

/** معنیِ هر پاسخ، به زبانِ مدیر. */
function explain(status: number): { ok: boolean; message: string } {
  switch (status) {
    case 200:
      return { ok: true, message: "دریافت شد. موتورها در روزهای آینده این صفحه‌ها را می‌بینند." };
    case 202:
      return {
        ok: true,
        message: "پذیرفته شد؛ کلید هنوز در حال تأیید است. چند ساعت بعد دوباره ارسال کنید تا قطعی شود.",
      };
    case 400:
      return { ok: false, message: "قالبِ درخواست پذیرفته نشد (۴۰۰). اگر تکرار شد، به برنامه‌نویس خبر بدهید." };
    case 403:
      return {
        ok: false,
        message:
          "کلید تأیید نشد (۴۰۳): موتور نتوانست /indexnow-key.txt را روی سایت بخواند. مطمئن شوید سایت در حالت بروزرسانی نیست و دوباره امتحان کنید.",
      };
    case 422:
      return {
        ok: false,
        message: "نشانی‌ها با دامنهٔ سایت نمی‌خوانند (۴۲۲). NEXT_PUBLIC_SITE_URL روی سرور را بررسی کنید.",
      };
    case 429:
      return { ok: false, message: "درخواست زیاد بود (۴۲۹). یکی دو ساعت بعد دوباره بفرستید." };
    default:
      return { ok: false, message: `پاسخِ غیرمنتظره: ${status}` };
  }
}

export async function submitIndexNow(urls: string[], key: string): Promise<IndexNowResult> {
  const origin = new URL(siteOrigin());
  // پروتکل تا ۱۰٬۰۰۰ نشانی را در یک درخواست می‌پذیرد؛ سروا زیرِ صد تاست.
  const urlList = urls.filter((u) => {
    try {
      return new URL(u).host === origin.host;
    } catch {
      return false;
    }
  });

  if (!urlList.length) return { ok: false, status: 0, message: "هیچ نشانیِ معتبری برای ارسال نبود." };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: origin.host,
        key,
        keyLocation: absoluteUrl("/indexnow-key.txt"),
        urlList: urlList.slice(0, 10_000),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return { status: res.status, ...explain(res.status) };
  } catch (err) {
    const reason = (err as Error).name === "TimeoutError" ? "پاسخی نیامد (بیش از ۱۵ ثانیه)" : (err as Error).message;
    return {
      ok: false,
      status: 0,
      message: `سرور به api.indexnow.org وصل نشد: ${reason}. شاید هاست ارتباطِ خروجی را بسته باشد.`,
    };
  }
}
