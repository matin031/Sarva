import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handleError, ok, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { GRAMMAR_CIRCUIT_CONFIG } from "@/lib/grammar-circuit/config";
import {
  isSelectableLesson,
  isValidGradeKey,
  LESSONS_PER_GRADE,
} from "@/lib/grammar-circuit/curriculum";
import {
  logRejected,
  rowsToQuestions,
  type GrammarCircuitRow,
} from "@/lib/grammar-circuit/server/rows";
import { withRoute } from "@/lib/api/route";

/**
 * GET /api/v1/grammar-circuit/questions?grade=yazdahom&lessons=1,2,6
 *
 * پرسش‌های «مدار دستور» برای یک پایه و یک یا چند درس. محتوای عمومی است، پس
 * احراز هویت نمی‌خواهد.
 *
 * ⚠️ RLS وجود ندارد: `is_published` مستقیم در همین کوئری است. اگر یک روز از
 * اینجا حذف شود، هیچ لایهٔ دیگری جلوی نشتِ محتوای منتشرنشده را نمی‌گیرد.
 *
 * درس‌های آزاد (۴/۱۵، ۴/۱۳، ۴/۱۵) برای بازیِ عادی رد می‌شوند — نه چون
 * دیتابیس نمی‌تواند نگهشان دارد، بلکه چون بخشی از انتخابِ این بازی نیستند.
 */

/** سقفِ سختِ تعداد. بدونِ آن `?limit=999999` یک کوئریِ گرانِ رایگان است. */
const MAX_LIMIT = 200;

export const GET = withRoute("/api/v1/grammar-circuit/questions", async (request: NextRequest) => {
  try {
    const { ip } = requestMeta(request);
    const limit = rateLimit(`gc-questions:${ip ?? "unknown"}`, 60, 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const params = request.nextUrl.searchParams;

    const grade = params.get("grade");
    if (!isValidGradeKey(grade)) {
      return fail("پایهٔ درخواستی نامعتبر است.", 400);
    }

    const lessonsRaw = params.get("lessons");
    if (!lessonsRaw || lessonsRaw.trim() === "") {
      return fail("دستِ‌کم یک درس باید انتخاب شود.", 400);
    }

    const parts = lessonsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > GRAMMAR_CIRCUIT_CONFIG.maxLessonsPerSession) {
      return fail(
        `حداکثر ${GRAMMAR_CIRCUIT_CONFIG.maxLessonsPerSession} درس در یک تمرین.`,
        400,
      );
    }

    const lessons: number[] = [];
    for (const part of parts) {
      // `Number("1abc")` NaN می‌دهد ولی `Number(" 1 ")` یک است؛ پس الگو را هم
      // صریح می‌سنجیم تا "1e1" یا "+1" از قلم نیفتد.
      if (!/^\d+$/.test(part)) return fail("شمارهٔ درس باید عدد باشد.", 400);
      const lesson = Number(part);
      if (!Number.isInteger(lesson) || lesson < 1 || lesson > LESSONS_PER_GRADE) {
        return fail(`شمارهٔ درس باید بین ۱ تا ${LESSONS_PER_GRADE} باشد.`, 400);
      }
      if (!isSelectableLesson(grade, lesson)) {
        return fail(`درس ${lesson} در این پایه برای «مدار دستور» در دسترس نیست.`, 400);
      }
      if (lessons.includes(lesson)) return fail("درسِ تکراری در فهرست.", 400);
      lessons.push(lesson);
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

    const rows = await query<GrammarCircuitRow>(
      `select id, source_id, grade, lesson, question_type, payload,
              difficulty, explanation, attribution
         from grammar_circuit_questions
        where is_published
          and grade = $1
          and lesson = any($2::smallint[])
        order by lesson, sort_index, source_id
        limit $3`,
      [grade, lessons, take],
    );

    const { questions, rejected } = rowsToQuestions(rows);
    logRejected("questions", rejected);

    return ok({ grade, lessons, questions });
  } catch (err) {
    return handleError(err);
  }
});
