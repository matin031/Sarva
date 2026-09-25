import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { pickCandidates } from "@/lib/kimia/server/source";
import { createRound } from "@/lib/kimia/server/rounds";
import type { KimiaRound } from "@/lib/kimia/types";

/**
 * POST /api/v1/kimia/rounds — شروعِ یک دورِ «کیمیای وزن».
 *
 * ── چرا POST و نه GET ──────────────────────────────────────────────────────
 * برای کاربرِ واردشده این درخواست *حالت می‌سازد*: یک ردیفِ `kimia_rounds` با
 * شناسه‌ای که سرور تولید می‌کند و چرخهٔ عمرِ ثبت به آن گره می‌خورد. GET ای
 * که ردیف بسازد، هم قرارداد را می‌شکند و هم با prefetchِ مرورگر دورهای
 * خیالی می‌سازد.
 *
 * ── آنچه برمی‌گردد و آنچه برنمی‌گردد ───────────────────────────────────────
 * ⚠️ این مهم‌ترین بندِ کلِ feature است.
 *
 * برمی‌گردد: شناسهٔ دور، شناسهٔ پرسش، بیت، تعدادِ جایگاه، و آدرسِ ریتم.
 *
 * برنمی‌گردد — نه صریح، نه در قالبی که بشود از آن بازسازی کرد:
 *   • ارکانِ درست
 *   • پاسخ‌های بدیل
 *   • نامِ وزن
 *   • هر چیزی که ترتیبِ جایگاه‌ها را بگوید
 *
 * ⚠️ و `rhythmUrl` هم عمداً `/api/v1/kimia/rhythm/<questionId>` است و نه
 * مسیرِ واقعیِ فایل. فایلِ روی دیسک `‎/audio/مفاعیلن-مفاعیلن-فعولن.mp3`
 * نام دارد — یعنی **نامِ فایل خودش پاسخ است**. اگر آن آدرس مستقیم سرو
 * می‌شد، پاسخ در تبِ Network، در DOM و در `src`ِ پخش‌کننده نوشته شده بود و
 * هر بازدیدکننده‌ای با یک F12 می‌توانست ببیندش.
 *
 * شناسهٔ پرسش را کلاینت از قبل دارد (برای «گزارشِ اشکال») و از آن هیچ وزنی
 * قابلِ استنتاج نیست، پس استفاده از آن در آدرسِ صدا چیزِ تازه‌ای لو
 * نمی‌دهد.
 *
 * ⚠️ `segmentCount` عمداً *هست*. «این وزن چهار رکن دارد» صورتِ مسئله است و
 * نه پاسخ؛ بدونش مخزن اصلاً قابلِ رسم نیست.
 *
 * ── مهمان ──────────────────────────────────────────────────────────────────
 * مهمان بازی می‌کند و چیزی ثبت نمی‌شود — همان سیاستِ «شکار نقش‌ها». شناسهٔ
 * دور برایش هم ساخته می‌شود (کلاینت به آن نیاز دارد) ولی هیچ ردیفی پشتش
 * نیست، و مسیرِ ثبت هم همین را می‌گوید.
 */

const schema = z
  .object({
    /** پرسش‌هایی که همین نشست دیده — برای تکراری نشدن. */
    exclude: z.array(z.uuid()).max(32).optional(),
  })
  .strict();

export const POST = withRoute("/api/v1/kimia/rounds", async (request: NextRequest) => {
  try {
    const { ip } = requestMeta(request);
    const user = await getCurrentUser();

    /* ⚠️ کلید بر اساس کاربر وقتی هست، وگرنه IP. بدونِ شاخهٔ IP، یک اسکریپتِ
       بدونِ حساب می‌توانست بی‌نهایت دور بسازد؛ و بدونِ شاخهٔ کاربر، یک
       کلاسِ درس پشتِ یک NAT همدیگر را محدود می‌کرد. */
    const bucket = user ? `u:${user.id}` : `ip:${ip ?? "unknown"}`;
    const limit = rateLimit(`kimia-rounds:${bucket}`, 90, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const [candidate] = await pickCandidates(1, body.data.exclude ?? []);
    if (!candidate) return fail("هنوز بیتی برای این بازی آماده نیست.", 404);

    /* ⚠️ برای مهمان هیچ ردیفی ساخته نمی‌شود و شناسه فقط یک کلیدِ محلی است.
       این تنها جایی است که شناسهٔ دور از سرور می‌آید ولی پشتش حالتی نیست —
       و مسیرِ ثبت هم دقیقاً همین را فرض می‌کند. */
    const roundId = user ? await createRound(user.id, candidate) : randomUUID();

    const round: KimiaRound = {
      roundId,
      questionId: candidate.questionId,
      source: candidate.source,
      verse: candidate.verse,
      slotCount: candidate.slotCount,
      rhythmUrl: `/api/v1/kimia/rhythm/${candidate.questionId}`,
    };

    return ok({ round, persisted: Boolean(user) }, 201);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
