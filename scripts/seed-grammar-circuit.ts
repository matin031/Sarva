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
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { isStorableLesson, isValidGradeKey } from "../lib/grammar-circuit/curriculum";
import type { GrammarCircuitQuestion } from "../lib/grammar-circuit/types";
import { validateGrammarCircuitQuestion } from "../lib/grammar-circuit/validator";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATA = join(ROOT, "lib", "grammar-circuit", "seed-data", "questions-v1.json");

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
function validateBatch(records: SeedRecord[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const at = (msg: string) => errors.push(`رکوردِ ${index + 1} (${record?.sourceId ?? "?"}): ${msg}`);

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
  const fileArg = args.find((a) => !a.startsWith("--"));
  const dataPath = fileArg ? resolve(process.cwd(), fileArg) : DEFAULT_DATA;

  const databaseUrl = requireDatabaseUrl();

  let records: SeedRecord[];
  try {
    records = JSON.parse(await readFile(dataPath, "utf8"));
  } catch (err) {
    console.error(`[seed-grammar-circuit] خواندنِ ${dataPath} ناموفق بود:`, err);
    process.exit(1);
  }
  if (!Array.isArray(records)) {
    console.error("[seed-grammar-circuit] فایل باید یک آرایه باشد.");
    process.exit(1);
  }

  const errors = validateBatch(records);
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
