import type { SkillAnalysis } from "./skill-buckets";

/**
 * نقشهٔ مبحث‌ها — منطقِ خالص، بدونِ دیتابیس.
 *
 * ⚠️ چرا یک لایهٔ تازه روی `skill-buckets`: آن فایل به پرسشِ «در کدام *وزن*
 * ضعیفم؟» جواب می‌دهد و هر مهارت جزیرهٔ خودش است. چیزی که دانش‌آموز
 * می‌خواهد یک پله بالاتر است: «کجای درس ضعیفم؟» — و آن یک فهرستِ واحد است
 * که وزن و نقش و واژه و قلمروِ آزمون را کنار هم می‌گذارد و ضعیف‌ترین را اول
 * می‌آورد.
 *
 * ⚠️ کلیدِ هر مبحث (`aruz:مفاعیلن`، `vocab:davazdahom:5`، `exam:قلمرو ادبی`)
 * عمداً پایدار و پیشونددار است. امروز فقط شناسه است؛ فردا که قرار شد هر
 * مبحث به درسنامه‌اش وصل شود، نقطهٔ اتصال همین است و نه برچسبِ فارسی که با
 * یک ویرایشِ محتوا عوض می‌شود.
 *
 * ⚠️ همهٔ توابعِ این فایل خالص‌اند و `server-only` ندارند — همان الگوی
 * `skill-buckets.ts`: قاعده‌های محصولی باید بدونِ بالا آوردنِ دیتابیس تست
 * شوند.
 */

export type TopicGroup = "aruz" | "grammar" | "vocab" | "exam";

export const TOPIC_GROUP_LABEL: Record<TopicGroup, string> = {
  aruz: "عروض و وزن",
  grammar: "دستور و نقش",
  vocab: "واژگان",
  exam: "قلمروهای آزمون",
};

/**
 * ⚠️ سه پله و نه یک طیفِ پیوسته. طیف در فهرستی با پانزده سطر، پانزده رنگِ
 * کمی متفاوت می‌سازد که چشم دسته‌بندی‌شان نمی‌کند. (همان استدلالی که بالای
 * `SkillBars` نوشته شده.)
 */
export type TopicStatus = "weak" | "fair" | "strong";

export const WEAK_BELOW = 0.55;
export const STRONG_AT = 0.8;

export function statusOf(accuracy: number): TopicStatus {
  if (accuracy < WEAK_BELOW) return "weak";
  if (accuracy < STRONG_AT) return "fair";
  return "strong";
}

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  weak: "ضعیف",
  fair: "متوسط",
  strong: "خوب",
};

export type Topic = {
  /** شناسهٔ پایدار و پیشونددار. */
  key: string;
  label: string;
  group: TopicGroup;
  /** بین ۰ و ۱. */
  accuracy: number;
  /** چند شاهد پشتِ این عدد است — تا کاربر بداند چقدر جدی‌اش بگیرد. */
  evidence: number;
  /** یک جملهٔ کوتاه که می‌گوید عدد از کجا آمده. */
  detail: string;
  status: TopicStatus;
};

export function topic(
  group: TopicGroup,
  key: string,
  label: string,
  correct: number,
  total: number,
  detail: string,
): Topic {
  const accuracy = total ? correct / total : 0;
  return {
    key: `${group}:${key}`,
    label,
    group,
    accuracy,
    evidence: total,
    detail,
    status: statusOf(accuracy),
  };
}

/**
 * سطل‌های یک مهارت → مبحث.
 *
 * ⚠️ `analysis.buckets` از قبل فقط سطل‌های کافی‌شواهد را دارد، پس اینجا
 * دوباره فیلتر نمی‌شود. و اگر `hasEnoughEvidence` نادرست باشد هیچ مبحثی
 * ساخته نمی‌شود — نه یک فهرستِ کوتاهِ گمراه‌کننده.
 */
export function topicsFromSkill(analysis: SkillAnalysis, group: TopicGroup): Topic[] {
  if (!analysis.hasEnoughEvidence) return [];
  return analysis.buckets.map((b) =>
    topic(
      group,
      b.key,
      b.label,
      b.correct,
      b.total,
      b.bySource.map((s) => `${s.source} ${s.correct}/${s.total}`).join(" • "),
    ),
  );
}

