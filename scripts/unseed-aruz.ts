// سؤال‌هایی را که با `npm run db:seed-aruz` وارد شده‌اند برمی‌دارد — و فقط
// همان‌ها را.
//
// اجرا:
//     npm run db:unseed-aruz            ← فقط گزارش می‌دهد، چیزی پاک نمی‌کند
//     npm run db:unseed-aruz -- --apply ← واقعاً حذف می‌کند
//
// ⚠️ چرا اثر انگشت و نه «حذف بر اساس تاریخ» یا «حذف همه»:
//
// سؤال‌های بانکِ عروض هیچ ستونی ندارند که بگوید از کجا آمده‌اند — نه برچسبی،
// نه منبعی. پس تنها راهِ دقیق برای جدا کردنشان از سؤال‌هایی که خودِ مدیر
// نوشته، مقایسهٔ *محتوا* است: نوع سؤال، صدا یا بیتِ خودش، و مجموعهٔ
// گزینه‌هایش. دقیقاً همان اثر انگشتی که scripts/seed-aruz.ts برای جلوگیری از
// درج تکراری می‌سازد.
//
// نتیجه‌اش این است که این اسکریپت هرگز نمی‌تواند سؤالی را که در فایل seed
// نیست حذف کند — حتی اگر شبیهش باشد. اگر مدیر یکی از همین سؤال‌ها را در پنل
// ویرایش کرده باشد، اثر انگشتش عوض شده و اینجا دست‌نخورده می‌ماند؛ آن هم
// عمدی است: کارِ دستی نباید با یک اسکریپتِ پاک‌سازی از بین برود.
//
// ⚠️ حذف یک سؤال با cascade این‌ها را هم می‌برد:
//     question_options، user_answers، quiz_attempt_answers
// یعنی سابقهٔ پاسخِ دانش‌آموزان به همین سؤال‌ها. تعدادش پیش از حذف گزارش
// می‌شود.
//
// چرا مستقیم از pg و نه از lib/db: آن ماژول «server-only» را import می‌کند که
// در نودِ خام خطا می‌دهد. (همان دلیلِ scripts/seed-exams.ts و seed-aruz.ts.)

process.loadEnvFile(".env.local");

import pg from "pg";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "lib", "quiz", "seed-data", "aruz-questions.json");
const APPLY = process.argv.includes("--apply");

type SeedOption = { poem?: string[]; audioUrl?: string };
type SeedQuestion = {
  type: string;
  poem?: string[];
  audioUrl?: string;
  options: SeedOption[];
};

/** یکسان‌سازی نویسه‌های عربی/فارسی — همان تابعِ seed-aruz.ts. */
function norm(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(
  type: string,
  poem: string[] | null,
  audioUrl: string | null,
  options: { poem?: string[] | null; audioUrl?: string | null }[],
): string {
  const stem = type === "audio-to-poem" ? (audioUrl ?? "") : norm((poem ?? []).join(" / "));
  const opts = options
    .map((o) => (o.audioUrl ? o.audioUrl : norm((o.poem ?? []).join(" / "))))
    .sort()
    .join("|");
  return `${type}::${stem}::${opts}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  const seeds: SeedQuestion[] = JSON.parse(readFileSync(DATA, "utf8"));
  const seedPrints = new Set(
    seeds.map((s) => fingerprint(s.type, s.poem ?? null, s.audioUrl ?? null, s.options)),
  );

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const { rows } = await client.query<{
      id: string;
      type: string;
      poem: string[] | null;
      audio_url: string | null;
      options: { poem: string[] | null; audio_url: string | null }[];
    }>(
      `select q.id, q.type, q.poem, q.audio_url,
              coalesce(
                json_agg(json_build_object('poem', o.poem, 'audio_url', o.audio_url))
                  filter (where o.id is not null),
                '[]'
              ) as options
         from questions q
         left join question_options o on o.question_id = q.id
        group by q.id, q.type, q.poem, q.audio_url`,
    );

    const doomed = rows.filter((r) =>
      seedPrints.has(
        fingerprint(
          r.type,
          r.poem,
          r.audio_url,
          (r.options ?? []).map((o) => ({ poem: o.poem, audioUrl: o.audio_url })),
        ),
      ),
    );
    const keep = rows.length - doomed.length;

    console.log(`سؤال‌های موجود در دیتابیس : ${rows.length}`);
    console.log(`از بانکِ seed (حذف می‌شود): ${doomed.length}`);
    console.log(`باقی می‌ماند              : ${keep}`);

    if (!doomed.length) {
      console.log("\n✓ هیچ سؤالی از بانکِ seed در دیتابیس نیست. کاری لازم نبود.");
      return;
    }

    const ids = doomed.map((d) => d.id);

    // اثرِ جانبیِ حذف، پیش از انجامش
    const { rows: fx } = await client.query<{ opts: string; ua: string; qaa: string; bm: string }>(
      `select (select count(*) from question_options      where question_id = any($1::uuid[])) as opts,
              (select count(*) from user_answers          where question_id = any($1::uuid[])) as ua,
              (select count(*) from quiz_attempt_answers  where question_id = any($1::uuid[])) as qaa,
              (select count(*) from user_bookmarks
                where area = 'aruz' and ref_id = any($2::text[]))                              as bm`,
      [ids, ids],
    );
    const { opts, ua, qaa, bm } = fx[0];
    console.log(`\nهمراهشان می‌رود (cascade):`);
    console.log(`   گزینه‌ها                : ${opts}`);
    console.log(`   پاسخ‌های دانش‌آموزان     : ${ua}`);
    console.log(`   پاسخ‌های داخل آزمون‌ها   : ${qaa}`);
    console.log(`   نشان‌شده‌های یتیم‌شونده  : ${bm}  (کلید خارجی ندارند، دستی پاک می‌شوند)`);

    if (!APPLY) {
      console.log(`\n⚠️  این فقط گزارش بود؛ هیچ‌چیز حذف نشد.`);
      console.log(`    برای انجام واقعی:  npm run db:unseed-aruz -- --apply`);
      return;
    }

    await client.query("begin");
    try {
      // نشان‌شده‌ها اول: کلید خارجی ندارند، پس cascade برشان نمی‌دارد و بعد از
      // حذفِ سؤال دیگر نمی‌شود پیدایشان کرد.
      const delBm = await client.query(
        `delete from user_bookmarks where area = 'aruz' and ref_id = any($1::text[])`,
        [ids],
      );
      const delQ = await client.query(`delete from questions where id = any($1::uuid[])`, [ids]);
      await client.query("commit");
      console.log(`\n✓ ${delQ.rowCount} سؤال حذف شد و ${delBm.rowCount} نشان‌شده پاک شد.`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    }

    const { rows: after } = await client.query<{ q: string; o: string }>(
      `select (select count(*) from questions) as q,
              (select count(*) from question_options) as o`,
    );
    console.log(`  اکنون در دیتابیس: ${after[0].q} سؤال و ${after[0].o} گزینه.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
