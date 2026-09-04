"use server";

import { randomBytes } from "node:crypto";
import { invalidateAvailability } from "@/lib/grammar-circuit/availability-cache";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import {
  isStorableLesson,
  isValidGradeKey,
  type GradeKey,
} from "@/lib/grammar-circuit/curriculum";
import { isGrammarRoleKey } from "@/lib/grammar-circuit/roles";
import {
  buildQuestionFromDraft,
  draftFromQuestion,
  sentenceFromTokens,
  type AuthoredQuestion,
} from "@/lib/grammar-circuit/authoring";
import { validateGrammarCircuitQuestion } from "@/lib/grammar-circuit/validator";
import type { GrammarCircuitQuestion } from "@/lib/grammar-circuit/types";

/**
 * مدیریت پرسش‌های «مدار دستور».
 *
 * ⚠️ قاعده‌ای که کلِ این فایل رویش ایستاده، همان قاعدهٔ
 * `lib/grammar-circuit/server/rows.ts` است: **بودنِ یک ردیف در جدول اثباتِ
 * سالم بودنش نیست.** payload یک jsonb آزاد است. پس هیچ چیزی از پنل ذخیره
 * نمی‌شود مگر از `validateGrammarCircuitQuestion` — همان اعتبارسنجی که خودِ
 * بازی و اسکریپتِ seed استفاده می‌کنند، شاملِ آزمونِ بن‌بست‌ناپذیری — رد شده
 * باشد.
 *
 * پنل هم *پیش از* ذخیره همان تابع را در مرورگر صدا می‌زند؛ این‌جا تکرارِ
 * بی‌دلیل نیست: یک Server Action در عمل یک endpoint شبکه است و هر کسی
 * می‌تواند مستقیم صدایش بزند.
 */

export type AdminGcSummary = {
  id: string;
  sourceId: string;
  grade: string;
  lesson: number;
  questionType: string;
  difficulty: number;
  isPublished: boolean;
  sortIndex: number;
  /** جملهٔ بازسازی‌شده از توکن‌ها — همان چیزی که دانش‌آموز می‌بیند. */
  sentence: string;
  slotCount: number;
  /** خروجیِ اعتبارسنجِ بازی روی همین ردیف؛ خالی یعنی سالم. */
  problems: string[];
};

export type AdminGcQuestion = {
  id: string;
  sourceId: string;
  grade: string;
  lesson: number;
  difficulty: number;
  explanation: string;
  attribution: string;
  isPublished: boolean;
  sortIndex: number;
  draft: AuthoredQuestion;
};

type ActionResult = { ok: true } | { ok: false; error: string };
type SaveResult = { ok: true; id: string } | { ok: false; error: string; problems?: string[] };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code?: string }).code === UNIQUE_VIOLATION;
}

type Row = {
  id: string;
  source_id: string;
  grade: string;
  lesson: number;
  question_type: string;
  payload: unknown;
  difficulty: number;
  explanation: string | null;
  attribution: string | null;
  is_published: boolean;
  sort_index: number;
};

/** ردیف → سؤال، بدونِ کنار گذاشتنِ ردیفِ خراب.
 *
 *  عمداً `rowToQuestion` سمتِ بازی را صدا نمی‌زند: آنجا ردیفِ نامعتبر `null`
 *  می‌شود و ناپدید. در پنل دقیقاً برعکس لازم است — ردیفِ خراب باید دیده شود،
 *  با دلیلش، وگرنه مدیر هیچ‌وقت نمی‌فهمد چرا سؤالش در بازی نمی‌آید. */
function rowToQuestion(row: Row): GrammarCircuitQuestion {
  const payload =
    typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
      ? (row.payload as Partial<GrammarCircuitQuestion>)
      : {};

  return {
    ...(payload as GrammarCircuitQuestion),
    id: row.id,
    sourceId: row.source_id,
    grade: row.grade as GradeKey,
    lesson: row.lesson,
    type: (row.question_type as GrammarCircuitQuestion["type"]) ?? "sentence",
    difficulty: row.difficulty as 1 | 2 | 3,
    ...(row.explanation ? { explanation: row.explanation } : {}),
    ...(row.attribution ? { attribution: row.attribution } : {}),
  };
}

