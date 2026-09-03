/**
 * هر مسیر صوتیِ داخل دیتابیس را با فایل‌های واقعیِ public/audio می‌سنجد.
 *
 * چرا لازم شد: `<audio>` وقتی مرورگر برای src چیزی جز صوت بگیرد — یعنی ۴۰۴ —
 * خطای «NotSupportedError: The element has no supported sources» می‌دهد. این
 * خطا هیچ نمی‌گوید کدام ردیف مقصر است، و چون نام فایل‌ها فارسی است دو تله
 * وجود دارد که با چشم دیده نمی‌شوند:
 *
 *   • ي عربی (U+064A) به‌جای ی فارسی (U+06CC)
 *   • ك عربی (U+0643) به‌جای ک فارسی (U+06A9)
 *
 * این دو حرف روی صفحه *دقیقاً* یکسان‌اند. فایل‌های این پروژه همه فارسی‌اند،
 * پس یک وزنِ کپی‌شده از منبعی عربی مسیرِ درست‌به‌نظر ولی هرگز-پیدا-نشدنی
 * می‌سازد.
 *
 * فقط گزارش می‌دهد. هیچ ردیفی را عوض یا حذف نمی‌کند.
 *
 * اجرا:  npm run db:check-audio
 * خروجی: فهرست ردیف‌های خراب، و برای هرکدام نزدیک‌ترین فایلِ موجود.
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const AUDIO_DIR = join(process.cwd(), "public", "audio");

/** حروفِ هم‌شکلِ عربی را به فارسی برمی‌گرداند، فقط برای مقایسه. */
function normalize(s) {
  return s
    .replace(/ي/g, "ی") // ي → ی
    .replace(/ك/g, "ک") // ك → ک
    .replace(/ى/g, "ی") // ى → ی
    .normalize("NFC");
}

