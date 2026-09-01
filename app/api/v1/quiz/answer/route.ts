import { z } from "zod";
import { queryOne, execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";

const schema = z.object({
  questionId: z.uuid("شناسهٔ سؤال معتبر نیست"),
  selectedOptionId: z.uuid("شناسهٔ گزینه معتبر نیست"),
});

/**
 * POST /api/v1/quiz/answer — ثبت پاسخ یک سؤال عروض سماعی.
 *
 * 🔒 مهم‌ترین تغییر امنیتیِ این فاز:
 *
 * نسخهٔ قبلی، `is_correct` را **از مرورگر** می‌گرفت و همان را در دیتابیس
 * می‌نوشت (components/UI/Quiz.tsx). یعنی هرکسی با کنسول مرورگر می‌توانست
 * برای هر سؤالی «درست» ثبت کند و کارنامه‌اش پر از نمرهٔ کامل شود.
 *
 * حالا سرور خودش از روی question_options.is_correct حساب می‌کند و مقدارِ
 * ارسالیِ کلاینت اصلاً خوانده نمی‌شود.
 */
export const POST = withRoute("/api/v1/quiz/answer", async (request: Request) => {
  try {
    const user = await requireUser();

    // سقفِ نوشتن. هر یک از این ردیف‌ها دائمی است، پس بدون سقف یک اسکریپت
    // می‌تواند جدول را — و با آن دیسک سرور را — پر کند. عدد سخاوتمندانه
    // است: هر سؤال یک درخواست است و پاسخِ دوباره فقط ردیف قبلی را بازنویسی می‌کند.
    const limit = rateLimit(`quiz-answer:${user.id}`, 300, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const { questionId, selectedOptionId } = body.data;

    // گزینه باید واقعاً مالِ همین سؤال باشد، وگرنه می‌شد گزینهٔ درستِ سؤال
    // دیگری را فرستاد و امتیاز گرفت.
    const option = await queryOne<{ is_correct: boolean }>(
      `select is_correct from question_options where id = $1 and question_id = $2`,
      [selectedOptionId, questionId],
    );

    if (!option) return fail("گزینهٔ انتخابی برای این سؤال معتبر نیست.", 400);

    const isCorrect = option.is_correct;

    // پاسخ دوباره به یک سؤال، بازنویسی است نه ردیف تازه — که دقیقاً همان
    // چیزی است که ایندکس یکتای (user_id, question_id) تضمین می‌کند. نسخهٔ
    // قبلی این را با «اول select بعد update یا insert» شبیه‌سازی می‌کرد و
    // دو کلیک سریع می‌توانست به خطای کلید تکراری بخورد.
    await execute(
      `insert into user_answers (user_id, question_id, selected_option_id, is_correct, answered_at)
       values ($1, $2, $3, $4, now())
       on conflict (user_id, question_id) do update
         set selected_option_id = excluded.selected_option_id,
             is_correct         = excluded.is_correct,
             answered_at        = excluded.answered_at`,
      [user.id, questionId, selectedOptionId, isCorrect],
    );

    return ok({ isCorrect });
  } catch (err) {
    return handleError(err);
  }
});
