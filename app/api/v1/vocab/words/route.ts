import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handleError, ok, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";

const GRADES = new Set(["dahom", "yazdahom", "davazdahom"]);

/**
 * GET /api/v1/vocab/words?grade=dahom[&lesson=2]
 *
 * واژه‌ها محتوای عمومی‌اند — هرکسی، واردشده یا نه، می‌تواند بخواندشان و بازی
 * کند. این تنها endpoint این فاز است که احراز هویت نمی‌خواهد، دقیقاً مثل
 * سیاست «Anyone can read vocab words» که قبلاً در RLS بود.
 *
 * بدون lesson، همهٔ واژه‌های آن پایه برمی‌گردند (بازی برای شمارش درس‌ها و
 * ساختن مخزن مشترکِ گزینه‌های نادرست به آن نیاز دارد).
 */
export async function GET(request: NextRequest) {
  try {
    // تنها endpoint این فاز که احراز هویت نمی‌خواهد — و بدون lesson، کلِ
    // واژه‌های یک پایه را برمی‌گرداند. یعنی گران‌ترین کوئریِ عمومیِ سایت است و
    // هرکسی می‌تواند در حلقه صدایش بزند. سقف طوری انتخاب شده که یک دور بازی
    // (که چند بار این را می‌خواند) هرگز به آن نخورد.
    const { ip } = requestMeta(request);
    const limit = rateLimit(`vocab-words:${ip ?? "unknown"}`, 60, 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const grade = request.nextUrl.searchParams.get("grade") ?? "";
    const lessonRaw = request.nextUrl.searchParams.get("lesson");

    if (!GRADES.has(grade)) return fail("پایهٔ نامعتبر است.", 400);

    let lesson: number | null = null;
    if (lessonRaw !== null) {
      lesson = Number(lessonRaw);
      if (!Number.isInteger(lesson) || lesson < 1 || lesson > 18) {
        return fail("شمارهٔ درس باید بین ۱ تا ۱۸ باشد.", 400);
      }
    }

    const rows = await query<{
      id: string;
      word: string;
      meaning: string;
      image: string | null;
      lesson: number;
    }>(
      `select id, word, meaning, image, lesson
         from vocab_words
        where grade = $1
          and ($2::int is null or lesson = $2)
        order by lesson, sort_index`,
      [grade, lesson],
    );

    return ok({
      words: rows.map((r) => ({
        id: r.id,
        word: r.word,
        meaning: r.meaning,
        image: r.image ?? "",
        lesson: r.lesson,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
