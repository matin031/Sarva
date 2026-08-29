#!/usr/bin/env node
/**
 * بارگذاریِ بستهٔ محتوایی بازیِ «مدار دستور» در دیتابیس.
 *
 * برخلافِ seed-aruz-bridge که .mjs است، این یکی TypeScript است و با tsx اجرا
 * می‌شود — همان قراردادِ `db:seed-exams`. دلیلش یک تصمیمِ آگاهانه است: پیش از
 * نوشتن، هر پرسش باید از *همان* اعتبارسنجِ بازی رد شود، شاملِ آزمونِ
 * بن‌بست‌ناپذیری. تکرارِ آن الگوریتم در یک فایلِ .mjs یعنی دو حقیقتِ موازی که
 * روزی از هم دور می‌شوند؛ و آن روز، پرسشی وارد دیتابیس می‌شود که بازی
 * نمی‌تواند حلش کند.
 *
 *     DATABASE_URL=… npm run db:seed-grammar-circuit
 *     DATABASE_URL=… tsx scripts/seed-grammar-circuit.ts path/to/file.json
 *     DATABASE_URL=… tsx scripts/seed-grammar-circuit.ts --prune
 *
 * اجرای دوباره بی‌خطر است: `source_id` یکتاست، پس ردیف‌های موجود *به‌روز*
 * می‌شوند نه تکرار. حذف هیچ‌وقت پیش‌فرض نیست و فقط با `--prune` انجام می‌شود.
 */
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { isStorableLesson, isValidGradeKey } from "../lib/grammar-circuit/curriculum";
import type { GrammarCircuitQuestion } from "../lib/grammar-circuit/types";
import { validateGrammarCircuitQuestion } from "../lib/grammar-circuit/validator";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_DIR = join(ROOT, "lib", "grammar-circuit", "seed-data");

/** همهٔ بسته‌های محتوایی، به ترتیبِ نام.
 *
 *  محتوا در چند فایل زندگی می‌کند نه یکی: بستهٔ هر پایه جدا رشد می‌کند و
 *  یک فایلِ چندهزارخطی که همه با هم ویرایشش کنند، دیر یا زود merge conflict
 *  می‌شود. بارگذاری همیشه *همهٔ* بسته‌ها را با هم می‌بیند، چون یکتاییِ
 *  `sourceId` باید در کلِ مجموعه برقرار باشد، نه فقط داخلِ یک فایل. */
async function discoverPacks(): Promise<string[]> {
  const entries = await readdir(SEED_DIR);
  return entries
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => join(SEED_DIR, name));
}

interface SeedRecord {
  sourceId: string;
  grade: string;
  lesson: number;
  type?: GrammarCircuitQuestion["type"];
  difficulty?: number;
  isPublished?: boolean;
  sortIndex?: number;
  explanation?: string;
  attribution?: string;
  roleDefinitions: GrammarCircuitQuestion["roleDefinitions"];
  tokens: GrammarCircuitQuestion["tokens"];
  pieces: GrammarCircuitQuestion["pieces"];
  circuitOrder?: string[];
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "[seed-grammar-circuit] DATABASE_URL تنظیم نشده است.\n" +
        "  در داکر از docker-compose می‌آید؛ برای اجرای محلی در .env.local بگذارید.",
    );
    process.exit(1);
  }
  return url;
}

