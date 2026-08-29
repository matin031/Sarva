// بانک سؤال عروض سماعی را در `questions` و `question_options` می‌ریزد.
//
// اجرا:
//     npm run db:seed-aruz
//
// دادهٔ خام از چهار بانکِ مارک‌داون استخراج شده و در
// `lib/quiz/seed-data/aruz-questions.json` نشسته است؛ اینجا فقط درج می‌شود.
//
// ⚠️ چهار تصمیم که عمدی‌اند:
//
// ۱) **افزودنی است، نه جایگزین.** برخلاف seed-exams.ts که هر آزمون را اول
//    حذف می‌کند، اینجا حذفی در کار نیست: سؤال‌های عروض ممکن است از پنل
//    مدیریت ویرایش شده باشند و پاک کردنشان یعنی از بین بردن کار دستی.
//
// ۲) **بی‌خطر در اجرای دوباره.** هر سؤال یک «اثر انگشت» دارد: نوعش، صدا یا
//    بیتِ خودش، و مجموعهٔ گزینه‌هایش. همان اثر انگشت از ردیف‌های موجود هم
//    ساخته می‌شود و تکراری‌ها رد می‌شوند.
//
// ۳) **همه در یک تراکنش.** درج نصفه‌کاره یعنی سؤالی بدون گزینه، و چنین
//    سؤالی در /quiz یک کارتِ بی‌گزینه است. یا همه می‌رود یا هیچ.
//
// ۴) **وجود فایل صوتی پیش از درج بررسی می‌شود.** ستون audio_url هیچ
//    محدودیتی در دیتابیس ندارد؛ مسیرِ اشتباه فقط وقتی معلوم می‌شود که
//    دانش‌آموز دکمهٔ پخش را بزند و صدایی نیاید.
//
// چرا مستقیم از pg و نه از lib/db: آن ماژول «server-only» را import می‌کند
// که فقط داخل باندل Next معنی دارد و در نودِ خام خطا می‌دهد. (همان دلیلی که
// scripts/seed-exams.ts هم دارد.)

process.loadEnvFile(".env.local");

import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const DATA = join(ROOT, "lib", "quiz", "seed-data", "aruz-questions.json");

type SeedOption = { poem?: string[]; audioUrl?: string; isCorrect: boolean; x: number };
type SeedQuestion = {
  type: "audio-to-poem" | "poem-to-audio";
  difficulty: "easy" | "medium" | "hard";
  poem?: string[];
  audioUrl?: string;
  options: SeedOption[];
};

/** یکسان‌سازی نویسه‌های عربی/فارسی، تا «ی» و «ي» دو بیتِ متفاوت به نظر نرسند. */
function norm(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** اثر انگشتِ یک سؤال — از فایل و از دیتابیس به یک شکل ساخته می‌شود. */
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

/** همان قواعدی که پنل مدیریت هنگام ساختن سؤال اعمال می‌کند. */
function validate(q: SeedQuestion, i: number): string[] {
  const e: string[] = [];
  if (q.options.length < 2) e.push("کمتر از ۲ گزینه");
  if (q.options.filter((o) => o.isCorrect).length !== 1) e.push("پاسخ صحیح دقیقاً یکی نیست");
  if (q.type === "audio-to-poem") {
    if (!q.audioUrl) e.push("صدای سؤال ندارد");
    if (q.options.some((o) => !o.poem || o.poem.length < 2)) e.push("گزینه‌ای بدون بیتِ دومصراعی");
  } else {
    if (!q.poem || q.poem.length < 2) e.push("بیتِ سؤال دومصراعی نیست");
    if (q.options.some((o) => !o.audioUrl)) e.push("گزینه‌ای بدون فایل صوتی");
  }
  return e.map((m) => `سؤال ${i + 1}: ${m}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  const seeds: SeedQuestion[] = JSON.parse(readFileSync(DATA, "utf8"));

  // ── ۱) اعتبارسنجی شکلِ داده
  const problems = seeds.flatMap((q, i) => validate(q, i));
  if (problems.length) {
    console.error(`✗ ${problems.length} ایراد در دادهٔ seed:`);
    for (const p of problems.slice(0, 10)) console.error("   " + p);
    process.exit(1);
  }

  // ── ۲) وجود فایل‌های صوتی
  const missing = new Set<string>();
  for (const s of seeds) {
    for (const u of [s.audioUrl, ...s.options.map((o) => o.audioUrl)]) {
      if (u && !existsSync(join(AUDIO_DIR, u.replace(/^\/audio\//, "")))) missing.add(u);
    }
  }
  if (missing.size) {
    console.error("✗ این فایل‌های صوتی در public/audio/ نیستند:");
    for (const m of missing) console.error("   " + m);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    // ── ۳) آنچه از قبل هست
    const { rows: existing } = await client.query<{
      type: string;
      poem: string[] | null;
      audio_url: string | null;
      options: { poem: string[] | null; audio_url: string | null }[];
    }>(
      `select q.type, q.poem, q.audio_url,
              coalesce(
                json_agg(json_build_object('poem', o.poem, 'audio_url', o.audio_url))
                  filter (where o.id is not null),
                '[]'
              ) as options
         from questions q
         left join question_options o on o.question_id = q.id
        group by q.id, q.type, q.poem, q.audio_url`,
    );

    const seen = new Set(
      existing.map((r) =>
        fingerprint(
          r.type,
          r.poem,
          r.audio_url,
          (r.options ?? []).map((o) => ({ poem: o.poem, audioUrl: o.audio_url })),
        ),
      ),
    );

    const fresh = seeds.filter((s) => {
      const fp = fingerprint(s.type, s.poem ?? null, s.audioUrl ?? null, s.options);
      if (seen.has(fp)) return false;
      seen.add(fp); // تکرارِ داخلِ خودِ فایل هم رد شود
      return true;
    });

    console.log(
      `فایل: ${seeds.length} سؤال · از قبل موجود: ${seeds.length - fresh.length} · تازه: ${fresh.length}`,
    );
    if (!fresh.length) {
      console.log("✓ چیزی برای افزودن نیست.");
      return;
    }

    // ── ۴) درج
    await client.query("begin");
    try {
      for (const s of fresh) {
        const { rows } = await client.query<{ id: string }>(
          `insert into questions (type, poem, audio_url, difficulty)
           values ($1, $2, $3, $4) returning id`,
          [s.type, s.poem ?? null, s.audioUrl ?? null, s.difficulty],
        );
        const id = rows[0].id;
        for (const o of s.options) {
          await client.query(
            `insert into question_options (question_id, poem, audio_url, is_correct, x)
             values ($1, $2, $3, $4, $5)`,
            [id, o.poem ?? null, o.audioUrl ?? null, o.isCorrect, o.x],
          );
        }
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    }

    const { rows: c } = await client.query<{ q: string; o: string }>(
      `select (select count(*) from questions) as q,
              (select count(*) from question_options) as o`,
    );
    console.log(`✓ ${fresh.length} سؤال افزوده شد. اکنون: ${c[0].q} سؤال و ${c[0].o} گزینه.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
