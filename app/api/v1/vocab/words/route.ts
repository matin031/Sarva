import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api/http";

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
