import "server-only";
import { query } from "@/lib/db";
import { getWeightAnalysis, getRoleAnalysis, getProgressTrend } from "@/lib/plus/analysis";
import type { ProgressPoint, SkillAnalysis } from "@/lib/plus/analysis";
import { GAME_KEYS, gameHasStoredResults, type GameKey } from "@/lib/activity/schema";
import { accuracyOrNull } from "./analytics-rules";
import { getStudentForTeacher, type TeacherStudentRef } from "./analytics";

/**
 * کارنامهٔ یک دانش‌آموز، آن‌طور که **دبیرش** می‌بیند.
 *
 * =============================================================================
 * ⚠️ چرا اینجا هیچ کوئریِ تحلیلی از نو نوشته نشده
 * =============================================================================
 *
 * `getWeightAnalysis`، `getRoleAnalysis` و `getProgressTrend` از قبل وجود
 * دارند، `userId` می‌گیرند، و دقیقاً همان چیزی را می‌دهند که لازم است —
 * از جمله قاعدهٔ «داده کافی» که برای صفحهٔ دبیر از خودِ اعداد مهم‌تر است.
 *
 * نوشتنِ نسخهٔ دوم یعنی دو تعریفِ متفاوت از «وزنِ ضعیف» که روزی از هم جدا
 * می‌افتند — و آن روز دانش‌آموز در پنلِ خودش یک چیز می‌بیند و دبیرش چیزِ
 * دیگری.
 *
 * ⚠️ تنها چیزی که اینجا تازه است، تفکیکِ بازی‌هاست: همان چیزی که پنلِ
 * دانش‌آموز لازم ندارد ولی دبیر باید بداند — کدام بازی اصلاً نتیجه‌ای ثبت
 * نمی‌کند.
 *
 * =============================================================================
 * ⚠️ دسترسی
 * =============================================================================
 *
 * هیچ‌کدام از توابعِ بالا گاردِ دسترسی ندارند و نباید داشته باشند — در پنلِ
 * خودِ کاربر، شناسه از سشن می‌آید. اینجا شناسه از **نوارِ آدرس** می‌آید، پس
 * تنها چیزی که جلوی «عوض کردنِ شناسه و دیدنِ کارنامهٔ یک غریبه» را می‌گیرد،
 * `getStudentForTeacher` در خطِ اولِ این تابع است.
 */

/** یک بازی، آن‌طور که در کارنامهٔ دبیر دیده می‌شود. */
export type GameLine = {
  key: GameKey;
  label: string;
  /**
   * ⚠️ کلیدِ کلِ «قاعدهٔ دادهٔ بازی».
   *
   * `false` یعنی رابط کاربری **حق ندارد** هیچ عددی نشان دهد و باید صریحاً
   * بنویسد «جزئیات نتیجه برای این بازی هنوز ثبت نمی‌شود».
   */
  hasStoredResults: boolean;
  /** فقط وقتی `hasStoredResults` درست است. */
  total: number;
  correct: number;
  /** `null` یعنی شواهد کافی نیست — و نه «صفر درصد». */
  accuracy: number | null;
  lastAt: string | null;
  /** ⚠️ برای واژه‌یاب درست است: درستی‌اش را مرورگر فرستاده. */
  clientReported: boolean;
};

export const GAME_LABEL: Record<GameKey, string> = {
  "aruz-bridge": "پل وزن",
  "aruz-rapid": "تندخوان عروض",
  "grammar-circuit": "مدار دستور",
  jasoos: "جاسوس",
  ninja: "نینجای دستور",
  pairs: "جفت‌های ادبی",
  vocab: "واژه‌یاب",
};

export type StudentReport = {
  student: TeacherStudentRef;
  /** دقتِ عروضِ سماعی — پاسخِ تکیِ `user_answers`، نه تلاش. */
  aruz: { total: number; correct: number; accuracy: number | null; lastAt: string | null };
  weights: SkillAnalysis;
  roles: SkillAnalysis;
  trend: ProgressPoint[];
  exams: {
    count: number;
    best: number | null;
    average: number | null;
    recent: { id: string; title: string; score: number; max: number; at: string }[];
  };
  games: GameLine[];
};

/**
 * ⚠️ چند کارنامهٔ اخیر نشان داده می‌شود.
 *
 * فهرستِ کامل عمداً نیست: دبیر برای تصمیم گرفتن به «آخرین‌ها» نیاز دارد، و
 * کشیدنِ صد کارنامه فقط صفحه را سنگین می‌کند. اگر روزی لازم شد، راهِ درست
 * یک صفحهٔ جدا با صفحه‌بندی است و نه بزرگ کردنِ این عدد.
 */
const RECENT_EXAMS = 10;

export async function getStudentReport(
  teacherId: string,
  studentId: string,
  classId?: string | null,
): Promise<StudentReport | null> {
  /* ⚠️ خطِ اول، و پیش از هر کوئریِ داده. */
  const student = await getStudentForTeacher(teacherId, studentId, classId);
  if (!student) return null;

  const [aruz, weights, roles, trend, examStats, recentExams, games] = await Promise.all([
    aruzSummary(studentId),
    getWeightAnalysis(studentId),
    getRoleAnalysis(studentId),
    getProgressTrend(studentId, 8),
    examSummary(studentId),
    recentExamList(studentId),
    gameLines(studentId),
  ]);

  return {
    student,
    aruz,
    weights,
    roles,
    trend,
    exams: {
      count: examStats.count,
      best: examStats.best,
      average: examStats.average,
      recent: recentExams,
    },
    games,
  };
}

/* ─────────────────────────── عروضِ سماعی ──────────────────────────────── */

