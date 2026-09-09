import { GRAMMAR_ROLE_CATALOG } from "@/lib/grammar-circuit/roles";

/**
 * منطقِ *خالصِ* تحلیل مهارت — بدونِ دیتابیس، بدونِ شبکه، بدونِ React.
 *
 * ⚠️ عمداً از `lib/plus/analysis.ts` جدا شده و "server-only" ندارد. دلیلش
 * آزمون‌پذیری است: قاعدهٔ «چند پاسخ لازم است تا بشود دربارهٔ یک وزن حرف زد»
 * و نگاشتِ برچسبِ فارسیِ نقش‌ها، هر دو منطقِ محصولی‌اند و باید بدونِ بالا
 * آوردنِ یک دیتابیس تست شوند.
 *
 * (همان الگویی که `lib/aruz-bridge/machine.ts` و `lib/grammar-circuit/
 * matching.ts` دارند: منطق جدا از منبعِ داده.)
 */

/** کمینهٔ پاسخ در یک سطل تا بشود دربارهٔ آن حرفی زد. */
export const MIN_EVIDENCE_PER_BUCKET = 4;

/** کمینهٔ پاسخِ کل تا اصلاً تحلیلی نشان داده شود. */
export const MIN_EVIDENCE_TOTAL = 12;

export type RawAnswer = {
  key: string;
  label: string;
  correct: boolean;
  /** نامِ فارسیِ بازی — برای اینکه کاربر بداند این عدد از کجا آمده. */
  source: string;
};

export type SkillBucket = {
  key: string;
  label: string;
  total: number;
  correct: number;
  /** بین ۰ و ۱. */
  accuracy: number;
  bySource: { source: string; total: number; correct: number }[];
};

export type SkillAnalysis = {
  /** ضعیف‌ترین‌ها اول. فقط سطل‌هایی که شواهدِ کافی دارند. */
  buckets: SkillBucket[];
  totalAnswers: number;
  hasEnoughEvidence: boolean;
  /** سطل‌هایی که کنار گذاشته شدند چون شواهدشان کم بود. */
  ignoredBuckets: number;
};

/**
 * پاسخ‌های خام → سطل‌های مرتب‌شده.
 *
 * ⚠️ قاعدهٔ «داده کافی» اینجاست و مهم است: تحلیلی که با سه پاسخ نتیجه
 * می‌گیرد حدس است، نه تحلیل — و دانش‌آموز به آن اعتماد می‌کند. سطلِ
 * کم‌شواهد کنار گذاشته می‌شود و اگر چیزی نماند، `hasEnoughEvidence` نادرست
 * می‌شود تا رابط کاربری صریحاً بگوید «هنوز داده کافی نداریم».
 */
export function bucketize(rows: RawAnswer[]): SkillAnalysis {
  const buckets = new Map<
    string,
    {
      label: string;
      total: number;
      correct: number;
      bySource: Map<string, { total: number; correct: number }>;
    }
  >();

  for (const row of rows) {
    if (!row.key) continue;
    const bucket = buckets.get(row.key) ?? {
      label: row.label,
      total: 0,
      correct: 0,
      bySource: new Map<string, { total: number; correct: number }>(),
    };

    bucket.total += 1;
    if (row.correct) bucket.correct += 1;

    const bySource = bucket.bySource.get(row.source) ?? { total: 0, correct: 0 };
    bySource.total += 1;
    if (row.correct) bySource.correct += 1;
    bucket.bySource.set(row.source, bySource);

    buckets.set(row.key, bucket);
  }

  const all = [...buckets.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    total: b.total,
    correct: b.correct,
    accuracy: b.total ? b.correct / b.total : 0,
    bySource: [...b.bySource.entries()].map(([source, s]) => ({ source, ...s })),
  }));

  const strong = all.filter((b) => b.total >= MIN_EVIDENCE_PER_BUCKET);

  return {
    // ضعیف‌ترین اول؛ در تساویِ دقت، سطلی که شواهدِ بیشتری دارد جلوتر است،
    // چون دربارهٔ آن مطمئن‌تریم.
    buckets: strong.sort((a, b) => a.accuracy - b.accuracy || b.total - a.total),
    totalAnswers: rows.length,
    hasEnoughEvidence: rows.length >= MIN_EVIDENCE_TOTAL && strong.length > 0,
    ignoredBuckets: all.length - strong.length,
  };
}

/* ─────────────────────── نگاشتِ نقش‌های دستوری ──────────────────────────── */

/** یکسان‌سازیِ نویسه‌های فارسی: نیم‌فاصله، ی/ك عربی و فاصله‌های تکراری. */
export function normalizeFa(value: string): string {
  return value
    .replace(/‌/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * برچسبِ فارسیِ نقش → کلیدِ متعارف.
 *
 * ⚠️ چرا لازم است: دو بازی دو زبانِ متفاوت حرف می‌زنند. «مدارِ دستور» کلید
 * ذخیره می‌کند (`subject`) و «جاسوس» برچسبِ فارسی (`نهاد`). بدونِ این نگاشت،
 * یک نقشِ واحد دو سطلِ جدا می‌ساخت و هر دو سطل شواهدِ ناکافی داشتند — یعنی
 * تحلیل دقیقاً همان‌جایی کور می‌شد که بیشترین داده را داشت.
 */
const ROLE_KEY_BY_LABEL = new Map<string, string>([
  ...GRAMMAR_ROLE_CATALOG.map((r) => [normalizeFa(r.label), r.key] as const),
  // مترادف‌هایی که در محتوای «جاسوس» به‌کار رفته‌اند.
  [normalizeFa("واو عطف"), "conjunct"],
  [normalizeFa("معطوف"), "conjunct"],
  [normalizeFa("مضاف الیه"), "possessive"],
  [normalizeFa("شبه جمله"), "interjection"],
  [normalizeFa("مفعول مطلق"), "absolute_object"],
]);

const ROLE_LABEL_BY_KEY = new Map(GRAMMAR_ROLE_CATALOG.map((r) => [r.key, r.label]));

export function roleLabelForKey(key: string): string | null {
  return ROLE_LABEL_BY_KEY.get(key) ?? null;
}

/**
 * از برچسبِ فارسی به یک سطلِ پایدار.
 *
 * ⚠️ نقشی که در کاتالوگ نیست (محتوای قدیمی) انداخته **نمی‌شود** — با برچسبِ
 * خودش سطل می‌شود. انداختنش یعنی از دست دادنِ شواهدِ واقعی، فقط به این دلیل
 * که کاتالوگِ ما کاملش نکرده.
 */
export function roleBucketFor(label: string): { key: string; label: string } | null {
  const normalized = normalizeFa(label ?? "");
  if (!normalized) return null;

  const key = ROLE_KEY_BY_LABEL.get(normalized);
  if (key) return { key, label: ROLE_LABEL_BY_KEY.get(key) ?? normalized };

  return { key: `label:${normalized}`, label: normalized };
}
