import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_EVIDENCE_PER_BUCKET,
  MIN_EVIDENCE_TOTAL,
  bucketize,
  roleBucketFor,
  type RawAnswer,
} from "@/lib/plus/skill-buckets";

/**
 * قاعدهٔ «داده کافی» و نگاشتِ نقش‌ها.
 *
 * ⚠️ چرا مهم است: تحلیلی که با سه پاسخ نتیجه بگیرد، حدس است — و دانش‌آموز
 * به آن اعتماد می‌کند و وقتش را روی چیزی می‌گذارد که مشکلش نبوده.
 */

function answers(
  key: string,
  source: string,
  correct: number,
  wrong: number,
): RawAnswer[] {
  const rows: RawAnswer[] = [];
  for (let i = 0; i < correct; i++) rows.push({ key, label: key, correct: true, source });
  for (let i = 0; i < wrong; i++) rows.push({ key, label: key, correct: false, source });
  return rows;
}

test("سطلِ کم‌شواهد در نتیجه نمی‌آید ولی شمرده می‌شود", () => {
  const rows = [
    ...answers("مفاعیلن", "پل وزن", 2, 2), // ۴ پاسخ = دقیقاً حدِ کفایت
    ...answers("فعولن", "پل وزن", 1, 1), // ۲ پاسخ = کم
    ...answers("مستفعلن", "عروض سماعی", 6, 2),
  ];

  const result = bucketize(rows);
  const keys = result.buckets.map((b) => b.key);

  assert.ok(keys.includes("مفاعیلن"));
  assert.ok(keys.includes("مستفعلن"));
  assert.ok(!keys.includes("فعولن"), "سطلِ دو پاسخی نباید نتیجه‌گیری شود");
  assert.equal(result.ignoredBuckets, 1);
});

test("ضعیف‌ترین سطل اول می‌آید", () => {
  const rows = [
    ...answers("قوی", "پل وزن", 9, 1), // ۹۰٪
    ...answers("ضعیف", "پل وزن", 2, 8), // ۲۰٪
  ];
  assert.equal(bucketize(rows).buckets[0]?.key, "ضعیف");
});

test("در تساویِ دقت، سطلِ پرشواهدتر جلوتر است", () => {
  const rows = [
    ...answers("کم", "پل وزن", 2, 2), // ۵۰٪ از ۴
    ...answers("زیاد", "پل وزن", 10, 10), // ۵۰٪ از ۲۰
  ];
  // دربارهٔ سطلی که بیست پاسخ دارد مطمئن‌تریم.
  assert.equal(bucketize(rows).buckets[0]?.key, "زیاد");
});

test("زیرِ کمینهٔ کلِ پاسخ‌ها، تحلیلی ارائه نمی‌شود", () => {
  const rows = answers("مفاعیلن", "پل وزن", 2, 2);
  const result = bucketize(rows);
  assert.equal(result.totalAnswers, 4);
  assert.equal(result.hasEnoughEvidence, false, "۴ پاسخ برای کلِ تحلیل کافی نیست");
  assert.ok(MIN_EVIDENCE_TOTAL > MIN_EVIDENCE_PER_BUCKET);
});

test("شواهد به تفکیکِ منبع نگه داشته می‌شود", () => {
  const rows = [
    ...answers("مفاعیلن", "پل وزن", 3, 1),
    ...answers("مفاعیلن", "عروض سماعی", 5, 3),
    ...answers("فاعلاتن", "پل وزن", 4, 0),
  ];
  const bucket = bucketize(rows).buckets.find((b) => b.key === "مفاعیلن");
  assert.ok(bucket);
  assert.equal(bucket.total, 12);
  assert.equal(bucket.correct, 8);

  const bridge = bucket.bySource.find((s) => s.source === "پل وزن");
  const quiz = bucket.bySource.find((s) => s.source === "عروض سماعی");
  assert.deepEqual(bridge, { source: "پل وزن", total: 4, correct: 3 });
  assert.deepEqual(quiz, { source: "عروض سماعی", total: 8, correct: 5 });
});

/* ── نگاشتِ نقش‌های دستوری ───────────────────────────────────────────────── */

test("برچسبِ فارسی و کلیدِ متعارف به یک سطل می‌رسند", () => {
  // «جاسوس» برچسب ذخیره می‌کند و «مدار دستور» کلید. اگر این نگاشت نبود، یک
  // نقشِ واحد دو سطلِ کم‌شواهد می‌شد و از تحلیل بیرون می‌افتاد.
  assert.equal(roleBucketFor("نهاد")?.key, "subject");
  assert.equal(roleBucketFor("مفعول")?.key, "object");
  assert.equal(roleBucketFor("مسند")?.key, "predicate");
});

test("نیم‌فاصله و «ی»/«ك» عربی مانعِ تطبیق نمی‌شوند", () => {
  assert.equal(roleBucketFor("مضاف‌الیه")?.key, "possessive");
  assert.equal(roleBucketFor("مضاف الیه")?.key, "possessive");
});

test("مترادف‌های محتوای جاسوس به همان کلید می‌رسند", () => {
  assert.equal(roleBucketFor("واو عطف")?.key, "conjunct");
  assert.equal(roleBucketFor("معطوف")?.key, "conjunct");
});

test("نقشِ ناشناخته انداخته نمی‌شود، سطلِ خودش را می‌گیرد", () => {
  // شواهدِ واقعی نباید فقط به این دلیل که کاتالوگِ ما کاملش نکرده دور ریخته شود.
  const bucket = roleBucketFor("نقشِ تازه");
  assert.ok(bucket);
  assert.ok(bucket.key.startsWith("label:"));
  assert.equal(bucket.label, "نقشِ تازه");
});

test("برچسبِ خالی سطل نمی‌سازد", () => {
  assert.equal(roleBucketFor(""), null);
  assert.equal(roleBucketFor("   "), null);
});