async function aruzSummary(studentId: string) {
  const rows = await query<{ total: number; correct: number; last_at: string | null }>(
    `select count(*)                            as total,
            sum(is_correct = 1)                 as correct,
            max(answered_at)                    as last_at
       from user_answers
      where user_id = ?`,
    [studentId],
  );
  const total = Number(rows[0]?.total ?? 0);
  const correct = Number(rows[0]?.correct ?? 0);
  return { total, correct, accuracy: accuracyOrNull(correct, total), lastAt: rows[0]?.last_at ?? null };
}

/* ──────────────────────────── آزمون‌ها ────────────────────────────────── */

/**
 * ⚠️ `null` برای «هنوز آزمونی نداده» و نه `0`.
 *
 * `getExamStats` در پنلِ خودِ کاربر صفر می‌دهد و آنجا درست است — کاربر
 * می‌داند خودش آزمون نداده. ولی «۰٪» کنارِ نامِ یک دانش‌آموز در فهرستِ
 * دبیر، خوانده می‌شود «افتضاح بوده».
 */
async function examSummary(studentId: string) {
  const rows = await query<{ n: number; best: number | null; score: number; max: number }>(
    `select count(*)                                          as n,
            max(case when max_score > 0
                     then round(total_score * 100 / max_score)
                     else 0 end)                              as best,
            coalesce(sum(total_score), 0)                     as score,
            coalesce(sum(max_score), 0)                       as max
       from exam_attempts
      where user_id = ?`,
    [studentId],
  );

  const count = Number(rows[0]?.n ?? 0);
  if (count === 0) return { count: 0, best: null, average: null };

  const max = Number(rows[0]?.max ?? 0);
  return {
    count,
    best: rows[0]?.best === null ? null : Number(rows[0]?.best),
    average: max > 0 ? Math.round((Number(rows[0]?.score ?? 0) * 100) / max) : null,
  };
}

/**
 * ⚠️ `question_results` و `answers` عمداً در این select نیستند.
 *
 * `getExamAttempts` آن دو ستونِ JSON را می‌آورد چون صفحهٔ مرورِ خودِ کاربر
 * به جزئیاتِ تک‌تکِ سؤال‌ها نیاز دارد. فهرستِ دبیر ندارد — و آوردنشان دو
 * هزینه داشت: ده‌ها کیلوبایت JSON برای ساختنِ یک ردیفِ چهارستونی، و
 * رساندنِ پاسخ‌های تشریحیِ دانش‌آموز به جایی که لازم نیستند.
 */
async function recentExamList(studentId: string) {
  const rows = await query<{
    id: string;
    total_score: number;
    max_score: number;
    created_at: string;
    exam_title: string | null;
  }>(
    `select a.id, a.total_score, a.max_score, a.created_at, e.title as exam_title
       from exam_attempts a
       left join exams e on e.id = a.exam_id
      where a.user_id = ?
      order by a.created_at desc, a.id
      limit ?`,
    [studentId, RECENT_EXAMS],
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.exam_title ?? "آزمون",
    score: Number(r.total_score),
    max: Number(r.max_score),
    at: r.created_at,
  }));
}

/* ───────────────────────────── بازی‌ها ────────────────────────────────── */

/**
 * یک ردیف برای هر بازی — **شاملِ بازی‌هایی که هیچ داده‌ای ندارند**.
 *
 * ⚠️ حذفِ آن سه بازی از فهرست ساده‌تر بود و غلط: دبیر آن‌وقت فکر می‌کند
 * دانش‌آموز سراغشان نرفته، در حالی که حقیقت این است که *ما* ثبتشان
 * نمی‌کنیم. تفاوتِ «نکرده» با «نمی‌دانیم» دقیقاً همان چیزی است که این
 * صفحه باید صادقانه نشان دهد.
 *
 * چهار کوئری و نه هفت: سه بازیِ بی‌داده جدولی ندارند که از آن بخوانیم.
 */
async function gameLines(studentId: string): Promise<GameLine[]> {
  const rows = await query<{
    game: string;
    total: number;
    correct: number;
    last_at: string | null;
  }>(
    `select game, count(*) as total, sum(is_correct = 1) as correct, max(at) as last_at
       from (
         select 'aruz-bridge' as game, is_correct, answered_at as at
           from aruz_bridge_answers where user_id = ?
         union all
         select 'grammar-circuit', is_correct, answered_at
           from grammar_circuit_answers where user_id = ?
         union all
         select 'jasoos', is_correct, answered_at
           from jasoos_answers where user_id = ?
         union all
         select 'vocab', is_correct, answered_at
           from vocab_answers where user_id = ?
       ) t
      group by game`,
    [studentId, studentId, studentId, studentId],
  );

  const byGame = new Map(rows.map((r) => [r.game, r]));

  return GAME_KEYS.map((key) => {
    const stored = gameHasStoredResults(key);
    const row = byGame.get(key);
    const total = Number(row?.total ?? 0);
    const correct = Number(row?.correct ?? 0);

    return {
      key,
      label: GAME_LABEL[key],
      hasStoredResults: stored,
      total: stored ? total : 0,
      correct: stored ? correct : 0,
      accuracy: stored ? accuracyOrNull(correct, total) : null,
      lastAt: stored ? (row?.last_at ?? null) : null,
      /* ⚠️ واژه‌یاب داده دارد ولی درستی‌اش را مرورگر فرستاده. رابط کاربری
         باید همین را کنارِ عدد بنویسد، وگرنه دبیر آن درصد را هم‌ارزِ
         بقیه می‌خواند. */
      clientReported: key === "vocab",
    };
  });
}
