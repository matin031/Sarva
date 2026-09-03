import { z } from "zod";
import { execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { loadJasoosLevel } from "@/lib/jasoos-content";
import { resolveJasoosAnswer } from "@/lib/jasoos-answer";

/**
 * ⚠️ ورودی عمداً کوچک است: فقط «کدام پرونده» و «چه کسی را زدی».
 *
 * تا دیروز `category`، دو مصراعِ بیت و — مهم‌تر از همه — `correctRole` هم از
 * کلاینت می‌آمدند. سرور `is_correct` را از مقایسهٔ `chosenRole` با
 * `correctRole` حساب می‌کرد، یعنی هر دو طرفِ مقایسه دستِ همان کسی بود که
 * پاسخ می‌داد: فرستادن `chosenRole = correctRole = "نهاد"` همیشه یک پاسخِ
 * درست ثبت می‌کرد. بقیهٔ ستون‌ها هم متنِ آزاد بودند، پس تاریخچهٔ بازی هر
 * چیزی می‌توانست بگوید.
 *
 * برخلاف واژه‌یاب (که گزینه‌هایش در مرورگر ساخته می‌شوند و هیچ‌جا ثبت
 * نمی‌شوند)، پرونده‌های جاسوس مرجعِ سروری دارند: جدولِ `jasoos_levels` و در
 * نبودش سطح‌های ثابتِ `lib/jasoos-data.ts`. پس اینجا واقعاً می‌شود همه‌چیز را
 * از `levelId` درآورد — و همین کار انجام می‌شود.
 */
const schema = z.object({
  levelId: z.number().int().min(0),
  chosenRole: z.string().trim().min(1).max(80),
});

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
    const { levelId, chosenRole } = body.data;

    // مرجع: همان چیزی که خودِ بازی از آن ساخته می‌شود — ولی فقط همان یک
    // مرحله، نه کلِ محتوای بازی. تضمینِ امنیتی همان است: نقشِ درست و بیت از
    // دیتابیس درمی‌آید، نه از کلاینت.
    const level = await loadJasoosLevel(levelId);
    const resolved = resolveJasoosAnswer(level ? [level] : [], levelId, chosenRole);
    if (!resolved.ok) {
      if (resolved.reason === "unknown_level") return fail("این پرونده پیدا نشد.", 404);
      if (resolved.reason === "broken_level") return fail("این پرونده ناقص است.", 409);
      return fail("این مظنون در این پرونده نیست.", 400);
    }
    const r = resolved.row;

    await execute(
      `insert into jasoos_answers
         (user_id, level_id, category, verse_line_1, verse_line_2,
          chosen_role, correct_role, is_correct)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user.id, r.levelId, r.category, r.verseLine1, r.verseLine2,
       r.chosenRole, r.correctRole, r.isCorrect],
    );

    return ok({ saved: true }, 201);
  } catch (err) {
    return handleError(err);
  }
});