export type TopicMap = {
  /** ضعیف‌ترین اول. */
  topics: Topic[];
  weak: Topic[];
  strong: Topic[];
  /** مبحث‌هایی که دیده شده‌اند ولی هنوز شواهدشان کم است. */
  pending: number;
};

/**
 * ⚠️ مرتب‌سازی: ضعیف‌ترین اول، و در تساویِ دقت آن‌که شواهدِ بیشتری دارد
 * جلوتر — چون دربارهٔ آن مطمئن‌تریم و پیشنهادِ تمرینِ مبتنی بر آن کمتر
 * احتمال دارد وقتِ دانش‌آموز را هدر بدهد.
 */
export function buildTopicMap(groups: Topic[][], pending: number): TopicMap {
  const topics = groups.flat().sort((a, b) => a.accuracy - b.accuracy || b.evidence - a.evidence);
  return {
    topics,
    weak: topics.filter((t) => t.status === "weak"),
    strong: topics.filter((t) => t.status === "strong"),
    pending,
  };
}

/* ─────────────────────────── پیشرفت در هر مبحث ─────────────────────────── */

/** یک پاسخ با زمانش — کمینهٔ چیزی که برای سنجشِ «بهتر شده؟» لازم است. */
export type DatedAnswer = { key: string; label: string; correct: boolean; at: string };

export type TopicDelta = {
  key: string;
  label: string;
  group: TopicGroup;
  /** دقتِ پنجرهٔ قبلی و پنجرهٔ اخیر، بین ۰ و ۱. */
  before: number;
  after: number;
  beforeN: number;
  afterN: number;
  /** تفاضل بر حسبِ *واحدِ درصد* و نه نسبت — ۴۵٪ به ۷۲٪ یعنی ۲۷. */
  delta: number;
};

/** کمینهٔ پاسخ در *هر دو* پنجره تا بشود از «بهتر شده» حرف زد. */
export const MIN_DELTA_EVIDENCE = 4;

/**
 * «تمرینم روی این مبحث نتیجه داد؟»
 *
 * ⚠️ نبودِ همین تابع بود که تحلیل را نصفه می‌گذاشت. روندِ کلی
 * (`getProgressTrend`) می‌گوید دقتِ *کلی* بالا رفته، ولی دانش‌آموزی که یک
 * هفته روی «مفاعیلن» کار کرده، دربارهٔ *مفاعیلن* جواب می‌خواهد — و عددِ کلی
 * می‌تواند فقط به این دلیل بالا رفته باشد که او سراغِ تمرینِ آسان‌تری رفته.
 *
 * ⚠️ دو پنجرهٔ **هم‌اندازه و پشتِ سرِ هم** مقایسه می‌شوند و نه «اخیر در برابرِ
 * همهٔ تاریخ». اگر مبنا کلِ تاریخ باشد، پاسخ‌های تازه در دریای پاسخ‌های
 * قدیمی گم می‌شوند و پیشرفتِ واقعی هیچ‌وقت دیده نمی‌شود.
 *
 * ⚠️ مبحثی که در یکی از دو پنجره شواهدِ کافی ندارد **حذف** می‌شود و نه اینکه
 * صفر بگیرد. «از ۰٪ به ۸۰٪» برای کسی که قبلاً یک بار تمرین کرده بود، یک
 * عددِ چشمگیرِ بی‌معناست.
 */
