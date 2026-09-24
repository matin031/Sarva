import "server-only";
import { placeholders, query } from "@/lib/db";
import { GRADE_META, LESSON_TITLES } from "@/lib/doroos/catalog";
import type { GradeKey } from "@/lib/doroos/types";
import { readAttemptQuestions } from "@/lib/exam/attempt-view";
import { collectRoleRows, collectWeightRows, type ProgressPoint } from "./analysis";
import { bucketize, roleLabelForKey } from "./skill-buckets";
import {
  buildTopicMap,
  masteryScore,
  topic,
  topicDeltas,
  topicsFromSkill,
  type Mastery,
  type Topic,
  type TopicDelta,
  type TopicMap,
} from "./topics";

/**
 * تحلیلِ عمیقِ سروا پلاس — یک لایه بالاتر از `analysis.ts`.
 *
 * ⚠️ فرقش با `analysis.ts` در جنسِ پرسش است و نه در اندازه:
 *
 *   • `analysis.ts`  → «در کدام *وزن* ضعیفم؟»  (یک مهارت، یک فهرست)
 *   • این فایل        → «کجای درس ضعیفم، چقدر بهتر شده‌ام، و اشتباهم چه
 *                        الگویی دارد؟»
 *
 * سه چیز اینجا اضافه می‌شود که هیچ‌کدام در تحلیلِ قبلی نبودند و هر سه از
 * دادهٔ **موجود** درمی‌آیند — نه از یک جدولِ تازه:
 *
 *   ۱. **قلمروهای آزمون** (`exam_attempts` × `exam_sections`) — نزدیک‌ترین
 *      چیز به «مبحث» در کلِ سایت. کارنامه‌ها از روزِ اول ذخیره می‌شدند و
 *      هیچ‌وقت خوانده نمی‌شدند.
 *   ۲. **واژگان به تفکیکِ درس** (`vocab_answers.grade/lesson`) — واژه‌یاب
 *      اصلاً در تحلیل نبود، در حالی که درسِ هر واژه ذخیره می‌شود.
 *   ۳. **الگوی اشتباه** (`chosen_* ≠ correct_*`) — نه فقط «غلط زدی» بلکه
 *      «چه چیزی را با چه چیزی عوضی می‌گیری». این ستون‌ها از اول بودند و
 *      هیچ‌جا خوانده نمی‌شدند.
 *
 * ⚠️ و همان قاعدهٔ `analysis.ts` اینجا هم برقرار است: چیزی که شواهدِ کافی
 * ندارد **ساخته نمی‌شود**. یک تحلیلِ حدسی بدتر از نبودِ تحلیل است، چون
 * دانش‌آموز به آن اعتماد می‌کند و وقتش را جای اشتباه می‌گذارد.
 */

/** سقفِ ردیف در هر کوئری — همهٔ کوئری‌ها باید کران‌دار بمانند. */
const ATTEMPT_CAP = 30;

/* ───────────────────── مبحث‌های آزمون (قلمروها) ─────────────────────────── */

/** کمینهٔ نمرهٔ کلِ یک قلمرو تا بشود درباره‌اش حرف زد. */
const MIN_EXAM_MAX = 3;

/**
 * قلمروهای آزمون — «قلمرو زبانی»، «قلمرو ادبی»، «تاریخ ادبیات»، ...
 *
 * ⚠️ دو کوئری و نه یک join. کوئریِ یکپارچه، `question_results` را — که یک
 * ستونِ JSONِ کامل است — به ازای *هر سؤالِ* هر آزمون تکرار می‌کرد: برای
 * بیست کارنامهٔ بیست‌سؤالی یعنی چهارصد بار همان متن.
 *
 * ⚠️ نگاشتِ «شمارهٔ سؤال → قلمرو» به `exam_id` وابسته است و نه فقط به
 * شماره. شماره‌گذاری در هر برگه از نو شروع می‌شود، پس سؤالِ ۸ در یک آزمون
 * «قلمرو ادبی» است و در آزمونِ دیگر می‌تواند «سبک‌شناسی» باشد.
 */
