import { z } from "zod";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { MAX_SLOTS, MIN_SLOTS, parseSelection } from "@/lib/kimia/catalog";
import { candidateById } from "@/lib/kimia/server/source";
import { guestVerdict, loadRound, recordAttempt } from "@/lib/kimia/server/rounds";
import { closedFail } from "@/lib/kimia/server/http";

/**
 * POST /api/v1/kimia/attempts — «آزمایش ترکیب».
 *
 * ── درستی کاملاً سمتِ سرور سنجیده می‌شود ────────────────────────────────────
 * ⚠️ بدنه عمداً کوچک است: «کدام دور»، «کدام تلاش»، «چه چیدمانی ساختم». وزنِ
 * درست از snapshotِ خودِ ردیفِ دور (یا برای مهمان، از بانکِ پرسش) می‌آید و
 * نه از مرورگر.
 *
 * ⚠️ و schema `.strict()` است: فرستادنِ `isCorrect`، `expected`،
 * `meterName`، `wrongPositions` یا `userId` خطای ۴۰۰ می‌گیرد و نه یک ۲۰۰
 * که به فرستنده بگوید شاید کار کرده. «بی‌صدا نادیده گرفتن» بدتر است، چون
 * کسی که امتحان می‌کند فکر می‌کند پذیرفته شده.
 *
 * ── یک دور = یک شاهد ───────────────────────────────────────────────────────
 * بازیکن می‌تواند اصلاح کند و دوباره آزمایش کند — این *هدفِ* بازی است. پس
 * تلاشِ دوم ردیفِ تازه‌ای نمی‌سازد: همان دور به‌روز می‌شود و
 * `attempts_count` یکی بالا می‌رود. تلاشِ اول جدا نگه داشته می‌شود، چون
 * شاهدِ یادگیری همان است.
 *
 * ── یک بار، حتی اگر دو بار فرستاده شود ──────────────────────────────────────
 * `attemptId` یک UUID به‌ازای هر *فشردنِ واقعیِ* دکمه است. تلاشِ دوبارهٔ
 * `fetch` همان شناسه را می‌فرستد و هیچ ستونی عوض نمی‌شود؛ بازیکنی که پاسخش
 * را عوض کرده و دوباره زده، شناسهٔ تازه می‌فرستد و یک تلاشِ واقعی ثبت
 * می‌شود. تفاوتِ «تلاشِ دوبارهٔ شبکه» و «تلاشِ دوبارهٔ کاربر» دقیقاً همین
 * است، و بدونش آمار با هر لرزشِ شبکه باد می‌کرد.
 *
 * ── سه تلاش، و بعد پاسخ ────────────────────────────────────────────────────
 * تلاشِ چهارم ۴۰۹ می‌گیرد، و تلاشِ سومِ *غلط* در همان تراکنش پاسخ را باز
 * می‌کند (`reveal_reason = 'exhausted'`). سقف داخلِ تراکنشِ قفل‌شده سنجیده
 * می‌شود و نه اینجا: اینجا فقط نتیجه‌اش به HTTP ترجمه می‌شود.
 *
 * ⚠️ متنِ ۴۰۹ عمداً خنثی است و هیچ‌چیز دربارهٔ *پاسخ* نمی‌گوید. کدِ
 * ماشین‌خوان کنارش می‌آید تا رابط کاربری بتواند «تلاش‌هایت تمام شد» را از
 * «پاسخ را قبلاً دیدی» جدا کند بدونِ تطبیقِ رشته.
 */

const schema = z
  .object({
    roundId: z.uuid("شناسهٔ دور معتبر نیست."),
    questionId: z.uuid("شناسهٔ پرسش معتبر نیست."),
    attemptId: z.uuid("شناسهٔ تلاش معتبر نیست."),
    /* ⚠️ کران روی *طول* هم اینجاست و هم در `parseSelection`. اینجا جلوی
       یک آرایهٔ ده‌هزارتایی را پیش از هر پردازشی می‌گیرد؛ آنجا طول را با
       تعدادِ جایگاه‌های همین دور تطبیق می‌دهد. */
    selected: z.array(z.string().min(1).max(40)).min(MIN_SLOTS).max(MAX_SLOTS),
    /** فقط برای تلاشِ اول؛ ادعای بی‌ضررِ کلاینت دربارهٔ زمان و نه دربارهٔ درستی. */
    responseMs: z.number().int().min(0).max(600_000).nullable().optional(),
  })
  .strict();