function toSummary(row: Row): AdminGcSummary {
  const question = rowToQuestion(row);
  const tokens = Array.isArray(question.tokens) ? question.tokens : [];
  return {
    id: row.id,
    sourceId: row.source_id,
    grade: row.grade,
    lesson: row.lesson,
    questionType: row.question_type,
    difficulty: row.difficulty,
    isPublished: row.is_published,
    sortIndex: row.sort_index,
    sentence: sentenceFromTokens(
      tokens.map((t) => ({
        id: t.id,
        text: t.text ?? "",
        separatorAfter: t.separatorAfter ?? " ",
        acceptedRoleKeys: [],
      })),
    ),
    slotCount: tokens.filter((t) => t.roleSlot).length,
    problems: validateGrammarCircuitQuestion(question).errors,
  };
}

const LIST_LIMIT = 200;

export async function gcAdminList(input: {
  grade: string;
  lesson: number;
}): Promise<AdminGcSummary[]> {
  await requireAdmin();
  if (!isValidGradeKey(input.grade)) throw new Error("پایهٔ نامعتبر است.");
  if (!isStorableLesson(input.lesson)) throw new Error("شمارهٔ درس نامعتبر است.");

  const rows = await query<Row>(
    `select id, source_id, grade, lesson, question_type, payload, difficulty,
            explanation, attribution, is_published, sort_index
       from grammar_circuit_questions
      where grade = $1 and lesson = $2
      order by sort_index, source_id
      limit $3`,
    [input.grade, input.lesson, LIST_LIMIT],
  );

  return rows.map(toSummary);
}

/** شمارِ سؤال‌های هر درس در یک پایه — برای اینکه پنل بگوید کدام درس خالی است. */
export async function gcAdminLessonCounts(
  grade: string,
): Promise<Record<number, { total: number; published: number }>> {
  await requireAdmin();
  if (!isValidGradeKey(grade)) throw new Error("پایهٔ نامعتبر است.");

  const rows = await query<{ lesson: number; total: number; published: number }>(
    `select lesson,
            count(*)::int as total,
            count(*) filter (where is_published)::int as published
       from grammar_circuit_questions
      where grade = $1
      group by lesson`,
    [grade],
  );

  const out: Record<number, { total: number; published: number }> = {};
  for (const r of rows) out[r.lesson] = { total: r.total, published: r.published };
  return out;
}

/** شمارِ کل، برای کارتِ صفحهٔ «بازی‌ها». */
export async function gcAdminTotals(): Promise<{ total: number; published: number }> {
  await requireAdmin();
  const row = await queryOne<{ total: number; published: number }>(
    `select count(*)::int as total,
            count(*) filter (where is_published)::int as published
       from grammar_circuit_questions`,
  );
  return row ?? { total: 0, published: 0 };
}

export async function gcAdminGet(id: string): Promise<AdminGcQuestion | null> {
  await requireAdmin();
  const questionId = uuidArg(id, "شناسهٔ پرسش نامعتبر است.");

  const row = await queryOne<Row>(
    `select id, source_id, grade, lesson, question_type, payload, difficulty,
            explanation, attribution, is_published, sort_index
       from grammar_circuit_questions where id = $1`,
    [questionId],
  );
  if (!row) return null;

  return {
    id: row.id,
    sourceId: row.source_id,
    grade: row.grade,
    lesson: row.lesson,
    difficulty: row.difficulty,
    explanation: row.explanation ?? "",
    attribution: row.attribution ?? "",
    isPublished: row.is_published,
    sortIndex: row.sort_index,
    draft: draftFromQuestion(rowToQuestion(row)),
  };
}

export type GcQuestionInput = {
  /** اگر باشد یعنی ویرایش. */
  id?: string;
  grade: string;
  lesson: number;
  difficulty: number;
  explanation: string;
  attribution: string;
  isPublished: boolean;
  draft: AuthoredQuestion;
};

/** شناسهٔ محتوایی برای سؤالِ تازه.
 *
 *  الگویش عمداً شبیهِ بسته‌های موجود است (`gc-<پایه>-l<درس>-…`) تا در یک
 *  فهرستِ مرتب‌شده کنارِ هم بنشینند. دنبالهٔ تصادفی است و نه شمارنده: شمارنده
 *  یعنی یک کوئریِ اضافه و یک مسابقه بین دو مدیرِ همزمان. */
