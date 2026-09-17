import "server-only";
import { query, queryOne } from "@/lib/db";
import { groupIntoSessions } from "@/lib/panel/format";
import { getExamByKey } from "@/lib/exam/db-exam";
import {
  answerKey,
  answerText,
  num,
  readAttemptQuestions,
  readJsonObject,
  type StoredPart,
} from "@/lib/exam/attempt-view";
import { accuracyOrNull } from "./analytics-rules";
import { getStudentForTeacher } from "./analytics";

/**
 * عملکردِ **دقیقِ** یک دانش‌آموز — نه خلاصه، خودِ چیزی که انجام داده.
 *
 * =============================================================================
 * ⚠️ چرا جدا از `student-report.ts`
 * =============================================================================
 *
 * آن فایل خلاصه می‌دهد: «۳۴ از ۵۰، ۶۸٪». این یکی جزئیات می‌دهد: کدام آزمون،
 * کدام سؤال، کدام مصراع، کدام واژه.
 *
 * یکی کردنشان وسوسه‌انگیز بود و غلط: صفحهٔ خلاصه در هر بار باز شدن همهٔ
 * جزئیات را می‌کشید — برای دانش‌آموزی با هزار پاسخِ پلِ وزن، مگابایت‌ها
 * JSON برای ساختنِ یک درصد. همان استدلالی که `student-report.ts` برای
 * نیاوردنِ `question_results` در فهرستِ آزمون‌ها دارد، و اینجا هم برقرار
 * است — فقط از آن سمت.
 *
 * =============================================================================
 * ⚠️⚠️ دسترسی — و چرا در *هر* تابع تکرار شده
 * =============================================================================
 *
 * هر تابعِ این فایل خطِ اولش `getStudentForTeacher` است. تکرار عمدی است و
 * «تمیزش» نکنید:
 *
 *   • شناسهٔ دانش‌آموز و شناسهٔ تلاش هر دو از **نوارِ آدرس** می‌آیند.
 *   • RLS نداریم (بالای `AGENTS.md`)؛ هر قاعدهٔ دسترسی در کدِ برنامه است.
 *   • یک نگهبانِ مشترک در لایهٔ بالاتر یعنی هر مسیرِ تازه‌ای که فردا اضافه
 *     شود، باید *یادش بماند* صدایش بزند. اینجا فراموش کردنش ممکن نیست،
 *     چون بدونِ آن هیچ داده‌ای در دست نیست.
 *
 * ⚠️ و شرطِ مالکیتِ خودِ ردیف هم جداگانه در `where` است
 * (`user_id = ?`). `getStudentForTeacher` می‌گوید «این دبیر حق دارد این
 * دانش‌آموز را ببیند»؛ چیزی دربارهٔ اینکه *این تلاش* مالِ همان دانش‌آموز
 * است نمی‌گوید. بدونِ شرطِ دوم، یک دبیرِ واقعی با شناسهٔ تلاشِ یک غریبه
 * می‌توانست کارنامهٔ او را بخواند.
 */

/* ═══════════════════════════ آزمون ══════════════════════════════════════ */

/** یک بخشِ تصحیح‌شده، آماده برای نمایش. */
export type ExamPartLine = {
  label: string | null;
  score: number;
  max: number;
  status: StoredPart["status"];
  /** پاسخِ درست، همان‌طور که تصحیح‌گر نوشته. */
  correctAnswerText: string | null;
  /** پاسخی که دانش‌آموز داده — رشتهٔ خالی یعنی چیزی ننوشته. */
  answer: string;
};

/** یک سؤال در کارنامه، همان‌طور که دبیر می‌بیند. */
export type ExamQuestionLine = {
  number: number;
  score: number;
  max: number;
  /** صورتِ سؤال — `null` یعنی از آن موقع از برگه حذف شده. */
  instruction: string | null;
  /** نامِ بخشِ برگه («درک مطلب»، «آرایه‌های ادبی»، …). */
  section: string | null;
  parts: ExamPartLine[];
};

export type StudentExamAttempt = {
  id: string;
  examTitle: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  questions: ExamQuestionLine[];
};

