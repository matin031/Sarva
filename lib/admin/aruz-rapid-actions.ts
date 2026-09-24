"use server";

import { randomUUID } from "node:crypto";
import {
  query,
  queryOne,
  execute,
  transaction,
  isUniqueViolation,
  isMissingTable,
  missingTableName,
} from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import { recordAudit, recordError } from "@/lib/admin/audit";
import { formatUnitSpec, parseUnitSpec, readStoredUnits, unitPattern, type ParsedUnit } from "@/lib/aruz-rapid/units";
import { fitMeter, meterPattern } from "@/lib/aruz-rapid/scan";

/**
 * محتوای بازی «کوتاه یا بلند؟» از دیدِ مدیر.
 *
 * ⚠️ واحدها همیشه به‌صورتِ *رشتهٔ فشرده* («تَ=U وا=-») بین پنل و سرور
 * جابه‌جا می‌شوند و نه به‌صورتِ آرایه. دلیلش این است که همان رشته چیزی است
 * که مدیر واقعاً تایپ می‌کند — در فرمِ تکی و در افزودنِ انبوه، هر دو. یک
 * قالب، یک تجزیه‌گر، یک جای خطا.
 */
export type AdminRapidAruzQuestion = {
  id: string;
  previewText: string;
  /** همان رشتهٔ فشرده، آمادهٔ نشستن در فرمِ ویرایش. */
  unitSpec: string;
  /** فقط الگو: «U--U-». برای دیدن در فهرست، بدون خواندنِ تک‌تکِ هجاها. */
  pattern: string;
  units: ParsedUnit[];
  meter: string;
  attribution: string;
  explanation: string;
  hasUnitOverlap: boolean;
  isPublished: boolean;
  sortIndex: number;
};

/**
 * ⚠️ `missingTable` یعنی «جدول روی این پایگاه‌داده نیست» و نه «خالی است».

 * این دو را نمی‌شود یکی گرفت. «خالی» یک حالتِ عادی است — بازی با دادهٔ
 * نمایشی کار می‌کند و مدیر هر وقت خواست مصراع اضافه می‌کند. «نیست» یعنی
 * `mysql-migrations/008_aruz_rapid.sql` روی این محیط اجرا نشده و *هیچ* کاری
 * از داخلِ پنل درستش نمی‌کند.
 *
 * روی هاست دقیقاً همین بود و پیامش هم این:
 *
 *     Error: Table 'wybtjehi_sarva.aruz_rapid_questions' doesn't exist
 *     route: /admin/games   ER_NO_SUCH_TABLE
 */
export type RapidAruzTotals = {
  total: number;
  published: number;
  /** نامِ جدولِ گمشده، یا null وقتی همه‌چیز سرِ جایش است. */
  missingTable: string | null;
};

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_PREVIEW = 191;
const MAX_SHORT_TEXT = 191;

type QuestionRow = {
  id: string;
  preview_text: string;
  units: unknown;
  meter: string;
  attribution: string;
  explanation: string | null;
  has_unit_overlap: boolean | number;
  is_published: boolean | number;
  sort_index: number;
};

function toAdmin(r: QuestionRow): AdminRapidAruzQuestion {
  const units = readStoredUnits(r.units);
  return {
    id: r.id,
    previewText: r.preview_text,
    unitSpec: formatUnitSpec(units),
    pattern: unitPattern(units),
    units,
    meter: r.meter,
    attribution: r.attribution,
    explanation: r.explanation ?? "",
    hasUnitOverlap: Boolean(r.has_unit_overlap),
    isPublished: Boolean(r.is_published),
    sortIndex: r.sort_index,
  };
}

export async function aruzRapidAdminList(): Promise<AdminRapidAruzQuestion[]> {
  await requireAdmin();

  // تازه‌ترها بالا؛ وگرنه مصراعِ تازه تهِ صدها ردیفِ seed گم می‌شود.
  const rows = await query<QuestionRow>(
    `select id, preview_text, units, meter, attribution, explanation,
            has_unit_overlap, is_published, sort_index
       from aruz_rapid_questions
      order by created_at desc, sort_index, preview_text`,
  );

  return rows.map(toAdmin);
}

