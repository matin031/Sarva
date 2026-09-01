import { z } from "zod";
import { execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";

const schema = z.object({
  levelId: z.number().int().min(0),
  category: z.string().trim().min(1).max(80),
  verseLine1: z.string().trim().min(1).max(300),
  verseLine2: z.string().trim().min(1).max(300),
  chosenRole: z.string().trim().min(1).max(80),
  correctRole: z.string().trim().min(1).max(80),
});

/**
 * POST /api/v1/jasoos/answer — ثبت یک پاسخ در بازی جاسوسِ نقش‌ها.
 *
 * `isCorrect` از ورودی گرفته نمی‌شود؛ سرور از مقایسهٔ chosenRole و correctRole
 * حسابش می‌کند. برخلاف کوییز، خودِ پاسخ درست اینجا در دیتابیس نیست (سطح‌ها در
 * lib/jasoos-data.ts هستند و کلاینت آن‌ها را می‌بیند)، پس این چک ارزش امنیتی
 * چندانی ندارد — ولی دست‌کم ردیفی که با خودش ناسازگار باشد ثبت نمی‌شود.
 */
export const POST = withRoute("/api/v1/jasoos/answer", async (request: Request) => {
  try {
    const user = await requireUser();

    // سقفِ نوشتن. هر یک از این ردیف‌ها دائمی است، پس بدون سقف یک اسکریپت
    // می‌تواند جدول را — و با آن دیسک سرور را — پر کند. عدد سخاوتمندانه
    // است: بازی جاسوس سطح‌محور است و در ده دقیقه به این عدد نمی‌رسد.
    const limit = rateLimit(`jasoos-answer:${user.id}`, 300, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const b = body.data;

    await execute(
      `insert into jasoos_answers
         (user_id, level_id, category, verse_line_1, verse_line_2,
          chosen_role, correct_role, is_correct)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        b.levelId,
        b.category,
        b.verseLine1,
        b.verseLine2,
        b.chosenRole,
        b.correctRole,
        b.chosenRole === b.correctRole,
      ],
    );

    return ok({ saved: true }, 201);
  } catch (err) {
    return handleError(err);
  }
});
