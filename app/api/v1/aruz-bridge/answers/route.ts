import { z } from "zod";
import { randomUUID } from "node:crypto";
import { placeholders, query, transaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { recordActivity } from "@/lib/activity/record";
import { lockAssignment, markAssignmentCompleted } from "@/lib/teacher/assignments";
import { subsetOfItems } from "@/lib/teacher/assignment-rules";

/**
 * POST /api/v1/aruz-bridge/answers — ثبتِ نتیجهٔ یک دورِ «پلِ وزن».
 *
 * ⚠️ چرا این endpoint اصلاً وجود دارد:
 *
 * تا امروز «پلِ وزن» هیچ ردی از خودش نمی‌گذاشت. یعنی دانش‌آموزی که دویست دور
 * بازی کرده و همیشه روی «مفاعیلن» می‌افتد، در هر تحلیلی نامرئی بود — و
 * تحلیلِ وزن دقیقاً همان چیزی است که سروا پلاس می‌فروشد. تحلیلی که نصفِ
 * شواهد را ندیده باشد، با اطمینان چیز اشتباهی پیشنهاد می‌دهد.
 *
 * ── درستی را سرور می‌سنجد، نه مرورگر ────────────────────────────────────────
 * ⚠️ کلاینت `isCorrect` نمی‌فرستد و اصلاً نمی‌تواند بفرستد. تنها چیزی که
 * می‌فرستد «کدام پرسش» و «کدام وزن را انتخاب کردم» است؛ وزنِ درست از
 * `aruz_bridge_questions` خوانده می‌شود و مقایسه اینجا انجام می‌شود.
 *
 * این از الگوی `vocab_answers` بهتر است (آنجا گزینه‌ها در مرورگر ساخته
 * می‌شوند و سرور راهی برای بازسنجی ندارد) و همان چیزی است که تاریخچهٔ آموزشی
 * را قابلِ اتکا نگه می‌دارد.
 *
 * ── چرا دسته‌ای و نه یکی‌یکی ─────────────────────────────────────────────────
 * بازی یک صحنهٔ سه‌بعدی با تایمرِ فشرده است. یک درخواستِ شبکه در وسطِ هر
 * پرش، هم لگِ محسوس می‌سازد و هم در دورِ ده‌مرحله‌ای ده رفت‌وبرگشت است. نتیجهٔ
 * کلِ دور در پایانِ آن، یک بار فرستاده می‌شود.
 */

const MAX_ANSWERS_PER_RUN = 60;

const schema = z.object({
  /** اگر این دور تکلیفِ دبیر است. فقط برچسب؛ همه‌چیز سمتِ سرور سنجیده می‌شود. */
  assignmentId: z.uuid().optional(),
  answers: z
    .array(
      z.object({
        questionId: z.uuid("شناسهٔ پرسش معتبر نیست."),
        /** null یعنی وقت تمام شد و بازیکن اصلاً انتخابی نکرد. */
        chosenPattern: z.string().trim().min(1).max(120).nullable(),
      }),
    )
    .min(1, "نتیجه‌ای برای ثبت نیست.")
    .max(MAX_ANSWERS_PER_RUN, "تعداد پاسخ‌های یک دور بیش از حد است."),
});

export const POST = withRoute("/api/v1/aruz-bridge/answers", async (request: Request) => {
  try {
    // ⚠️ مهمان هم می‌تواند بازی کند (بازی عمومی است) ولی چیزی ثبت نمی‌شود.
    // ۲۰۰ برمی‌گردد و نه ۴۰۱: نبودنِ حساب برای این بازی یک حالتِ عادی است و
    // نباید کنسولِ بازیکن را پر از خطا کند یا پایانِ بازی را خراب کند.
    const user = await getCurrentUser();
    if (!user) return ok({ saved: 0, reason: "guest" });

    // سقفِ نوشتن. هر ردیف دائمی است، پس بدون سقف یک اسکریپت می‌تواند جدول —
    // و با آن دیسکِ سرور — را پر کند.
    const limit = rateLimit(`aruz-bridge-answers:${user.id}`, 60, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const ids = [...new Set(body.data.answers.map((a) => a.questionId))];

    // مرجع: خودِ جدولِ پرسش‌ها. شرطِ `is_published` هم هست تا پرسشِ
    // منتشرنشده — که هیچ‌وقت به دستِ بازیکن نمی‌رسد — نتواند از این مسیر
    // وارد تاریخچه شود.
    const rows = await query<{
      id: string;
      phrase: string;
      correct_pattern: string;
      difficulty: number;
    }>(
      // ⚠️ MySQL معادلِ `= any($1::uuid[])` ندارد؛ فهرست باید به تعدادِ
      // شناسه‌ها `?` بگیرد. `placeholders()` همان را می‌سازد و چون طولش از
      // آرایه می‌آید و نه از ورودی، رشتهٔ کاربر هرگز وارد خودِ SQL نمی‌شود.
      `select id, phrase, correct_pattern, difficulty
         from aruz_bridge_questions
        where id in (${placeholders(ids.length)}) and is_published = 1`,
      ids,
    );

    const byId = new Map(rows.map((r) => [r.id, r]));

    const values: {
      questionId: string;
      phrase: string;
      correctPattern: string;
      chosenPattern: string | null;
      outcome: "correct" | "wrong" | "timeout";
      isCorrect: boolean;
      difficulty: number;
    }[] = [];

    for (const answer of body.data.answers) {
      const question = byId.get(answer.questionId);
      // پرسشی که وجود ندارد یا منتشر نیست، بی‌سروصدا رد می‌شود: نتیجهٔ کلِ
      // دور نباید به‌خاطر یک ردیفِ حذف‌شده از دست برود.
      if (!question) continue;

      const chosen = answer.chosenPattern?.trim() || null;
      const outcome =
        chosen === null ? "timeout" : chosen === question.correct_pattern.trim() ? "correct" : "wrong";

      values.push({
        questionId: question.id,
        phrase: question.phrase,
        correctPattern: question.correct_pattern,
        chosenPattern: chosen,
        outcome,
        isCorrect: outcome === "correct",
        difficulty: question.difficulty,
      });
    }

    if (values.length === 0) return ok({ saved: 0 });

    const { assignmentId } = body.data;

    // یک تراکنش برای کلِ دور: یا همهٔ نتیجهٔ دور ثبت می‌شود یا هیچ‌کدام. نصفهٔ
    // یک دور در تاریخچه، تحلیل را به‌شکلِ نامرئی کج می‌کند.
    const rejected = await transaction(async (tx) => {
      /* ⚠️ تکلیف پیش از هر نوشتن قفل و سنجیده می‌شود. دور با اولین اشتباه
         تمام می‌شود، پس هر زیرمجموعهٔ یکتا از سؤال‌های تکلیف پذیرفته است —
         ولی سؤالی بیرون از آن، نه. */
      let total = 0;
      if (assignmentId) {
        const lock = await lockAssignment(tx, assignmentId, user.id, "aruz_bridge");
        if (!lock.ok) return lock;
        if (!subsetOfItems(lock.items, body.data.answers.map((a) => a.questionId))) {
          return { ok: false as const, error: "سؤال‌های این دور با تکلیف یکی نیست.", status: 400 };
        }
        total = lock.items.length;
      }

      for (const v of values) {
        await tx.execute(
          `insert into aruz_bridge_answers
             (id, user_id, question_id, phrase, correct_pattern, chosen_pattern,
              outcome, is_correct, difficulty)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            user.id,
            v.questionId,
            v.phrase,
            v.correctPattern,
            v.chosenPattern,
            v.outcome,
            v.isCorrect,
            v.difficulty,
          ],
        );
      }

      if (assignmentId) {
        const miss = values.find((v) => !v.isCorrect);
        await markAssignmentCompleted(tx, assignmentId, {
          total,
          answered: values.length,
          correct: values.filter((v) => v.isCorrect).length,
          timeouts: values.filter((v) => v.outcome === "timeout").length,
          miss: miss
            ? { phrase: miss.phrase, correctPattern: miss.correctPattern, chosenPattern: miss.chosenPattern }
            : null,
        });
      }
      return null;
    });

    if (rejected) return fail(rejected.error, rejected.status);


    /* ⚠️ یک ردیفِ فعالیت به‌ازای هر **دور**، نه هر پاسخ.

       نتیجهٔ کلِ دور در یک درخواست می‌آید، پس اینجا دقیقاً یک بار ثبت
       می‌شود. اگر این endpoint پاسخ‌ها را یکی‌یکی می‌گرفت (مثل واژه‌یاب و
       جاسوس)، ثبتِ رویداد اینجا صدها ردیفِ تکراری می‌ساخت — و آن دو بازی
       دقیقاً به همین دلیل رویدادی ثبت نمی‌کنند: زمانِ فعالیتشان از خودِ
       جدولِ پاسخ درمی‌آید. قاعده‌اش در `docs/activity-events.md`. */
    await recordActivity({
      userId: user.id,
      eventType: "game_completed",
      entityId: "aruz-bridge",
    });

    return ok({ saved: values.length }, 201);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