/** برای کارتِ صفحهٔ «بازی‌ها». یک کوئری، نه یک فهرستِ کامل. */
export async function aruzRapidAdminTotals(): Promise<RapidAruzTotals> {
  await requireAdmin();

  /* ⚠️ تنها خطایی که اینجا گرفته می‌شود «جدول نیست» است و نه هر خطایی.

     صفحهٔ /admin/games پنج کارت را با `Promise.all` می‌خواند؛ throw شدنِ
     همین یکی کلِ صفحه را ۵۰۰ می‌کرد — و ۵۰۰ به مدیر نمی‌گوید چه کاری باید
     بکند. حالا صفحه بالا می‌آید و روی همان کارت می‌نویسد کدام migration جا
     مانده است.

     هر خطای دیگری (قطعیِ اتصال، دسترسی) همچنان بالا می‌رود: آن‌ها با اجرای
     یک migration حل نمی‌شوند و پنهان کردنشان یعنی یک پنلِ سالم‌نما روی یک
     دیتابیسِ خراب. */
  try {
    const row = await queryOne<{ total: number; published: number }>(
      `select count(*) as total,
              coalesce(sum(case when is_published = 1 then 1 else 0 end), 0) as published
         from aruz_rapid_questions`,
    );

    return { total: row?.total ?? 0, published: row?.published ?? 0, missingTable: null };
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    return {
      total: 0,
      published: 0,
      missingTable: missingTableName(err) ?? "aruz_rapid_questions",
    };
  }
}

export type RapidAruzInput = {
  id?: string; // اگر باشد یعنی ویرایش
  previewText: string;
  unitSpec: string;
  meter?: string;
  attribution?: string;
  explanation?: string;
  hasUnitOverlap?: boolean;
  isPublished?: boolean;
};

type Prepared = {
  previewText: string;
  units: ParsedUnit[];
  meter: string;
  attribution: string;
  explanation: string | null;
  hasUnitOverlap: boolean;
  isPublished: boolean;
};

/** بررسیِ مشترکِ فرمِ تکی و افزودنِ انبوه. */
function prepare(input: RapidAruzInput): { ok: true; data: Prepared } | { ok: false; error: string } {
  const previewText = input.previewText.trim();
  if (!previewText) return { ok: false, error: "متنِ مصراع را وارد کنید." };
  if (previewText.length > MAX_PREVIEW) {
    return { ok: false, error: `متنِ مصراع نباید بیشتر از ${MAX_PREVIEW} نویسه باشد.` };
  }

  const parsed = parseUnitSpec(input.unitSpec);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.units.length < 2) {
    return { ok: false, error: "یک مصراع دستِ‌کم دو هجا دارد." };
  }
  if (parsed.units.length > 40) {
    return { ok: false, error: "بیشتر از ۴۰ هجا برای یک مصراع پذیرفته نمی‌شود." };
  }

  const meter = (input.meter ?? "").trim();
  const attribution = (input.attribution ?? "").trim();
  if (meter.length > MAX_SHORT_TEXT || attribution.length > MAX_SHORT_TEXT) {
    return { ok: false, error: `وزن و شاعر نباید بیشتر از ${MAX_SHORT_TEXT} نویسه باشند.` };
  }

  /* ⚠️ وزن اجباری است و الگوی هجاها باید با یکی از گونه‌های مجازش بخواند.
     این تنها سدی است که میان یک کلیکِ اشتباه در پنل و صدها دانش‌آموزی که
     «کوتاه» را «بلند» یاد می‌گیرند قرار دارد؛ پنل هم همین را می‌سنجد، ولی
     پنل ورودیِ مورد اعتماد نیست. */
  if (!meter) return { ok: false, error: "وزن را انتخاب کنید." };
  if (!meterPattern(meter)) return { ok: false, error: `وزنِ «${meter}» شناخته نشد.` };
  if (!fitMeter(unitPattern(parsed.units), meter)) {
    return { ok: false, error: "الگوی هجاها با این وزن نمی‌خواند." };
  }

  const explanation = (input.explanation ?? "").trim();

  return {
    ok: true,
    data: {
      previewText,
      units: parsed.units,
      meter,
      attribution,
      explanation: explanation || null,
      hasUnitOverlap: input.hasUnitOverlap ?? false,
      isPublished: input.isPublished ?? true,
    },
  };
}