export async function getExamTopics(userId: string): Promise<Topic[]> {
  const attempts = await query<{
    exam_id: string;
    question_results: unknown;
  }>(
    `select exam_id, question_results
       from exam_attempts
      where user_id = ?
      order by created_at desc
      limit ?`,
    [userId, ATTEMPT_CAP],
  );

  if (attempts.length === 0) return [];

  const examIds = [...new Set(attempts.map((a) => a.exam_id))];
  const sections = await query<{ exam_id: string; title: string; number: number }>(
    `select s.exam_id, s.title, q.number
       from exam_sections s
       join exam_questions q on q.exam_section_id = s.id
      where s.exam_id in (${placeholders(examIds.length)})`,
    examIds,
  );

  /* `exam_id|number` → عنوانِ قلمرو. */
  const sectionOf = new Map<string, string>();
  for (const s of sections) sectionOf.set(`${s.exam_id}|${s.number}`, s.title.trim());

  const totals = new Map<string, { scored: number; max: number; papers: Set<number> }>();

  attempts.forEach((attempt, index) => {
    /* ⚠️ `readAttemptQuestions` و نه خواندنِ مستقیمِ JSON: دو شکلِ ذخیره‌سازی
       در دیتابیس هست (قدیمی `{score,max}` و امروزی `{parts:[…]}`) و در
       MariaDB ستونِ JSON اصلاً **رشته** برمی‌گردد. همهٔ این دانش آنجاست. */
    for (const q of readAttemptQuestions(attempt.question_results)) {
      const title = sectionOf.get(`${attempt.exam_id}|${q.number}`);
      if (!title || q.max <= 0) continue;

      const bucket = totals.get(title) ?? { scored: 0, max: 0, papers: new Set<number>() };
      bucket.scored += q.score;
      bucket.max += q.max;
      bucket.papers.add(index);
      totals.set(title, bucket);
    }
  });

  const out: Topic[] = [];
  for (const [title, t] of totals) {
    /* ⚠️ حدِ کفایت اینجا «نمره» است و نه «تعدادِ پاسخ». یک قلمرو می‌تواند
       یک سؤالِ پنج‌نمره‌ای داشته باشد و قلمروی دیگر ده سؤالِ نیم‌نمره‌ای؛
       شمردنِ سؤال، اولی را همیشه کم‌شاهد نشان می‌داد. */
    if (t.max < MIN_EXAM_MAX) continue;
    out.push(
      topic(
        "exam",
        title,
        title,
        /* ⚠️ «درست» اینجا نمرهٔ کسب‌شده است و نه تعدادِ پاسخِ درست: سؤالِ
           نیمه‌درست در آزمون واقعاً نیمه‌درست است و گرد کردنش به صفر یا یک،
           کارنامه را با تحلیل ناسازگار می‌کرد. */
        t.scored,
        t.max,
        `${t.papers.size} کارنامه`,
      ),
    );
  }

  return out;
}

/* ───────────────────────── مبحث‌های واژگان ──────────────────────────────── */

/** کمینهٔ پاسخ در یک درس تا بشود درباره‌اش حرف زد. */
const MIN_VOCAB_ANSWERS = 5;

const GRADE_LABEL = new Map(GRADE_META.map((g) => [g.key as string, g.label]));

/** «دوازدهم · درس ۵: کویر» — عنوانِ درس وقتی می‌دانیمش. */
function vocabLabel(grade: string, lesson: number): string {
  const gradeLabel = GRADE_LABEL.get(grade) ?? grade;
  const title = LESSON_TITLES[grade as GradeKey]?.[lesson];
  return title ? `${gradeLabel} · درس ${lesson}: ${title}` : `${gradeLabel} · درس ${lesson}`;
}

/**
 * واژگان به تفکیکِ درس.
 *
 * ⚠️ واژه‌یاب تا امروز اصلاً در تحلیل نبود، با اینکه پایه و شمارهٔ درسِ هر
 * واژه در همان ردیف ذخیره می‌شود. و این نزدیک‌ترین سیگنال به «مبحث» است
 * که کاربر خودش هم با همان اسم می‌شناسدش: «درس ۵».
 *
 * ⚠️ تجمیع در دیتابیس و نه در کد — کاربرِ پرکار هزاران ردیفِ واژه دارد و
 * کشیدنشان برای شمردنِ بیست عدد، همان اشتباهی است که `getPanelOverview`
 * یک بار مرتکب شد.
 *
 * ⚠️ و یک صداقتِ لازم: `vocab_answers.is_correct` را مرورگر می‌فرستد
 * (توضیحش در `docs/activity-events.md`). برای «کدام درس را باید مرور
 * کنم» کافی است، ولی سنجهٔ سختی نیست.
 */
export async function getVocabTopics(userId: string): Promise<Topic[]> {
  const rows = await query<{ grade: string; lesson: number; total: number; correct: number }>(
    `select grade, lesson, count(*) as total, sum(is_correct = 1) as correct
       from vocab_answers
      where user_id = ?
      group by grade, lesson
      having count(*) >= ?
      order by total desc
      limit 40`,
    [userId, MIN_VOCAB_ANSWERS],
  );

  return rows.map((r) =>
    topic(
      "vocab",
      `${r.grade}:${r.lesson}`,
      vocabLabel(r.grade, r.lesson),
      Number(r.correct),
      Number(r.total),
      `${Number(r.total)} واژه تمرین‌شده`,
    ),
  );
}

