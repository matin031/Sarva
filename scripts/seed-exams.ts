// وارد کردن دو آزمونِ ایستا (فایل‌های seed-data) به جدول‌های بانک آزمون.
//
// بدون این، یک نصب تازه هیچ آزمونی ندارد و صفحهٔ /exam خالی است.
//
// امن برای اجرای دوباره: هر آزمون با همان exam_session اول حذف می‌شود
// (cascade بخش‌ها و سؤال‌ها و گزینه‌ها را می‌برد)، پس این «جایگزینی» است نه
// «افزودن».
//
// اجرا:
//     npx tsx scripts/seed-exams.ts
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
import { farsi3Dey1401 } from "../lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "../lib/exam/seed-data/farsi3-1403-kherdad";
import type { SeedExam } from "../lib/exam/seed-data/seed-types";

const exams: { examKey: string; exam: SeedExam }[] = [
  { examKey: "1403-kherdad", exam: farsi3Kherdad1403 },
  { examKey: "1401-dey", exam: farsi3Dey1401 },
];

async function importExam(conn: Connection, examKey: string, exam: SeedExam) {
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

  const conn = await connect(url);

  try {
    for (const { examKey, exam } of exams) {
      await importExam(conn, examKey, exam);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
