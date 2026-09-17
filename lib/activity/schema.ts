import { z } from "zod";

/**
 * قواعدِ رویدادِ فعالیت — منطقِ خالص، بدونِ دیتابیس و بدونِ `server-only`.
 *
 * ⚠️ چرا جدا از `record.ts`:
 *
 * همان استدلالِ `lib/teacher/doc-paths.ts`. این فایل تنها چیزی است که بینِ
 * مرورگر و جدولِ `user_activity_events` می‌ایستد؛ اگر بشکند، کلاینت هر
 * چیزی می‌تواند بنویسد. یعنی از هر کدِ دیگری بیشتر به تست نیاز دارد — و
 * ماژولی که `"server-only"` باشد اصلاً قابلِ تست نیست.
 */

/* ────────────────────────── فهرست‌های بسته ─────────────────────────────── */

/**
 * رویدادهایی که ثبت می‌شوند — و فقط همین‌ها.
 *
 * ⚠️ این فهرست باید **مو‌به‌مو** با `user_activity_events_type_check` در
 * مهاجرت ۰۱۱ یکی باشد. ناهماهنگی‌اش دو شکل دارد و هر دو بد است:
 *   • مقداری اینجا باشد و در CHECK نباشد → خطای زمانِ اجرا روی هاست.
 *   • مقداری در CHECK باشد و اینجا نباشد → یک نوعِ رویدادِ مرده.
 * تستِ `tests/activity/schema.test.ts` هر دو را می‌سنجد.
 */
