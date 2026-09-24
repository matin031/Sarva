#!/usr/bin/env node
/**
 * seedِ «رنگ‌آرا» — اختیاری.
 *
 *   npm run db:seed-rang-ara                 # بیت‌های کتاب به‌صورتِ پیش‌نویس
 *   npm run db:seed-rang-ara -- --publish-book   # همان‌ها، منتشرشده
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
 */
import { randomUUID } from "node:crypto";
import { connect } from "./mysql/script-db.mjs";
import { OUTSIDE_RAW_LEVELS } from "../lib/rang-ara/content";
import { validateVerse, type VerseRecord } from "../lib/rang-ara/verse";
import { BOOK_RAW } from "./rang-ara/book-seed";

const publishBook = process.argv.includes("--publish-book");

type Seed = { key: string; verse: Omit<VerseRecord, "id">; published: boolean; sort: number };

const seeds: Seed[] = [
  ...OUTSIDE_RAW_LEVELS.map((l, i) => ({
    key: `outside:${l.id}`,
    verse: {
      grade: null,
      lesson: null,
      poet: l.poet,
      source: l.source ?? null,
      lines: l.lines,
      meaning: l.meaning ?? null,
      steps: l.steps,
    },
    published: true,
    sort: i + 1,
  })),
  ...BOOK_RAW.map((l) => ({
    key: `book:${l.id}`,
    verse: {
      grade: l.book.grade,
      lesson: l.book.lesson,
      poet: l.poet,
      source: null,
      lines: [l.lines[0], l.lines[1]] as [string, string],
      meaning: l.meaning,
      steps: l.steps,
    },
    published: publishBook,
    sort: l.book.beyt,
  })),
];

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
  try {
    for (const s of seeds) {
      const [existing] = await conn.execute("select 1 from rang_ara_verses where source_key = ?", [s.key]);
      if ((existing as unknown[]).length) {
        kept++;
        continue;
      }
      const v = s.verse;
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
}

void main();