/** اعتبارسنجیِ کامل، *پیش از* هر نوشتنی. */
function validateBatch(records: SeedRecord[], originOf: (i: number) => string): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const at = (msg: string) =>
      errors.push(`${originOf(index)} — رکوردِ ${record?.sourceId ?? `#${index + 1}`}: ${msg}`);

    if (!record || typeof record !== "object") return at("شیء معتبر نیست.");
    if (!record.sourceId || typeof record.sourceId !== "string") return at("sourceId ندارد.");
    if (seen.has(record.sourceId)) at(`sourceId تکراری: ${record.sourceId}`);
    seen.add(record.sourceId);

    if (!isValidGradeKey(record.grade)) at(`پایهٔ نامعتبر: ${record.grade}`);
    if (!isStorableLesson(record.lesson)) at(`شمارهٔ درسِ نامعتبر: ${record.lesson}`);
    if (record.difficulty !== undefined && ![1, 2, 3].includes(record.difficulty)) {
      at(`سختیِ نامعتبر: ${record.difficulty}`);
    }
    if (record.type && !["sentence", "hemistich", "verse"].includes(record.type)) {
      at(`نوعِ نامعتبر: ${record.type}`);
    }

    // همان اعتبارسنجِ بازی: شناسه‌ها، ارجاع‌ها، ترتیبِ مدار، حل‌پذیری و
    // بن‌بست‌ناپذیری.
    const question: GrammarCircuitQuestion = {
      id: record.sourceId,
      type: record.type ?? "sentence",
      tokens: record.tokens,
      roleDefinitions: record.roleDefinitions,
      pieces: record.pieces,
      ...(record.circuitOrder ? { circuitOrder: record.circuitOrder } : {}),
    };
    const result = validateGrammarCircuitQuestion(question);
    if (!result.ok) result.errors.forEach(at);
  });

  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const prune = args.includes("--prune");
  const fileArgs = args.filter((a) => !a.startsWith("--"));
  const paths =
    fileArgs.length > 0
      ? fileArgs.map((a) => resolve(process.cwd(), a))
      : await discoverPacks();

  if (paths.length === 0) {
    console.error(`[seed-grammar-circuit] هیچ بستهٔ محتوایی‌ای در ${SEED_DIR} نیست.`);
    process.exit(1);
  }

  const databaseUrl = requireDatabaseUrl();

  // `origins` برای هر رکورد می‌گوید از کدام فایل آمده، تا خطا قابلِ ردیابی
  // باشد؛ در یک مجموعهٔ چندصدتایی «رکوردِ ۴۱۲» به‌تنهایی بی‌فایده است.
  const records: SeedRecord[] = [];
  const origins: string[] = [];
  for (const dataPath of paths) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(dataPath, "utf8"));
    } catch (err) {
      console.error(`[seed-grammar-circuit] خواندنِ ${dataPath} ناموفق بود:`, err);
      process.exit(1);
    }
    if (!Array.isArray(parsed)) {
      console.error(`[seed-grammar-circuit] ${basename(dataPath)} باید یک آرایه باشد.`);
      process.exit(1);
    }
    const label = basename(dataPath);
    for (const record of parsed as SeedRecord[]) {
      records.push(record);
      origins.push(label);
    }
    console.log(`[seed-grammar-circuit] ${label}: ${parsed.length} رکورد`);
  }

  const errors = validateBatch(records, (i) => origins[i] ?? "?");
  if (errors.length > 0) {
    console.error(
      `[seed-grammar-circuit] ${errors.length} خطا در بسته. هیچ ردیفی نوشته نشد:\n` +
        errors.map((e) => `  • ${e}`).join("\n"),
    );
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;
  let pruned = 0;

  try {
    // کلِ بسته در یک تراکنش: یا همه می‌نشیند یا هیچ‌کدام. نصفه‌نوشتن یعنی
    // مخزنی که نه نسخهٔ قبلی است نه نسخهٔ جدید.
    await client.query("begin");

    for (const r of records) {
      const payload = {
        type: r.type ?? "sentence",
        roleDefinitions: r.roleDefinitions,
        tokens: r.tokens,
        pieces: r.pieces,
        ...(r.circuitOrder ? { circuitOrder: r.circuitOrder } : {}),
      };
      const res = await client.query<{ inserted: boolean }>(
        `insert into grammar_circuit_questions
           (source_id, grade, lesson, question_type, payload, difficulty,
            explanation, attribution, is_published, sort_index)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)
         on conflict (source_id) do update set
           grade = excluded.grade,
           lesson = excluded.lesson,
           question_type = excluded.question_type,
           payload = excluded.payload,
           difficulty = excluded.difficulty,
           explanation = excluded.explanation,
           attribution = excluded.attribution,
           is_published = excluded.is_published,
           sort_index = excluded.sort_index
         returning (xmax = 0) as inserted`,
        [
          r.sourceId,
          r.grade,
          r.lesson,
          r.type ?? "sentence",
          JSON.stringify(payload),
          r.difficulty ?? 2,
          r.explanation ?? null,
          r.attribution ?? null,
          r.isPublished ?? false,
          r.sortIndex ?? 0,
        ],
      );
      if (res.rows[0]?.inserted) inserted++;
      else updated++;
    }

    if (prune) {
      const ids = records.map((r) => r.sourceId);
      const res = await client.query(
        `delete from grammar_circuit_questions where not (source_id = any($1::text[]))`,
        [ids],
      );
      pruned = res.rowCount ?? 0;
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    console.error("[seed-grammar-circuit] نوشتن ناموفق بود؛ تراکنش برگشت خورد:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  console.log(
    `[seed-grammar-circuit] ${records.length} رکورد پردازش شد — ` +
      `${inserted} تازه، ${updated} به‌روز${prune ? `، ${pruned} حذف` : ""}.`,
  );
}

void main();
