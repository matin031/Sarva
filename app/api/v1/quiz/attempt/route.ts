import { z } from "zod";
import { transaction } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { handleError, ok, readJson } from "@/lib/api/http";

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
    .max(200, "تعداد پاسخ‌ها بیش از حد است"),
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
export async function POST(request: Request) {
  try {
    const user = await requireUser();

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

      for (const g of graded) {
        await tx.execute(
          `insert into quiz_attempt_answers (attempt_id, question_id, selected_option_id, is_correct)
           values ($1, $2, $3, $4)`,
          [attempt!.id, g.questionId, g.selectedOptionId, g.isCorrect],
        );
      }

      return { attemptId: attempt!.id, total: graded.length, correct };
    });

    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
