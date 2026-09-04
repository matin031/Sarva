import "server-only";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import type {
  AruzAttempt,
  AruzQuestionType,
  Bookmark,
  BookmarkArea,
  ExamAttempt,
  JasoosAnswer,
  PanelOverview,
  PanelUser,
  VocabAnswer,
} from "@/lib/panel/types";

// re-exported so server pages can keep importing everything from one place
export * from "@/lib/panel/types";

/** خواندنِ سمت‌سرورِ پنل کاربر.
 *
 *  هر تابع اینجا با یک شرط صریح روی user_id محدود شده. تا دیروز آن شرط
 *  «اضافه ولی مفید» بود چون RLS هم پشتش ایستاده بود؛ حالا تنها چیزی است که
 *  داده‌های یک دانش‌آموز را از دیگری جدا می‌کند — پس هیچ‌کدام از این توابع
 *  نباید بدون آن فراخوانی شوند، و هیچ‌کدام userId را از ورودی کاربر
 *  نمی‌گیرند: صفحه‌ها آن را از getPanelUser() می‌گیرند که سشن را می‌خواند. */

export async function getPanelUser(): Promise<PanelUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || "دانش‌آموز",
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------- عروض ----

/** تلاش‌های گذشتهٔ عروض، با هرچه مرور لازم دارد: صورت سؤال (بیت یا صوت)، همهٔ
 *  گزینه‌ها، اینکه دانش‌آموز کدام را زد و کدام درست بود. بدون گزینه‌ها چیزی
 *  برای گوش دادن دوباره نمی‌ماند — که کل هدف مرور یک آزمون سماعی است. */
export async function getAruzAttempts(
  userId: string,
  offset = 0,
  limit = 5,
): Promise<{ attempts: AruzAttempt[]; hasMore: boolean }> {
  // یک ردیف بیشتر از صفحه خوانده می‌شود، فقط برای فهمیدن اینکه دکمهٔ «بارگیری
  // بیشتر» لازم است یا نه — ارزان‌تر و مطمئن‌تر از یک کوئری شمارش دوم.
  const attemptRows = await query<{
    id: string;
    total: number;
    correct: number;
    created_at: string;
  }>(
    `select id, total, correct, created_at
       from quiz_attempts
      where user_id = $1
      order by created_at desc
      limit $2 offset $3`,
    [userId, limit + 1, offset],
  );

  const hasMore = attemptRows.length > limit;
  const page = attemptRows.slice(0, limit);
  if (page.length === 0) return { attempts: [], hasMore: false };

  const attemptIds = page.map((a) => a.id);

  // پاسخ‌ها + سؤال + همهٔ گزینه‌های آن سؤال، در یک کوئری.
  //
  // گزینه‌ها با یک زیرکوئریِ json می‌آیند و نه با JOIN دیگر: با JOIN، هر پاسخ
  // به تعداد گزینه‌هایش تکرار می‌شد و باید در کد دوباره یکتا می‌شد.
  const answerRows = await query<{
    attempt_id: string;
    id: string;
    is_correct: boolean;
    selected_option_id: string | null;
    question_id: string | null;
    q_type: string | null;
    q_poem: string[] | null;
    q_audio_url: string | null;
    options: { id: string; label: string | null; poem: string[] | null; audio_url: string | null; is_correct: boolean }[] | null;
  }>(
    `select ans.attempt_id, ans.id, ans.is_correct, ans.selected_option_id,
            q.id as question_id, q.type as q_type, q.poem as q_poem, q.audio_url as q_audio_url,
            (select coalesce(
                      json_agg(json_build_object(
                        'id', o.id, 'label', o.label, 'poem', o.poem,
                        'audio_url', o.audio_url, 'is_correct', o.is_correct
                      ) order by o.x, o.id),
                      '[]'::json)
               from question_options o where o.question_id = q.id) as options
       from quiz_attempt_answers ans
       left join questions q on q.id = ans.question_id
      where ans.attempt_id = any($1::uuid[])
      order by ans.created_at, ans.id`,
    [attemptIds],
  );

  const byAttempt = new Map<string, AruzAttempt["answers"]>();
  for (const r of answerRows) {
    const list = byAttempt.get(r.attempt_id) ?? [];
    list.push({
      id: r.id,
      isCorrect: r.is_correct,
      selectedOptionId: r.selected_option_id,
      questionId: r.question_id,
      type: (r.q_type ?? null) as AruzQuestionType | null,
      poem: r.q_poem,
      audioUrl: r.q_audio_url,
      options: (r.options ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        poem: o.poem,
        audioUrl: o.audio_url,
        isCorrect: o.is_correct,
      })),
    });
    byAttempt.set(r.attempt_id, list);
  }

  return {
    attempts: page.map((a) => ({
      id: a.id,
      total: a.total,
      correct: a.correct,
      createdAt: a.created_at,
      answers: byAttempt.get(a.id) ?? [],
    })),
    hasMore,
  };
}