export const ACTIVITY_EVENT_TYPES = [
  "login",
  "game_started",
  "game_completed",
  "quiz_started",
  "quiz_completed",
  "exam_started",
  "exam_completed",
  "lesson_viewed",
  "aruz_practice_completed",
  "grammar_practice_completed",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const ACTIVITY_ENTITY_TYPES = ["game", "quiz", "exam", "lesson"] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

/**
 * شناسه‌های بازی — همان اسمِ مسیر در `app/game/`.
 *
 * ⚠️ چرا فهرستِ بسته و نه هر رشته‌ای: `entity_id` برای رویدادهای بازی از
 * کلاینت می‌آید. بدونِ فهرست، یک اسکریپت می‌توانست هزار «بازی» خیالی بسازد
 * و صفحهٔ دبیر پر از نامِ بی‌معنی شود.
 */
export const GAME_KEYS = [
  "aruz-bridge",
  "aruz-rapid",
  "grammar-circuit",
  "jasoos",
  "ninja",
  "pairs",
  "role-hunt",
  "vocab",
] as const;

export type GameKey = (typeof GAME_KEYS)[number];

/**
 * بازی‌هایی که پاسخشان **سمتِ سرور ذخیره می‌شود**.
 *
 * ⚠️ این تفکیک قلبِ «قاعدهٔ دادهٔ بازی» است و باید در یک جا زندگی کند تا
 * رابط کاربری نتواند تصادفاً خلافش را نشان دهد:
 *
 *   • برای این‌ها دبیر درست/غلط و تحلیلِ واقعی می‌بیند، از جدولِ پاسخ.
 *   • برای بقیه فقط «شروع کرد / تمام کرد» — و رابط کاربری صریحاً می‌گوید
 *     «جزئیاتِ نتیجه برای این بازی هنوز ثبت نمی‌شود»، نه یک عددِ تخمینی.
 *
 * (بررسی شد: `aruz_rapid_questions`، `ninja_words` و `memory_pairs` فقط
 *  محتوای نوشتهٔ مدیرند و هیچ جدولِ پاسخی ندارند.)
 */
export const GAMES_WITH_STORED_RESULTS: readonly GameKey[] = [
  "aruz-bridge",
  "grammar-circuit",
  "jasoos",
  "role-hunt",
  "vocab",
];

export function gameHasStoredResults(key: string): boolean {
  return (GAMES_WITH_STORED_RESULTS as readonly string[]).includes(key);
}

/* ─────────────────────────── سقف‌ها ───────────────────────────────────── */

/** سقفِ حجمِ `metadata` پس از سریال شدن. */
export const MAX_METADATA_BYTES = 1024;

/** سقفِ تعدادِ کلیدها — یک شیءِ ۵۰ کلیدیِ کوچک هم نباید بگذرد. */
export const MAX_METADATA_KEYS = 8;

/** سقفِ طولِ هر مقدارِ متنی. */
export const MAX_METADATA_STRING = 120;

/** سقفِ قدرِ مطلقِ هر مقدارِ عددی. */
export const MAX_METADATA_NUMBER = 1_000_000_000;

/* ──────────────────────── کلیدهای مجاز metadata ────────────────────────── */

/**
 * برای هر نوعِ رویداد، **دقیقاً** چه کلیدهایی پذیرفته می‌شوند.
 *
 * ⚠️ فهرستِ خالی یعنی «هیچ metadataیی قبول نیست» و این حالتِ پیش‌فرض است.
 * افزودن یک کلید باید یک تصمیم باشد.
 *
 * ⚠️⚠️ و قاعده‌ای که هیچ‌وقت نباید شکسته شود: **هیچ کلیدی حق ندارد نمره،
 * تعدادِ درست، درصد یا مدتِ زمان را حمل کند.**
 *
 * دلیلش این است که این مقادیر از مرورگر می‌آیند و سرور نمی‌تواند
 * راستی‌آزمایی‌شان کند. نشان دادنشان به دبیر به‌عنوانِ «عملکردِ آموزشی»
 * یعنی ساختنِ عددی که پشتش هیچ چیز نیست — و دبیر بر اساسش دربارهٔ یک
 * دانش‌آموزِ واقعی تصمیم می‌گیرد.
 *
 * درست/غلط فقط از جدول‌های پاسخ می‌آید: `user_answers`، `vocab_answers`،
 * `jasoos_answers`، `aruz_bridge_answers`، `grammar_circuit_answers`،
 * `quiz_attempts`، `exam_attempts`.
 */
export const METADATA_KEYS: Record<ActivityEventType, readonly string[]> = {
  login: [],
  // «کدام حالت و کدام سطح را بازی کرد» — انتخابِ خودِ دانش‌آموز، نه ادعایی
  // دربارهٔ عملکردش. برای دبیر معنی‌دار است («سراغِ پایهٔ دهم رفته») و اگر
  // هم دستکاری شود، هیچ عددی را کج نمی‌کند.
  game_started: ["mode", "level"],
  game_completed: ["mode", "level"],
  quiz_started: [],
  quiz_completed: [],
  exam_started: [],
  exam_completed: [],
  lesson_viewed: ["section"],
  aruz_practice_completed: [],
  grammar_practice_completed: [],
};

/* ─────────────────────────── اعتبارسنجی ───────────────────────────────── */

export type MetadataValue = string | number | boolean | null;
export type ActivityMetadata = Record<string, MetadataValue>;

export type MetadataCheck =
  | { ok: true; value: ActivityMetadata | null }
  | { ok: false; error: string };

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;

/** شناسهٔ موجودیت — همان الگویی که CHECK دیتابیس هم دارد. */
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidEntityId(value: string): boolean {
  return ENTITY_ID_PATTERN.test(value);
}

/**
 * `metadata` را می‌سنجد و یا مقدارِ امن می‌دهد یا دلیلِ ردش.
 *
 * ⚠️ پنج لایه، و هیچ‌کدام زائد نیست:
 *
 *   ۱) باید شیءِ ساده باشد — نه آرایه، نه `null` داخلِ ساختار، نه چیزی با
 *      prototype. (`{"__proto__": …}` یکی از راه‌های آلوده کردنِ آبجکت در
 *      جاوااسکریپت است.)
 *   ۲) هر کلید باید در فهرستِ همان نوعِ رویداد باشد.
 *   ۳) هر مقدار باید ساده باشد — شیء یا آرایهٔ تودرتو رد می‌شود، وگرنه
 *      کلاینت می‌توانست یک درختِ عمیق بفرستد.
 *   ۴) سقف روی طول و اندازه.
 *   ۵) و در آخر سقفِ حجمِ کلِ JSON — چون ۸ کلیدِ ۱۲۰ نویسه‌ای هم ممکن است
 *      از سقف رد شود.
 */
export function validateMetadata(
  eventType: ActivityEventType,
  raw: unknown,
): MetadataCheck {
  if (raw === undefined || raw === null) return { ok: true, value: null };

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "metadata باید یک شیء ساده باشد." };
  }

  const allowed = METADATA_KEYS[eventType];
  // ⚠️ `Object.keys` و نه `for…in`: دومی زنجیرهٔ prototype را هم می‌پیماید.
  const keys = Object.keys(raw as Record<string, unknown>);

  if (keys.length === 0) return { ok: true, value: null };

  if (allowed.length === 0) {
    return { ok: false, error: `رویداد «${eventType}» metadata نمی‌پذیرد.` };
  }

  if (keys.length > MAX_METADATA_KEYS) {
    return { ok: false, error: `metadata بیش از ${MAX_METADATA_KEYS} کلید دارد.` };
  }

  const out: ActivityMetadata = {};

  for (const key of keys) {
    if (!KEY_PATTERN.test(key)) {
      return { ok: false, error: "نامِ کلیدِ metadata معتبر نیست." };
    }
    if (!allowed.includes(key)) {
      return { ok: false, error: `کلیدِ «${key}» برای این رویداد مجاز نیست.` };
    }

    const value = (raw as Record<string, unknown>)[key];

    if (value === null || typeof value === "boolean") {
      out[key] = value;
      continue;
    }

    if (typeof value === "string") {
      if (value.length > MAX_METADATA_STRING) {
        return { ok: false, error: `مقدارِ «${key}» بیش از حد بلند است.` };
      }
      out[key] = value;
      continue;
    }

    if (typeof value === "number") {
      // ⚠️ `Number.isFinite` و نه `typeof === "number"` تنها: `NaN` و
      // `Infinity` هر دو عددند و هیچ‌کدام در JSON معنا ندارند.
      if (!Number.isFinite(value) || Math.abs(value) > MAX_METADATA_NUMBER) {
        return { ok: false, error: `مقدارِ «${key}» عددِ معتبری نیست.` };
      }
      out[key] = value;
      continue;
    }

    return { ok: false, error: `نوعِ مقدارِ «${key}» پشتیبانی نمی‌شود.` };
  }

  const size = Buffer.byteLength(JSON.stringify(out), "utf8");
  if (size > MAX_METADATA_BYTES) {
    return { ok: false, error: `حجمِ metadata از ${MAX_METADATA_BYTES} بایت بیشتر است.` };
  }

  return { ok: true, value: out };
}