/** مسیرِ داخل دیتابیس → نامِ فایل. */
function fileNameOf(url) {
  const clean = url.split("?")[0].split("#")[0];
  const last = clean.split("/").filter(Boolean).pop() ?? "";
  // اگر مسیر درصد-کدگذاری‌شده ذخیره شده باشد، بازش می‌کنیم.
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

const files = existsSync(AUDIO_DIR) ? readdirSync(AUDIO_DIR) : [];
const byNormalized = new Map(files.map((f) => [normalize(f), f]));

if (!files.length) {
  console.error("پوشهٔ public/audio خالی است یا وجود ندارد.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(`
  select q.id::text as question_id, q.type, 'سؤال' as جا, q.audio_url as url
    from questions q
   where q.audio_url is not null and btrim(q.audio_url) <> ''
  union all
  select o.question_id::text, q.type, 'گزینه', o.audio_url
    from question_options o join questions q on q.id = o.question_id
   where o.audio_url is not null and btrim(o.audio_url) <> ''
  order by 2, 1
`);

// ── بخش یکم: ردیف‌هایی که اصلاً مسیر ندارند ──────────────────────────────
//
// این شایع‌ترین علتِ آن خطاست. کامپوننت‌ها `audioSrc || ""` می‌نویسند و
// `<audio src="">` به آدرسِ خودِ صفحه resolve می‌شود؛ مرورگر HTML می‌گیرد و
// همان NotSupportedError را می‌دهد. در پنل ادمین دیده نمی‌شود، چون آنجا فقط
// ردیف‌های پرشده پخش‌کننده دارند.
// ⚠️ NULL بودنِ audio_url به‌خودیِ‌خود خطا نیست — بستگی به نوعِ سؤال دارد:
//
//   audio-to-poem   صوت در صورتِ سؤال است، گزینه‌ها بیت‌اند
//                   → questions.audio_url لازم، option.audio_url طبیعتاً خالی
//   poem-to-audio   صورتِ سؤال بیت است، گزینه‌ها صوت‌اند
//                   → questions.audio_url طبیعتاً خالی، option.audio_url لازم
//
// این دو فهرست از دو جای مستقل درآمده و با هم می‌خوانند: فرم ادمین
// (needsStemAudio و optionsAreAudio در components/admin/QuizQuestionForm.tsx)
// و آنچه واقعاً رندر می‌شود (CircularVisualizer در QuestionCard.tsx برای
// صورتِ سؤال، و موجِ WaveSurfer در QuestionOption.tsx برای گزینه‌ها).
//
// audio-to-pattern عمداً در هیچ‌کدام نیست: نه پخش‌کننده‌ای برای صورتِ
// سؤالش رندر می‌شود نه گزینه‌هایش صوت‌اند، پس هیچ صوتی لازم ندارد.
const STEM_AUDIO = ["audio-to-poem", "audio-to-weight"];
const OPTION_AUDIO = ["poem-to-audio", "pattern-to-audio", "weight-to-audio"];

const missing = (
  await client.query(
    `select q.id::text as question_id, q.type, 'صورت سؤال' as جا, 1 as n
       from questions q
      where q.type = any($1) and (q.audio_url is null or btrim(q.audio_url) = '')
     union all
     select q.id::text, q.type, 'گزینه', count(*)::int
       from questions q join question_options o on o.question_id = q.id
      where q.type = any($2) and (o.audio_url is null or btrim(o.audio_url) = '')
      group by q.id, q.type
      order by 2, 1`,
    [STEM_AUDIO, OPTION_AUDIO],
  )
).rows;

await client.end();

const broken = [];
for (const r of rows) {
  const name = fileNameOf(r.url);
  if (files.includes(name)) continue; // دقیقاً هست

  const near = byNormalized.get(normalize(name));
  broken.push({ ...r, name, near });
}

console.log(`\nمسیرهای صوتیِ بررسی‌شده: ${rows.length}`);
console.log(`فایل‌های موجود در public/audio: ${files.length}`);

if (missing.length) {
  const total = missing.reduce((a, m) => a + m.n, 0);
  console.log(`\n✗ ${total} جای صوتی هیچ مسیری ندارد (در ${missing.length} سؤال):\n`);
  for (const m of missing) {
    console.log(`  [${m.جا}${m.n > 1 ? ` ×${m.n}` : ""}] ${m.type}  سؤال ${m.question_id}`);
  }
  console.log(
    "\n  این‌ها همان‌هایی‌اند که در سایت خطای NotSupportedError می‌دهند:\n" +
      '  مسیرِ خالی به آدرسِ خودِ صفحه تبدیل می‌شود و مرورگر HTML می‌گیرد.\n' +
      "  یا برایشان فایل صوتی بگذارید، یا نوعِ سؤال را عوض کنید.\n",
  );
}

if (!broken.length) {
  if (!missing.length) console.log("\n✓ هر مسیر به یک فایلِ واقعی می‌رسد.\n");
  process.exit(missing.length ? 1 : 0);
}

console.log(`\n✗ ${broken.length} مسیر به هیچ فایلی نمی‌رسد:\n`);

let fixable = 0;
for (const b of broken) {
  console.log(`  [${b.جا}] ${b.type}  سؤال ${b.question_id}`);
  console.log(`    مسیر: ${b.url}`);
  if (b.near) {
    fixable++;
    // همان نام است با حروفِ عربی — یعنی فقط حرف عوض شده.
    console.log(`    ← فایلِ درست همین است: ${b.near}`);
    console.log(`      (فقط ي/ك عربی به ی/ک فارسی عوض شود)`);
  } else {
    console.log(`    ← هیچ فایلِ نزدیکی نیست؛ این وزن اصلاً صوت ندارد.`);
  }
  console.log();
}

if (fixable) {
  console.log(
    `${fixable} تا فقط مشکلِ حروفِ هم‌شکل دارند و با یک update درست می‌شوند:\n\n` +
      `  update questions       set audio_url = replace(replace(audio_url, 'ي', 'ی'), 'ك', 'ک');\n` +
      `  update question_options set audio_url = replace(replace(audio_url, 'ي', 'ی'), 'ك', 'ک');\n`,
  );
}

console.log(`فایل‌های موجود:\n${files.map((f) => "  " + f).join("\n")}\n`);
process.exit(1);