/** نمرهٔ همهٔ تلاش‌ها، بدون پاسخ‌ها.
 *
 *  فهرست صفحه‌بندی می‌شود، ولی «بهترین عملکرد» و جمع‌ها کل تاریخچه را توصیف
 *  می‌کنند — پس کوئری خودشان را دارند. حالا کلِ جمع‌بندی هم در دیتابیس انجام
 *  می‌شود، به‌جای کشیدن همهٔ ردیف‌ها و reduce کردنشان در جاوااسکریپت. */
export async function getAruzSummary(userId: string): Promise<{
  attempts: number;
  best: number;
  questions: number;
  correct: number;
}> {
  const row = await queryOne<{
    attempts: number;
    best: number | null;
    questions: number;
    correct: number;
  }>(
    `select count(*)                                   as attempts,
            max(case when total > 0
                     then round(correct::numeric * 100 / total)
                     else 0 end)                       as best,
            coalesce(sum(total), 0)                    as questions,
            coalesce(sum(correct), 0)                  as correct
       from quiz_attempts
      where user_id = $1`,
    [userId],
  );

  return {
    attempts: row?.attempts ?? 0,
    best: row?.best ?? 0,
    questions: row?.questions ?? 0,
    correct: row?.correct ?? 0,
  };
}

/** تاریخچهٔ خام هر پاسخ، برای نمودار فعالیت و streak. */
export async function getAruzActivity(userId: string): Promise<{ at: string; ok: boolean }[]> {
  const rows = await query<{ is_correct: boolean; answered_at: string }>(
    `select is_correct, answered_at
       from user_answers
      where user_id = $1
      order by answered_at desc
      limit 2000`,
    [userId],
  );

  return rows.map((r) => ({ at: r.answered_at, ok: r.is_correct }));
}

/** دقت به تفکیک وزن عروضی.
 *
 *  فقط دو شکل از سؤال‌ها اصلاً وزن را نام می‌برند: `weight-to-audio` آن را در
 *  poem[0] دارد و `audio-to-weight` در برچسبِ گزینهٔ درست. سؤال بیت→صوت دربارهٔ
 *  یک بیت است و هرگز ثبت نمی‌کند به کدام وزن تعلق دارد، پس آن پاسخ‌ها در جمع
 *  کل هستند ولی به هیچ وزنی نسبت داده نمی‌شوند — وانمود کردن خلافش یعنی ساختن
 *  داده‌ای که وجود ندارد. */
