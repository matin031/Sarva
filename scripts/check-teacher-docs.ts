/**
 * آشتی دادنِ دیسک با دیتابیس برای مدارکِ دبیری —
 * `npm run db:check-teacher-docs`
 *
 * =============================================================================
 * ⚠️ پیش‌فرض فقط **گزارش** می‌دهد. برای حذف باید `-- --purge` بدهید.
 * =============================================================================
 *
 * ── چرا وجود دارد ─────────────────────────────────────────────────────────
 * حکمِ کارگزینی یک سندِ هویتی است و نباید بی‌صاحب روی دیسک بماند. سه راه
 * می‌توانست یتیم بسازد:
 *
 *   ۱) حذفِ حسابِ کاربر — ردیف با cascade می‌رفت و فایل می‌ماند.
 *      (حالا `adminDeleteUser` خودش پاک می‌کند، ولی اگر همان حذف شکست
 *       بخورد فقط یک خطِ لاگ می‌ماند.)
 *   ۲) ارسالِ دوباره‌ای که وسطش قطع شود.
 *   ۳) هر خرابیِ دیگری بینِ نوشتنِ فایل و نوشتنِ ردیف.
 *
 * به‌جای سه مکانیزمِ جدا، یک آشتی‌دهندهٔ ساده: هر فایلی که **هیچ ردیفی** به
 * آن اشاره نمی‌کند، یتیم است.
 *
 * ⚠️ «هیچ ردیفی» یعنی کلِ جدول و نه فقط ردیف‌های یک کاربر — وگرنه فایلِ
 * دبیرِ دیگری می‌توانست یتیم شمرده شود. این تنها قاعده‌ای است که هرگز
 * فایلِ زنده را حذف نمی‌کند.
 */
process.loadEnvFile(".env.local");

import { query } from "@/lib/db";
import { listStoredDocumentKeys, removeTeacherDocumentChecked } from "@/lib/teacher/documents";

const purge = process.argv.includes("--purge");

async function main() {
  console.log(
    `آشتی دادنِ مدارکِ دبیری با دیتابیس — ${purge ? "حالتِ حذف" : "فقط گزارش"}\n`,
  );

  const onDisk = await listStoredDocumentKeys();

  /* ⚠️ *همهٔ* کلیدهای جدول، بدونِ هیچ فیلتری روی وضعیت.
     پروندهٔ ردشده هم سندش را نگه می‌دارد (سیاستِ فعلی: مبنای تصمیمِ مدیر
     باید بعداً قابلِ دیدن باشد)، پس ردیفِ `rejected` هم فایلش را زنده نگه
     می‌دارد. */
  const referenced = new Set(
    (await query<{ document_key: string }>("select document_key from teacher_requests")).map(
      (r) => r.document_key,
    ),
  );

  const orphans = onDisk.filter((k) => !referenced.has(k));
  const missing = [...referenced].filter((k) => !onDisk.includes(k));

  console.log(`  فایل روی دیسک        : ${onDisk.length}`);
  console.log(`  ردیف در دیتابیس      : ${referenced.size}`);
  console.log(`  یتیم (فایلِ بی‌ردیف)  : ${orphans.length}`);
  console.log(`  گم‌شده (ردیفِ بی‌فایل) : ${missing.length}`);

  if (missing.length > 0) {
    console.log("\n⚠️ این ردیف‌ها به فایلی اشاره می‌کنند که روی دیسک نیست.");
    console.log("   حذف نمی‌شوند — یعنی مدیر نمی‌تواند آن پرونده‌ها را بررسی کند");
    console.log("   و باید از کاربر خواسته شود دوباره بفرستد:");
    for (const k of missing.slice(0, 20)) console.log(`     ${k}`);
    if (missing.length > 20) console.log(`     … و ${missing.length - 20} مورد دیگر`);
  }

  if (orphans.length === 0) {
    console.log("\n✓ فایلِ یتیمی نیست.");
    process.exit(missing.length > 0 ? 1 : 0);
  }

  console.log("\nفایل‌های یتیم:");
  for (const k of orphans.slice(0, 20)) console.log(`  ${k}`);
  if (orphans.length > 20) console.log(`  … و ${orphans.length - 20} مورد دیگر`);

  if (!purge) {
    console.log("\nبرای حذفشان:  npm run db:check-teacher-docs -- --purge");
    process.exit(1);
  }

  let removed = 0;
  const failed: string[] = [];
  for (const key of orphans) {
    if (await removeTeacherDocumentChecked(key)) removed++;
    else failed.push(key);
  }

  console.log(`\n${removed} فایل حذف شد.`);
  if (failed.length > 0) {
    console.log(`${failed.length} فایل حذف نشد (دسترسی؟ قفل؟):`);
    for (const k of failed) console.log(`  ${k}`);
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nآشتی‌دهنده با خطا متوقف شد:\n", err);
  process.exit(1);
});