export function topicDeltas(
  rows: DatedAnswer[],
  group: TopicGroup,
  now: Date,
  windowDays = 14,
): TopicDelta[] {
  const span = windowDays * 86_400_000;
  const recentFrom = now.getTime() - span;
  const olderFrom = recentFrom - span;

  type Pair = [correct: number, total: number];
  const acc = new Map<string, { label: string; before: Pair; after: Pair }>();

  for (const row of rows) {
    const t = Date.parse(row.at);
    if (!Number.isFinite(t) || t < olderFrom) continue;

    const entry =
      acc.get(row.key) ?? { label: row.label, before: [0, 0] as Pair, after: [0, 0] as Pair };
    const slot = t >= recentFrom ? entry.after : entry.before;
    slot[1] += 1;
    if (row.correct) slot[0] += 1;
    acc.set(row.key, entry);
  }

  const out: TopicDelta[] = [];
  for (const [key, e] of acc) {
    if (e.before[1] < MIN_DELTA_EVIDENCE || e.after[1] < MIN_DELTA_EVIDENCE) continue;
    const before = e.before[0] / e.before[1];
    const after = e.after[0] / e.after[1];
    out.push({
      key: `${group}:${key}`,
      label: e.label,
      group,
      before,
      after,
      beforeN: e.before[1],
      afterN: e.after[1],
      delta: Math.round((after - before) * 100),
    });
  }

  /* بزرگ‌ترین تغییر اول — چه رو به بالا و چه رو به پایین. افتِ یک مبحث هم
     خبر است، و پنهان کردنش یعنی دانش‌آموز تا شبِ آزمون نفهمد. */
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/* ──────────────────────────── شاخصِ تسلط ────────────────────────────────── */

export type MasteryPart = { key: string; label: string; percent: number; hint: string };

export type Mastery = {
  /** ۰ تا ۱۰۰. */
  score: number;
  level: string;
  /** اجزای نمره — همیشه کنارِ عدد نمایش داده می‌شوند. */
  parts: MasteryPart[];
  /** وقتی شواهد کم است، عدد معنا ندارد و نباید نشان داده شود. */
  ready: boolean;
};

const LEVELS: { at: number; label: string }[] = [
  { at: 85, label: "مسلط" },
  { at: 70, label: "پیشرفته" },
  { at: 50, label: "در حال پیشرفت" },
  { at: 0, label: "تازه‌کار" },
];

/**
 * یک عددِ خلاصه برای «کجای کارم؟».
 *
 * ⚠️ و سه جزئش **همیشه** کنارش نوشته می‌شوند. یک عددِ واحدِ بی‌توضیح هر
 * تفسیری را برمی‌دارد: کسی که ۶۲ می‌بیند نمی‌داند باید بیشتر تمرین کند یا
 * دقیق‌تر. با سه جزء، خودِ عدد می‌گوید کدام پایه لنگ است.
 *
 * ⚠️ وزن‌ها یک قضاوتِ محصولی‌اند و نه یک نتیجهٔ آماری، و همین‌جا نوشته
 * می‌شوند تا کسی دنبالِ پشتوانه‌شان نگردد:
 *   • دقت ۵۰٪   — مهم‌ترین چیز، ولی به‌تنهایی کسی را که فقط یک مبحثِ آسان
 *                 تمرین کرده «مسلط» نشان می‌دهد.
 *   • پوشش ۳۰٪  — چند مبحث به وضعیتِ خوب رسیده‌اند.
 *   • استمرار ۲۰٪ — چند هفته از هشت هفتهٔ اخیر فعال بوده.
 */
export function masteryScore(input: {
  correct: number;
  total: number;
  /** مبحث‌هایی که وضعیتشان «خوب» است. */
  strongTopics: number;
  /** همهٔ مبحث‌هایی که به حدِ سنجش رسیده‌اند. */
  ratedTopics: number;
  activeWeeks: number;
  weeks: number;
}): Mastery {
  const accuracy = input.total ? input.correct / input.total : 0;
  const coverage = input.ratedTopics ? input.strongTopics / input.ratedTopics : 0;
  const consistency = input.weeks ? Math.min(1, input.activeWeeks / input.weeks) : 0;

  const score = Math.round(accuracy * 50 + coverage * 30 + consistency * 20);
  const level = LEVELS.find((l) => score >= l.at)?.label ?? "تازه‌کار";

  return {
    /* ⚠️ بدونِ حتی یک مبحثِ سنجیده‌شده، عدد فقط از دقت می‌آید و گمراه است. */
    ready: input.ratedTopics > 0 && input.total > 0,
    score,
    level,
    parts: [
      {
        key: "accuracy",
        label: "دقت",
        percent: Math.round(accuracy * 100),
        hint: `${input.correct} از ${input.total} پاسخ درست`,
      },
      {
        key: "coverage",
        label: "پوشش",
        percent: Math.round(coverage * 100),
        hint: `${input.strongTopics} از ${input.ratedTopics} مبحث در وضعیت خوب`,
      },
      {
        key: "consistency",
        label: "استمرار",
        percent: Math.round(consistency * 100),
        hint: `${input.activeWeeks} هفته فعال از ${input.weeks} هفتهٔ اخیر`,
      },
    ],
  };
}