export async function getAruzWeightStats(
  userId: string,
): Promise<{ weight: string; total: number; correct: number }[]> {
  const rows = await query<{
    is_correct: boolean;
    type: string | null;
    poem: string[] | null;
    correct_label: string | null;
  }>(
    `select ua.is_correct, q.type, q.poem,
            (select o.label from question_options o
              where o.question_id = q.id and o.is_correct limit 1) as correct_label
       from user_answers ua
       join questions q on q.id = ua.question_id
      where ua.user_id = $1
      limit 3000`,
    [userId],
  );

  const buckets = new Map<string, { total: number; correct: number }>();

  for (const row of rows) {
    let weight: string | null = null;
    if (row.type === "weight-to-audio") weight = row.poem?.[0]?.trim() || null;
    else if (row.type === "audio-to-weight") weight = row.correct_label?.trim() || null;
    if (!weight) continue;

    const b = buckets.get(weight) ?? { total: 0, correct: 0 };
    b.total += 1;
    if (row.is_correct) b.correct += 1;
    buckets.set(weight, b);
  }

  return [...buckets.entries()]
    .map(([weight, b]) => ({ weight, ...b }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total);
}

// ------------------------------------------------------------ واژه‌یاب ----

/** یک صفحه از پاسخ‌های واژه‌یاب، از تازه به قدیم. */
export async function getVocabAnswers(
  userId: string,
  offset = 0,
  limit = 150,
): Promise<{ answers: VocabAnswer[]; hasMore: boolean }> {
  const rows = await query<{
    id: string;
    grade: string;
    lesson: number | null;
    word: string;
    meaning: string;
    image: string | null;
    is_correct: boolean;
    answered_at: string;
  }>(
    `select id, grade, lesson, word, meaning, image, is_correct, answered_at
       from vocab_answers
      where user_id = $1
      order by answered_at desc
      limit $2 offset $3`,
    [userId, limit + 1, offset],
  );

  return {
    answers: rows.slice(0, limit).map((r) => ({
      id: r.id,
      grade: r.grade ?? "",
      lesson: r.lesson,
      word: r.word ?? "",
      meaning: r.meaning ?? "",
      image: r.image ?? "",
      isCorrect: r.is_correct,
      answeredAt: r.answered_at,
    })),
    hasMore: rows.length > limit,
  };
}

/** هر پاسخ واژه‌یاب، سه ستون عرض — برای دقت، streak، روند روزانه و تفکیک
 *  کتاب کافی است، بدون کشیدن واژه و معنی و آدرس تصویر برای رسیدن به یک عدد. */
export async function getVocabSummary(
  userId: string,
): Promise<{ grade: string; ok: boolean; at: string }[]> {
  const rows = await query<{ grade: string; is_correct: boolean; answered_at: string }>(
    `select grade, is_correct, answered_at
       from vocab_answers
      where user_id = $1
      order by answered_at desc
      limit 5000`,
    [userId],
  );

  return rows.map((r) => ({ grade: r.grade ?? "", ok: r.is_correct, at: r.answered_at }));
}

// -------------------------------------------------------------- جاسوس ----

export async function getJasoosAnswers(userId: string): Promise<JasoosAnswer[]> {
  const rows = await query<{
    id: string;
    level_id: number;
    category: string;
    chosen_role: string;
    correct_role: string;
    is_correct: boolean;
    answered_at: string;
  }>(
    `select id, level_id, category, chosen_role, correct_role, is_correct, answered_at
       from jasoos_answers
      where user_id = $1
      order by answered_at desc
      limit 2000`,
    [userId],
  );

  return rows.map((r) => ({
    id: r.id,
    levelId: r.level_id,
    category: r.category ?? "",
    chosenRole: r.chosen_role ?? "",
    correctRole: r.correct_role ?? "",
    isCorrect: r.is_correct,
    answeredAt: r.answered_at,
  }));
}

// ------------------------------------------------------- امتحان نهایی ----

/** کارنامه‌های امتحان نهایی.
 *
 *  نسخهٔ قبلی اینجا مجبور بود کلاینت service-role بسازد، چون exam_attempts
 *  هیچ policy ای برای کاربر عادی نداشت و خواندنش با کلید anon
 *  «permission denied» می‌داد. حالا فقط یک کوئری معمولی است — آنچه دسترسی را
 *  محدود می‌کند شرط user_id است و اینکه فراخوان آن را از سشن گرفته. */
/**
 * فقط شمارنده‌های کارنامهٔ امتحان — بدونِ آوردنِ حتی یک ردیف.
 *
 * ⚠️ چرا: صفحهٔ اولِ پنل سه عدد می‌خواهد (تعداد، بهترین، میانگین) و برای
 * همان `getExamAttempts` را صدا می‌زد، که *هر* کارنامه را با
 * `question_results` و `answers` می‌آورد — یعنی جزئیاتِ تک‌تکِ سؤال‌ها.
 * روی کاربری با ۶۰ کارنامهٔ چهل‌سؤالی، ۴۸ کیلوبایت jsonb خوانده می‌شد تا سه
 * عدد ساخته شود. حالا هیچ ردیفی منتقل نمی‌شود.
 */
export async function getExamStats(
  userId: string,
): Promise<{ attempts: number; best: number; average: number }> {
  const row = await queryOne<{ attempts: number; best: number | null; score: number; max: number }>(
    `select count(*)::int                                    as attempts,
            max(case when max_score > 0
                     then round(total_score * 100 / max_score)
                     else 0 end)                             as best,
            coalesce(sum(total_score), 0)                    as score,
            coalesce(sum(max_score), 0)                      as max
       from exam_attempts
      where user_id = $1`,
    [userId],
  );
  const max = Number(row?.max ?? 0);
  return {
    attempts: row?.attempts ?? 0,
    best: Number(row?.best ?? 0),
    average: max ? Math.round((Number(row?.score ?? 0) * 100) / max) : 0,
  };
}

/**
 * جزئیاتِ یک کارنامه — فقط وقتی کاربر بازش می‌کند.
 *
 * ⚠️ شرطِ user_id اینجا امنیتی است، نه فیلترِ راحتی: بدونِ آن هر کسی با
 * داشتنِ یک شناسه می‌توانست کارنامهٔ نفرِ دیگری را بخواند. RLS نداریم و
 * تنها چیزی که جلویش را می‌گیرد همین شرط است.
 */
export async function getExamAttemptDetail(
  userId: string,
  attemptId: string,
): Promise<{ questionResults: Record<string, unknown>; answers: Record<string, unknown> } | null> {
  const row = await queryOne<{
    question_results: Record<string, unknown> | null;
    answers: Record<string, unknown> | null;
  }>(
    `select question_results, answers
       from exam_attempts
      where id = $1 and user_id = $2`,
    [attemptId, userId],
  );
  if (!row) return null;
  return { questionResults: row.question_results ?? {}, answers: row.answers ?? {} };
}

export async function getExamAttempts(
  userId: string,
  /** ⚠️ محافظ، نه صفحه‌بندی.
   *
   *  پیش از این هیچ limitی نبود و فهرست بی‌مرز رشد می‌کرد. ولی صفحهٔ
   *  کارنامه‌ها دکمهٔ «بیشتر» ندارد، پس سقفِ کوچک یعنی پنهان شدنِ بی‌صدای
   *  کارنامه‌های قدیمی — که خودش یک باگ است. عدد آن‌قدر بزرگ است که کاربر
   *  واقعی به آن نخورد و فقط جلوی حالتِ فاجعه‌بار را بگیرد.
   *
   *  اگر روزی کسی واقعاً از این رد شد، راهِ درست صفحه‌بندیِ واقعی با UI
   *  است، نه پایین آوردنِ این عدد. */
  limit = 500,
): Promise<ExamAttempt[]> {
  const rows = await query<{
    id: string;
    total_score: number;
    max_score: number;
    created_at: string;
    question_results: Record<string, { score?: number; max?: number }> | null;
    answers: Record<string, unknown> | null;
    exam_title: string | null;
    exam_session: string | null;
  }>(
    `select a.id, a.total_score, a.max_score, a.created_at,
            a.question_results, a.answers,
            e.title as exam_title, e.exam_session
       from exam_attempts a
       left join exams e on e.id = a.exam_id
      where a.user_id = $1
      order by a.created_at desc, a.id
      limit $2`,
    [userId, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    examTitle: r.exam_title ?? "آزمون",
    examKey: r.exam_session,
    answers: r.answers,
    totalScore: r.total_score,
    maxScore: r.max_score,
    createdAt: r.created_at,
    results: r.question_results ?? {},
  }));
}

