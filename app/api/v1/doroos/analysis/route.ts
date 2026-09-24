import type { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { requirePlus } from "@/lib/plus/entitlement";
import { getLesson, parseLessonNumber } from "@/lib/doroos";
import { loadAiLesson } from "@/lib/doroos/ai";
import { extractAnalysis } from "@/lib/doroos/public";

/**
 * GET /api/v1/doroos/analysis?grade=dahom&lesson=5              — نقش‌ها و آرایه‌ها
 * GET /api/v1/doroos/analysis?grade=dahom&lesson=5&source=ai    — نقش‌های هوشواره
 *
 * بخشِ پولیِ درسنامه. صفحهٔ درس این‌ها را دیگر در HTML نمی‌فرستد
 * (`toPublicLesson`) و تنها راهِ رسیدن به آن‌ها همین مسیر است.
 *
 * ⚠️ `requirePlus()` پیش از *هر* کاری — حتی پیش از اینکه بدانیم درس وجود
 * دارد یا نه. وگرنه پاسخِ ۴۰۴ در برابرِ ۴۰۳ به مهمان می‌گفت کدام درس
 * تحلیلِ پولی دارد. سه خروجیِ ممکنِ آن:
 *   • برمی‌گردد   → مشترک است، یا کلِ پلاس خاموش است و همه‌چیز باز.
 *   • ۴۰۳        → «این بخش با سروا پلاس در دسترس است.»
 *   • ۵۰۳        → «نتوانستیم بررسی کنیم» — نه «بخر».
 *
 * ⚠️ یک درخواست برای کلِ درس و نه یکی برای هر بیت: کلاینت آن را برای همهٔ
 * کارت‌های صفحه نگه می‌دارد، پس ده بیت یعنی یک درخواست.
 */
export const GET = withRoute("/api/v1/doroos/analysis", async (request: NextRequest) => {
  try {
    await requirePlus();

    const params = request.nextUrl.searchParams;
    const grade = params.get("grade") ?? "";
    const number = parseLessonNumber(params.get("lesson") ?? "");
    const source = params.get("source") === "ai" ? "ai" : "base";

    if (number === null) return fail("شمارهٔ درس نامعتبر است.", 400);

    const lesson =
      source === "ai" ? await loadAiLesson(grade, number) : await getLesson(grade, number);
    if (!lesson) return fail("این درس پیدا نشد.", 404);

    // هوشواره فقط نقشِ دستوری است؛ آرایه‌های نسخهٔ AI فرستاده نمی‌شوند.
    return ok({ units: extractAnalysis(lesson, { devices: source === "base" }) });
  } catch (error) {
    return handleError(error, "doroos.analysis");
  }
});
