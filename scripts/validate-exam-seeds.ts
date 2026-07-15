import { farsi3Kherdad1403 } from "../lib/exam/seed-data/farsi3-1403-kherdad";
import { unverifiedParts, validateSeedExam } from "../lib/exam/seed-data/seed-types";

const exams = [farsi3Kherdad1403];

let hadErrors = false;

for (const exam of exams) {
  console.log(`\n=== ${exam.title} ===`);
  const errors = validateSeedExam(exam);
  if (errors.length === 0) {
    console.log("schema + score checks: OK");
  } else {
    hadErrors = true;
    console.log(`schema + score checks: ${errors.length} problem(s)`);
    for (const e of errors) console.log(`  - ${e}`);
  }

  const unverified = unverifiedParts(exam);
  console.log(`unverified parts: ${unverified.length}`);
  for (const u of unverified) console.log(`  ! ${u}`);
}

if (hadErrors) {
  process.exit(1);
}
