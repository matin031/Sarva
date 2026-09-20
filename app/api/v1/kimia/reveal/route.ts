import { z } from "zod";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { candidateById } from "@/lib/kimia/server/source";
import { guestSolution, revealRound } from "@/lib/kimia/server/rounds";
import { closedFail } from "@/lib/kimia/server/http";

/**
 * POST /api/v1/kimia/reveal — «پاسخ را نشانم بده».
 *
 * ── چرا یک endpointِ جدا و نه یک فیلد روی `/attempts` ──────────────────────
 * سه دلیل، و هر سه عملی‌اند:
 *
 *   ۱) این یک *تلاش* نیست و نباید در `attempts_count` بنشیند. اگر پرچمی
 *      روی همان بدنه بود، اولین اشتباهِ ممکن این بود که یک reveal به‌عنوان
 *      یک تلاشِ غلط ثبت شود — یعنی کارنامهٔ دانش‌آموز بدتر از واقعیت.
 *   ۲) محدودیتِ نرخش متفاوت است و باید متفاوت بماند.
 *   ۳) بدنه‌اش چیدمان ندارد. فرستادنِ `selected` با درخواستی که هیچ‌چیز
 *      دربارهٔ چیدمان نمی‌پرسد، فقط یک فرصتِ اضافه برای اشتباه است.
 *
 * ── چه چیزی برمی‌گردد ──────────────────────────────────────────────────────
 * `solution` = نامِ وزن، دنبالهٔ متعارف، و همهٔ خوانش‌های پذیرفتنی.
 *
 * ⚠️ تطبیقِ هجا با کلمه‌های شعر **نمی‌آید، چون در داده نیست**. نه جدولِ
 * پرسش‌ها چنین چیزی دارد و نه `kimia_rounds`. موتورِ عروض می‌تواند حدسش
 * را بزند و آن حدس اینجا ساخته نمی‌شود: تقطیعِ حدسی که به‌عنوانِ «درست»
 * نشان داده شود، از نشان ندادنش بدتر است.
 *
 * ── مالکیت ─────────────────────────────────────────────────────────────────
 * ⚠️ دورِ کسِ دیگر ۴۰۴ می‌گیرد و نه ۴۰۳ — همان قاعدهٔ `/attempts` و
 * `docs/activity-events.md`: «مالِ تو نیست» و «وجود ندارد» یک پاسخ
 * می‌گیرند، وگرنه می‌شد با امتحان کردنِ شناسه‌ها فهمید کدام دورها
 * واقعی‌اند.
 *
 * ── مهمان ──────────────────────────────────────────────────────────────────
 * مهمان پاسخ را می‌گیرد و هیچ‌چیز ثبت نمی‌شود. شرطِ «دست‌کم یک تلاش»
 * برایش اعمال نمی‌شود و **نمی‌تواند** بشود: هیچ ردیفی وجود ندارد که
 * بگوید تلاش کرده یا نه. آنچه می‌ماند محدودیتِ نرخ روی IP است تا کسی
 * نتواند با یک حلقه وزنِ همهٔ بیت‌های بانک را بکشد.
 */

const schema = z
  .object({
    roundId: z.uuid("شناسهٔ دور معتبر نیست."),
    questionId: z.uuid("شناسهٔ پرسش معتبر نیست."),
  })
  .strict();

export const POST = withRoute("/api/v1/kimia/reveal", async (request: NextRequest) => {
  try {
    const { ip } = requestMeta(request);
    const user = await getCurrentUser();

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;
    const { roundId, questionId } = body.data;

    /* ── مهمان ────────────────────────────────────────────────────────── */
    if (!user) {
      /* ⚠️ سخت‌گیرانه‌تر از تلاش‌ها و عمداً: یک نشستِ مهمان حداکثر پانزده
         بیت دارد، پس سی درخواست در ده دقیقه برای استفادهٔ عادی فراوان
         است و برای کشیدنِ بانک کم. */
      const limit = rateLimit(`kimia-reveal-ip:${ip ?? "unknown"}`, 30, 10 * 60);
      if (!limit.allowed) {
        return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
      }

      const candidate = await candidateById(questionId);
      if (!candidate) return fail("این بیت پیدا نشد.", 404);
      const solution = guestSolution(candidate);
      if (!solution) return fail("این بیت فعلاً قابل بررسی نیست.", 409);

      return ok({ solution, saved: false, revealed: true, remaining: null });
    }

    const limit = rateLimit(`kimia-reveal:${user.id}`, 60, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const outcome = await revealRound({ userId: user.id, roundId });
    if (!outcome.ok) {
      if (outcome.reason === "not-found") return fail("این دور پیدا نشد.", 404);
      if (outcome.reason === "rejected") return closedFail(outcome.code);
      return fail("این بیت فعلاً قابل بررسی نیست.", 409);
    }

    return ok({
      solution: outcome.solution,
      saved: outcome.verdict.saved,
      revealed: outcome.verdict.revealed,
      remaining: outcome.verdict.remaining,
    });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
