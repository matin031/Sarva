import { z } from "zod";
import { randomUUID } from "node:crypto";
import { execute, isUniqueViolation, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { rowToQuestion, type GrammarCircuitRow } from "@/lib/grammar-circuit/server/rows";
import { resolveRoleHuntAnswer } from "@/lib/role-hunt/round";

/**
 * POST /api/v1/role-hunt/answers — ثبتِ نتیجهٔ یک دورِ «شکار نقش‌ها».
 *
 * ── درستی کاملاً سمتِ سرور سنجیده می‌شود ────────────────────────────────────
 * ⚠️ بدنهٔ درخواست عمداً کوچک است: «کدام پرسش» و «کدام واژه را زدم». نقشِ
 * هدف هم از کلاینت نمی‌آید — و این نکتهٔ اصلی است.
 *
 * اگر نقش از مرورگر می‌آمد، کسی که کنسول را باز کند می‌توانست همیشه همان
 * نقشی را بفرستد که واژهٔ کلیک‌شده‌اش دارد و یک تاریخچهٔ بی‌نقصِ ساختگی
 * بسازد — و آن تاریخچه مستقیم به تحلیلِ «کدام نقش را باید مرور کنی»
 * می‌رفت. حالا نقش تابعِ *خالصِ* خودِ پرسش است (`lib/role-hunt/round.ts`) و
 * سرور همان تابع را روی payloadِ دیتابیس اجرا می‌کند.
 *
 * پس هیچ ادعایی از مرورگر دربارهٔ درست/غلط پذیرفته نمی‌شود، نه صریح و نه
 * ضمنی.
 *
 * ── یک بار، حتی اگر دو بار فرستاده شود ──────────────────────────────────────
 * `roundId` یک UUID به‌ازای هر دور است و روی `(user_id, round_id)` کلیدِ
 * یکتا دارد، پس ردیفِ دوم هرگز ساخته نمی‌شود.
 *
 * ⚠️ ولی «ساخته شد یا نه» را از `affectedRows` نمی‌پرسیم، و این درسِ گران‌
 * قیمتی بود. نسخهٔ اول `insert … on duplicate key update id = id` داشت و
 * `affected > 0` را «ساخته شد» می‌خواند. روی MySQL درست است (۰ برمی‌گرداند
 * وقتی ردیف عوض نشده)، ولی **روی MariaDB — یعنی همان چیزی که production
 * اجرا می‌کند — همیشه ۱ برمی‌گردد.** اندازه‌گیری‌شده روی 10.11.19:
 *
 *     first affected = 1   second affected = 1   third affected = 1
 *     rows in table  = 1
 *
 * یعنی داده درست بود و *گزارش* دروغ: هر ثبتِ دوباره ۲۰۱ Created می‌گرفت و
 * `saved: true` می‌شنید، برای چیزی که ساخته نشده بود.
 *
 * حالا یک `insert` سادهٔ بدونِ `on duplicate` می‌رود و خطای نقضِ یکتایی
 * گرفته می‌شود. شمارهٔ ۱۰۶۲ در هر دو موتور یکی است، پس این تشخیص — برخلافِ
 * `affectedRows` — بینِ MySQL و MariaDB فرق نمی‌کند.
 *
 * ⚠️ و `insert ignore` هم نه: آن *هر* خطایی را می‌بلعد — از داده‌ای که
 * برش می‌خورد تا کلیدِ خارجیِ شکسته — و همه را «تکراری بود» نشان می‌دهد.
 */

const schema = z.object({
  roundId: z.uuid("شناسهٔ دور معتبر نیست."),
  questionId: z.uuid("شناسهٔ پرسش معتبر نیست."),
  selectedTokenId: z.string().trim().min(1).max(80),
});

export const POST = withRoute("/api/v1/role-hunt/answers", async (request: Request) => {
  try {
    // مهمان بازی می‌کند ولی چیزی ثبت نمی‌شود — همان سیاستِ «مدارِ دستور».
    const user = await getCurrentUser();
    if (!user) return ok({ saved: false, reason: "guest" });

    const limit = rateLimit(`role-hunt-answers:${user.id}`, 300, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const row = await queryOne<GrammarCircuitRow & { is_published: boolean }>(
      `select id, source_id, grade, lesson, question_type, payload, difficulty,
              explanation, attribution, is_published
         from grammar_circuit_questions
        where id = ?`,
      [body.data.questionId],
    );
    if (!row || !row.is_published) return fail("این پرسش پیدا نشد.", 404);

    // همان تبدیل و اعتبارسنجی‌ای که خودِ بازی از آن استفاده می‌کند.
    const { question } = rowToQuestion(row);
    if (!question) return fail("این پرسش قابل بررسی نیست.", 409);

    const resolved = resolveRoleHuntAnswer(question, body.data.selectedTokenId);
    // یا این پرسش اصلاً واجدِ شرایطِ این بازی نیست، یا واژه‌ای بیرونِ مدار
    // فرستاده شده. هیچ‌کدام دادهٔ قابلِ ثبتی نیست.
    if (!resolved) return fail("این پاسخ با این پرسش جور نیست.", 400);

    const { round, chosenToken, correctToken, isCorrect, verse } = resolved;

    let created = true;
    try {
      await execute(
        `insert into role_hunt_answers
           (id, user_id, round_id, question_id, grade, lesson, role_key, verse,
            correct_token_id, correct_token_text, chosen_token_id, chosen_token_text, is_correct)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          user.id,
          body.data.roundId,
          row.id,
          round.grade,
          round.lesson,
          round.roleKey,
          // ستون ۴۰۰ نویسه است و بلندترین مصراعِ بانک نزدیکِ ۶۰؛ برش فقط
          // نگهبانِ محتوای غیرمنتظره است، نه اتفاقی که انتظارش را داریم.
          verse.slice(0, 400),
          correctToken.id,
          correctToken.text.slice(0, 200),
          chosenToken.id,
          chosenToken.text.slice(0, 200),
          isCorrect,
        ],
      );
    } catch (err) {
      // همین دور قبلاً ثبت شده — نه خطاست و نه ردیفِ تازه‌ای می‌سازد.
      if (!isUniqueViolation(err)) throw err;
      created = false;
    }

    /* ⚠️ اینجا عمداً هیچ رویدادِ فعالیتی ثبت نمی‌شود.
       قاعدهٔ `docs/activity-events.md`: رویداد فقط جایی نوشته می‌شود که
       جدول‌های پاسخ نتوانند همان سؤال را جواب بدهند. «کِی شکار نقش‌ها بازی
       کرد» را `role_hunt_answers.answered_at` دقیق‌تر می‌گوید، و نوشتنِ
       همان واقعیت در جدولِ دوم یعنی دو منبعِ حقیقت.

       («مدارِ دستور» رویداد می‌نویسد چون نتیجهٔ کلِ دورش در *یک* درخواست
       می‌آید؛ اینجا هر دور یک درخواست است و همان کد صدها ردیفِ تکراری
       می‌ساخت — دقیقاً دلیلی که واژه‌یاب و جاسوس هم رویدادی ثبت نمی‌کنند.) */
    /* ⚠️ `isCorrect` حتی در حالتِ تکراری هم برمی‌گردد: کلاینتی که پاسخش را
       دوباره فرستاده (شبکهٔ لرزان) باید همان بازخورد را بگیرد، نه یک حالتِ
       خطا. فقط `saved` و کدِ وضعیت راستش را می‌گویند. */
    return ok({ saved: created, isCorrect }, created ? 201 : 200);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
