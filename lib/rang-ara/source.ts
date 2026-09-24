import "server-only";
import { query, queryOne } from "@/lib/db";
import { recordError } from "@/lib/admin/audit";
import { OUTSIDE, type Level } from "./content";
import { isGradeKey, parseSteps, toLevel } from "./verse";

/**
 * بیت‌های منتشرشدهٔ «رنگ‌آرا» از دیتابیس.
 *
 * بیتی که `validateVerse` قبولش نکند (مثلاً ردیفی که پیش از قاعده‌ای تازه
 * ذخیره شده) به بازی نمی‌رسد؛ در پنل دیده می‌شود ولی بازیکن را وسطِ یک گامِ
 * بی‌جواب گیر نمی‌اندازد.
 *
 * تا وقتی هیچ بیتِ منتشرشده‌ای نیست، بیت‌های ثابتِ کد نمایش داده می‌شوند تا
 * صفحهٔ بازی خالی نماند — همان قراردادِ `loadJasoosLevels`.
 */
export type RangAraLevelData = { levels: Level[]; fromDatabase: boolean };

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
};

export async function loadRangAraLevels(): Promise<RangAraLevelData> {
  try {
    const rows = await query<Row>(
      `select id, grade, lesson, poet, source, line_1, line_2, meaning, steps
         from rang_ara_verses
        where is_published = 1
        order by grade is null, field(grade, 'dahom', 'yazdahom', 'davazdahom'), lesson, sort_index, created_at`,
    );
    const levels = rows
      .map((r) =>
        toLevel({
          id: r.id,
          grade: isGradeKey(r.grade) ? r.grade : null,
          lesson: isGradeKey(r.grade) ? r.lesson : null,
          poet: r.poet,
          source: r.source,
          lines: [r.line_1, r.line_2],
          meaning: r.meaning,
          steps: parseSteps(r.steps),
        }),
      )
      .filter((l): l is Level => l !== null);
    if (levels.length) return { levels, fromDatabase: true };
  } catch (err) {
    await recordError("db", err, "loadRangAraLevels");
  }
  return { levels: OUTSIDE, fromDatabase: false };
}

/**
 * یک بیت با شناسه، برای داوریِ ثبتِ نتیجه. بیتِ دیتابیس فقط اگر منتشرشده
 * باشد؛ وگرنه بیت‌های ثابتِ کد (همان‌هایی که بازی در نبودِ دیتابیس نشان
 * می‌دهد).
 */
export async function loadRangAraLevel(id: string): Promise<Level | null> {
  const row = await queryOne<Row>(
    `select id, grade, lesson, poet, source, line_1, line_2, meaning, steps
       from rang_ara_verses
      where id = ? and is_published = 1`,
    [id],
  );
  if (!row) return OUTSIDE.find((l) => l.id === id) ?? null;
  return toLevel({
    id: row.id,
    grade: isGradeKey(row.grade) ? row.grade : null,
    lesson: isGradeKey(row.grade) ? row.lesson : null,
    poet: row.poet,
    source: row.source,
    lines: [row.line_1, row.line_2],
    meaning: row.meaning,
    steps: parseSteps(row.steps),
  });
}
