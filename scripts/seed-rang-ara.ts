#!/usr/bin/env node
/**
 * seedِ «رنگ‌آرا» — اختیاری.
 *
 *   npm run db:seed-rang-ara                 # بیت‌های کتاب به‌صورتِ پیش‌نویس
 *   npm run db:seed-rang-ara -- --publish-book   # همان‌ها، منتشرشده
 *   npm run db:seed-rang-ara -- --update     # به‌علاوهٔ به‌روز کردنِ ردیف‌های قبلی
 *   npm run db:seed-rang-ara -- --update --publish-book   # به‌علاوهٔ انتشارِ بیت‌های کتابی که پیش‌نویس مانده‌اند
 *
 * دو دسته بیت وارد می‌شود:
 *
 *   • «خارج از کتاب» — همان بیت‌هایی که بازی تا امروز داشت. *منتشرشده*
 *     وارد می‌شوند، چون تا وقتی دیتابیس خالی است بازی همین‌ها را نشان می‌دهد
 *     و با اولین بیتِ منتشرشدهٔ مدیر، بی‌صدا از بازی بیرون می‌رفتند.
 *   • کتابِ درسی — پیشنهادهایی که از «قلمرو ادبی»ِ رایگانِ درسنامه ساخته
 *     شده‌اند (`scripts/rang-ara/book-seed.ts`). *پیش‌نویس* وارد می‌شوند تا
 *     مدیر بازبینی و خودش منتشر کند.
 *
 * ⚠️ هر ردیف با `source_key` شناخته می‌شود و اگر از قبل باشد **دست نمی‌خورد**:
 * اجرای دوباره نه تکراری می‌سازد و نه ویرایش‌های مدیر را بازنویسی می‌کند.
 * هر بیت پیش از درج با همان `validateVerse` پنل سنجیده می‌شود.
 *
 * `--update` برای وقتی است که خودِ فایلِ seed اصلاح شده (گامِ تازه، آرایهٔ
 * درست‌شده): ردیفی که متن یا گام‌هایش با فایل فرق دارد با فایل یکی می‌شود و
 * کلیدش چاپ می‌شود. ⚠️ ویرایشِ مدیر روی همان ردیف‌ها از دست می‌رود.
 *
 * ⚠️ `--publish-book` به‌تنهایی فقط وضعیتِ ردیف‌های *تازه* را تعیین می‌کند.
 * روی سرورِ اصلی اولین اجرا بی‌آن بود، ۳۸۷ بیتِ کتاب پیش‌نویس درج شدند، و
 * اجراهای بعدی با `--publish-book` (حتی همراهِ `--update`) همه را «از قبل بود»
 * شمردند: این مسیر هیچ‌وقت `is_published` را نمی‌نوشت و بازی فقط ۱۴ بیتِ
 * خارج از کتاب را نشان می‌داد. حالا `--update --publish-book` بیت‌های کتابِ
 * همین seed را که پیش‌نویس‌اند منتشر می‌کند؛ فقط از پیش‌نویس به منتشرشده و
 * هرگز برعکس، بیت‌های خارج از کتاب و ردیف‌های ساختهٔ پنل را دست نمی‌زند، و
 * اجرای دوباره‌اش کاری نمی‌کند. قاعده‌اش در `scripts/rang-ara/plan.ts` است.
 * `--update` بدونِ `--publish-book` وضعیتِ انتشار را دست نمی‌زند.
 */
import { randomUUID } from "node:crypto";
import { connect } from "./mysql/script-db.mjs";
import { parseSteps, validateVerse } from "../lib/rang-ara/verse";
import { buildSeeds, planExisting, type Seed } from "./rang-ara/plan";

const publishBook = process.argv.includes("--publish-book");
const update = process.argv.includes("--update");

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
  sort_index: number;
  is_published: boolean;
};

