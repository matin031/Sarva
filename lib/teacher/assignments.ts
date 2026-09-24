import "server-only";
import { randomUUID } from "node:crypto";
import { execute, placeholders, query, queryOne, transaction, type Tx } from "@/lib/db";
import { isUuid } from "@/lib/api/action-input";
import { notify } from "@/lib/plus/notifications";
import { quizQuestionWeight } from "@/lib/quiz/weight";
import { loadRapidAruzQuestions } from "@/lib/aruz-rapid/content";
import type { AruzBridgeQuestion } from "@/lib/aruz-bridge/types";
import { getStudentForTeacher } from "./analytics";
import {
  BRIDGE_COUNTS,
  QUIZ_MAX_TOTAL,
  RAPID_MAX,
  assignmentHref,
  assignmentStatus,
  assignmentTitle,
  pickByWeight,
  readConfig,
  readResult,
  sameItems,
  shortageMessage,
  shuffle,
  validateWeightRequest,
  weightAvailability,
  type AssignmentConfig,
  type AssignmentKind,
  type AssignmentStatus,
  type PoolQuestion,
  type WeightAvailability,
} from "./assignment-rules";

/**
 * تکلیف و آزمونِ عروض — از دبیر به دانش‌آموز.
 *
 * =============================================================================
 * ⚠️ دسترسی — سه قاعده
 * =============================================================================
 *
 * ۱) هر تابعِ سمتِ دبیر خطِ اولش `getStudentForTeacher` است؛ همان گاردی که
 *    کارنامه و بازخورد دارند. دانش‌آموزی که عضوِ فعالِ کلاسِ همین دبیر نیست،
 *    «در کلاس شما نیست» می‌گیرد — چه وجود داشته باشد چه نه.
 *
 * ۲) هر تابعِ سمتِ دانش‌آموز `student_id = ?` را داخلِ خودِ SQL دارد و
 *    شناسهٔ دانش‌آموز همیشه از سشن می‌آید. شناسهٔ تکلیف در نشانی فقط یک
 *    برچسب است.
 *
 * ۳) سؤال‌های تکلیف را **سرور** هنگامِ ساخت انتخاب می‌کند و در `config`
 *    می‌گذارد. بازی آن‌ها را از همین‌جا می‌خواند و تکمیل هم فقط با همان‌ها
 *    پذیرفته می‌شود.
 */

export type ActionErrors = { ok: false; errors: string[] };
export type CreateResult = { ok: true; id: string } | ActionErrors;

type Owner = {
  teacherId: string;
  teacherName: string | null;
  studentId: string;
  classId: string;
};

const NOT_IN_CLASS = "این دانش‌آموز در کلاس شما نیست.";

/* ═══════════════════════════ بانکِ سؤال ═══════════════════════════════ */

type QuizBankRow = {
  id: string;
  type: string | null;
  poem: unknown;
  audio_url: string | null;
  correct_label: string | null;
  correct_audio: string | null;
};

/**
 * سؤال‌های عروضِ سماعی با وزنشان.
 *
 * ⚠️ `poem` فقط برای `weight-to-audio` خوانده می‌شود — تنها نوعی که وزن را
 * در متنِ سؤال دارد. بقیه بیت‌اند و برای وزن لازم نیستند.
 */
async function quizBank(ids?: readonly string[]): Promise<PoolQuestion[]> {
  if (ids && ids.length === 0) return [];
  const rows = await query<QuizBankRow>(
    `select q.id, q.type,
            case when q.type = 'weight-to-audio' then q.poem end as poem,
            q.audio_url, o.label as correct_label, o.audio_url as correct_audio
       from questions q
       left join question_options o on o.question_id = q.id and o.is_correct = 1
      ${ids ? `where q.id in (${placeholders(ids.length)})` : ""}`,
    ids ? [...ids] : [],
  );

  /* سؤالی با دو گزینهٔ «درست» (نباید باشد) دو ردیف می‌دهد؛ اولی می‌ماند. */
  const byId = new Map<string, PoolQuestion>();
  for (const r of rows) {
    if (byId.has(r.id)) continue;
    byId.set(r.id, {
      id: r.id,
      weight: quizQuestionWeight({
        type: r.type,
        poem: r.poem,
        audioUrl: r.audio_url,
        correctLabel: r.correct_label,
        correctAudioUrl: r.correct_audio,
      }),
    });
  }
  return [...byId.values()];
}

