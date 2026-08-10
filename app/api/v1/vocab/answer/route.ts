import { z } from "zod";
import { execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";

const schema = z.object({
  grade: z.enum(["dahom", "yazdahom", "davazdahom"]),
  lesson: z.number().int().min(1).max(18),
  word: z.string().trim().min(1).max(120),
  meaning: z.string().trim().min(1).max(500),
  image: z.string().trim().max(500).default(""),
  isCorrect: z.boolean(),
});

/**
 * POST /api/v1/vocab/answer — ثبت یک پاسخ در بازی واژه‌یاب.
 *
 * برخلاف کوییز، `isCorrect` اینجا از کلاینت پذیرفته می‌شود. دلیلش این نیست که
 * فراموش شده: در واژه‌یاب گزینه‌های نادرست در مرورگر و از روی مخزن واژه‌های
 * همان پایه ساخته می‌شوند و هیچ‌جا ثبت نمی‌شوند، پس سرور هیچ راهی ندارد بداند
 * چه چیزی به دانش‌آموز نشان داده شده. تنها راه واقعیِ بستن این در، ساختن دور
 * بازی در سرور است — کاری که به بازنویسی خودِ بازی نیاز دارد، نه به این
 * endpoint.
 *
 * پیامدش محدود است: این جدول فقط تاریخچهٔ شخصیِ «کدام واژه‌ها را اشتباه زدم»
 * را می‌سازد و هیچ نمره یا رتبه‌بندی‌ای از آن در نمی‌آید.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // سقفِ نوشتن. هر یک از این ردیف‌ها دائمی است، پس بدون سقف یک اسکریپت
    // می‌تواند جدول را — و با آن دیسک سرور را — پر کند. عدد سخاوتمندانه
    // است: یک دور بازی چند ده پاسخ دارد؛ ۶۰۰ در ده دقیقه یعنی هیچ بازیکن واقعی به آن نمی‌خورد.
    const limit = rateLimit(`vocab-answer:${user.id}`, 600, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const b = body.data;

    await execute(
      `insert into vocab_answers (user_id, grade, lesson, word, meaning, image, is_correct)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, b.grade, b.lesson, b.word, b.meaning, b.image, b.isCorrect],
    );

    return ok({ saved: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}