/** ردیفِ دیتابیس با فایلِ seed فرق دارد؟ گام‌ها از همان `parseSteps` می‌گذرند تا ترتیبِ کلیدها فرق حساب نشود. */
function differs(row: Row, s: Seed): boolean {
  const v = s.verse;
  return (
    row.grade !== v.grade ||
    row.lesson !== v.lesson ||
    row.poet !== v.poet ||
    row.source !== v.source ||
    row.line_1 !== v.lines[0] ||
    row.line_2 !== v.lines[1] ||
    row.meaning !== v.meaning ||
    row.sort_index !== s.sort ||
    JSON.stringify(parseSteps(row.steps)) !== JSON.stringify(parseSteps(v.steps))
  );
}

const seeds = buildSeeds(publishBook);

async function main() {
  const invalid = seeds.flatMap((s) => {
    const problem = validateVerse(s.verse);
    return problem ? [`${s.key}: ${problem}`] : [];
  });
  if (invalid.length) {
    console.error("بیتِ نامعتبر در seed:\n  " + invalid.join("\n  "));
    process.exit(1);
  }

  const conn = await connect();
  let inserted = 0;
  let kept = 0;
  let published = 0;
  let drafts = 0;
  const updated: string[] = [];
  try {
    for (const s of seeds) {
      const v = s.verse;
      const [existing] = await conn.execute(
        `select id, grade, lesson, poet, source, line_1, line_2, meaning, steps, sort_index, is_published
           from rang_ara_verses where source_key = ?`,
        [s.key],
      );
      const row = (existing as Row[])[0];
      if (row) {
        const plan = planExisting(s, { isPublished: row.is_published, changed: differs(row, s) }, update);
        if (plan.sync) {
          await conn.execute(
            `update rang_ara_verses
                set grade = ?, lesson = ?, poet = ?, source = ?, line_1 = ?, line_2 = ?,
                    meaning = ?, steps = ?, sort_index = ?, updated_at = current_timestamp(6)
              where id = ?`,
            [v.grade, v.lesson, v.poet, v.source, v.lines[0], v.lines[1], v.meaning, JSON.stringify(v.steps), s.sort, row.id],
          );
          updated.push(s.key);
        }
        if (plan.publish) {
          // `is_published = 0` در شرط: ردیفی که در این فاصله منتشر شده دوباره شمرده نشود.
          const [res] = await conn.execute(
            `update rang_ara_verses set is_published = 1, updated_at = current_timestamp(6)
              where id = ? and is_published = 0`,
            [row.id],
          );
          if ((res as { affectedRows: number }).affectedRows) published++;
        }
        if (!plan.sync && !plan.publish) {
          kept++;
          if (s.promote && !row.is_published) drafts++;
        }
        continue;
      }
      await conn.execute(
        `insert into rang_ara_verses
           (id, source_key, grade, lesson, poet, source, line_1, line_2, meaning, steps, is_published, sort_index)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          s.key,
          v.grade,
          v.lesson,
          v.poet,
          v.source,
          v.lines[0],
          v.lines[1],
          v.meaning,
          JSON.stringify(v.steps),
          s.published,
          s.sort,
        ],
      );
      inserted++;
    }
  } finally {
    await conn.end();
  }
  console.log(`رنگ‌آرا: ${inserted} بیت وارد شد، ${kept} بیت از قبل بود و دست نخورد.`);
  if (published) console.log(`${published} بیتِ کتاب از پیش‌نویس به منتشرشده رفت.`);
  if (drafts) {
    console.log(
      `${drafts} بیتِ کتاب از قبل پیش‌نویس است و --publish-book به‌تنهایی منتشرش نمی‌کند:\n` +
        "  npm run db:seed-rang-ara -- --update --publish-book",
    );
  }
  if (updated.length) console.log(`${updated.length} بیت با فایلِ seed یکی شد:\n  ${updated.join("\n  ")}`);
  else if (!update && kept && !drafts) console.log("برای به‌روز کردنِ بیت‌هایی که از قبل بودند: npm run db:seed-rang-ara -- --update");
}

void main();
