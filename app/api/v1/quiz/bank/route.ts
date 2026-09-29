import type { NextRequest } from "next/server";
import { handleError } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { quizBankPayload } from "@/lib/quiz/bank";

/**
 * بانکِ سؤالِ آزمونِ وزن، برای همه یکسان.
 *
 * ⚠️ پاسخ همان بایت‌هایی است که در کشِ سرور نشسته‌اند؛ هر درخواست فقط آن‌ها را
 * می‌فرستد و نه کوئری می‌زند، نه سریالایز می‌کند، نه فشرده (توضیح در
 * lib/quiz/bank.ts).
 *
 * کشِ مرورگر کوتاه است (یک دقیقه) تا سؤالی که مدیر اصلاح کرده زود برسد، و
 * `stale-while-revalidate` یعنی بازدیدِ بعدی منتظرِ شبکه نمی‌ماند. پس از آن،
 * ETag یعنی اگر بانک عوض نشده باشد فقط یک ۳۰۴ی خالی برمی‌گردد. پاسخ‌ها همچنان
 * روی سرور بررسی می‌شوند (/api/v1/quiz/answer)، پس نسخهٔ کهنه در مرورگر
 * نمی‌تواند نمره‌ای را عوض کند.
 */
export const GET = withRoute("/api/v1/quiz/bank", async (request: NextRequest) => {
  try {
    const bank = await quizBankPayload();
    const headers: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=600",
      etag: bank.etag,
      vary: "Accept-Encoding",
    };

    if (request.headers.get("if-none-match") === bank.etag) {
      return new Response(null, { status: 304, headers });
    }

    const gzip = /\bgzip\b/i.test(request.headers.get("accept-encoding") ?? "");
    const body = gzip ? bank.gzip : bank.json;
    if (gzip) headers["content-encoding"] = "gzip";
    headers["content-length"] = String(body.length);
    return new Response(body, { headers });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
