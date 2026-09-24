"use server";

import { randomUUID } from "node:crypto";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { InvalidInputError } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { faNum } from "@/lib/doroos/catalog";
import { verseKey } from "@/lib/rang-ara/bulk";
import type { GradeKey, Step } from "@/lib/rang-ara/content";
import { isGradeKey, parseSteps, storageProblem, validateVerse, type VerseRecord } from "@/lib/rang-ara/verse";

/**
 * مدیریتِ بانکِ بیت‌های «رنگ‌آرا».
 *
 * هر بیت یا به یک درسِ کتاب تعلق دارد (پایه + شمارهٔ درس) یا «خارج از کتاب»
 * است (هر دو NULL). گام‌ها همیشه با هم و در همان ردیف ذخیره می‌شوند؛ پیش از
 * نوشتن، `validateVerse` همان قاعده‌ای را می‌سنجد که بازی هم با آن بیت را
 * می‌پذیرد، پس چیزی که پنل ذخیره کند در بازی هم کار می‌کند.
 */

export type AdminRangAraSummary = {
  id: string;
  grade: GradeKey | null;
  lesson: number | null;
  poet: string;
  firstLine: string;
  stepCount: number;
  isPublished: boolean;
  /** اگر بیت با قاعده‌های فعلی قابلِ بازی نباشد، دلیلش؛ وگرنه null. */
  problem: string | null;
};

export type AdminRangAraVerse = VerseRecord & { isPublished: boolean };

export type RangAraVerseInput = Omit<AdminRangAraVerse, "id"> & { id?: string };

type ActionResult = { ok: true } | { ok: false; error: string };
type SaveResult = { ok: true; id: string } | { ok: false; error: string };

type Row = {
  id: string;
  grade: string | null;
  lesson: number | null;
  poet: string;
  source: string | null;
  line_1: string;
  line_2: string;
  meaning: string | null;
  steps: unknown;
  is_published: boolean;
};

function idArg(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new InvalidInputError("شناسهٔ بیت نامعتبر است.");
  }
  return value;
}

function fromRow(r: Row): AdminRangAraVerse {
  const grade = isGradeKey(r.grade) ? r.grade : null;
  return {
    id: r.id,
    grade,
    lesson: grade ? r.lesson : null,
    poet: r.poet,
    source: r.source,
    lines: [r.line_1, r.line_2],
    meaning: r.meaning,
    steps: parseSteps(r.steps),
    isPublished: r.is_published,
  };
}

/** ورودیِ مرورگر هرگز همان‌طور که آمده باور نمی‌شود. */
function clean(input: RangAraVerseInput): Omit<AdminRangAraVerse, "id"> {
  const grade = isGradeKey(input.grade) ? input.grade : null;
  const lesson = grade && Number.isInteger(input.lesson) ? (input.lesson as number) : null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const lines = Array.isArray(input.lines) ? input.lines : ["", ""];
  return {
    grade,
    lesson,
    poet: str(input.poet),
    source: grade ? null : str(input.source) || null,
    lines: [str(lines[0]), str(lines[1])],
    meaning: str(input.meaning) || null,
    steps: parseSteps(input.steps).map((s: Step) => ({
      ...s,
      explanation: s.explanation.trim(),
      ...(s.tip ? { tip: s.tip.trim() } : {}),
    })),
    isPublished: input.isPublished === true,
  };
}

const SELECT = `select id, grade, lesson, poet, source, line_1, line_2, meaning, steps, is_published
                  from rang_ara_verses`;

export async function rangAraAdminList(): Promise<AdminRangAraSummary[]> {
  await requireAdmin();
  const rows = await query<Row>(
    `${SELECT} order by grade is null, field(grade, 'dahom', 'yazdahom', 'davazdahom'), lesson, sort_index, created_at`,
  );
  return rows.map((r) => {
    const v = fromRow(r);
    return {
      id: v.id,
      grade: v.grade,
      lesson: v.lesson,
      poet: v.poet,
      firstLine: v.lines[0],
      stepCount: v.steps.length,
      isPublished: v.isPublished,
      problem: validateVerse(v),
    };
  });
}

