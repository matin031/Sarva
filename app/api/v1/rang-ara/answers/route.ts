import { z } from "zod";
import { randomUUID } from "node:crypto";
import { execute, isUniqueViolation } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { MAX_STROKES, scoreVersePlay } from "@/lib/rang-ara/record";
import { loadRangAraLevel } from "@/lib/rang-ara/source";

/**
 * POST /api/v1/rang-ara/answers — ثبتِ یک بیتِ تمام‌شدهٔ «رنگ‌آرا».
 *
 * ⚠️ بدنه فقط ضربه‌هاست. درست/غلطِ هر گام را `scoreVersePlay` با داورِ خودِ
 * بازی روی بیتِ دیتابیس می‌سازد؛ هیچ ادعایی از مرورگر دربارهٔ نتیجه
 * پذیرفته نمی‌شود. همان قاعدهٔ `role-hunt/answers`.
 *
 * ⚠️ تکرار با `playId` گرفته می‌شود: درجِ چندردیفی یک دستور است، پس یا همه
 * می‌نشینند یا نقضِ یکتایی همه را برمی‌گرداند. `affectedRows` مبنا نیست
 * (روی MariaDB دروغ می‌گوید؛ توضیحش در همان مسیرِ role-hunt).
 */

const schema = z.object({
  playId: z.uuid("شناسهٔ بازی معتبر نیست."),
  verseId: z.string().trim().min(1).max(80),
  strokes: z
    .array(z.object({ concept: z.string().max(24), token: z.string().max(12) }))
    .min(1)
    .max(MAX_STROKES),
});

export const POST = withRoute("/api/v1/rang-ara/answers", async (request: Request) => {
  try {
    // مهمان بازی می‌کند ولی چیزی ثبت نمی‌شود.
    const user = await getCurrentUser();
    if (!user) return ok({ saved: false, reason: "guest" });

    const limit = rateLimit(`rang-ara-answers:${user.id}`, 120, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const level = await loadRangAraLevel(body.data.verseId);
    if (!level) return fail("این بیت پیدا نشد.", 404);

    const steps = scoreVersePlay(level, body.data.strokes);
    if (!steps) return fail("این ضربه‌ها با این بیت جور نیست.", 400);

    const grade = level.book?.grade ?? null;
    const lesson = level.book?.lesson ?? null;
    const verse = level.lines.join(" / ").slice(0, 620);

    const rowsSql = steps.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    let created = true;
    try {
      await execute(
        `insert into rang_ara_answers
           (id, user_id, play_id, verse_key, grade, lesson, verse, step_index, concept, mistakes, is_correct)
         values ${rowsSql}`,
        steps.flatMap((s) => [
          randomUUID(),
          user.id,
          body.data.playId,
          level.id,
          grade,
          lesson,
          verse,
          s.step,
          s.concept,
          s.mistakes,
          s.mistakes === 0,
        ]),
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      created = false;
    }

    return ok({ saved: created, steps }, created ? 201 : 200);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