export const POST = withRoute("/api/v1/kimia/attempts", async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;
    const { roundId, questionId, attemptId, selected } = body.data;

    /* ── مهمان: بازی می‌کند، ثبت نمی‌شود ──────────────────────────────────
       ⚠️ ولی *داوری* همان داوریِ سرور است. یک نسخهٔ سبکِ سمتِ کلاینت برای
       مهمان یعنی دو تعریف از «درست»، و روزی که از هم دور شوند کسی
       نمی‌فهمد. */
    if (!user) {
      const candidate = await candidateById(questionId);
      if (!candidate) return fail("این بیت پیدا نشد.", 404);

      const feet = parseSelection(selected, candidate.slotCount);
      if (!feet) return fail("این ترکیب با این بیت جور نیست.", 400);

      const verdict = guestVerdict(candidate, feet);
      if (!verdict) return fail("این بیت فعلاً قابل بررسی نیست.", 409);
      /* ⚠️ `remaining: null` و نه یک عدد: سرور دربارهٔ مهمان هیچ حالتی
         ندارد و وانمود نمی‌کند دارد. شمارشِ سه تلاشِ مهمان در مرورگر
         انجام می‌شود و `lib/kimia/config.ts` صریح نوشته که سنجهٔ امنیتی
         نیست. */
      return ok({ ...verdict, attemptsCount: null, remaining: null });
    }

    const limit = rateLimit(`kimia-attempts:${user.id}`, 300, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const round = await loadRound(roundId, user.id);
    /* «مالِ تو نیست» و «وجود ندارد» یک پاسخ می‌گیرند، وگرنه می‌شد با امتحان
       کردنِ شناسه‌ها فهمید کدام دورها واقعی‌اند. (همان قاعدهٔ
       `docs/activity-events.md`.) */
    if (!round) return fail("این دور پیدا نشد.", 404);

    /* ⚠️ شناسهٔ پرسش هم بررسی می‌شود و نه فقط شناسهٔ دور: بدونش، کسی
       می‌توانست دورِ یک بیتِ آسان را باز کند و پاسخِ بیتِ دیگری را در آن
       بفرستد. تناقض یعنی درخواست دستکاری شده یا کلاینت گیج شده؛ هیچ‌کدام
       دادهٔ قابلِ ثبتی نیست. */
    const roundItem = round.question_id ?? round.verse_id;
    if (roundItem !== null && roundItem !== questionId) {
      return fail("این ترکیب برای این دور نیست.", 409);
    }

    /* ⚠️ ناقص بودن اینجا هم رد می‌شود، با اینکه دکمهٔ رابط کاربری غیرفعال
       است. غیرفعال بودنِ یک دکمه یک قاعدهٔ نمایشی است و نه یک تضمین. */
    const feet = parseSelection(selected, round.slot_count);
    if (!feet) return fail("این ترکیب با این مخزن جور نیست.", 400);

    const outcome = await recordAttempt({
      userId: user.id,
      roundId,
      attemptId,
      selected: feet,
      responseMs: body.data.responseMs ?? null,
    });

    if (!outcome.ok) {
      if (outcome.reason === "not-found") return fail("این دور پیدا نشد.", 404);
      if (outcome.reason === "closed") return closedFail(outcome.code);
      return fail("این بیت فعلاً قابل بررسی نیست.", 409);
    }

    /* ⚠️ اینجا عمداً هیچ رویدادِ فعالیتی ثبت نمی‌شود.
       قاعدهٔ `docs/activity-events.md`: رویداد فقط جایی نوشته می‌شود که
       جدول‌های پاسخ نتوانند همان سؤال را جواب بدهند. «کِی کیمیای وزن بازی
       کرد» را `kimia_rounds.answered_at` دقیق‌تر می‌گوید، و نوشتنِ همان
       واقعیت در جدولِ دوم یعنی دو منبعِ حقیقت. (همان تصمیمِ «شکار نقش‌ها».) */
    return ok(outcome.verdict);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