export async function rangAraAdminTotals(): Promise<{ total: number; published: number; broken: number }> {
  const list = await rangAraAdminList();
  return {
    total: list.length,
    published: list.filter((v) => v.isPublished).length,
    broken: list.filter((v) => v.problem).length,
  };
}

export async function rangAraAdminGet(id: string): Promise<AdminRangAraVerse | null> {
  await requireAdmin();
  const row = await queryOne<Row>(`${SELECT} where id = ?`, [idArg(id)]);
  return row ? fromRow(row) : null;
}

export async function rangAraAdminSave(input: RangAraVerseInput): Promise<SaveResult> {
  const admin = await requireAdmin();
  const v = clean(input);
  const problem = validateVerse(v);
  if (problem) return { ok: false, error: problem };

  const steps = JSON.stringify(v.steps);
  try {
    let id: string;
    if (input.id) {
      id = idArg(input.id);
      const updated = await execute(
        `update rang_ara_verses
            set grade = ?, lesson = ?, poet = ?, source = ?, line_1 = ?, line_2 = ?,
                meaning = ?, steps = ?, is_published = ?, updated_at = current_timestamp(6)
          where id = ?`,
        [v.grade, v.lesson, v.poet, v.source, v.lines[0], v.lines[1], v.meaning, steps, v.isPublished, id],
      );
      if (!updated) return { ok: false, error: "این بیت پیدا نشد." };
    } else {
      id = randomUUID();
      /* ⚠️ جدولِ مشتق، چون MySQL اجازه نمی‌دهد زیرکوئریِ یک INSERT از جدولِ
         مقصد بخواند (خطای ۱۰۹۳). بیتِ تازه آخرِ همان درس می‌نشیند. */
      await execute(
        `insert into rang_ara_verses
           (id, grade, lesson, poet, source, line_1, line_2, meaning, steps, is_published, sort_index)
         select ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce(m, 0) + 1
           from (select max(sort_index) as m from rang_ara_verses
                  where grade <=> ? and lesson <=> ?) t`,
        [id, v.grade, v.lesson, v.poet, v.source, v.lines[0], v.lines[1], v.meaning, steps, v.isPublished, v.grade, v.lesson],
      );
    }

    await recordAudit({
      actor: admin,
      action: "rang_ara.verse_save",
      targetType: "rang_ara_verse",
      targetId: id,
      summary: input.id ? `بیتِ «${v.lines[0]}» ویرایش شد` : `بیتِ «${v.lines[0]}» ساخته شد`,
      metadata: { grade: v.grade, lesson: v.lesson, published: v.isPublished, steps: v.steps.length },
    });
    return { ok: true, id };
  } catch (err) {
    if (err instanceof InvalidInputError) return { ok: false, error: err.message };
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "rangAraAdminSave");
    return { ok: false, error: "ذخیرهٔ بیت ناموفق بود." };
  }
}

export type RangAraImportResult =
  | { ok: true; added: number; published: number; duplicates: number }
  | { ok: false; error: string };

/** سقفِ هر بار افزودن؛ بدنهٔ اکشن هم زیرِ سقفِ ۱ مگابایتیِ Next می‌ماند. */
const MAX_IMPORT = 200;

/**
 * افزودنِ انبوه (خروجیِ `parseBulk` در پنل).
 *
 * همه با هم در یک INSERT می‌نشینند یا هیچ‌کدام. بیتی که جایش یا اندازه‌اش
 * ذخیره‌شدنی نیست کلِ درخواست را رد می‌کند؛ بیتی که فقط ناقص است (مثلاً
 * توضیحِ گامی را ندارد) پیش‌نویس ذخیره می‌شود، حتی اگر «منتشر شود» خواسته
 * شده باشد. بیتی که همین حالا در بانک هست (با همان متن، هر جا) کنار گذاشته
 * می‌شود تا چسباندنِ دوبارهٔ یک متن چیزی را تکراری نکند.
 */