/* ──────────────────────── الگوی اشتباه‌ها ───────────────────────────────── */

export type Confusion = {
  area: string;
  /** چیزی که درست بود. */
  expected: string;
  /** چیزی که کاربر انتخاب کرد. */
  chosen: string;
  times: number;
};

/** کمینهٔ تکرار تا یک اشتباه «الگو» شمرده شود و نه بدشانسی. */
const MIN_CONFUSION = 2;

/**
 * «چه چیزی را با چه چیزی عوضی می‌گیری؟»
 *
 * ⚠️ این تنها بخشِ تحلیل است که به جای «چقدر غلط زدی» می‌گوید «غلط‌هایت چه
 * شکلی‌اند» — و دقیقاً همان چیزی است که دبیر سرِ کلاس می‌گوید و هیچ گزارشِ
 * درصدی نمی‌تواند بگوید: کسی که «مفاعیلن» را همیشه با «مفتعلن» اشتباه
 * می‌گیرد، مشکلش وزن نیست، تفکیکِ آن دوتاست.
 *
 * ⚠️ ستون‌های `chosen_*` از روزِ اول در این سه جدول بودند و هیچ‌جا خوانده
 * نمی‌شدند.
 */
export async function getConfusions(userId: string, limit = 6): Promise<Confusion[]> {
  const cap = Math.min(Math.max(limit, 1), 20);

  const [bridge, jasoos, circuit] = await Promise.all([
    query<{ expected: string; chosen: string; n: number }>(
      `select correct_pattern as expected, chosen_pattern as chosen, count(*) as n
         from aruz_bridge_answers
        where user_id = ? and is_correct = 0 and chosen_pattern is not null
        group by correct_pattern, chosen_pattern
       having count(*) >= ?
        order by n desc
        limit ?`,
      [userId, MIN_CONFUSION, cap],
    ),
    query<{ expected: string; chosen: string; n: number }>(
      `select correct_role as expected, chosen_role as chosen, count(*) as n
         from jasoos_answers
        where user_id = ? and is_correct = 0
        group by correct_role, chosen_role
       having count(*) >= ?
        order by n desc
        limit ?`,
      [userId, MIN_CONFUSION, cap],
    ),
    query<{ expected: string; chosen: string; n: number }>(
      `select role_key as expected, chosen_role_key as chosen, count(*) as n
         from grammar_circuit_answers
        where user_id = ? and is_correct = 0
        group by role_key, chosen_role_key
       having count(*) >= ?
        order by n desc
        limit ?`,
      [userId, MIN_CONFUSION, cap],
    ),
  ]);

  const all: Confusion[] = [
    ...bridge.map((r) => ({
      area: "وزن",
      expected: r.expected,
      chosen: r.chosen,
      times: Number(r.n),
    })),
    ...jasoos.map((r) => ({
      area: "نقش دستوری",
      expected: r.expected,
      chosen: r.chosen,
      times: Number(r.n),
    })),
    ...circuit.map((r) => ({
      area: "نقش دستوری",
      /* کلیدِ انگلیسی به برچسبِ فارسی — همان نگاشتی که تحلیلِ نقش هم
         استفاده می‌کند، تا دو جا دو اسمِ متفاوت نگویند. */
      expected: roleLabelForKey(r.expected) ?? r.expected,
      chosen: roleLabelForKey(r.chosen) ?? r.chosen,
      times: Number(r.n),
    })),
  ];

  return all.sort((a, b) => b.times - a.times).slice(0, cap);
}

/* ────────────────────── جنسِ خطا در کیمیای وزن ──────────────────────────── */

export type ErrorShape = { orderOnly: number; footContent: number; total: number };

/**
 * «ارکان را بلدی ولی ترتیبشان را اشتباه می‌چینی» — یا برعکس.
 *
 * ⚠️ `kimia_rounds.first_error_type` یکی از دو مقدار را می‌گیرد و تفاوتشان
 * تفاوتِ *دو مشکلِ کاملاً متفاوت* است:
 *   • `ORDER_ONLY`   — ارکانِ درست را برداشته، جایشان را اشتباه چیده.
 *   • `FOOT_CONTENT` — اصلاً رکنِ درست را نشناخته.
 *
 * اولی یعنی شناختِ ارکان سالم است و تمرینِ لازم «چیدمان» است؛ دومی یعنی
 * باید از خودِ ارکان شروع کند. یک درصدِ کلیِ «۶۰٪ درست» این دو را یکی
 * نشان می‌دهد.
 *
 * ⚠️ فقط تلاشِ **اول** شمرده می‌شود — همان قاعده‌ای که کلِ تحلیلِ وزن دارد.
 * در آن بازی بازیکن می‌تواند اصلاح کند و دوباره آزمایش کند، و شاهدِ
 * یادگیری تلاشِ اول است.
 */
