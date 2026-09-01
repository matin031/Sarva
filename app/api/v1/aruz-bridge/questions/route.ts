import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handleError, ok, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";

/**
 * GET /api/v1/aruz-bridge/questions[?difficulty=1|2|3][&limit=n]
 *
 * پرسش‌های بازیِ «پلِ وزن». محتوای عمومی است — مثلِ واژه‌های واژه‌یاب، هرکسی
 * واردشده یا نه می‌تواند بخواندشان و بازی کند، پس احراز هویت نمی‌خواهد.
 *
 * ⚠️ در این پروژه RLS وجود ندارد و هر قاعدهٔ دسترسی در کدِ برنامه است. برای
 * همین شرطِ `is_published` مستقیم در کوئری نوشته شده و نه در لایه‌ای بالاتر:
 * اگر یک روز فراموش شود، دیتابیس جلویش را نمی‌گیرد و محتوای منتشرنشده بیرون
 * می‌رود.
 *
 * بازی کلِ مخزن را یک بار می‌گیرد و خودش نمونه‌گیری می‌کند (تا بتواند پیش از
 * شروع بگوید چند پرسشِ یکتا موجود است). پس این endpoint معمولاً بدونِ صافی
 * صدا زده می‌شود و پاسخش حدودِ ۱۰۰ کیلوبایت است.
 */

/** سقفِ سختِ تعداد. بدونِ آن، `?limit=999999999` یک کوئریِ گران و رایگان است. */
const MAX_LIMIT = 1000;

interface Row {
  id: string;
  phrase: string;
  correct_pattern: string;
  wrong_pattern: string;
  difficulty: number;
  explanation: string | null;
  audio_url: string | null;
}

export const GET = withRoute("/api/v1/aruz-bridge/questions", async (request: NextRequest) => {
  try {
    /* همان سیاستِ واژه‌یاب: این هم یک endpointِ عمومی و نسبتاً گران است، پس
       سقفی می‌خواهد که یک دورِ عادیِ بازی هرگز به آن نخورد. */
    const { ip } = requestMeta(request);
    const limit = rateLimit(`aruz-bridge-questions:${ip ?? "unknown"}`, 60, 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const params = request.nextUrl.searchParams;

    const difficultyRaw = params.get("difficulty");
    let difficulty: number | null = null;
    if (difficultyRaw !== null) {
      difficulty = Number(difficultyRaw);
      if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) {
        return fail("سطحِ سختی باید ۱، ۲ یا ۳ باشد.", 400);
      }
    }

    const limitRaw = params.get("limit");
    let take = MAX_LIMIT;
    if (limitRaw !== null) {
      const parsed = Number(limitRaw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return fail("تعدادِ درخواستی نامعتبر است.", 400);
      }
      take = Math.min(parsed, MAX_LIMIT);
    }

    const rows = await query<Row>(
      `select id, phrase, correct_pattern, wrong_pattern, difficulty, explanation, audio_url
         from aruz_bridge_questions
        where is_published
          and ($1::smallint is null or difficulty = $1)
        order by sort_index, source_id
        limit $2`,
      [difficulty, take],
    );

    return ok({
      questions: rows.map((r) => ({
        id: r.id,
        promptText: r.phrase,
        correctPattern: r.correct_pattern,
        wrongPattern: r.wrong_pattern,
        difficulty: r.difficulty,
        ...(r.explanation ? { explanation: r.explanation } : {}),
        ...(r.audio_url ? { audioUrl: r.audio_url } : {}),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
});