export async function getStudentExamAttempt(
  teacherId: string,
  studentId: string,
  attemptId: string,
  classId?: string | null,
): Promise<StudentExamAttempt | null> {
  const student = await getStudentForTeacher(teacherId, studentId, classId);
  if (!student) return null;

  const row = await queryOne<{
    id: string;
    total_score: number;
    max_score: number;
    created_at: string;
    question_results: unknown;
    answers: unknown;
    exam_session: string | null;
    exam_title: string | null;
  }>(
    /* ⚠️ `a.user_id = ?` جدا از نگهبانِ بالاست و حذف‌شدنی نیست — توضیحش
       بالای همین فایل. */
    `select a.id, a.total_score, a.max_score, a.created_at,
            a.question_results, a.answers,
            e.exam_session, e.title as exam_title
       from exam_attempts a
       left join exams e on e.id = a.exam_id
      where a.id = ? and a.user_id = ?`,
    [attemptId, studentId],
  );
  if (!row) return null;

  const graded = readAttemptQuestions(row.question_results);
  const answers = readJsonObject(row.answers);

  /* صورتِ سؤال‌ها، تا دبیر نبیند «سؤال ۷: ۰ از ۲» بی‌آنکه بداند سؤال ۷ چه
     بوده.

     ⚠️ اگر برگه خوانده نشد، کارنامه *باز هم* نشان داده می‌شود و فقط
     صورتِ سؤال‌ها خالی می‌ماند. یک خطای خواندنِ برگه نباید نمره‌ای را که
     در دیتابیس هست پنهان کند. */
  const paper = row.exam_session ? await examPaper(row.exam_session) : null;

  const questions: ExamQuestionLine[] = graded.map((q) => ({
    number: q.number,
    score: q.score,
    max: q.max,
    instruction: paper?.get(q.number)?.instruction ?? null,
    section: paper?.get(q.number)?.section ?? null,
    parts: q.parts.map((part, index) => ({
      label: part.label ?? null,
      score: num(part.score),
      max: num(part.maxScore),
      status: part.status,
      correctAnswerText: part.correctAnswerText ?? null,
      /* ⚠️ کلیدِ پاسخ از `q.key` ساخته می‌شود و نه از `q.number`.

         این دو معمولاً یکی‌اند ولی نه همیشه: ردیف‌های قدیمی `number` را
         داخلِ شیء ندارند و آن‌وقت `number` از خودِ کلید حدس زده می‌شود.
         استفاده از کلیدِ خام، همان رشته‌ای را می‌سازد که موقعِ ذخیره ساخته
         شده بود. */
      answer: answerText(answers[answerKey(q.key, index)]),
    })),
  }));

  return {
    id: row.id,
    examTitle: row.exam_title ?? "آزمون",
    totalScore: num(row.total_score),
    maxScore: num(row.max_score),
    createdAt: row.created_at,
    questions,
  };
}

/**
 * شمارهٔ سؤال → صورتِ سؤال و نامِ بخش.
 *
 * ⚠️ از `getExamByKey` خوانده می‌شود و نه با یک کوئریِ تازه — دقیقاً همان
 * کاری که `app/panel/exam/page.tsx` برای پنلِ خودِ دانش‌آموز می‌کند. یک
 * کوئریِ دوم یعنی روزی که ساختارِ برگه عوض شود، یکی از این دو بی‌صدا عقب
 * می‌ماند.
 *
 * ⚠️ خطا بلعیده می‌شود و `null` برمی‌گردد: نبودنِ صورتِ سؤال یک کارنامهٔ
 * ناقص است، ولی throw کردنش یک صفحهٔ ۵۰۰ است — و نمره‌ها که سرِ جایشان
 * هستند.
 */
async function examPaper(
  examKey: string,
): Promise<Map<number, { instruction: string; section: string }> | null> {
  try {
    const exam = await getExamByKey(examKey);
    if (!exam) return null;

    const map = new Map<number, { instruction: string; section: string }>();
    for (const section of exam.sections) {
      for (const question of section.questions) {
        map.set(question.number, {
          instruction: question.instruction ?? "",
          section: section.title,
        });
      }
    }
    return map;
  } catch (err) {
    console.error(`teacher/student-detail: could not load paper ${examKey} —`, err);
    return null;
  }
}

/* ═══════════════════════════ پلِ وزن ════════════════════════════════════ */

/** یک پاسخِ پلِ وزن. */
export type BridgeAnswerLine = {
  id: string;
  phrase: string;
  correctPattern: string;
  /** `null` یعنی وقت تمام شد و بازیکن اصلاً چیزی انتخاب نکرد. */
  chosenPattern: string | null;
  isCorrect: boolean;
  difficulty: number | null;
  answeredAt: string;
};

/** یک نشست — چند پاسخ که پشتِ‌هم داده شده‌اند. */
export type BridgeSession = {
  startedAt: string;
  endedAt: string;
  total: number;
  correct: number;
  accuracy: number | null;
  answers: BridgeAnswerLine[];
};

/**
 * ⚠️ سقفِ ردیف، و چرا این عدد.
 *
 * دانش‌آموزِ فعال در یک ترم به‌راحتی هزار پاسخِ پلِ وزن دارد. کشیدنِ همه‌شان
 * برای یک صفحه نه لازم است و نه بی‌هزینه: هر ردیف یک مصراع و دو الگوی وزنی
 * دارد.
 *
 * چهارصد یعنی حدودِ بیست نشستِ اخیر — که برای «ببینم آخرین بارها چطور بوده»
 * کافی است و برای «کلِ تاریخچه» نیست. اگر روزی دومی لازم شد، راهش
 * صفحه‌بندیِ واقعی است و نه بزرگ کردنِ این عدد.
 */