function newSourceId(grade: string, lesson: number): string {
  const n = String(lesson).padStart(2, "0");
  return `gc-${grade}-l${n}-panel-${randomBytes(4).toString("hex")}`;
}

function checkInput(input: GcQuestionInput): string | null {
  if (!isValidGradeKey(input.grade)) return "پایهٔ نامعتبر است.";
  if (!isStorableLesson(input.lesson)) return "شمارهٔ درس باید بین ۱ تا ۱۸ باشد.";
  if (![1, 2, 3].includes(input.difficulty)) return "سطحِ سختی نامعتبر است.";
  if (!["sentence", "hemistich", "verse"].includes(input.draft?.type)) {
    return "نوعِ متن نامعتبر است.";
  }
  if (!Array.isArray(input.draft?.tokens) || input.draft.tokens.length === 0) {
    return "متنِ سؤال خالی است.";
  }
  if (input.draft.tokens.length > 60) return "متن نباید بیشتر از ۶۰ واژه باشد.";
  if (input.explanation.length > 600) return "توضیح نباید بیشتر از ۶۰۰ نویسه باشد.";
  if (input.attribution.length > 200) return "مأخذ نباید بیشتر از ۲۰۰ نویسه باشد.";

  for (const token of input.draft.tokens) {
    if (typeof token.text !== "string" || token.text.trim() === "") {
      return "یکی از واژه‌ها خالی است.";
    }
    if (token.text.length > 60) return "یک واژه بیش از حد بلند است.";
    if (typeof token.separatorAfter !== "string") return "جداکنندهٔ یک واژه نامعتبر است.";
    for (const key of token.acceptedRoleKeys ?? []) {
      if (!isGrammarRoleKey(key)) return `نقشِ ناشناخته: «${key}».`;
    }
  }
  for (const key of input.draft.distractorRoleKeys ?? []) {
    if (!isGrammarRoleKey(key)) return `نقشِ ناشناخته: «${key}».`;
  }
  return null;
}

export async function gcAdminSave(input: GcQuestionInput): Promise<SaveResult> {
  const admin = await requireAdmin();

  const problem = checkInput(input);
  if (problem) return { ok: false, error: problem };

  // همان اعتبارسنجِ بازی، روی همان چیزی که ذخیره خواهد شد.
  const built = buildQuestionFromDraft(input.draft, { id: input.id ?? "new" });
  const validation = validateGrammarCircuitQuestion(built);
  if (!validation.ok) {
    return {
      ok: false,
      error: "این سؤال هنوز قابلِ بازی نیست.",
      problems: validation.errors,
    };
  }

  // شناسه و فراداده از ستون‌ها می‌آیند، پس در payload تکرار نمی‌شوند —
  // همان قراردادی که server/rows.ts رویش حساب می‌کند.
  const payload = {
    type: built.type,
    roleDefinitions: built.roleDefinitions,
    tokens: built.tokens,
    pieces: built.pieces,
    ...(built.circuitOrder ? { circuitOrder: built.circuitOrder } : {}),
  };

  const explanation = input.explanation.trim() || null;
  const attribution = input.attribution.trim() || null;
  const sentence = sentenceFromTokens(input.draft.tokens);

  // ⚠️ ویرایش هم شمارش را عوض می‌کند: پرسشی که payloadش خراب شود دیگر
  // معتبر شمرده نمی‌شود. پس مثل انتشار و حذف، کش را باطل می‌کند.
  invalidateAvailability();

  try {
    if (input.id) {
      const id = uuidArg(input.id, "شناسهٔ پرسش نامعتبر است.");
      const updated = await execute(
        `update grammar_circuit_questions
            set grade = $1, lesson = $2, question_type = $3, payload = $4::jsonb,
                difficulty = $5, explanation = $6, attribution = $7, is_published = $8
          where id = $9`,
        [
          input.grade,
          input.lesson,
          built.type,
          JSON.stringify(payload),
          input.difficulty,
          explanation,
          attribution,
          input.isPublished,
          id,
        ],
      );
      if (!updated) return { ok: false, error: "این پرسش پیدا نشد." };

      await recordAudit({
        actor: admin,
        action: "grammar_circuit.question_save",
        targetType: "grammar_circuit_question",
        targetId: id,
        summary: `پرسشِ «${sentence.slice(0, 60)}» ویرایش شد`,
        metadata: { grade: input.grade, lesson: input.lesson, published: input.isPublished },
      });

      return { ok: true, id };
    }

    // سؤالِ تازه به انتهای همان درس می‌رود.
    const row = await queryOne<{ id: string }>(
      `insert into grammar_circuit_questions
         (source_id, grade, lesson, question_type, payload, difficulty,
          explanation, attribution, is_published, sort_index)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9,
               coalesce((select max(sort_index) from grammar_circuit_questions
                          where grade = $2 and lesson = $3), 0) + 1)
       returning id`,
      [
        newSourceId(input.grade, input.lesson),
        input.grade,
        input.lesson,
        built.type,
        JSON.stringify(payload),
        input.difficulty,
        explanation,
        attribution,
        input.isPublished,
      ],
    );
    if (!row) return { ok: false, error: "ذخیرهٔ پرسش ناموفق بود." };

    await recordAudit({
      actor: admin,
      action: "grammar_circuit.question_save",
      targetType: "grammar_circuit_question",
      targetId: row.id,
      summary: `پرسشِ «${sentence.slice(0, 60)}» ساخته شد`,
      metadata: { grade: input.grade, lesson: input.lesson, published: input.isPublished },
    });

    return { ok: true, id: row.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: "شناسهٔ محتوایی تکراری است؛ دوباره تلاش کنید." };
    }
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "gcAdminSave");
    return { ok: false, error: "ذخیرهٔ پرسش ناموفق بود." };
  }
}

