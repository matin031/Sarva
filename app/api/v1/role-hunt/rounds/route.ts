import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handleError, ok, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { logRejected, rowsToQuestions, type GrammarCircuitRow } from "@/lib/grammar-circuit/server/rows";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";
import { buildRoleHuntRound } from "@/lib/role-hunt/round";
import type { RoleHuntRound } from "@/lib/role-hunt/types";

/**
 * GET /api/v1/role-hunt/rounds?count=8
 *
 * دورهای «شکار نقش‌ها». محتوای عمومی است، پس احراز هویت نمی‌خواهد — همان
 * سیاستِ `/api/v1/grammar-circuit/questions`.
 *
 * ⚠️ RLS وجود ندارد: `is_published` مستقیم در همین کوئری است. اگر روزی از
 * اینجا حذف شود، هیچ لایهٔ دیگری جلوی نشتِ محتوای منتشرنشده را نمی‌گیرد.
 *
 * ── چرا `order by rand()` اینجا قابلِ دفاع است ─────────────────────────────
 * معمولاً نیست: روی جدولِ بزرگ یعنی اسکنِ کامل و یک filesort. ولی اینجا
 * دامنه با `question_type in ('hemistich','verse')` به شعرِ منتشرشده محدود
 * می‌شود — چند صد ردیفِ نوشتهٔ دست، که نرخِ رشدش نرخِ *تألیف* است و نه نرخِ
 * ترافیک. جایگزینش (نگه داشتنِ فهرستِ شناسه‌ها در حافظه و بُر زدنشان) یک
 * کشِ تازه با مسئلهٔ بی‌اعتبارسازیِ خودش می‌آورد، برای مسئله‌ای که هنوز
 * وجود ندارد.
 *
 * ⚠️ پاسخِ درست همراهِ دور فرستاده می‌شود و این عمدی است — همان کاری که
 * «مدارِ دستور» می‌کند. بازخوردِ فوری بدونِ رفت‌وبرگشتِ شبکه فقط همین‌طور
 * ممکن است، و تضمینِ واقعی جای دیگری است: مسیرِ ثبتِ پاسخ هیچ ادعایی از
 * مرورگر دربارهٔ درست/غلط نمی‌پذیرد و خودش دوباره می‌سنجد.
 */

export const GET = withRoute("/api/v1/role-hunt/rounds", async (request: NextRequest) => {
  try {
    const { ip } = requestMeta(request);
    const limit = rateLimit(`role-hunt-rounds:${ip ?? "unknown"}`, 60, 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const countRaw = request.nextUrl.searchParams.get("count");
    let count: number = ROLE_HUNT_CONFIG.roundsPerSession;
    if (countRaw !== null) {
      const parsed = Number(countRaw);
      if (!Number.isInteger(parsed) || parsed < 1) return fail("تعدادِ درخواستی نامعتبر است.", 400);
      count = Math.min(parsed, ROLE_HUNT_CONFIG.maxRoundsPerRequest);
    }

    /* ⚠️ چهار برابرِ خواسته کشیده می‌شود چون بخشی از پرسش‌ها واجدِ شرایطِ این
       بازی نیستند (مدارِ کم‌گزینه، یا نقشی که پاسخش یکتا نیست) و آن صافی
       فقط در TypeScript قابلِ اجراست — شرطش دربارهٔ محتوای payload است و نه
       دربارهٔ ستون‌ها. */
    const pool = await query<GrammarCircuitRow>(
      `select id, source_id, grade, lesson, question_type, payload,
              difficulty, explanation, attribution
         from grammar_circuit_questions
        where is_published
          and question_type in ('hemistich', 'verse')
        order by rand()
        limit ?`,
      [count * 4],
    );

    const { questions, rejected } = rowsToQuestions(pool);
    logRejected("role-hunt", rejected);

    const rounds: RoleHuntRound[] = [];
    for (const question of questions) {
      const round = buildRoleHuntRound(question);
      if (round) rounds.push(round);
      if (rounds.length === count) break;
    }

    return ok({ rounds });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