const BRIDGE_LIMIT = 400;

export async function getStudentBridgeSessions(
  teacherId: string,
  studentId: string,
  classId?: string | null,
): Promise<BridgeSession[] | null> {
  const student = await getStudentForTeacher(teacherId, studentId, classId);
  if (!student) return null;

  const rows = await query<{
    id: string;
    phrase: string;
    correct_pattern: string;
    chosen_pattern: string | null;
    is_correct: boolean | number;
    difficulty: number | null;
    answered_at: string;
  }>(
    `select id, phrase, correct_pattern, chosen_pattern, is_correct, difficulty, answered_at
       from aruz_bridge_answers
      where user_id = ?
      order by answered_at desc, id
      limit ?`,
    [studentId, BRIDGE_LIMIT],
  );

  const answers: BridgeAnswerLine[] = rows.map((r) => ({
    id: r.id,
    phrase: r.phrase,
    correctPattern: r.correct_pattern,
    chosenPattern: r.chosen_pattern,
    isCorrect: Boolean(r.is_correct),
    difficulty: r.difficulty,
    answeredAt: r.answered_at,
  }));

  return toSessions(answers, (a) => a.answeredAt, (a) => a.isCorrect);
}

/* ═══════════════════════════ واژه‌یاب ═══════════════════════════════════ */

export type VocabAnswerLine = {
  id: string;
  grade: string;
  lesson: number | null;
  word: string;
  meaning: string;
  isCorrect: boolean;
  answeredAt: string;
};

export type VocabSession = {
  startedAt: string;
  endedAt: string;
  total: number;
  correct: number;
  accuracy: number | null;
  answers: VocabAnswerLine[];
};

/** همان استدلالِ `BRIDGE_LIMIT`. */
const VOCAB_LIMIT = 400;

export async function getStudentVocabSessions(
  teacherId: string,
  studentId: string,
  classId?: string | null,
): Promise<VocabSession[] | null> {
  const student = await getStudentForTeacher(teacherId, studentId, classId);
  if (!student) return null;

  /* ⚠️ `image` عمداً در این select نیست. صفحهٔ دبیر تصویر نشان نمی‌دهد و آن
     ستون تا ۱۰۲۴ نویسه است — یعنی برای چهارصد ردیف، صدها کیلوبایتِ آدرس
     که هیچ‌جا خوانده نمی‌شود. */
  const rows = await query<{
    id: string;
    grade: string;
    lesson: number | null;
    word: string;
    meaning: string;
    is_correct: boolean | number;
    answered_at: string;
  }>(
    `select id, grade, lesson, word, meaning, is_correct, answered_at
       from vocab_answers
      where user_id = ?
      order by answered_at desc, id
      limit ?`,
    [studentId, VOCAB_LIMIT],
  );

  const answers: VocabAnswerLine[] = rows.map((r) => ({
    id: r.id,
    grade: r.grade ?? "",
    lesson: r.lesson,
    word: r.word ?? "",
    meaning: r.meaning ?? "",
    isCorrect: Boolean(r.is_correct),
    answeredAt: r.answered_at,
  }));

  return toSessions(answers, (a) => a.answeredAt, (a) => a.isCorrect);
}

/* ═══════════════════════════ مشترک ═════════════════════════════════════ */

/**
 * پاسخ‌ها → نشست‌ها.
 *
 * ⚠️ نه پلِ وزن و نه واژه‌یاب شناسهٔ «دور» ذخیره نمی‌کنند؛ هر پاسخ یک ردیفِ
 * مستقل است. پس نشست از روی فاصلهٔ زمانی بازسازی می‌شود — همان کاری که
 * `groupIntoSessions` برای پنلِ خودِ دانش‌آموز هم می‌کند.
 *
 * ⚠️ و عمداً از همان تابع استفاده می‌شود و نه یک کپیِ تازه: اگر فاصلهٔ
 * پیش‌فرض روزی عوض شود، دانش‌آموز و دبیرش نباید دو شمارشِ متفاوت از
 * «چند بار بازی کرده» ببینند.
 */
function toSessions<T>(
  answers: T[],
  at: (item: T) => string,
  ok: (item: T) => boolean,
): { startedAt: string; endedAt: string; total: number; correct: number; accuracy: number | null; answers: T[] }[] {
  return groupIntoSessions(answers, at).map((group) => {
    const correct = group.filter(ok).length;
    return {
      /* ⚠️ فهرست تازه‌ترین-اول است، پس *آخرین* عضوِ گروه شروعِ نشست است و
         اولی پایانش. برعکس نوشتنش یک بازهٔ منفی می‌ساخت. */
      startedAt: at(group[group.length - 1]),
      endedAt: at(group[0]),
      total: group.length,
      correct,
      accuracy: accuracyOrNull(correct, group.length),
      answers: group,
    };
  });
}