/**
 * سؤال‌هایی که این دانش‌آموز «دیده».
 *
 * سه منبع: هر پاسخِ ثبت‌شده (`user_answers`)، هر سؤالی که در یک دورِ آزمون
 * آمده حتی بی‌پاسخ (`quiz_attempt_answers`)، و سؤال‌های آزمون‌هایی که پیش‌تر
 * برایش گذاشته شده و لغو نشده — تا دو آزمونِ پشتِ‌سرِ هم با «عدم تکرار»
 * همدیگر را تکرار نکنند.
 *
 * ⚠️ هر سه با `user_id` / `student_id` همین دانش‌آموز؛ تاریخچهٔ کسِ دیگری
 * هیچ‌جا وارد نمی‌شود.
 */
async function seenQuizQuestions(studentId: string): Promise<Set<string>> {
  const [answered, assigned] = await Promise.all([
    query<{ id: string }>(
      `select question_id as id from user_answers where user_id = ?
       union
       select a.question_id from quiz_attempt_answers a
         join quiz_attempts t on t.id = a.attempt_id
        where t.user_id = ?`,
      [studentId, studentId],
    ),
    query<{ config: unknown }>(
      `select config from teacher_assignments
        where student_id = ? and kind = 'aruz_quiz' and cancelled_at is null`,
      [studentId],
    ),
  ]);
  const seen = new Set(answered.map((r) => r.id));
  for (const r of assigned) for (const id of readConfig(r.config).items) seen.add(id);
  return seen;
}

/** سؤال‌هایی که **آخرین** پاسخِ همین دانش‌آموز به آن‌ها غلط بوده، تازه‌ترین اول. */
async function mistakeQuestions(studentId: string, limit: number): Promise<string[]> {
  const rows = await query<{ question_id: string }>(
    `select question_id from user_answers
      where user_id = ? and is_correct = 0
      order by answered_at desc, question_id
      limit ?`,
    [studentId, limit],
  );
  return rows.map((r) => r.question_id);
}

/* ═════════════════════════ فرم‌سازِ دبیر ══════════════════════════════ */

export type QuizBuilderData = {
  weights: WeightAvailability[];
  /** سؤال‌هایی که آخرین پاسخِ دانش‌آموز به آن‌ها غلط بوده. */
  mistakes: number;
};

export async function getQuizBuilderData(
  teacherId: string,
  studentId: string,
  classId: string,
): Promise<QuizBuilderData | null> {
  if (!(await getStudentForTeacher(teacherId, studentId, classId))) return null;

  const [pool, seen, wrong] = await Promise.all([
    quizBank(),
    seenQuizQuestions(studentId),
    queryOne<{ n: number }>(
      `select count(*) as n from user_answers where user_id = ? and is_correct = 0`,
      [studentId],
    ),
  ]);

  return { weights: weightAvailability(pool, seen), mistakes: Number(wrong?.n ?? 0) };
}

/* ═════════════════════════════ ساخت ══════════════════════════════════ */

async function insertAssignment(
  owner: Owner,
  kind: AssignmentKind,
  config: AssignmentConfig,
): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into teacher_assignments
       (id, teacher_id, student_id, class_id, kind, config, created_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [id, owner.teacherId, owner.studentId, owner.classId, kind, JSON.stringify(config), new Date()],
  );

  const teacher = owner.teacherName?.trim() || "دبیر شما";
  await notify({
    userId: owner.studentId,
    kind: "teacher_assignment",
    title:
      kind === "aruz_quiz"
        ? `${teacher} برای شما آزمون عروض جدیدی گذاشته است`
        : `${teacher} برای شما تکلیف جدیدی گذاشته است`,
    body: assignmentTitle(kind, config.items.length, config.source),
    href: assignmentHref(kind, id),
    /* بدونِ `dedupeKey`: هر تکلیف یک رویدادِ جداست. */
  });

  return id;
}

export type QuizRequest =
  | { source: "weights"; weights: Record<string, number>; excludeSeen: boolean }
  | { source: "mistakes"; count: number };

