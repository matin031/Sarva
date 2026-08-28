import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handleError, ok, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { GRADE_KEYS, selectableLessons } from "@/lib/grammar-circuit/curriculum";
import {
  logRejected,
  rowsToQuestions,
  type GrammarCircuitRow,
} from "@/lib/grammar-circuit/server/rows";

/**
 * GET /api/v1/grammar-circuit/availability
 *
 * به صفحهٔ انتخابِ «مدار دستور» می‌گوید کدام درس‌ها واقعاً قابلِ تمرین‌اند.
 *
 * ⚠️ در این پروژه RLS وجود ندارد، پس شرطِ `is_published` مستقیم در کوئری است.
 *
 * نکتهٔ مهم: شمارش با `count(*)` انجام *نمی‌شود*. یک ردیفِ منتشرشده با payloadِ
 * خراب هم در count می‌آید و آن‌وقت درسی «۳ پرسش» نشان می‌دهد که بازی‌اش شروع
 * نمی‌شود — بدترین نوع خطا، چون در صفحهٔ انتخاب سالم به نظر می‌رسد. پس همان
 * اعتبارسنجیِ واقعی اینجا هم اجرا می‌شود و فقط پرسش‌های *سالم* شمرده می‌شوند.
 * برای مخزنی در حدِ چند صد پرسش این هزینه ناچیز است؛ اگر روزی بزرگ شد،
 * راهش memoization است نه شمارشِ خوش‌بینانه.
 *
 * درس‌های آزادِ هر پایه (۴ و ۱۵ / ۴ و ۱۳ / ۴ و ۱۵) اصلاً در پاسخ نمی‌آیند:
 * آن‌ها بخشی از انتخابِ این بازی نیستند.
 */
export async function GET(request: NextRequest) {
  try {
    const { ip } = requestMeta(request);
    const limit = rateLimit(`gc-availability:${ip ?? "unknown"}`, 60, 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const rows = await query<GrammarCircuitRow>(
      `select id, source_id, grade, lesson, question_type, payload,
              difficulty, explanation, attribution
         from grammar_circuit_questions
        where is_published
        order by grade, lesson, sort_index, source_id`,
    );

    const { questions, rejected } = rowsToQuestions(rows);
    logRejected("availability", rejected);

    /* شمارشِ پرسش‌های سالم به تفکیکِ پایه/درس. */
    const counts = new Map<string, number>();
    for (const q of questions) {
      if (!q.grade || q.lesson === undefined) continue;
      const key = `${q.grade}:${q.lesson}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return ok({
      grades: GRADE_KEYS.map((grade) => ({
        grade,
        lessons: selectableLessons(grade).map((lesson) => {
          const questionCount = counts.get(`${grade}:${lesson}`) ?? 0;
          return { lesson, available: questionCount > 0, questionCount };
        }),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