// ----------------------------------------------------- خلاصهٔ همهٔ بخش‌ها ----

/** یک خواندن برای صفحهٔ اول پنل.
 *
 *  سه جدولِ فعالیت با UNION ALL در یک کوئری جمع می‌شوند، به‌جای سه رفت‌وبرگشت
 *  جدا. ستون area در خودِ SQL ساخته می‌شود، پس کد فقط ردیف‌ها را می‌شمارد و
 *  دیگر لازم نیست بداند هر نتیجه از کدام کوئری آمده. */
export async function getPanelOverview(userId: string): Promise<PanelOverview> {
  const [activityRows, bookmarkRow, exams] = await Promise.all([
    // ⚠️ تجمیع در دیتابیس، نه در کد.
    //
    // نسخهٔ قبلی ردیف‌های *خام* را می‌آورد با سقفِ ۳۰۰۰ + ۵۰۰۰ + ۳۰۰۰ —
    // یعنی تا یازده هزار ردیف، برای صفحه‌ای که فقط چند شمارنده و یک نمودارِ
    // سی‌روزه نشان می‌دهد. کد هم بعد همان یازده هزار ردیف را یکی‌یکی
    // می‌شمرد و برای هرکدام یک `Intl.DateTimeFormat` می‌ساخت.
    //
    // حالا هر بخش به تفکیکِ روزِ تهران شمرده می‌شود: حداکثر چند صد ردیف،
    // و شمارنده‌ها از جمعِ همان‌ها درمی‌آیند.
    //
    // ⚠️ سقف‌های قبلی هم برداشته شدند و این یک اصلاحِ درستی است، نه فقط
    // سرعت: کاربرِ پرکار با بیش از سه هزار پاسخ، شمارنده‌اش بریده می‌شد و
    // «رشتهٔ روزهای پیاپی» غلط درمی‌آمد.
    query<{ area: BookmarkArea; day: string; total: number; correct: number }>(
      `select area,
              to_char((at at time zone 'Asia/Tehran')::date, 'YYYY-MM-DD') as day,
              count(*)::int                           as total,
              count(*) filter (where ok)::int         as correct
         from (
           select 'aruz'::text as area, is_correct as ok, answered_at as at
             from user_answers where user_id = $1
           union all
           select 'vocab'::text, is_correct, answered_at
             from vocab_answers where user_id = $1
           union all
           select 'jasoos'::text, is_correct, answered_at
             from jasoos_answers where user_id = $1
         ) t
        where at is not null
        group by area, 2
        order by 2`,
      [userId],
    ),
    queryOne<{ n: number }>(`select count(*) as n from user_bookmarks where user_id = $1`, [userId]),
    // ⚠️ شمارنده‌ها، نه فهرستِ کارنامه‌ها. پیش از این هر کارنامه با
    // جزئیاتِ تک‌تکِ سؤال‌هایش خوانده می‌شد تا سه عدد ساخته شود.
    getExamStats(userId),
  ]);

  const dayCounts: PanelOverview["dayCounts"] = [];
  const counts: PanelOverview["counts"] = {
    aruz: { total: 0, correct: 0 },
    vocab: { total: 0, correct: 0 },
    jasoos: { total: 0, correct: 0 },
    exam: { total: 0, correct: 0 },
  };

  for (const row of activityRows) {
    dayCounts.push({ day: row.day, total: row.total, correct: row.correct, area: row.area });
    counts[row.area].total += row.total;
    counts[row.area].correct += row.correct;
  }



  return {
    dayCounts,
    counts,
    bookmarks: bookmarkRow?.n ?? 0,
    exams,
  };
}