export async function createQuizAssignment(owner: Owner, input: QuizRequest): Promise<CreateResult> {
  if (!(await getStudentForTeacher(owner.teacherId, owner.studentId, owner.classId))) {
    return { ok: false, errors: [NOT_IN_CLASS] };
  }

  if (input.source === "mistakes") {
    if (!Number.isInteger(input.count) || input.count < 1 || input.count > QUIZ_MAX_TOTAL) {
      return { ok: false, errors: [`تعداد باید بین ۱ و ${QUIZ_MAX_TOTAL} باشد.`] };
    }
    const ids = await mistakeQuestions(owner.studentId, input.count);
    if (ids.length === 0) return { ok: false, errors: ["این دانش‌آموز سؤال غلطی برای تمرین ندارد."] };
    if (ids.length < input.count) {
      return { ok: false, errors: [`این دانش‌آموز فقط ${ids.length} سؤال غلط دارد.`] };
    }
    return {
      ok: true,
      id: await insertAssignment(owner, "aruz_quiz", { items: shuffle(ids), source: "mistakes" }),
    };
  }

  const weights = Object.fromEntries(
    Object.entries(input.weights).filter(([, n]) => n !== 0),
  );
  const invalid = validateWeightRequest(weights);
  if (invalid) return { ok: false, errors: [invalid] };

  const [pool, seen] = await Promise.all([
    quizBank(),
    input.excludeSeen ? seenQuizQuestions(owner.studentId) : Promise.resolve(new Set<string>()),
  ]);

  const picked = pickByWeight({ pool, seen, request: weights, excludeSeen: input.excludeSeen });
  if (!picked.ok) {
    return { ok: false, errors: picked.shortages.map((s) => shortageMessage(s, input.excludeSeen)) };
  }

  return {
    ok: true,
    id: await insertAssignment(owner, "aruz_quiz", {
      items: picked.items,
      source: "weights",
      weights,
      excludeSeen: input.excludeSeen,
    }),
  };
}

export async function createGameAssignment(
  owner: Owner,
  kind: "aruz_rapid" | "aruz_bridge",
  count: number,
): Promise<CreateResult> {
  if (!(await getStudentForTeacher(owner.teacherId, owner.studentId, owner.classId))) {
    return { ok: false, errors: [NOT_IN_CLASS] };
  }

  let items: string[];
  if (kind === "aruz_bridge") {
    if (!BRIDGE_COUNTS.includes(count)) return { ok: false, errors: ["تعداد سؤال نامعتبر است."] };
    const rows = await query<{ id: string }>(
      `select id from aruz_bridge_questions where is_published = 1 order by rand() limit ?`,
      [count],
    );
    if (rows.length < count) {
      return { ok: false, errors: [`بانک پل وزن فقط ${rows.length} سؤال دارد.`] };
    }
    items = rows.map((r) => r.id);
  } else {
    if (!Number.isInteger(count) || count < 1 || count > RAPID_MAX) {
      return { ok: false, errors: [`تعداد باید بین ۱ و ${RAPID_MAX} باشد.`] };
    }
    /* همان مخزنی که صفحهٔ بازی نشان می‌دهد — با همان اعتبارسنجی. */
    const { questions } = await loadRapidAruzQuestions();
    if (questions.length < count) {
      return { ok: false, errors: [`بانک «کوتاه یا بلند؟» فقط ${questions.length} مصراع دارد.`] };
    }
    items = shuffle(questions).slice(0, count).map((q) => q.id);
  }

  return { ok: true, id: await insertAssignment(owner, kind, { items }) };
}

/** ⚠️ فقط تکلیفِ خودِ همین دبیر، و فقط پیش از انجام. شرط‌ها داخلِ خودِ `UPDATE`اند. */
export async function cancelAssignment(
  teacherId: string,
  id: string,
): Promise<{ ok: true } | ActionErrors> {
  const n = await execute(
    `update teacher_assignments set cancelled_at = ?
      where id = ? and teacher_id = ? and completed_at is null and cancelled_at is null`,
    [new Date(), id, teacherId],
  );
  return n > 0 ? { ok: true } : { ok: false, errors: ["این تکلیف قابل لغو نیست."] };
}

/* ═════════════════════════════ فهرست ═════════════════════════════════ */

export type AssignmentView = {
  id: string;
  kind: AssignmentKind;
  title: string;
  status: AssignmentStatus;
  href: string;
  teacherName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  result: Record<string, unknown> | null;
};

type AssignmentRow = {
  id: string;
  kind: AssignmentKind;
  config: unknown;
  result: unknown;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  teacher_name: string | null;
};