export async function aruzRapidAdminUpsert(input: RapidAruzInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const prepared = prepare(input);
  if (!prepared.ok) return prepared;
  const q = prepared.data;
  const unitsJson = JSON.stringify(q.units);

  try {
    if (input.id) {
      const id = uuidArg(input.id, "شناسهٔ مصراع نامعتبر است.");
      const updated = await execute(
        `update aruz_rapid_questions
            set preview_text = ?, units = ?, meter = ?, attribution = ?,
                explanation = ?, has_unit_overlap = ?, is_published = ?
          where id = ?`,
        [
          q.previewText,
          unitsJson,
          q.meter,
          q.attribution,
          q.explanation,
          q.hasUnitOverlap,
          q.isPublished,
          id,
        ],
      );
      if (!updated) return { ok: false, error: "این مصراع پیدا نشد." };

      await recordAudit({
        actor: admin,
        action: "aruz_rapid.question_save",
        targetType: "aruz_rapid_question",
        targetId: id,
        summary: `مصراعِ «${q.previewText}» ویرایش شد`,
        metadata: { units: q.units.length },
      });

      return { ok: true };
    }

    // مصراعِ تازه بعد از آخری می‌نشیند. خواندنِ بیشترین sort_index و درج در
    // یک تراکنش‌اند تا دو افزودنِ همزمان یک شماره نگیرند.
    await transaction(async (tx) => {
      await tx.execute(
        // ⚠️ جدولِ مشتق لازم است: MySQL اجازه نمی‌دهد زیرکوئریِ یک INSERT از
        // جدولِ مقصد بخواند (خطای ۱۰۹۳).
        `insert into aruz_rapid_questions
           (id, preview_text, units, meter, attribution, explanation,
            has_unit_overlap, is_published, sort_index)
         select ?, ?, ?, ?, ?, ?, ?, ?, coalesce(m, 0) + 1
           from (select max(sort_index) as m from aruz_rapid_questions) t`,
        [
          randomUUID(),
          q.previewText,
          unitsJson,
          q.meter,
          q.attribution,
          q.explanation,
          q.hasUnitOverlap,
          q.isPublished,
        ],
      );
    });

    await recordAudit({
      actor: admin,
      action: "aruz_rapid.question_save",
      targetType: "aruz_rapid_question",
      summary: `مصراعِ «${q.previewText}» اضافه شد`,
      metadata: { units: q.units.length },
    });

    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `«${q.previewText}» از قبل ثبت شده است.` };
    }
    await recordError("action", err, "aruzRapidAdminUpsert");
    return { ok: false, error: "ذخیرهٔ مصراع ناموفق بود." };
  }
}

export async function aruzRapidAdminPublish(id: string, published: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const questionId = uuidArg(id, "شناسهٔ مصراع نامعتبر است.");

  const updated = await execute(
    "update aruz_rapid_questions set is_published = ? where id = ?",
    [published, questionId],
  );
  if (!updated) return { ok: false, error: "این مصراع پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "aruz_rapid.question_publish",
    targetType: "aruz_rapid_question",
    targetId: questionId,
    summary: published ? "یک مصراع منتشر شد" : "انتشار یک مصراع برداشته شد",
    metadata: { published },
  });

  return { ok: true };
}

export async function aruzRapidAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const questionId = uuidArg(id, "شناسهٔ مصراع نامعتبر است.");

  // قبل از حذف خوانده می‌شود، وگرنه لاگ فقط یک uuid خواهد داشت.
  const target = await queryOne<{ preview_text: string }>(
    "select preview_text from aruz_rapid_questions where id = ?",
    [questionId],
  );

  const deleted = await execute("delete from aruz_rapid_questions where id = ?", [questionId]);
  if (!deleted) return { ok: false, error: "این مصراع پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "aruz_rapid.question_delete",
    targetType: "aruz_rapid_question",
    targetId: questionId,
    summary: target ? `مصراعِ «${target.preview_text}» حذف شد` : "یک مصراع حذف شد",
    metadata: {},
  });

  return { ok: true };
}