// --------------------------------------------------------- نشان‌شده‌ها ----

export async function getBookmarks(
  userId: string,
  area?: BookmarkArea,
  /** ⚠️ همان استدلالِ کارنامه‌ها — محافظ، نه صفحه‌بندی. */
  limit = 500,
): Promise<Bookmark[]> {
  const rows = await query<{
    id: string;
    area: BookmarkArea;
    ref_id: string;
    title: string;
    subtitle: string | null;
    payload: Record<string, unknown> | null;
    note: string | null;
    created_at: string;
  }>(
    `select id, area, ref_id, title, subtitle, payload, note, created_at
       from user_bookmarks
      where user_id = $1
        and ($2::text is null or area = $2)
      order by created_at desc, id
      limit $3`,
    [userId, area ?? null, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    area: r.area,
    refId: r.ref_id,
    title: r.title ?? "",
    subtitle: r.subtitle,
    payload: r.payload ?? {},
    note: r.note,
    createdAt: r.created_at,
  }));
}

/**
 * فعالیتِ روزانه، تجمیع‌شده در دیتابیس.
 *
 * ⚠️ چرا جای getAruzActivity: آن تابع تا ۲۰۰۰ ردیفِ *خام* می‌آورد تا کلاینت
 * خودش روزها را بشمارد. دو هزینه داشت:
 *
 *   • انتقال و تجزیهٔ دو هزار ردیف برای نموداری که سی عدد لازم دارد.
 *   • `dailyBuckets` برای هر روز کلِ فهرست را فیلتر می‌کند و برای هر ردیف یک
 *     `Intl.DateTimeFormat` می‌سازد — سی روز در دو هزار ردیف یعنی شصت هزار
 *     قالب‌بندیِ تاریخ در هر بار باز شدنِ پنل، روی نخِ اصلیِ مرورگر.
 *
 * و یک درستیِ اضافه: سقفِ دو هزار ردیف یعنی کاربرِ پرکار روزهای قدیمی‌ترش
 * بریده می‌شد و «رشتهٔ روزهای پیاپی» غلط درمی‌آمد. تجمیع در SQL این سقف را
 * لازم ندارد.
 *
 * تاریخ‌ها به وقتِ تهران گروه می‌شوند — همان منطقه‌ای که کلاینت هم با آن
 * حساب می‌کرد، پس نتیجه عوض نمی‌شود.
 */
export async function getAruzDayCounts(
  userId: string,
  days = 400,
): Promise<{ day: string; total: number; correct: number }[]> {
  const rows = await query<{ day: string; total: number; correct: number }>(
    `select to_char((answered_at at time zone 'Asia/Tehran')::date, 'YYYY-MM-DD') as day,
            count(*)::int                                as total,
            count(*) filter (where is_correct)::int      as correct
       from user_answers
      where user_id = $1
        and answered_at >= now() - ($2 || ' days')::interval
      group by 1
      order by 1`,
    [userId, days],
  );
  return rows;
}

/** آخرین پاسخ — یک مقدار، نه یک فهرست. */
export async function getAruzLastAnsweredAt(userId: string): Promise<string | null> {
  const row = await queryOne<{ at: string | null }>(
    `select max(answered_at) as at from user_answers where user_id = $1`,
    [userId],
  );
  return row?.at ?? null;
}