function toView(r: AssignmentRow): AssignmentView {
  const config = readConfig(r.config);
  return {
    id: r.id,
    kind: r.kind,
    title: assignmentTitle(r.kind, config.items.length, config.source),
    status: assignmentStatus({
      startedAt: r.started_at,
      completedAt: r.completed_at,
      cancelledAt: r.cancelled_at,
    }),
    href: assignmentHref(r.kind, r.id),
    teacherName: r.teacher_name,
    createdAt: r.created_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    result: readResult(r.result),
  };
}

const LIST_LIMIT = 30;

/** تکالیفی که **همین دبیر** به این دانش‌آموز داده — همان قاعدهٔ فهرستِ بازخورد. */
export async function listTeacherAssignments(
  teacherId: string,
  studentId: string,
  classId: string,
): Promise<AssignmentView[] | null> {
  if (!(await getStudentForTeacher(teacherId, studentId, classId))) return null;
  const rows = await query<AssignmentRow>(
    `select id, kind, config, result, created_at, started_at, completed_at, cancelled_at,
            null as teacher_name
       from teacher_assignments
      where teacher_id = ? and student_id = ? and cancelled_at is null
      order by created_at desc, id
      limit ?`,
    [teacherId, studentId, LIST_LIMIT],
  );
  return rows.map(toView);
}

/** تکالیفِ خودِ دانش‌آموز، از همهٔ دبیرهایش. */
export async function listStudentAssignments(studentId: string): Promise<AssignmentView[]> {
  const rows = await query<AssignmentRow>(
    `select a.id, a.kind, a.config, a.result, a.created_at, a.started_at, a.completed_at,
            a.cancelled_at, t.full_name as teacher_name
       from teacher_assignments a
       join users t on t.id = a.teacher_id
      where a.student_id = ? and a.cancelled_at is null
      order by a.created_at desc, a.id
      limit ?`,
    [studentId, LIST_LIMIT],
  );
  return rows.map(toView);
}

/* ═══════════════════════════ اجرا — دانش‌آموز ═════════════════════════ */

export type AssignmentGate =
  | { state: "ok"; id: string; items: string[]; title: string }
  | { state: "done" | "cancelled" | "missing" };

/**
 * تکلیفی که دانش‌آموز می‌خواهد انجامش دهد.
 *
 * ⚠️ «مالِ تو نیست» و «وجود ندارد» یک جواب می‌گیرند (`missing`).
 */
export async function loadAssignmentForStudent(
  studentId: string,
  id: unknown,
  kind: AssignmentKind,
): Promise<AssignmentGate> {
  if (!isUuid(id)) return { state: "missing" };
  const row = await queryOne<{
    config: unknown;
    completed_at: string | null;
    cancelled_at: string | null;
  }>(
    `select config, completed_at, cancelled_at from teacher_assignments
      where id = ? and student_id = ? and kind = ?`,
    [id, studentId, kind],
  );
  if (!row) return { state: "missing" };
  if (row.cancelled_at) return { state: "cancelled" };
  if (row.completed_at) return { state: "done" };
  const config = readConfig(row.config);
  return { state: "ok", id, items: config.items, title: assignmentTitle(kind, config.items.length, config.source) };
}

/** سؤال‌های پل وزنِ یک تکلیف، به همان شکلی که `/api/v1/aruz-bridge/questions` می‌دهد. */
export async function loadBridgeQuestions(ids: readonly string[]): Promise<AruzBridgeQuestion[]> {
  if (ids.length === 0) return [];
  const rows = await query<{
    id: string;
    phrase: string;
    correct_pattern: string;
    wrong_pattern: string;
    difficulty: number;
    explanation: string | null;
    audio_url: string | null;
  }>(
    `select id, phrase, correct_pattern, wrong_pattern, difficulty, explanation, audio_url
       from aruz_bridge_questions
      where id in (${placeholders(ids.length)}) and is_published = 1`,
    [...ids],
  );
  return rows.map((r) => ({
    id: r.id,
    promptText: r.phrase,
    correctPattern: r.correct_pattern,
    wrongPattern: r.wrong_pattern,
    difficulty: r.difficulty as AruzBridgeQuestion["difficulty"],
    ...(r.explanation ? { explanation: r.explanation } : {}),
    ...(r.audio_url ? { audioUrl: r.audio_url } : {}),
  }));
}

