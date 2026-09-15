import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_EVENT_TYPES,
  EVENT_ENTITY,
  GAMES_WITH_STORED_RESULTS,
  GAME_KEYS,
  MAX_METADATA_BYTES,
  MAX_METADATA_KEYS,
  MAX_METADATA_STRING,
  METADATA_KEYS,
  gameHasStoredResults,
  resolveEntity,
  validateMetadata,
  type ActivityEventType,
} from "@/lib/activity/schema";

/**
 * قواعدِ رویدادِ فعالیت.
 *
 * ⚠️ چیزی که این فایل محافظت می‌کند، مرزِ بینِ مرورگر و یک جدولِ append-only
 * است. اگر بشکند، کلاینت می‌تواند هر چیزی بنویسد — و بدتر از حجمِ زباله،
 * چیزی که بعداً به‌عنوانِ «فعالیتِ آموزشیِ دانش‌آموز» به دبیرش نشان داده
 * می‌شود.
 */

const MIGRATION = readFileSync(
  join(process.cwd(), "mysql-migrations", "011_activity_events.sql"),
  "utf8",
);

/** مقادیرِ داخلِ یک بندِ `CHECK (... IN ( … ))` در فایلِ مهاجرت. */
function checkValues(constraintName: string): string[] {
  const start = MIGRATION.indexOf(constraintName);
  assert.ok(start > 0, `بندِ ${constraintName} در مهاجرت نیست`);
  const open = MIGRATION.indexOf("IN (", start);
  const close = MIGRATION.indexOf("))", open);
  return [...MIGRATION.slice(open + 4, close).matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("فهرست‌ها با CHECK دیتابیس یکی‌اند", () => {
  /**
   * ⚠️ مهم‌ترین تستِ این فایل.
   *
   * تایپ‌اسکریپت در زمانِ اجرا وجود ندارد. اگر این دو فهرست از هم جدا
   * بیفتند، نتیجه‌اش دو باگِ متفاوت است و هر دو فقط روی هاست دیده می‌شوند:
   *   • مقداری اینجا و نه در CHECK → خطای ۵۰۰ هنگامِ ثبتِ رویداد.
   *   • مقداری در CHECK و نه اینجا → یک نوعِ رویدادِ مرده که هیچ‌وقت نوشته
   *     نمی‌شود و کسی هم متوجه نمی‌شود.
   */
  test("نوعِ رویداد", () => {
    assert.deepEqual(
      [...ACTIVITY_EVENT_TYPES].sort(),
      checkValues("user_activity_events_type_check").sort(),
    );
  });

  test("نوعِ موجودیت", () => {
    assert.deepEqual(
      [...ACTIVITY_ENTITY_TYPES].sort(),
      checkValues("user_activity_events_entity_type_check").sort(),
    );
  });

  test("هر نوعِ رویداد یک ردیف در METADATA_KEYS و EVENT_ENTITY دارد", () => {
    for (const type of ACTIVITY_EVENT_TYPES) {
      assert.ok(METADATA_KEYS[type] !== undefined, `${type} در METADATA_KEYS نیست`);
      assert.ok(type in EVENT_ENTITY, `${type} در EVENT_ENTITY نیست`);
    }
    assert.equal(Object.keys(METADATA_KEYS).length, ACTIVITY_EVENT_TYPES.length);
    assert.equal(Object.keys(EVENT_ENTITY).length, ACTIVITY_EVENT_TYPES.length);
  });
});

describe("قاعدهٔ دادهٔ بازی", () => {
  test("بازی‌های دارای نتیجهٔ ذخیره‌شده زیرمجموعهٔ فهرستِ بازی‌هایند", () => {
    for (const key of GAMES_WITH_STORED_RESULTS) {
      assert.ok((GAME_KEYS as readonly string[]).includes(key), `${key} بازی نیست`);
    }
  });

  /**
   * ⚠️ این سه بازی هیچ جدولِ پاسخی ندارند و نباید داشته باشند تا وقتی
   * کسی واقعاً یکی بسازد. اگر روزی این تست بشکند یعنی یا جدول ساخته شده
   * (خوب — فهرست را به‌روز کن) یا کسی بی‌خبر ادعا کرده که داده دارند.
   */
  test("تندخوان، نینجا و جفت‌ها نتیجهٔ ذخیره‌شده ندارند", () => {
    for (const key of ["aruz-rapid", "ninja", "pairs"]) {
      assert.equal(gameHasStoredResults(key), false, `${key} نباید نتیجه داشته باشد`);
    }
  });

  test("بازی ناشناخته نتیجه‌دار شمرده نمی‌شود", () => {
    assert.equal(gameHasStoredResults("something-else"), false);
  });
});

describe("کلیدهای metadata", () => {
  /**
   * ⚠️ قاعده‌ای که کلِ صداقتِ تحلیلِ دبیر به آن بند است.
   *
   * مقدارهای metadata از مرورگر می‌آیند و سرور نمی‌تواند راستی‌آزمایی‌شان
   * کند. اگر روزی کلیدی مثل `score` یا `correct` به این فهرست اضافه شود،
   * یک عددِ غیرقابلِ اعتماد وارد سیستم می‌شود که بعداً به‌عنوانِ «عملکردِ
   * آموزشی» به دبیر نشان داده می‌شود و او بر اساسش دربارهٔ یک دانش‌آموزِ
   * واقعی تصمیم می‌گیرد.
   *
   * این تست آن اضافه شدن را در همان لحظه می‌گیرد، نه شش ماه بعد.
   */
  test("هیچ کلیدی نمره یا مدتِ زمان را حمل نمی‌کند", () => {
    const forbidden = [
      "score", "points", "correct", "wrong", "accuracy", "percent", "percentage",
      "duration", "seconds", "ms", "millis", "time", "elapsed", "streak", "rank",
    ];
    for (const [type, keys] of Object.entries(METADATA_KEYS)) {
      for (const key of keys) {
        const lower = key.toLowerCase();
        for (const bad of forbidden) {
          assert.ok(
            !lower.includes(bad),
            `کلیدِ «${key}» در «${type}» شبیهِ نمره/زمان است — قاعدهٔ دادهٔ بازی را بخوان`,
          );
        }
      }
    }
  });
});

describe("اعتبارسنجیِ metadata", () => {
  test("نبودنش مجاز است", () => {
    assert.deepEqual(validateMetadata("login", undefined), { ok: true, value: null });
    assert.deepEqual(validateMetadata("login", null), { ok: true, value: null });
    // شیءِ خالی هم همان نبودن است — ردیفی با `{}` ذخیره نمی‌شود.
    assert.deepEqual(validateMetadata("login", {}), { ok: true, value: null });
  });

  test("کلیدِ مجاز پذیرفته می‌شود", () => {
    const result = validateMetadata("game_started", { mode: "easy", level: "dahom" });
    assert.ok(result.ok);
    assert.deepEqual(result.value, { mode: "easy", level: "dahom" });
  });

  /** ⚠️ رویدادی که فهرستش خالی است، *هیچ* metadataیی نمی‌گیرد. */
  test("رویدادِ بدونِ کلیدِ مجاز، metadata نمی‌پذیرد", () => {
    const result = validateMetadata("login", { mode: "x" });
    assert.equal(result.ok, false);
  });

  test("کلیدِ خارج از فهرست رد می‌شود", () => {
    assert.equal(validateMetadata("game_started", { score: 100 }).ok, false);
    assert.equal(validateMetadata("game_started", { mode: "a", score: 100 }).ok, false);
  });

  test("آرایه شیء نیست", () => {
    assert.equal(validateMetadata("game_started", ["mode"]).ok, false);
    assert.equal(validateMetadata("game_started", "mode=easy").ok, false);
    assert.equal(validateMetadata("game_started", 42).ok, false);
  });

  test("مقدارِ تودرتو رد می‌شود", () => {
    assert.equal(validateMetadata("game_started", { mode: { deep: true } }).ok, false);
    assert.equal(validateMetadata("game_started", { mode: ["a", "b"] }).ok, false);
  });

  test("مقدارِ متنیِ بلند رد می‌شود", () => {
    const long = "x".repeat(MAX_METADATA_STRING + 1);
    assert.equal(validateMetadata("game_started", { mode: long }).ok, false);
    assert.equal(
      validateMetadata("game_started", { mode: "x".repeat(MAX_METADATA_STRING) }).ok,
      true,
    );
  });

  /** ⚠️ `NaN` و `Infinity` هر دو `typeof "number"` اند و در JSON `null`
   *  می‌شوند — یعنی بدونِ این بررسی، بی‌صدا تبدیل می‌شدند. */
  test("عددِ نامعتبر رد می‌شود", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 1e12]) {
      assert.equal(validateMetadata("lesson_viewed", { section: bad }).ok, false);
    }
  });

  test("تعدادِ کلیدِ زیاد رد می‌شود", () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < MAX_METADATA_KEYS + 1; i++) many[`k${i}`] = "v";
    assert.equal(validateMetadata("game_started", many).ok, false);
  });

  /** ⚠️ ورودیِ عظیم — همان چیزی که سقفِ بایت برایش هست. */
  test("metadataِ بزرگ رد می‌شود", () => {
    const huge = { mode: "x".repeat(50_000) };
    const result = validateMetadata("game_started", huge);
    assert.equal(result.ok, false);
    // و حتی اگر سقفِ طولِ رشته نبود، سقفِ بایت هم می‌گرفتش.
    assert.ok(MAX_METADATA_BYTES < 50_000);
  });

  /** ⚠️ `__proto__` یکی از راه‌های آلوده کردنِ آبجکت در جاوااسکریپت است.
   *  اینجا چون کلید در فهرست نیست رد می‌شود — ولی صریحاً آزموده می‌شود
   *  تا اگر روزی فهرست باز شد، کسی یادش بماند. */
  test("__proto__ رد می‌شود", () => {
    assert.equal(validateMetadata("game_started", JSON.parse('{"__proto__":{"x":1}}')).ok, false);
  });
});

