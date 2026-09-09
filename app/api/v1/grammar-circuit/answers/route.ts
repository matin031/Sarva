import { z } from "zod";
import { queryOne, transaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { rowToQuestion, type GrammarCircuitRow } from "@/lib/grammar-circuit/server/rows";

/**
 * POST /api/v1/grammar-circuit/answers — ثبتِ نتیجهٔ یک پرسشِ «مدارِ دستور».
 *
 * ⚠️ چرا لازم است: تحلیلِ «در کدام نقشِ دستوری ضعیف است» تا امروز فقط از
 * «جاسوس» تغذیه می‌شد. «مدارِ دستور» — که دقیقاً همان مهارت را در قالبِ
 * چیدنِ نقش‌ها در جمله می‌سنجد — هیچ ردی از خودش نمی‌گذاشت. یعنی دو بازیِ
 * هم‌مهارت، یکی دیده می‌شد و یکی نه.
 *
 * ── درستی کاملاً سمتِ سرور سنجیده می‌شود ────────────────────────────────────
 * ⚠️ کلاینت فقط می‌گوید «کدام قطعه را روی کدام سوکت گذاشتم». سرور خودِ
 * payload پرسش را از دیتابیس می‌خواند، از همان اعتبارسنجِ بازی
 * (`rowToQuestion`) ردش می‌کند و بعد بررسی می‌کند که نقشِ انتخاب‌شده در
 * `acceptedRoleKeys` آن سوکت هست یا نه.
 *
 * پس هیچ ادعایی از مرورگر دربارهٔ درست/غلط پذیرفته نمی‌شود — نه صریح و نه
 * ضمنی.
 *
 * ── چرا یک ردیف به‌ازای هر سوکت ─────────────────────────────────────────────
 * بازیکن در یک پرسش ممکن است «نهاد» را درست بگذارد و «متمم» را غلط. اگر
 * نتیجه در سطحِ پرسش ثبت می‌شد، دقیقاً همان چیزی که تحلیل به آن نیاز دارد —
 * «کدام نقش» — گم می‌شد.
 */

const MAX_PLACEMENTS = 24;

const schema = z.object({
  questionId: z.uuid("شناسهٔ پرسش معتبر نیست."),
  placements: z
    .array(
      z.object({
        tokenId: z.string().trim().min(1).max(80),
        roleKey: z.string().trim().min(1).max(60),
      }),
    )
    .min(1, "نتیجه‌ای برای ثبت نیست.")
    .max(MAX_PLACEMENTS, "تعداد سوکت‌ها بیش از حد است."),
});

export const POST = withRoute("/api/v1/grammar-circuit/answers", async (request: Request) => {
  try {
    // مهمان بازی می‌کند ولی چیزی ثبت نمی‌شود — همان سیاستِ «پلِ وزن».
    const user = await getCurrentUser();
    if (!user) return ok({ saved: 0, reason: "guest" });

    const limit = rateLimit(`grammar-circuit-answers:${user.id}`, 120, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const row = await queryOne<GrammarCircuitRow & { is_published: boolean }>(
      `select id, source_id, grade, lesson, question_type, payload, difficulty,
              explanation, attribution, is_published
         from grammar_circuit_questions
        where id = $1`,
      [body.data.questionId],
    );
    if (!row || !row.is_published) return fail("این پرسش پیدا نشد.", 404);

    // همان تبدیل و اعتبارسنجی‌ای که خودِ بازی از آن استفاده می‌کند. اگر
    // payload خراب باشد، پرسش اصلاً به بازیکن نرسیده و ثبتِ نتیجه‌اش هم
    // بی‌معنی است.
    const { question } = rowToQuestion(row);
    if (!question) return fail("این پرسش قابل بررسی نیست.", 409);

    // سوکت‌های واقعی: توکن‌هایی که `roleSlot` دارند.
    const slots = new Map<string, readonly string[]>();
    for (const token of question.tokens) {
      if (token.roleSlot) slots.set(token.id, token.roleSlot.acceptedRoleKeys);
    }

    const rows: {
      tokenId: string;
      tokenText: string;
      roleKey: string;
      accepted: readonly string[];
      chosen: string;
      isCorrect: boolean;
    }[] = [];

    const seen = new Set<string>();
    for (const placement of body.data.placements) {
      const accepted = slots.get(placement.tokenId);
      // سوکتی که وجود ندارد بی‌سروصدا رد می‌شود؛ و هر سوکت فقط یک بار
      // شمرده می‌شود تا فرستادنِ ده‌بارهٔ یک سوکت، آمار را متورم نکند.
      if (!accepted || seen.has(placement.tokenId)) continue;
      seen.add(placement.tokenId);

      const token = question.tokens.find((t) => t.id === placement.tokenId);
      if (!token) continue;

      rows.push({
        tokenId: placement.tokenId,
        tokenText: token.text,
        // ⚠️ برچسبِ متعارفِ سطلِ تحلیل: اولین نقشِ پذیرفته‌شده. کلِ فهرست هم
        // ذخیره می‌شود تا اگر روزی تحلیل خواست دقیق‌تر شود، داده‌اش باشد.
        roleKey: accepted[0] ?? "unknown",
        accepted,
        chosen: placement.roleKey,
        isCorrect: accepted.includes(placement.roleKey),
      });
    }

    if (rows.length === 0) return ok({ saved: 0 });

    await transaction(async (tx) => {
      for (const r of rows) {
        await tx.execute(
          `insert into grammar_circuit_answers
             (user_id, question_id, grade, lesson, token_text,
              role_key, accepted_role_keys, chosen_role_key, is_correct)
           values ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9)`,
          [
            user.id,
            row.id,
            row.grade,
            row.lesson,
            r.tokenText,
            r.roleKey,
            r.accepted,
            r.chosen,
            r.isCorrect,
          ],
        );
      }
    });

    return ok({ saved: rows.length }, 201);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
