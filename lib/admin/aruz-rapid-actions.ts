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
import { parseUnitSpec, unitPattern, type ParsedUnit } from "@/lib/aruz-rapid/units";

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
  | { ok: true; warning?: string }
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

/** همان دلیلِ lib/aruz-rapid/content.ts: در MariaDB ستونِ JSON رشته برمی‌گردد. */
function readUnits(value: unknown): ParsedUnit[] {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  const units: ParsedUnit[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const u = item as { display?: unknown; length?: unknown };
    if (typeof u.display !== "string" || u.display.length === 0) continue;
    if (u.length !== "short" && u.length !== "long") continue;
    units.push({ display: u.display, length: u.length });
  }
  return units;
}

function toAdmin(r: QuestionRow): AdminRapidAruzQuestion {
  const units = readUnits(r.units);
  return {
    id: r.id,
    previewText: r.preview_text,
    unitSpec: units.map((u) => `${u.display}=${u.length === "short" ? "U" : "-"}`).join(" "),
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

  const rows = await query<QuestionRow>(
    `select id, preview_text, units, meter, attribution, explanation,
            has_unit_overlap, is_published, sort_index
       from aruz_rapid_questions
      order by sort_index, preview_text`,
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

/**
 * الگوی دستیِ مدیر را با موتورِ عروضِ خودِ سروا می‌سنجد.
 *
 * ⚠️ نتیجه‌اش **هشدار** است و نه خطا، و این عمدی است. موتور روی متنِ
 * کاملاً اعراب‌گذاری‌شده گاهی هیچ تقطیعی پیدا نمی‌کند (سکونِ صریح مسیرش را
 * می‌بندد) — همان چیزی که scripts/verify-aruz-rapid.ts هم با آن روبه‌رو بود
 * و راه‌حلش امتحانِ دوبارهٔ متنِ بی‌اعراب است. پس «موتور تأیید نکرد» یعنی
 * «یک بار دیگر نگاه کن»، نه «غلط است»؛ مرجعِ نهایی خودِ مدیر است.
 *
 * ⚠️ و import اش پویاست: موتور lexicon.json را با خودش می‌آورد و دلیلی
 * ندارد در هر اکشنِ دیگری بارگذاری شود.
 */
async function engineWarning(previewText: string, units: ParsedUnit[]): Promise<string | undefined> {
  const mine = unitPattern(units);
  try {
    const { detect } = await import("@/lib/aruz/detect");
    const diacritics = /[ً-ْٰ]/g;

    for (const text of [previewText, previewText.replace(diacritics, "")]) {
      const { rows, s1 } = detect(text);
      if ([...s1.keys()].includes(mine)) return undefined;
      if (rows[0]?.pat === mine) return undefined;
    }

    return "ذخیره شد، ولی موتورِ عروض این الگو را برای این مصراع پیدا نکرد؛ یک بار دیگر هجاها را نگاه کنید.";
  } catch {
    // موتور در دسترس نبود؟ ذخیره نباید به‌خاطرش شکست بخورد.
    return undefined;
  }
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

      return { ok: true, warning: await engineWarning(q.previewText, q.units) };
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

    return { ok: true, warning: await engineWarning(q.previewText, q.units) };
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
 * افزودنِ گروهی از یک متنِ چندخطی.
 *
 * هر خط یک مصراع، و ستون‌ها با `|` جدا می‌شوند:
 *
 *     متنِ مصراع | تَ=U وا=- نا=- | وزن | شاعر
 *
 * ⚠️ جداکننده اینجا فقط `|` و tab است و نه خط تیره — بر خلافِ جفت‌های ادبی.
 * دلیلش سرِ جای خودش روشن است: خطِ تیره در این بازی *نمادِ هجای بلند* است و
 * در ستونِ دوم ده‌ها بار می‌آید.
 *
 * خط‌های خراب باعث شکستِ کل عملیات نمی‌شوند؛ شمارشان با شمارهٔ خط برگردانده
 * می‌شود تا مدیر بداند کدام خط و چرا رد شد.
 */
export type RapidAruzBulkResult =
  | { ok: true; added: number; duplicates: number; failures: string[] }
  | { ok: false; error: string };

export async function aruzRapidAdminBulkAdd(text: string): Promise<RapidAruzBulkResult> {
  const admin = await requireAdmin();

  const lines = text
    .split("\n")
    .map((l, i) => ({ no: i + 1, raw: l.trim() }))
    .filter((l) => l.raw.length > 0 && !l.raw.startsWith("#"));

  if (lines.length === 0) return { ok: false, error: "متنی برای افزودن وارد نشده." };
  if (lines.length > 200) return { ok: false, error: "هر بار حداکثر ۲۰۰ خط." };

  const prepared: Prepared[] = [];
  const failures: string[] = [];

  for (const line of lines) {
    const cols = line.raw.split(/\s*[|\t]\s*/);
    if (cols.length < 2) {
      failures.push(`خط ${line.no}: ستونِ هجاها ندارد.`);
      continue;
    }

    const result = prepare({
      previewText: cols[0],
      unitSpec: cols[1],
      meter: cols[2],
      attribution: cols[3],
    });
    if (!result.ok) {
      failures.push(`خط ${line.no}: ${result.error}`);
      continue;
    }
    prepared.push(result.data);
  }

  if (prepared.length === 0) {
    return {
      ok: false,
      error:
        failures[0] ??
        "هیچ خطی خوانده نشد. هر خط باید «متن مصراع | هجاها | وزن | شاعر» باشد.",
    };
  }

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
