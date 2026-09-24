import { seedExams } from "../lib/exam/seed-data";
import { lintSeedExam } from "../lib/exam/seed-data/lint";
import { unverifiedParts, validateSeedExam } from "../lib/exam/seed-data/seed-types";

// همهٔ آزمون‌های lib/exam/seed-data/index.ts را می‌سنجد (به دیتابیس نیاز ندارد):
//   ۱. شِمای Zod و جمعِ بارم‌ها
//   ۲. ساختار: شناسه‌ها، کلیدهای پاسخ، زیرخطِ واژه‌های «مشخص‌شده»
// با --quiet فقط آزمون‌های دارای مشکل چاپ می‌شوند.

const quiet = process.argv.includes("--quiet");
let hadErrors = false;
const keys = new Set<string>();

for (const exam of seedExams) {
  const errors = [...validateSeedExam(exam), ...lintSeedExam(exam).errors];
  const { warnings } = lintSeedExam(exam);
  if (keys.has(exam.examSession)) errors.push(`examSession تکراری: ${exam.examSession}`);
  keys.add(exam.examSession);
  const unverified = unverifiedParts(exam);

  if (quiet && errors.length === 0 && warnings.length === 0) continue;

  console.log(`\n=== ${exam.examSession} — ${exam.title} ===`);
  if (errors.length === 0) {
    console.log("OK");
  } else {
    hadErrors = true;
    console.log(`${errors.length} خطا:`);
    for (const e of errors) console.log(`  ✗ ${e}`);
  }
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (unverified.length) {
    console.log(`unverified: ${unverified.length}`);
    for (const u of unverified) console.log(`  ! ${u}`);
  }
}

console.log(`\n${seedExams.length} آزمون بررسی شد.`);
if (hadErrors) process.exit(1);
