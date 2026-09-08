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

// ماژول .mjs مشترکِ اسکریپت‌ها — همان تنظیماتِ اتصالِ lib/db.
import { connect } from "./mysql/script-db.mjs";
import type { RowDataPacket } from "mysql2/promise";

type ExistingRow = RowDataPacket & {
  id: string;
  type: string;
  poem: string[] | null;
  audio_url: string | null;
  o_id: string | null;
  o_poem: string[] | null;
  o_audio_url: string | null;
};

type FxRow = RowDataPacket & { opts: number; ua: number; qaa: number; bm: number };
type CountRow = RowDataPacket & { q: number; o: number };
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

  const conn = await connect(url);

  try {
    // ⚠️ ردیف‌های مسطحِ مرتب و گروه‌بندی در TypeScript، نه تجمیعِ JSON:
    // اثرانگشت به ترتیبِ گزینه‌ها حساس است و ترتیبِ JSON_ARRAYAGG در MySQL
    // تضمین نشده. یک ترتیبِ متفاوت یعنی اثرانگشتِ متفاوت — یعنی سؤالی که
    // باید حذف شود شناسایی نمی‌شد.
    const [flat] = await conn.execute<ExistingRow[]>(
      `select q.id, q.type, q.poem, q.audio_url,
              o.id as o_id, o.poem as o_poem, o.audio_url as o_audio_url
         from questions q
         left join question_options o on o.question_id = q.id
        order by q.id, o.x, o.id`,
    );

    const grouped = new Map<
      string,
      { id: string; type: string; poem: string[] | null; audio_url: string | null;
        options: { poem: string[] | null; audioUrl: string | null }[] }
    >();
    for (const r of flat) {
      let q = grouped.get(r.id);
      if (!q) {
        q = { id: r.id, type: r.type, poem: r.poem, audio_url: r.audio_url, options: [] };
        grouped.set(r.id, q);
      }
      if (r.o_id !== null) q.options.push({ poem: r.o_poem, audioUrl: r.o_audio_url });
    }
    const rows = [...grouped.values()];

    const doomed = rows.filter((r) =>
      seedPrints.has(fingerprint(r.type, r.poem, r.audio_url, r.options)),
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
    // `any($1::uuid[])` سه بار یک آرایه می‌گرفت؛ در MySQL هر فهرست
    // جای‌نگهدارِ خودش را دارد، پس مقدارها چهار بار فرستاده می‌شوند.
    const ph = ids.map(() => "?").join(", ");
    const [fx] = await conn.execute<FxRow[]>(
      `select (select count(*) from question_options      where question_id in (${ph})) as opts,
              (select count(*) from user_answers          where question_id in (${ph})) as ua,
              (select count(*) from quiz_attempt_answers  where question_id in (${ph})) as qaa,
              (select count(*) from user_bookmarks
                where area = 'aruz' and ref_id in (${ph}))                              as bm`,
      [...ids, ...ids, ...ids, ...ids],
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

    await conn.beginTransaction();
    try {
      // نشان‌شده‌ها اول: کلید خارجی ندارند، پس cascade برشان نمی‌دارد و بعد از
      // حذفِ سؤال دیگر نمی‌شود پیدایشان کرد.
      const [delBm] = await conn.execute(
        `delete from user_bookmarks where area = 'aruz' and ref_id in (${ph})`,
        ids,
      );
      const [delQ] = await conn.execute(`delete from questions where id in (${ph})`, ids);
      await conn.commit();
      const n = (r: unknown) => (r as { affectedRows: number }).affectedRows;
      console.log(`\n✓ ${n(delQ)} سؤال حذف شد و ${n(delBm)} نشان‌شده پاک شد.`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const [after] = await conn.execute<CountRow[]>(
      `select (select count(*) from questions) as q,
              (select count(*) from question_options) as o`,
    );
    console.log(`  اکنون در دیتابیس: ${after[0].q} سؤال و ${after[0].o} گزینه.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