export async function rangAraAdminImport(inputs: RangAraVerseInput[]): Promise<RangAraImportResult> {
  const admin = await requireAdmin();
  if (!Array.isArray(inputs) || !inputs.length) return { ok: false, error: "بیتی برای افزودن نیست." };
  if (inputs.length > MAX_IMPORT) return { ok: false, error: `هر بار حداکثر ${faNum(MAX_IMPORT)} بیت.` };

  const verses = inputs.map(clean);
  for (const [i, v] of verses.entries()) {
    const problem = storageProblem(v);
    if (problem) return { ok: false, error: `بیتِ ${faNum(i + 1)}: ${problem}` };
    if (v.isPublished && validateVerse(v)) v.isPublished = false;
  }

  try {
    const existing = await query<{ line_1: string; line_2: string }>("select line_1, line_2 from rang_ara_verses");
    const seen = new Set(existing.map((r) => verseKey([r.line_1, r.line_2])));
    const fresh = verses.filter((v) => {
      const key = verseKey(v.lines);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (fresh.length) {
      const last = await query<{ grade: string | null; lesson: number | null; m: number }>(
        "select grade, lesson, max(sort_index) as m from rang_ara_verses group by grade, lesson",
      );
      const next = new Map(last.map((r) => [`${r.grade}:${r.lesson}`, Number(r.m)]));
      const rows = fresh.map((v) => {
        const place = `${v.grade}:${v.lesson}`;
        const sort = (next.get(place) ?? 0) + 1;
        next.set(place, sort);
        return [randomUUID(), v.grade, v.lesson, v.poet, v.source, v.lines[0], v.lines[1], v.meaning, JSON.stringify(v.steps), v.isPublished, sort];
      });
      await execute(
        `insert into rang_ara_verses
           (id, grade, lesson, poet, source, line_1, line_2, meaning, steps, is_published, sort_index)
         values ${rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
        rows.flat(),
      );
    }

    const published = fresh.filter((v) => v.isPublished).length;
    await recordAudit({
      actor: admin,
      action: "rang_ara.verse_import",
      targetType: "rang_ara_verse",
      targetId: null,
      summary: `${faNum(fresh.length)} بیتِ رنگ‌آرا افزوده شد`,
      metadata: { added: fresh.length, published, duplicates: verses.length - fresh.length },
    });
    return { ok: true, added: fresh.length, published, duplicates: verses.length - fresh.length };
  } catch (err) {
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "rangAraAdminImport");
    return { ok: false, error: "افزودنِ بیت‌ها ناموفق بود." };
  }
}

export async function rangAraAdminSetPublished(id: string, published: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const verseId = idArg(id);
  if (typeof published !== "boolean") return { ok: false, error: "مقدارِ انتشار نامعتبر است." };

  const row = await queryOne<Row>(`${SELECT} where id = ?`, [verseId]);
  if (!row) return { ok: false, error: "این بیت پیدا نشد." };
  const v = fromRow(row);
  /* منتشر کردنِ بیتِ ناقص یعنی مرحله‌ای که بازی کنارش می‌گذارد ولی مدیر فکر
     می‌کند منتشرش کرده. جلویش همین‌جا گرفته می‌شود، نه در سکوت. */
  const problem = published ? validateVerse(v) : null;
  if (problem) return { ok: false, error: `بیتِ ناقص منتشر نمی‌شود: ${problem}` };

  await execute("update rang_ara_verses set is_published = ?, updated_at = current_timestamp(6) where id = ?", [
    published,
    verseId,
  ]);
  await recordAudit({
    actor: admin,
    action: "rang_ara.verse_publish",
    targetType: "rang_ara_verse",
    targetId: verseId,
    summary: published ? `بیتِ «${v.lines[0]}» منتشر شد` : `بیتِ «${v.lines[0]}» از بازی خارج شد`,
  });
  return { ok: true };
}

export async function rangAraAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const verseId = idArg(id);
  const target = await queryOne<{ line_1: string }>("select line_1 from rang_ara_verses where id = ?", [verseId]);
  const deleted = await execute("delete from rang_ara_verses where id = ?", [verseId]);
  if (!deleted) return { ok: false, error: "این بیت پیدا نشد." };
  await recordAudit({
    actor: admin,
    action: "rang_ara.verse_delete",
    targetType: "rang_ara_verse",
    targetId: verseId,
    summary: target ? `بیتِ «${target.line_1}» حذف شد` : "یک بیتِ رنگ‌آرا حذف شد",
  });
  return { ok: true };
}