describe("تطبیقِ موجودیت با رویداد", () => {
  test("رویدادِ بازی بدونِ شناسه رد می‌شود", () => {
    assert.equal(resolveEntity("game_started", null).ok, false);
    assert.equal(resolveEntity("game_completed", "").ok, false);
  });

  test("بازیِ ناشناخته رد می‌شود", () => {
    assert.equal(resolveEntity("game_started", "minecraft").ok, false);
  });

  test("بازیِ معتبر پذیرفته می‌شود و نوعش از خودِ رویداد می‌آید", () => {
    const result = resolveEntity("game_started", "aruz-bridge");
    assert.ok(result.ok);
    assert.equal(result.entityType, "game");
    assert.equal(result.entityId, "aruz-bridge");
  });

  /** ⚠️ `login` دربارهٔ هیچ موجودیتی نیست؛ شناسه فرستادن یعنی فراخوان
   *  اشتباه فهمیده و باید خطا بگیرد، نه اینکه بی‌صدا دور ریخته شود. */
  test("رویدادِ بدونِ موجودیت، شناسه نمی‌پذیرد", () => {
    assert.equal(resolveEntity("login", "anything").ok, false);
    const empty = resolveEntity("login", null);
    assert.ok(empty.ok);
    assert.equal(empty.entityType, null);
    assert.equal(empty.entityId, null);
  });

  test("شناسهٔ بدشکل رد می‌شود", () => {
    for (const bad of ["../etc", "a b", "x".repeat(65), "a/b", "سلام", "a\0b"]) {
      assert.equal(resolveEntity("quiz_completed", bad).ok, false, `«${bad}» باید رد شود`);
    }
  });

  test("شناسهٔ تلاش (uuid) پذیرفته می‌شود", () => {
    const result = resolveEntity("quiz_completed", "0f9f1a3c-2b4d-4e6f-8a1b-2c3d4e5f6a7b");
    assert.ok(result.ok);
    assert.equal(result.entityType, "quiz");
  });

  /** هر نوعِ رویداد باید بدونِ شناسه هم یک نتیجهٔ معنی‌دار بدهد — جز بازی‌ها. */
  test("هیچ نوعِ رویدادی استثنا جا نمی‌گذارد", () => {
    for (const type of ACTIVITY_EVENT_TYPES as readonly ActivityEventType[]) {
      const result = resolveEntity(type, null);
      if (EVENT_ENTITY[type] === "game") assert.equal(result.ok, false, type);
      else assert.ok(result.ok, type);
    }
  });
});
