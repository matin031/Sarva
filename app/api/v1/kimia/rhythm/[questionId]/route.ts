import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import type { NextRequest } from "next/server";
import { requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { candidateById } from "@/lib/kimia/server/source";

/**
 * GET /api/v1/kimia/rhythm/<questionId> — ریتمِ وزنِ یک بیت، بدونِ لو دادنِ وزن.
 *
 * ── مسئله ──────────────────────────────────────────────────────────────────
 * فایل‌های ریتم در `public/audio/` نشسته‌اند و **نامشان خودِ پاسخ است**:
 *
 *     /audio/مفاعیلن-مفاعیلن-فعولن.mp3
 *
 * شنیدنِ ریتم و ساختنِ ارکان از رویش، کلِ مسئلهٔ آموزشیِ این بازی است. اگر
 * آن آدرس مستقیم به `<audio src>` می‌رفت، پاسخ هم‌زمان در DOM، در تبِ
 * Network و در تاریخچهٔ کشِ مرورگر نوشته می‌شد — یعنی بازی برای هر کسی که
 * F12 بلد است تمام بود، و همان کس دقیقاً کسی است که بیشتر از همه وسوسه
 * می‌شود.
 *
 * ── راه‌حل ─────────────────────────────────────────────────────────────────
 * صدا از پشتِ شناسهٔ پرسش سرو می‌شود. شناسهٔ پرسش یک UUID است، کلاینت از
 * قبل آن را دارد (دکمهٔ «گزارشِ اشکال» به همان نیاز دارد)، و از آن هیچ وزنی
 * قابلِ استنتاج نیست. سرور خودش بیت را می‌خواند، وزنش را درمی‌آورد و
 * بایت‌های همان فایل را می‌دهد — بی‌آنکه اسمی از آن ببرد.
 *
 * ⚠️ هدر `Content-Disposition` عمداً `inline` بدونِ `filename` است: با نام،
 * همان چیزی که از URL برداشتیم دوباره در پاسخ می‌نشست.
 *
 * ⚠️ کشِ خصوصی و نه عمومی: آدرس عمومی است ولی پاسخش نباید در یک CDN یا
 * proxy مشترک بنشیند؛ `private` نگهش می‌دارد جایی که فقط خودِ مرورگر
 * می‌بیند، و `max-age` معقول یعنی «دوباره گوش بده» شبکه نمی‌خواهد.
 *
 * ── چرا خواندن از دیسک و نه ریدایرکت ───────────────────────────────────────
 * یک `302` به آدرسِ واقعی، پاسخ را در همان تبِ Network می‌نوشت که قرار بود
 * پنهان بماند — یعنی دقیقاً هیچ کاری نمی‌کرد. بایت‌ها از همین دیسک خوانده
 * می‌شوند، همان‌طور که `app/api/vocab-image/route.ts` برای دارایی‌های
 * هم‌ریشه می‌کند.
 */

export const runtime = "nodejs";

const AUDIO_ROOT = join(process.cwd(), "public", "audio");

/** نامِ فایلِ ریتمِ یک وزن، طبقِ همان قراردادی که `lib/audioManifest` دارد. */
function audioFileFor(ark: string): string {
  return `${ark.trim().replace(/\s+/g, "-")}.mp3`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ questionId: string }> },
) {
  const { ip } = requestMeta(request);
  /* سخاوتمندانه: یک دور ممکن است پنج‌شش بار پخش شود و نشست شش دور دارد.
     سقف فقط جلوی کشیدنِ کلِ بانکِ صوتی در یک حلقه را می‌گیرد. */
  const limit = rateLimit(`kimia-rhythm:${ip ?? "unknown"}`, 240, 10 * 60);
  if (!limit.allowed) {
    return new Response("too many requests", {
      status: 429,
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  const { questionId } = await context.params;
  if (!/^[0-9a-fA-F-]{36}$/.test(questionId)) {
    return new Response("not found", { status: 404 });
  }

  const candidate = await candidateById(questionId);
  if (!candidate) return new Response("not found", { status: 404 });

  /* ⚠️ `normalize` + بررسیِ ریشه، حتی با اینکه نام از دیتابیس می‌آید و نه
     از URL. پیمایشِ مسیر یک حملهٔ *ورودی* نیست، یک خاصیتِ *کد* است: هر
     مسیری که از یک رشتهٔ متغیر ساخته شود باید ثابت کند داخلِ ریشه مانده،
     وگرنه اولین ردیفِ عجیبِ دیتابیس آن را می‌شکند. */
  const target = normalize(join(AUDIO_ROOT, audioFileFor(candidate.meter.ark)));
  if (target !== AUDIO_ROOT && !target.startsWith(AUDIO_ROOT + sep)) {
    return new Response("not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(target);
  } catch {
    /* وزنی که فایلش نیست نباید اصلاً وارد مخزن شده باشد (`kimiaMeterFor`
       همین را تضمین می‌کند). اگر با این حال اینجا رسیدیم، ۴۰۴ صادقانه‌تر
       از یک بدنهٔ خالیِ ۲۰۰ است — و بازی هم برای همین حالت state دارد. */
    return new Response("not found", { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
