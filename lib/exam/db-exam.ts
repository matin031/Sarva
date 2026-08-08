import "server-only";
import { query, queryOne } from "@/lib/db";
import type { QuestionPartType } from "@/lib/exam/content-schemas";
import type { SeedExam, SeedOption, SeedPart, SeedQuestion } from "./seed-data/seed-types";

/**
 * بازسازی دقیقِ شکل SeedExam از جدول‌های بانک آزمون.
 *
 * عمداً با ماژول‌های ایستای seed-data سازگار مانده: grading.ts و
 * client-exam.ts و format-answer.ts همگی SeedExam مصرف می‌کنند و هیچ‌کدام
 * تغییر نکرده‌اند — تنها چیزی که عوض شده این است که SeedExam از کجا می‌آید.
 *
 * این فایل server-only است چون کلید پاسخ را می‌خواند. toClientExam() قبل از
 * رسیدن به مرورگر آن را حذف می‌کند.
 */
export async function getExamByKey(examKey: string): Promise<SeedExam | null> {
  const exam = await queryOne<{
    id: string;
    subject: string;
    grade: number;
    title: string;
    exam_session: string | null;
    total_score: number;
  }>(
    `select id, subject, grade, title, exam_session, total_score
       from exams where exam_session = $1`,
    [examKey],
  );

  if (!exam) return null;

  // چهار کوئری موازی، نه پشت سر هم.
  //
  // نسخهٔ قبلی مجبور بود ترتیبی باشد: هر مرحله شناسه‌های مرحلهٔ قبل را لازم
  // داشت تا در .in(...) بگذارد. با JOIN، هر چهارتا مستقیماً به exam_id وصل
  // می‌شوند و هم‌زمان اجرا می‌شوند — یعنی تأخیر کل به کندترینشان محدود است،
  // نه جمع هر چهار.
  const [sections, questions, parts, options] = await Promise.all([
    query<{ id: string; title: string; order_index: number; section_score: number }>(
      `select id, title, order_index, section_score
         from exam_sections where exam_id = $1 order by order_index`,
      [exam.id],
    ),
    query<{
      id: string;
      exam_section_id: string;
      number: number;
      page_ref: number | null;
      instruction: string | null;
      layout_pattern: string | null;
    }>(
      `select q.id, q.exam_section_id, q.number, q.page_ref, q.instruction, q.layout_pattern
         from exam_questions q
         join exam_sections s on s.id = q.exam_section_id
        where s.exam_id = $1
        order by q.order_index`,
      [exam.id],
    ),
    query<{
      id: string;
      question_id: string;
      label: string | null;
      type: string;
      score: number;
      content: unknown;
      correct_answer: unknown;
      accepted_answers: unknown;
      grading_mode: string;
      ai_grading_hint: string | null;
    }>(
      `select p.id, p.question_id, p.label, p.type, p.score, p.content,
              p.correct_answer, p.accepted_answers, p.grading_mode, p.ai_grading_hint
         from exam_question_parts p
         join exam_questions q on q.id = p.question_id
         join exam_sections s on s.id = q.exam_section_id
        where s.exam_id = $1
        order by p.part_index`,
      [exam.id],
    ),
    query<{
      question_part_id: string;
      option_key: string | null;
      text: string;
      is_correct: boolean;
    }>(
      `select o.question_part_id, o.option_key, o.text, o.is_correct
         from exam_question_options o
         join exam_question_parts p on p.id = o.question_part_id
         join exam_questions q on q.id = p.question_id
         join exam_sections s on s.id = q.exam_section_id
        where s.exam_id = $1
        order by o.order_index`,
      [exam.id],
    ),
  ]);

  const optionsByPart = new Map<string, SeedOption[]>();
  for (const o of options) {
    const list = optionsByPart.get(o.question_part_id) ?? [];
    list.push({ optionKey: o.option_key ?? undefined, text: o.text, isCorrect: o.is_correct });
    optionsByPart.set(o.question_part_id, list);
  }

  const partsByQuestion = new Map<string, SeedPart[]>();
  for (const p of parts) {
    const seedPart: SeedPart = {
      label: p.label ?? undefined,
      type: p.type as QuestionPartType,
      score: p.score,
      content: p.content as SeedPart["content"],
      correctAnswer: p.correct_answer as SeedPart["correctAnswer"],
      acceptedAnswers: (p.accepted_answers as string[] | null) ?? undefined,
      gradingMode: p.grading_mode as SeedPart["gradingMode"],
      aiGradingHint: p.ai_grading_hint ?? undefined,
      options: optionsByPart.get(p.id),
      // بانک آزمون ستون verified/sourceNote ندارد — هر سؤالی که از پنل تألیف
      // شده، تأییدشده به دست همان کسی که تایپش کرده حساب می‌شود، برخلاف
      // فایل‌های seed که از روی OCR آمده‌اند.
      verified: true,
    };
    const list = partsByQuestion.get(p.question_id) ?? [];
    list.push(seedPart);
    partsByQuestion.set(p.question_id, list);
  }

  const questionsBySection = new Map<string, SeedQuestion[]>();
  for (const q of questions) {
    const seedQuestion: SeedQuestion = {
      number: q.number,
      pageRef: q.page_ref ?? undefined,
      layoutPattern: (q.layout_pattern as SeedQuestion["layoutPattern"]) ?? undefined,
      instruction: q.instruction ?? undefined,
      parts: partsByQuestion.get(q.id) ?? [],
    };
    const list = questionsBySection.get(q.exam_section_id) ?? [];
    list.push(seedQuestion);
    questionsBySection.set(q.exam_section_id, list);
  }

  return {
    subject: exam.subject,
    grade: exam.grade,
    title: exam.title,
    examSession: exam.exam_session ?? examKey,
    totalScore: exam.total_score,
    sourcePdf: "",
    sections: sections.map((s) => ({
      title: s.title,
      orderIndex: s.order_index,
      sectionScore: s.section_score,
      questions: questionsBySection.get(s.id) ?? [],
    })),
  };
}