export async function gcAdminSetPublished(
  id: string,
  published: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const questionId = uuidArg(id, "شناسهٔ پرسش نامعتبر است.");
  if (typeof published !== "boolean") return { ok: false, error: "مقدار انتشار نامعتبر است." };

  const row = await queryOne<Row>(
    `select id, source_id, grade, lesson, question_type, payload, difficulty,
            explanation, attribution, is_published, sort_index
       from grammar_circuit_questions where id = $1`,
    [questionId],
  );
  if (!row) return { ok: false, error: "این پرسش پیدا نشد." };

  // منتشر کردنِ سؤالِ خراب یعنی مدیر فکر می‌کند منتشرش کرده، ولی بازی
  // بی‌سروصدا کنارش می‌گذارد و هیچ‌کس نمی‌فهمد چرا.
  if (published) {
    const validation = validateGrammarCircuitQuestion(rowToQuestion(row));
    if (!validation.ok) {
      return {
        ok: false,
        error: `این سؤال قابلِ بازی نیست: ${validation.errors[0]}`,
      };
    }
  }

  await execute("update grammar_circuit_questions set is_published = $1 where id = $2", [
    published,
    questionId,
  ]);

  // شمارشِ درس‌ها کش شده و این تغییر آن را کهنه می‌کند — بدونِ این، مدیر تا
  // یک دقیقه اثرِ کارش را در صفحهٔ بازی نمی‌دید.
  invalidateAvailability();

  await recordAudit({
    actor: admin,
    action: "grammar_circuit.question_publish",
    targetType: "grammar_circuit_question",
    targetId: questionId,
    summary: published
      ? `پرسشِ «${row.source_id}» منتشر شد`
      : `پرسشِ «${row.source_id}» از دسترس دانش‌آموزان خارج شد`,
  });

  return { ok: true };
}

export async function gcAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const questionId = uuidArg(id, "شناسهٔ پرسش نامعتبر است.");

  const target = await queryOne<{ source_id: string; grade: string; lesson: number }>(
    "select source_id, grade, lesson from grammar_circuit_questions where id = $1",
    [questionId],
  );

  invalidateAvailability();
  const deleted = await execute("delete from grammar_circuit_questions where id = $1", [
    questionId,
  ]);
  if (!deleted) return { ok: false, error: "این پرسش پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "grammar_circuit.question_delete",
    targetType: "grammar_circuit_question",
    targetId: questionId,
    summary: target ? `پرسشِ «${target.source_id}» حذف شد` : "یک پرسش مدار دستور حذف شد",
    metadata: target ? { grade: target.grade, lesson: target.lesson } : {},
  });

  return { ok: true };
}
