#!/usr/bin/env node
// بارگذاریِ بستهٔ محتوایی بازیِ «پلِ وزن» در دیتابیس.
//
// مثلِ scripts/migrate.mjs عمداً .mjs و بی‌وابستگی است تا داخلِ کانتینر هم
// اجرا شود، جایی که tsc/tsx وجود ندارد.
//
// اجرای دوباره بی‌خطر است: کلیدِ یکتای `source_id` باعث می‌شود ردیف‌های موجود
// *به‌روز* شوند نه تکرار. پس اگر بستهٔ محتوایی اصلاح شد، کافی است دوباره
// اجرا شود.
//
//     node scripts/seed-aruz-bridge.mjs
//     node scripts/seed-aruz-bridge.mjs --prune   # ردیف‌هایی که دیگر در فایل نیستند حذف شوند

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { connect, upsertKind } from "./mysql/script-db.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "lib", "aruz-bridge", "seed-data", "questions-v1.json");

/* جدولِ رکن → الگوی هجایی.
   نسخهٔ کوچکی از `lib/aruz/meters.ts` است و عمداً اینجا تکرار شده: این اسکریپت
   باید بدونِ گذر از TypeScript اجرا شود، و وارد کردنِ یک ماژولِ .ts از دلِ .mjs
   یعنی افزودنِ یک وابستگیِ ساخت به مسیری که قرار است ساده بماند.
   هر تغییری در آن جدول باید اینجا هم بازتاب پیدا کند. */
const FOOT = {
  "فعولن": "U--", "فعل": "U-", "فعولان": "U---", "فاعلن": "-U-",
  "فاعلاتن": "-U--", "فاعلات": "-U-U", "فعلاتن": "UU--", "فعلات": "UU-U",
  "فعلن": "UU-", "مفاعیلن": "U---", "مفاعیل": "U--U", "مفاعلن": "U-U-",
  "مفاعلتن": "U-UU-", "مستفعلن": "--U-", "مستفعل": "--U", "مستفعلتن": "--UU-",
  "مفعول": "--U", "مفعولن": "---", "مفعولات": "---U", "مفتعلن": "-UU-",
  "متفاعلن": "UU-U-", "متفاعلاتن": "UU-U--", "فع": "-", "لن": "-",
  "فع‌لن": "--",
};

/** فاصلهٔ لِوِنشتاین روی رشتهٔ هجاها. */
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * سختی از *فاصلهٔ دو وزن* می‌آید، نه از حدس.
 *
 * هرچه دو گزینه به هم شبیه‌تر باشند تشخیص سخت‌تر است: یک هجا اختلاف یعنی
 * سطحِ ۳، دو هجا سطحِ ۲، بیشتر سطحِ ۱. اگر رکنی در جدول نبود سطحِ میانی
 * می‌گیرد — محافظه‌کارانه، تا یک ردیفِ ناشناخته به‌اشتباه «آسان» نشود.
 */
function difficultyOf(correct, wrong) {
  const a = FOOT[correct];
  const b = FOOT[wrong];
  if (!a || !b) return 2;
  const d = distance(a, b);
  return d <= 1 ? 3 : d === 2 ? 2 : 1;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[seed-aruz-bridge] ${name} تنظیم نشده است.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const prune = process.argv.includes("--prune");
  const rows = JSON.parse(await readFile(DATA, "utf8"));

  // اعتبارسنجی پیش از هر نوشتنی: بهتر است اسکریپت بمیرد تا اینکه دادهٔ
  // نیم‌بند وارد شود و بازی وسطِ یک دور به پرسشِ بی‌پاسخ بربخورد.
  const problems = [];
  const seen = new Set();
  for (const r of rows) {
    const where = `id=${r?.id}`;
    if (!Number.isInteger(r?.id)) problems.push(`${where}: شناسهٔ نامعتبر`);
    if (seen.has(r.id)) problems.push(`${where}: شناسهٔ تکراری`);
    seen.add(r.id);
    if (!r?.phrase?.trim()) problems.push(`${where}: عبارت خالی`);
    const correct = r?.correctOption === 1 ? r?.option1 : r?.option2;
    const wrong = r?.correctOption === 1 ? r?.option2 : r?.option1;
    if (!correct?.trim() || !wrong?.trim()) problems.push(`${where}: گزینهٔ خالی`);
    if (correct === wrong) problems.push(`${where}: دو گزینهٔ یکسان`);
    // فایل هم `correctOption` دارد هم `correctAnswer`؛ اگر با هم نخوانند،
    // یعنی بسته دستکاری شده و نباید حدس بزنیم کدام درست است.
    if (r?.correctAnswer && r.correctAnswer !== correct) {
      problems.push(`${where}: correctAnswer با correctOption نمی‌خواند`);
    }
  }
  if (problems.length) {
    console.error(`[seed-aruz-bridge] ${problems.length} ایراد در دادهٔ ورودی:`);
    for (const p of problems.slice(0, 20)) console.error("  •", p);
    process.exit(1);
  }

  const conn = await connect(requireEnv("DATABASE_URL"));

  try {
    await conn.beginTransaction();

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const [index, r] of rows.entries()) {
      const correct = r.correctOption === 1 ? r.option1 : r.option2;
      const wrong = r.correctOption === 1 ? r.option2 : r.option1;
      // ⚠️ ترفندِ `returning (xmax = 0)` مالِ PostgreSQL بود و در MySQL لازم
      // هم نیست: خودِ affectedRows در ON DUPLICATE KEY UPDATE معنایی است —
      // ۱ یعنی درج، ۲ یعنی به‌روزرسانی، ۰ یعنی بود و چیزی عوض نشد.
      //
      // نکته: شمارندهٔ «بدون تغییر» عملاً همیشه صفر می‌ماند، چون تریگرِ
      // aruz_bridge_questions_touch روی هر UPDATE ستون updated_at را عوض
      // می‌کند — پس ردیف واقعاً تغییر می‌کند حتی وقتی محتوایش یکی است.
      // همین رفتار در PostgreSQL هم بود (touch_updated_at).
      const [res] = await conn.execute(
        `insert into aruz_bridge_questions
           (id, source_id, phrase, correct_pattern, wrong_pattern, difficulty, sort_index)
         values (?, ?, ?, ?, ?, ?, ?)
         on duplicate key update
           phrase          = values(phrase),
           correct_pattern = values(correct_pattern),
           wrong_pattern   = values(wrong_pattern),
           difficulty      = values(difficulty),
           sort_index      = values(sort_index)`,
        [
          randomUUID(),
          r.id,
          r.phrase.trim(),
          correct.trim(),
          wrong.trim(),
          difficultyOf(correct, wrong),
          index,
        ],
      );
      const kind = upsertKind(res.affectedRows);
      if (kind === "inserted") inserted++;
      else if (kind === "updated") updated++;
      else unchanged++;
    }

    let pruned = 0;
    if (prune) {
      // `<> all($1::int[])` یعنی «هیچ‌کدام از این‌ها نباشد» → `not in (…)`.
      const keep = rows.map((r) => r.id);
      const [res] = await conn.execute(
        `delete from aruz_bridge_questions
          where source_id not in (${keep.map(() => "?").join(", ")})`,
        keep,
      );
      pruned = res.affectedRows ?? 0;
    }

    await conn.commit();
    console.log(
      `[seed-aruz-bridge] ${inserted} ردیفِ تازه، ${updated} به‌روزرسانی، ` +
        `${unchanged} بدون تغییر` +
        (prune ? `، ${pruned} حذف` : "") + ".",
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[seed-aruz-bridge]", err);
  process.exit(1);
});