export type ExamSummary = {
  examKey: string;
  title: string;
  grade: number;
  subject: string;
  totalScore: number;
  questionCount: number;
  createdAt: string | null;
};

/**
 * فهرست صفحهٔ آزمون‌ها، بدون بار کردن بدنهٔ حتی یک سؤال.
 *
 * نسخهٔ قبلی برای شمردن سؤال‌ها به یک aggregate تودرتوی PostgREST تکیه می‌کرد
 * و چون آن قابلیت به نسخهٔ PostgREST وابسته بود، یک مسیر fallback هم داشت که
 * در صورت رد شدن، فهرست را بدون تعداد نشان بدهد. در SQL خام این فقط یک
 * زیرکوئری است — نه شرطی، نه fallback، نه چیزی که در نسخهٔ دیگری خراب شود.
 */
export async function listExamSummaries(): Promise<ExamSummary[]> {
  const rows = await query<{
    exam_session: string | null;
    title: string | null;
    grade: number | null;
    subject: string | null;
    total_score: number | null;
    created_at: string | null;
    question_count: number;
  }>(
    `select e.exam_session, e.title, e.grade, e.subject, e.total_score, e.created_at,
            (select count(*)
               from exam_questions q
               join exam_sections s on s.id = q.exam_section_id
              where s.exam_id = e.id) as question_count
       from exams e
      where e.exam_session is not null
      order by e.created_at desc`,
  );

  return rows.map((r) => ({
    examKey: r.exam_session as string,
    title: r.title ?? "آزمون",
    grade: r.grade ?? 0,
    subject: r.subject ?? "",
    totalScore: r.total_score ?? 20,
    questionCount: r.question_count,
    createdAt: r.created_at,
  }));
}

export async function listExams(): Promise<{ examKey: string; exam: SeedExam }[]> {
  const rows = await query<{ exam_session: string | null }>(
    `select exam_session from exams
      where exam_session is not null
      order by created_at desc`,
  );

  const keys = rows.map((e) => e.exam_session).filter((k): k is string => !!k);
  const exams = await Promise.all(
    keys.map(async (examKey) => ({ examKey, exam: await getExamByKey(examKey) })),
  );

  return exams.filter((e): e is { examKey: string; exam: SeedExam } => e.exam !== null);
}