/* ───────────────── تطبیقِ نوعِ رویداد با نوعِ موجودیت ────────────────────── */

/**
 * هر رویداد دربارهٔ چه نوع موجودیتی است.
 *
 * ⚠️ بدونِ این، `login` با `entity_type = 'exam'` هم پذیرفته می‌شد — یک
 * ردیفِ بی‌معنی که هیچ CHECKی جلویش را نمی‌گیرد، چون هر دو ستون به‌تنهایی
 * معتبرند.
 */
export const EVENT_ENTITY: Record<ActivityEventType, ActivityEntityType | null> = {
  login: null,
  game_started: "game",
  game_completed: "game",
  quiz_started: "quiz",
  quiz_completed: "quiz",
  exam_started: "exam",
  exam_completed: "exam",
  lesson_viewed: "lesson",
  /* ⚠️ این دو عمداً موجودیت ندارند. نامشان خودش می‌گوید دربارهٔ چه چیزی‌اند
     («تمرینِ عروض تمام شد»)، و دادنِ یک شناسهٔ بازی به آن‌ها فقط همان چیزی
     را تکرار می‌کرد که `game_completed` از قبل ثبت می‌کند. */
  aruz_practice_completed: null,
  grammar_practice_completed: null,
};

export type EntityCheck =
  | { ok: true; entityType: ActivityEntityType | null; entityId: string | null }
  | { ok: false; error: string };

