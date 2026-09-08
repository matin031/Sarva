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

import { randomUUID } from "node:crypto";

import type { RowDataPacket } from "mysql2/promise";

type ExistingRow = RowDataPacket & {
  qid: string;
  type: string;
  poem: string[] | null;
  audio_url: string | null;
  o_id: string | null;
  o_poem: string[] | null;
  o_audio_url: string | null;
};

type CountRow = RowDataPacket & { q: number; o: number };
// ماژول .mjs مشترکِ اسکریپت‌ها — همان تنظیماتِ اتصالِ lib/db.
import { connect } from "./mysql/script-db.mjs";
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

  const conn = await connect(url);

  try {
    // ── ۳) آنچه از قبل هست
    //
    // ⚠️ اثرانگشتِ سؤال به ترتیبِ گزینه‌ها حساس است، پس تجمیعِ JSON اینجا
    // خطرناک بود: JSON_ARRAYAGG در MySQL ترتیبش تضمین نشده است و یک ترتیبِ
    // متفاوت یعنی اثرانگشتِ متفاوت — یعنی سؤالی که از قبل هست دوباره درج
    // می‌شد.
    //
    // پس ردیف‌های مسطحِ مرتب خوانده و در TypeScript گروه می‌شوند.
    const [flat] = await conn.execute<ExistingRow[]>(
      `select q.id as qid, q.type, q.poem, q.audio_url,
              o.id as o_id, o.poem as o_poem, o.audio_url as o_audio_url
         from questions q
         left join question_options o on o.question_id = q.id
        order by q.id, o.x, o.id`,
    );

    const grouped = new Map<
      string,
      { type: string; poem: string[] | null; audio_url: string | null;
        options: { poem: string[] | null; audioUrl: string | null }[] }
    >();
    for (const r of flat) {
      let q = grouped.get(r.qid);
      if (!q) {
        q = { type: r.type, poem: r.poem, audio_url: r.audio_url, options: [] };
        grouped.set(r.qid, q);
      }
      if (r.o_id !== null) q.options.push({ poem: r.o_poem, audioUrl: r.o_audio_url });
    }

    const seen = new Set(
      [...grouped.values()].map((r) => fingerprint(r.type, r.poem, r.audio_url, r.options)),
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
    await conn.beginTransaction();
    try {
      for (const s of fresh) {
        const id = randomUUID();
        // ⚠️ poem آرایه است و ستون JSON؛ بدون JSON.stringify درایور آرایهٔ JS
        // را به نمایشِ متنیِ خودش تبدیل می‌کند.
        await conn.execute(
          `insert into questions (id, type, poem, audio_url, difficulty)
           values (?, ?, ?, ?, ?)`,
          [id, s.type, s.poem ? JSON.stringify(s.poem) : null, s.audioUrl ?? null, s.difficulty],
        );
        for (const o of s.options) {
          await conn.execute(
            `insert into question_options (id, question_id, poem, audio_url, is_correct, x)
             values (?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(),
              id,
              o.poem ? JSON.stringify(o.poem) : null,
              o.audioUrl ?? null,
              o.isCorrect,
              o.x,
            ],
          );
        }
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const [c] = await conn.execute<CountRow[]>(
      `select (select count(*) from questions) as q,
              (select count(*) from question_options) as o`,
    );
    console.log(`✓ ${fresh.length} سؤال افزوده شد. اکنون: ${c[0].q} سؤال و ${c[0].o} گزینه.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