/** «در حال انجام». بی‌اثر اگر قبلاً شروع شده یا دیگر باز نیست. */
export async function markAssignmentStarted(studentId: string, id: string): Promise<void> {
  await execute(
    `update teacher_assignments set started_at = ?
      where id = ? and student_id = ? and started_at is null
        and completed_at is null and cancelled_at is null`,
    [new Date(), id, studentId],
  );
}

/**
 * قفلِ ردیف برای تکمیل — داخلِ همان تراکنشی که نتیجه را می‌نویسد.
 *
 * ⚠️ `for update` تا دو ارسالِ هم‌زمان (دو تب، یا تلاشِ دوبارهٔ شبکه) هر دو
 * «هنوز کامل نشده» نبینند و نتیجه دو بار نوشته نشود.
 */
export async function lockAssignment(
  tx: Tx,
  id: string,
  studentId: string,
  kind: AssignmentKind,
): Promise<{ ok: true; items: string[] } | { ok: false; error: string; status: number }> {
  const row = await tx.queryOne<{
    config: unknown;
    completed_at: string | null;
    cancelled_at: string | null;
  }>(
    `select config, completed_at, cancelled_at from teacher_assignments
      where id = ? and student_id = ? and kind = ?
      for update`,
    [id, studentId, kind],
  );
  if (!row) return { ok: false, error: "تکلیف پیدا نشد.", status: 404 };
  if (row.cancelled_at) return { ok: false, error: "این تکلیف لغو شده است.", status: 409 };
  if (row.completed_at) return { ok: false, error: "این تکلیف قبلاً انجام شده است.", status: 409 };
  return { ok: true, items: readConfig(row.config).items };
}

export async function markAssignmentCompleted(
  tx: Tx,
  id: string,
  result: Record<string, unknown>,
  quizAttemptId: string | null = null,
): Promise<void> {
  const now = new Date();
  await tx.execute(
    `update teacher_assignments
        set result = ?, completed_at = ?, started_at = coalesce(started_at, ?), quiz_attempt_id = ?
      where id = ?`,
    [JSON.stringify(result), now, now, quizAttemptId, id],
  );
}

/** خلاصهٔ آزمون به تفکیکِ وزن — از روی پاسخ‌هایی که سرور تصحیح کرده. */
export async function quizResult(
  graded: readonly { questionId: string; isCorrect: boolean }[],
): Promise<Record<string, unknown>> {
  const weights = new Map(
    (await quizBank(graded.map((g) => g.questionId))).map((q) => [q.id, q.weight]),
  );
  const byWeight: Record<string, { total: number; correct: number }> = {};
  for (const g of graded) {
    const w = weights.get(g.questionId);
    if (!w) continue;
    const b = (byWeight[w] ??= { total: 0, correct: 0 });
    b.total += 1;
    if (g.isCorrect) b.correct += 1;
  }
  return {
    total: graded.length,
    correct: graded.filter((g) => g.isCorrect).length,
    byWeight,
  };
}

export type RapidReport = {
  questionIds: string[];
  wrongChoices: number;
  timeouts: number;
  activeMs: number;
};

/**
 * پایانِ «کوتاه یا بلند؟».
 *
 * ⚠️ این بازی جدولِ پاسخ ندارد و درستی را مرورگر می‌سنجد (`lib/activity/
 * schema.ts`). سرور اینجا فقط آنچه را که *می‌تواند* می‌سنجد: تکلیف مالِ همین
 * کاربر است، باز است، و مصراع‌ها دقیقاً همان‌هایی‌اند که خودش انتخاب کرده.
 * شمارِ اشتباه‌ها گزارشِ خودِ بازی است و در رابط کاربری همین برچسب را دارد.
 */
export async function completeRapidAssignment(
  studentId: string,
  id: string,
  report: RapidReport,
): Promise<{ ok: true } | ActionErrors> {
  return transaction(async (tx) => {
    const lock = await lockAssignment(tx, id, studentId, "aruz_rapid");
    if (!lock.ok) return { ok: false as const, errors: [lock.error] };
    if (!sameItems(lock.items, report.questionIds)) {
      return { ok: false as const, errors: ["مصراع‌های این نشست با تکلیف یکی نیست."] };
    }
    await markAssignmentCompleted(tx, id, {
      total: lock.items.length,
      wrongChoices: report.wrongChoices,
      timeouts: report.timeouts,
      activeMs: report.activeMs,
    });
    return { ok: true as const };
  });
}