/**
 * افزودنِ گروهی.
 *
 * پنل هر خط را خودش تقطیع می‌کند و به مدیر نشان می‌دهد؛ اینجا همان
 * مصراع‌ها با هجاهایشان می‌رسند و دوباره با همان `prepare` سنجیده می‌شوند —
 * پیش‌نمایشِ پنل ورودیِ مورد اعتماد نیست.
 *
 * خط‌های خراب باعث شکستِ کل عملیات نمی‌شوند؛ با شمارهٔ خط برمی‌گردند.
 */
export type RapidAruzBulkResult =
  | { ok: true; added: number; duplicates: number; failures: string[] }
  | { ok: false; error: string };

export type RapidAruzBulkItem = RapidAruzInput & { line: number };

export async function aruzRapidAdminBulkAdd(items: RapidAruzBulkItem[]): Promise<RapidAruzBulkResult> {
  const admin = await requireAdmin();

  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "مصراعی برای افزودن نیست." };
  if (items.length > 200) return { ok: false, error: "هر بار حداکثر ۲۰۰ مصراع." };

  const prepared: Prepared[] = [];
  const failures: string[] = [];

  for (const item of items) {
    const line = Number.isInteger(item?.line) ? item.line : 0;
    if (typeof item?.previewText !== "string" || typeof item.unitSpec !== "string") {
      failures.push(`خط ${line}: دادهٔ نامعتبر.`);
      continue;
    }
    const result = prepare({
      previewText: item.previewText,
      unitSpec: item.unitSpec,
      meter: typeof item.meter === "string" ? item.meter : "",
      attribution: typeof item.attribution === "string" ? item.attribution : "",
      explanation: typeof item.explanation === "string" ? item.explanation : "",
      hasUnitOverlap: item.hasUnitOverlap === true,
    });
    if (!result.ok) {
      failures.push(`خط ${line}: ${result.error}`);
      continue;
    }
    prepared.push(result.data);
  }

  if (prepared.length === 0) return { ok: false, error: failures[0] ?? "هیچ مصراعی پذیرفته نشد." };

  try {
    // on duplicate key update با مقدارِ خودش = «هیچ کاری نکن»، ولی بر خلاف
    // INSERT IGNORE فقط نقضِ کلید یکتا را می‌بلعد و بقیهٔ خطاها را بالا
    // می‌فرستد.
    const added = await transaction(async (tx) => {
      let inserted = 0;
      let next =
        (
          await tx.queryOne<{ max: number }>(
            "select coalesce(max(sort_index), 0) as max from aruz_rapid_questions",
          )
        )?.max ?? 0;

      for (const q of prepared) {
        next++;
        inserted += await tx.execute(
          `insert into aruz_rapid_questions
             (id, preview_text, units, meter, attribution, explanation,
              has_unit_overlap, is_published, sort_index)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?)
           on duplicate key update preview_text = preview_text`,
          [
            randomUUID(),
            q.previewText,
            JSON.stringify(q.units),
            q.meter,
            q.attribution,
            q.explanation,
            q.hasUnitOverlap,
            q.isPublished,
            next,
          ],
        );
      }
      return inserted;
    });

    await recordAudit({
      actor: admin,
      action: "aruz_rapid.question_save",
      targetType: "aruz_rapid_question",
      summary: `${added} مصراع به‌صورت گروهی به «کوتاه یا بلند؟» اضافه شد`,
      metadata: { added, failed: failures.length },
    });

    return {
      ok: true,
      added,
      duplicates: prepared.length - added,
      // پنل فقط چند خطِ اول را نشان می‌دهد؛ بیست خطِ خطا در یک toast خوانده
      // نمی‌شود.
      failures: failures.slice(0, 6),
    };
  } catch (err) {
    await recordError("action", err, "aruzRapidAdminBulkAdd");
    return { ok: false, error: "افزودن گروهی ناموفق بود." };
  }
}
