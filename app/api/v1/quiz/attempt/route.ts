import { z } from "zod";
import { transaction } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";

const schema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        /** null یعنی این سؤال بی‌پاسخ ماند */
        selectedOptionId: z.uuid().nullable(),
      }),
    )
    .min(1, "حداقل یک پاسخ لازم است")
    .max(200, "تعداد پاسخ‌ها بیش از حد است")
    // ⚠️ یک دور بازی یعنی هر سؤال حداکثر یک بار.
    //
    //    بدون این شرط، فرستادن *یک* سؤالِ درست به‌صورت ۲۰۰ ردیفِ تکراری یک
    //    دورِ «۲۰۰ از ۲۰۰» می‌ساخت — آزموده شد و دقیقاً همین را برمی‌گرداند.
    //    آمار پنل از همین ردیف‌ها ساخته می‌شود، پس تکرار یعنی کارنامهٔ باد‌شده.
    //
    //    رد کردن، و نه حذفِ بی‌صدای تکراری‌ها: کلاینتِ سالم هرگز سؤال تکراری
    //    نمی‌فرستد، پس تکرار یعنی یا باگ است یا دستکاری — و هر دو باید دیده
    //    شوند نه اینکه بی‌صدا اصلاح شوند.
    .superRefine((answers, ctx) => {
      const seen = new Set<string>();
      for (const a of answers) {
        if (seen.has(a.questionId)) {
          ctx.addIssue({ code: "custom", message: "هر سؤال فقط یک بار می‌تواند در یک دور بیاید." });
          return;
        }
        seen.add(a.questionId);
      }
    }),
});

/**
 * POST /api/v1/quiz/attempt — ثبت یک دور کاملِ بازی.
 *
 * مثل endpoint پاسخ تکی، درستی هر پاسخ و در نتیجه تعداد پاسخ‌های درست، همه
 * سمت سرور حساب می‌شوند. نسخهٔ قبلی هم `correct` و هم `is_correct` هر ردیف را
 * از مرورگر می‌گرفت.
 *
 * کل کار در یک تراکنش است: قبلاً اول quiz_attempts درج می‌شد و بعد
 * quiz_attempt_answers در درخواستی جدا — اگر دومی شکست می‌خورد، یک دورِ بدون
 * هیچ پاسخی در کارنامه می‌ماند.
 */
export const POST = withRoute("/api/v1/quiz/attempt", async (request: Request) => {
  try {
    const user = await requireUser();

    // سقفِ نوشتن. هر یک از این ردیف‌ها دائمی است، پس بدون سقف یک اسکریپت
    // می‌تواند جدول را — و با آن دیسک سرور را — پر کند. عدد سخاوتمندانه
    // است: هر «دور کامل» یک درخواست است؛ ۳۰ دور در ده دقیقه از توان انسان بیرون است.
    const limit = rateLimit(`quiz-attempt:${user.id}`, 30, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const { answers } = body.data;

    const result = await transaction(async (tx) => {
      // درستیِ همهٔ گزینه‌های انتخاب‌شده، در یک کوئری. شرط question_id هم چک
      // می‌شود تا گزینهٔ سؤال دیگری قابل ارسال نباشد.
      const selectedIds = answers
        .map((a) => a.selectedOptionId)
        .filter((id): id is string => id !== null);

      const rows = selectedIds.length
        ? await tx.query<{ id: string; question_id: string; is_correct: boolean }>(
            `select id, question_id, is_correct from question_options where id = any($1::uuid[])`,
            [selectedIds],
          )
        : [];

      const optionById = new Map(rows.map((r) => [r.id, r]));

      // سؤال‌ها باید واقعاً وجود داشته باشند. بدون این چک، شناسهٔ ساختگی به
      // کلید خارجیِ quiz_attempt_answers می‌خورد و کلِ تراکنش با یک ۵۰۰ برمی‌گشت
      // — خطای درست، ولی از جنسِ «سرور خراب شد» به‌جای «ورودی‌ات غلط بود».
      const known = new Set(
        (
          await tx.query<{ id: string }>(
            `select id from questions where id = any($1::uuid[])`,
            [answers.map((a) => a.questionId)],
          )
        ).map((r) => r.id),
      );
      const unknown = answers.filter((a) => !known.has(a.questionId));
      if (unknown.length) return { badRequest: true as const };

      const graded = answers.map((a) => {
        const option = a.selectedOptionId ? optionById.get(a.selectedOptionId) : undefined;
        // گزینه‌ای که به این سؤال تعلق ندارد، مثل بی‌پاسخ حساب می‌شود
        const valid = option && option.question_id === a.questionId;
        return {
          questionId: a.questionId,
          selectedOptionId: valid ? a.selectedOptionId : null,
          isCorrect: valid ? option.is_correct : false,
        };
      });

      const correct = graded.filter((g) => g.isCorrect).length;

      const attempt = await tx.queryOne<{ id: string }>(
        `insert into quiz_attempts (user_id, total, correct) values ($1, $2, $3) returning id`,
        [user.id, graded.length, correct],
      );

      // یک درجِ دسته‌ای به‌جای N رفت‌وبرگشت. با ۲۰۰ پاسخ، این ۲۰۰ کوئری بود.
      await tx.execute(
        `insert into quiz_attempt_answers (attempt_id, question_id, selected_option_id, is_correct)
         select $1, qid, oid, flag
           from unnest($2::uuid[], $3::uuid[], $4::boolean[]) as t(qid, oid, flag)`,
        [
          attempt!.id,
          graded.map((g) => g.questionId),
          graded.map((g) => g.selectedOptionId),
          graded.map((g) => g.isCorrect),
        ],
      );

      return { attemptId: attempt!.id, total: graded.length, correct };
    });

    if ("badRequest" in result) return fail("یکی از سؤال‌ها وجود ندارد.", 400);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
});
