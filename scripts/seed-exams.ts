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

import pg from "pg";
import { farsi3Dey1401 } from "../lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "../lib/exam/seed-data/farsi3-1403-kherdad";
import type { SeedExam } from "../lib/exam/seed-data/seed-types";

const exams: { examKey: string; exam: SeedExam }[] = [
  { examKey: "1403-kherdad", exam: farsi3Kherdad1403 },
  { examKey: "1401-dey", exam: farsi3Dey1401 },
];

async function importExam(client: pg.Client, examKey: string, exam: SeedExam) {
  // کل آزمون در یک تراکنش: نسخهٔ قبلی ده‌ها درخواست جدا می‌فرستاد، پس شکست در
  // سؤال چهلم یک آزمونِ نیمه‌کاره در دیتابیس باقی می‌گذاشت که نه کامل بود نه
  // حذف‌شده.
  await client.query("begin");
  try {
    await client.query("delete from exams where exam_session = $1", [examKey]);

    const { rows: examRows } = await client.query<{ id: string }>(
      `insert into exams (subject, grade, title, exam_session, total_score)
       values ($1, $2, $3, $4, $5) returning id`,
      [exam.subject, exam.grade, exam.title, examKey, exam.totalScore],
    );
    const examId = examRows[0].id;

    let questionCount = 0;

    for (const section of exam.sections) {
      const { rows: sectionRows } = await client.query<{ id: string }>(
        `insert into exam_sections (exam_id, title, order_index, section_score)
         values ($1, $2, $3, $4) returning id`,
        [examId, section.title, section.orderIndex, section.sectionScore],
      );
      const sectionId = sectionRows[0].id;

      for (const [qIndex, question] of section.questions.entries()) {
        const { rows: questionRows } = await client.query<{ id: string }>(
          `insert into exam_questions
             (exam_section_id, number, page_ref, instruction, layout_pattern, order_index)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [
            sectionId,
            question.number,
            question.pageRef ?? null,
            question.instruction ?? null,
            question.layoutPattern ?? null,
            qIndex,
          ],
        );
        const questionId = questionRows[0].id;
        questionCount++;

        for (const [partIndex, part] of question.parts.entries()) {
          const { rows: partRows } = await client.query<{ id: string }>(
            `insert into exam_question_parts
               (question_id, part_index, label, type, score, content,
                correct_answer, accepted_answers, grading_mode, ai_grading_hint)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
            [
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
            await client.query(
              `insert into exam_question_options
                 (question_part_id, option_key, order_index, text, is_correct)
               values ($1, $2, $3, $4, $5)`,
              [partRows[0].id, o.optionKey ?? null, i, o.text, o.isCorrect],
            );
          }
        }
      }
    }

    await client.query("commit");
    console.log(`✓ ${examKey} — ${exam.title} (${questionCount} سؤال)`);
  } catch (err) {
    await client.query("rollback");
    throw new Error(`وارد کردن ${examKey} شکست خورد: ${(err as Error).message}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    for (const { examKey, exam } of exams) {
      await importExam(client, examKey, exam);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