export async function getErrorShape(userId: string): Promise<ErrorShape | null> {
  const rows = await query<{ t: string; n: number }>(
    `select first_error_type as t, count(*) as n
       from kimia_rounds
      where user_id = ?
        and answered_at is not null
        and first_correct = 0
        and first_error_type is not null
      group by first_error_type`,
    [userId],
  );

  const orderOnly = Number(rows.find((r) => r.t === "ORDER_ONLY")?.n ?? 0);
  const footContent = Number(rows.find((r) => r.t === "FOOT_CONTENT")?.n ?? 0);
  const total = orderOnly + footContent;

  // با کمتر از چهار خطا هر نسبتی نویز است.
  return total >= 4 ? { orderOnly, footContent, total } : null;
}

/* ─────────────────────────── همه با هم ──────────────────────────────────── */

export type Insights = {
  map: TopicMap;
  /** بزرگ‌ترین تغییرها در دو هفتهٔ اخیر نسبت به دو هفتهٔ پیش از آن. */
  deltas: TopicDelta[];
  confusions: Confusion[];
  errorShape: ErrorShape | null;
  mastery: Mastery;
};

/** چند هفته از یک روند، فعالیت داشته — جزءِ «استمرار» در شاخصِ تسلط. */
function activeWeeks(trend: ProgressPoint[]): number {
  return trend.filter((p) => p.total > 0).length;
}

/**
 * یک ورودی برای کلِ صفحهٔ تحلیل.
 *
 * ⚠️ `trend` از بیرون پاس داده می‌شود و دوباره گرفته نمی‌شود: صفحه از قبل
 * برای نمودارِ هفتگی آن را دارد، و شاخصِ تسلط باید **همان** عددها را
 * بشمارد. دو کوئریِ جدا یعنی روزی نمودار یک چیز بگوید و شاخص چیزِ دیگر.
 *
 * ⚠️ «استمرار» از همین روندِ هفتگی می‌آید و نه از سطل‌بندیِ روزانه. سطل‌بندیِ
 * روزانه به `CONVERT_TZ` و جدول‌های `mysql.time_zone` نیاز دارد که روی
 * هاستِ اشتراکی ممکن است نباشند و آن‌وقت بی‌هیچ خطایی `NULL` می‌دهد —
 * یعنی یک عددِ غلط، نه یک نمودارِ خالی. روندِ هفتگی آن وابستگی را ندارد.
 */
export async function getInsights(
  userId: string,
  trend: ProgressPoint[],
  /** همان بازه‌ای که `getProgressTrend` با آن صدا زده شده. */
  weeks = 8,
): Promise<Insights> {
  const [weightRows, roleRows, examTopics, vocabTopics, confusions, errorShape] =
    await Promise.all([
      collectWeightRows(userId),
      collectRoleRows(userId),
      getExamTopics(userId),
      getVocabTopics(userId),
      getConfusions(userId),
      getErrorShape(userId),
    ]);

  const weights = bucketize(weightRows);
  const roles = bucketize(roleRows);

  const map = buildTopicMap(
    [
      topicsFromSkill(weights, "aruz"),
      topicsFromSkill(roles, "grammar"),
      vocabTopics,
      examTopics,
    ],
    weights.ignoredBuckets + roles.ignoredBuckets,
  );

  const now = new Date();
  const dated = (rows: typeof weightRows) =>
    rows.flatMap((r) => (r.at ? [{ key: r.key, label: r.label, correct: r.correct, at: r.at }] : []));

  const deltas = [
    ...topicDeltas(dated(weightRows), "aruz", now),
    ...topicDeltas(dated(roleRows), "grammar", now),
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const correct = trend.reduce((n, p) => n + p.correct, 0);
  const total = trend.reduce((n, p) => n + p.total, 0);

  return {
    map,
    deltas,
    confusions,
    errorShape,
    mastery: masteryScore({
      correct,
      total,
      strongTopics: map.strong.length,
      ratedTopics: map.topics.length,
      activeWeeks: activeWeeks(trend),
      weeks,
    }),
  };
}