/**
 * موجودیت را می‌سنجد.
 *
 * ⚠️ `entityType` از کلاینت گرفته **نمی‌شود** — از خودِ `eventType` مشتق
 * می‌شود. یعنی هیچ ترکیبِ ناجوری اصلاً قابلِ ساخت نیست، به‌جای اینکه
 * ترکیب‌های ناجور را یکی‌یکی رد کنیم.
 */
export function resolveEntity(
  eventType: ActivityEventType,
  rawEntityId: unknown,
): EntityCheck {
  const entityType = EVENT_ENTITY[eventType];

  if (rawEntityId === undefined || rawEntityId === null || rawEntityId === "") {
    if (entityType === "game") {
      return { ok: false, error: "شناسهٔ بازی لازم است." };
    }
    return { ok: true, entityType, entityId: null };
  }

  if (typeof rawEntityId !== "string" || !isValidEntityId(rawEntityId)) {
    return { ok: false, error: "شناسهٔ موجودیت معتبر نیست." };
  }

  if (entityType === null) {
    return { ok: false, error: `رویداد «${eventType}» شناسهٔ موجودیت نمی‌پذیرد.` };
  }

  // بازی‌ها فهرستِ بسته دارند؛ بقیه (تلاشِ آزمون و کوییز و درس) شناسه‌شان
  // از خودِ دیتابیس می‌آید و مالکیتش در `record.ts` بررسی می‌شود.
  if (entityType === "game" && !(GAME_KEYS as readonly string[]).includes(rawEntityId)) {
    return { ok: false, error: "بازیِ ناشناخته." };
  }

  return { ok: true, entityType, entityId: rawEntityId };
}

/* ════════════════════ schemaِ بدنهٔ درخواست ═══════════════════════════ */

/**
 * بدنهٔ `POST /api/v1/activity`.
 *
 * ⚠️ اینجا و نه داخلِ فایلِ route، چون تنها راهِ **تست کردنش** همین است —
 * یک فایلِ route را نمی‌شود از `node --test` وارد کرد. و این schema دقیقاً
 * همان چیزی است که جلوی جعلِ شناسهٔ کاربر می‌ایستد؛ بررسی‌نشده ماندنش
 * یعنی مهم‌ترین گارد بدونِ تست.
 *
 * ⚠️ فیلدی به نامِ `userId` **وجود ندارد** و `.strict()` یعنی فرستادنش یک
 * خطای ۴۰۰ است و نه یک مقدارِ بی‌صدا دور ریخته‌شده.
 *
 * فرقش مهم است: «نادیده گرفته می‌شود» یعنی روزی کسی که کد را می‌خواند فکر
 * کند شاید پذیرفته شود. «رد می‌شود» جای شکی نمی‌گذارد.
 *
 * ⚠️ `occurredAt` هم نیست: زمان را سرور می‌گذارد. ساعتِ دستگاهِ کاربر
 * نباید تقویمِ فعالیتِ کلاس را تعیین کند.
 *
 * ⚠️ و هیچ `score` یا `isCorrect`ی: این endpoint می‌گوید «چه اتفاقی
 * افتاد»، نه «چقدر خوب بود».
 */
export const activityRequestSchema = z
  .object({
    eventType: z.enum(ACTIVITY_EVENT_TYPES),
    entityId: z.string().trim().min(1).max(64).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
  })
  .strict();
