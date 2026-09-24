// وارد کردن آزمون‌های ایستا (lib/exam/seed-data/index.ts) به جدول‌های بانک آزمون.
//
// بدون این، یک نصب تازه هیچ آزمونی ندارد و صفحهٔ /exam خالی است.
//
// ⚠️ پیش‌فرض فقط «افزودن» است: آزمونی که exam_session اش در دیتابیس هست
// دست نمی‌خورد. جایگزین‌کردن یعنی delete، و exam_attempts با ON DELETE CASCADE
// به exams وصل است — پس جایگزینی کارنامه‌های دانش‌آموزانِ آن آزمون را هم
// پاک می‌کند. برای همین فقط با نامِ صریح:
//
//     npm run db:seed-exams                              ← فقط آزمون‌های تازه
//     npm run db:seed-exams -- --dry-run                 ← فقط گزارش، بدون نوشتن
//     npm run db:seed-exams -- --replace=1403-kherdad    ← جایگزینیِ یک آزمون
//     npm run db:seed-exams -- --replace=all             ← همه (کارنامه‌ها می‌روند)
//
// چرا .ts و نه .mjs مثل بقیهٔ اسکریپت‌ها: داده‌های seed ماژول‌های TypeScript
// اند. و چرا مستقیم از pg استفاده می‌کند نه از lib/db: آن ماژول
// «server-only» را import می‌کند که فقط داخل باندل Next معنی دارد و در نود
// خام خطا می‌دهد.

process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";
import type { Connection } from "mysql2/promise";
// ماژول .mjs مشترکِ اسکریپت‌ها — همان تنظیماتِ اتصالِ lib/db.
import { connect } from "./mysql/script-db.mjs";
import { seedExams } from "../lib/exam/seed-data";
import { lintSeedExam } from "../lib/exam/seed-data/lint";
import { validateSeedExam, type SeedExam } from "../lib/exam/seed-data/seed-types";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const replaceArg = args.find((a) => a.startsWith("--replace="))?.slice("--replace=".length);
const replaceKeys = new Set(replaceArg ? replaceArg.split(",").map((k) => k.trim()) : []);
const replaceAll = replaceKeys.has("all");

async function importExam(conn: Connection, examKey: string, exam: SeedExam) {
  const [existing] = (await conn.execute(
    `select e.id, (select count(*) from exam_attempts a where a.exam_id = e.id) as attempts
       from exams e where e.exam_session = ?`,
    [examKey],
  )) as unknown as [{ id: string; attempts: number }[]];
  const present = existing.length > 0;
  const replace = present && (replaceAll || replaceKeys.has(examKey));

  if (present && !replace) {
    console.log(`– ${examKey} — از قبل هست، دست نخورد`);
    return;
  }
  if (dryRun) {
    console.log(
      replace
        ? `~ ${examKey} — جایگزین می‌شد (${Number(existing[0].attempts)} کارنامه پاک می‌شد)`
        : `+ ${examKey} — اضافه می‌شد`,
    );
    return;
  }

  // کل آزمون در یک تراکنش: نسخهٔ قبلی ده‌ها درخواست جدا می‌فرستاد، پس شکست در
  // سؤال چهلم یک آزمونِ نیمه‌کاره در دیتابیس باقی می‌گذاشت که نه کامل بود نه
  // حذف‌شده.
  await conn.beginTransaction();
  try {
    await conn.execute("delete from exams where exam_session = ?", [examKey]);

    // ⚠️ همهٔ شناسه‌ها اینجا ساخته می‌شوند و نه با RETURNING: MySQL نه
    // DEFAULT تصادفیِ نسخهٔ ۴ دارد و نه RETURNING.
    const examId = randomUUID();
    await conn.execute(
      `insert into exams (id, subject, grade, title, exam_session, total_score)
       values (?, ?, ?, ?, ?, ?)`,
      [examId, exam.subject, exam.grade, exam.title, examKey, exam.totalScore],
    );

    let questionCount = 0;

    for (const section of exam.sections) {
      const sectionId = randomUUID();
      await conn.execute(
        `insert into exam_sections (id, exam_id, title, order_index, section_score)
         values (?, ?, ?, ?, ?)`,
        [sectionId, examId, section.title, section.orderIndex, section.sectionScore],
      );

      for (const [qIndex, question] of section.questions.entries()) {
        const questionId = randomUUID();
        await conn.execute(
          `insert into exam_questions
             (id, exam_section_id, number, page_ref, instruction, layout_pattern, order_index)
           values (?, ?, ?, ?, ?, ?, ?)`,
          [
            questionId,
            sectionId,
            question.number,
            question.pageRef ?? null,
            question.instruction ?? null,
            question.layoutPattern ?? null,
            qIndex,
          ],
        );
        questionCount++;

        for (const [partIndex, part] of question.parts.entries()) {
          const partId = randomUUID();
          await conn.execute(
            `insert into exam_question_parts
               (id, question_id, part_index, label, type, score, content,
                correct_answer, accepted_answers, grading_mode, ai_grading_hint)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              partId,
              questionId,
              partIndex,
              part.label ?? null,
              part.type,
              part.score,
              JSON.stringify(part.content),
              JSON.stringify(part.correctAnswer),
              part.acceptedAnswers === undefined ? null : JSON.stringify(part.acceptedAnswers),
              part.gradingMode,
              part.aiGradingHint ?? null,
            ],
          );

          for (const [i, o] of (part.options ?? []).entries()) {
            await conn.execute(
              `insert into exam_question_options
                 (id, question_part_id, option_key, order_index, text, is_correct)
               values (?, ?, ?, ?, ?, ?)`,
              [randomUUID(), partId, o.optionKey ?? null, i, o.text, o.isCorrect],
            );
          }
        }
      }
    }

    await conn.commit();
    console.log(`✓ ${examKey} — ${exam.title} (${questionCount} سؤال)`);
  } catch (err) {
    await conn.rollback();
    throw new Error(`وارد کردن ${examKey} شکست خورد: ${(err as Error).message}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  // هیچ آزمونِ معیوبی به دیتابیس نمی‌رود — همان سنجشِ `npm run exam:validate`
  const broken = seedExams.flatMap((exam) =>
    [...validateSeedExam(exam), ...lintSeedExam(exam).errors].map((e) => `${exam.examSession}: ${e}`),
  );
  if (broken.length > 0) {
    console.error("✗ آزمون‌ها خطا دارند؛ اول `npm run exam:validate` را درست کنید:");
    for (const b of broken) console.error("  " + b);
    process.exit(1);
  }

  const unknown = [...replaceKeys].filter((k) => k !== "all" && !seedExams.some((e) => e.examSession === k));
  if (unknown.length > 0) {
    console.error(`✗ این کلیدها در seed-data نیستند: ${unknown.join(", ")}`);
    process.exit(1);
  }

  const conn = await connect(url);

  try {
    for (const exam of seedExams) {
      await importExam(conn, exam.examSession, exam);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
