import test from "node:test";
import assert from "node:assert/strict";

import {
  MIN_EVIDENCE_PER_BUCKET,
  MIN_EVIDENCE_TOTAL,
  bucketize,
  roleBucketFor,
  roleLabelForKey,
  type RawAnswer,
} from "@/lib/plus/skill-buckets";
import { buildRoleHuntRound } from "@/lib/role-hunt/round";
import type { GrammarCircuitQuestion } from "@/lib/grammar-circuit/types";

/**
 * «مسند» یکی است — از هر بازی که آمده باشد.
 *
 * ⚠️ این تست دربارهٔ یک تابع نیست، دربارهٔ یک *قاعدهٔ محصولی* است: مفهومِ
 * یادگیری نقشِ دستوری است و بازی فقط منبع. دانش‌آموزی که در سه بازی روی
 * «مسند» می‌افتد، یک مشکل دارد و نه سه تا؛ اگر تحلیل سه سطلِ جدا بسازد، هر
 * سه زیرِ حدِ «شواهدِ کافی» می‌مانند و تحلیل دقیقاً همان‌جایی کور می‌شود که
 * بیشترین داده را دارد.
 *
 * سه بازی سه *زبانِ* متفاوت حرف می‌زنند و همین است که این قاعده را شکننده
 * می‌کند:
 *
 *   جاسوس        → برچسبِ فارسی در `jasoos_answers.correct_role`
 *   مدارِ دستور   → کلیدِ متعارف در `grammar_circuit_answers.role_key`
 *   شکار نقش‌ها   → کلیدِ متعارف در `role_hunt_answers.role_key`
 *
 * پس هر سه ردیفِ زیر دقیقاً همان‌طوری ساخته می‌شوند که `lib/plus/analysis.ts`
 * از دیتابیس می‌سازدشان. اگر روزی آنجا نگاشتی عوض شود و اینجا نه، این تست
 * همان‌جا می‌شکند.
 */

/** همان تبدیلی که `getRoleAnalysis` روی ردیفِ «جاسوس» انجام می‌دهد. */
function fromJasoos(correctRole: string, correct: boolean): RawAnswer {
  const bucket = roleBucketFor(correctRole);
  assert.ok(bucket, "برچسبِ جاسوس باید سطل بسازد");
  return { ...bucket, correct, source: "جاسوس" };
}

/** همان تبدیلی که روی ردیفِ «مدارِ دستور» انجام می‌شود. */
function fromCircuit(roleKey: string, correct: boolean): RawAnswer {
  return { key: roleKey, label: roleLabelForKey(roleKey) ?? roleKey, correct, source: "مدار دستور" };
}

/** و همان تبدیل روی ردیفِ «شکار نقش‌ها». */
function fromRoleHunt(roleKey: string, correct: boolean): RawAnswer {
  return { key: roleKey, label: roleLabelForKey(roleKey) ?? roleKey, correct, source: "شکار نقش‌ها" };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ دو چیزِ متفاوت که نباید قاطی شوند: «تجمیع» و «نمایش»
   ═══════════════════════════════════════════════════════════════════════════

   خواستهٔ اصلی این بود: سه پاسخِ غلطِ «مسند» از سه بازی باید یک چیز باشند و
   نه سه چیز. این دربارهٔ **تجمیع** است و دقیقاً همان‌طور کار می‌کند.

   ولی `bucketize` یک لایهٔ دوم هم دارد که از قبل بوده و عمدی است: سطلی که
   کمتر از MIN_EVIDENCE_PER_BUCKET پاسخ دارد **نمایش داده نمی‌شود**. پس با
   دقیقاً سه پاسخ، پنل «مسند ۳ غلط» نشان نمی‌دهد — می‌گوید «هنوز تمرینِ کافی
   نداری».

   این تناقض نیست؛ دو جملهٔ درست‌اند:
     • سه غلط → یک سطل (تجمیع درست است)
     • یک سطلِ سه‌پاسخی → هنوز حرفی برای زدن ندارد (سیاستِ شواهد)

   هر دو صریح آزموده می‌شوند، چون نسخهٔ قبلیِ این فایل فقط دومی را دور می‌زد
   (شواهد را تا چهار پر می‌کرد) و عنوانش هنوز «سه غلط» بود — یعنی تستی که
   چیزی را می‌سنجید که نامش نمی‌گفت.
   ═══════════════════════════════════════════════════════════════════════════ */

test("سه غلطِ «مسند» از سه بازی یک سطل می‌سازد و نه سه تا", () => {
  const rows: RawAnswer[] = [
    fromJasoos("مسند", false),
    fromCircuit("predicate", false),
    fromRoleHunt("predicate", false),
  ];

  // خودِ تجمیع: هر سه روی یک کلید می‌نشینند.
  assert.deepEqual([...new Set(rows.map((r) => r.key))], ["predicate"]);

  const analysis = bucketize(rows);
  assert.equal(analysis.totalAnswers, 3);
  // یک سطل ساخته شد — نه سه تا.
  assert.equal(analysis.buckets.length + analysis.ignoredBuckets, 1);
});

test("…ولی سه پاسخ هنوز به حدِ نمایش نمی‌رسد و پنل چیزی ادعا نمی‌کند", () => {
  const analysis = bucketize([
    fromJasoos("مسند", false),
    fromCircuit("predicate", false),
    fromRoleHunt("predicate", false),
  ]);

  assert.ok(3 < MIN_EVIDENCE_PER_BUCKET, "پیش‌فرضِ این تست: سه پاسخ زیرِ حدِ نصاب است");
  assert.equal(analysis.buckets.length, 0, "سطلِ کم‌شواهد نمایش داده نمی‌شود");
  assert.equal(analysis.ignoredBuckets, 1, "ولی گم هم نمی‌شود — شمرده می‌شود");
  assert.equal(analysis.hasEnoughEvidence, false);
});

test("با رسیدنِ شواهد به حدِ نصاب، همان سه غلط با هم شمرده می‌شوند", () => {
  /* ⚠️ چهارمین پاسخِ «مسند» عمداً *درست* است: اگر غلط می‌بود، «سه غلط» به
     چهار می‌رسید و تست دیگر همان چیزی را نمی‌سنجید که نامش می‌گوید. */
  const rows: RawAnswer[] = [
    fromJasoos("مسند", false),
    fromCircuit("predicate", false),
    fromRoleHunt("predicate", false),
    fromRoleHunt("predicate", true),
    ...Array.from({ length: MIN_EVIDENCE_TOTAL }, () => fromCircuit("subject", true)),
  ];

  const bucket = bucketize(rows).buckets.find((b) => b.key === "predicate");
  assert.ok(bucket, "«مسند» باید در تحلیل باشد");

  assert.equal(bucket.label, "مسند");
  assert.equal(bucket.total, MIN_EVIDENCE_PER_BUCKET);
  assert.equal(bucket.correct, 1);
  assert.equal(bucket.total - bucket.correct, 3, "هر سه غلط، در یک سطل");
});

test("تفکیکِ منبع نشان می‌دهد هر غلط از کدام بازی آمده", () => {
  /* یک غلط از هر بازی — و یک درست از هر بازی، فقط برای اینکه سطل به حدِ
     نصابِ شواهد برسد. اگر نمی‌رسید، `buckets` خالی بود و این تست چیزی را
     می‌سنجید که اصلاً ساخته نشده. */
  const rows: RawAnswer[] = [
    fromJasoos("مسند", false),
    fromJasoos("مسند", true),
    fromCircuit("predicate", false),
    fromCircuit("predicate", true),
    fromRoleHunt("predicate", false),
    fromRoleHunt("predicate", true),
    ...Array.from({ length: 12 }, () => fromCircuit("subject", true)),
  ];

  const bucket = bucketize(rows).buckets.find((b) => b.key === "predicate");
  assert.ok(bucket);

  const wrongBySource = Object.fromEntries(
    bucket.bySource.map((s) => [s.source, s.total - s.correct]),
  );
  assert.deepEqual(wrongBySource, {
    "جاسوس": 1,
    "مدار دستور": 1,
    "شکار نقش‌ها": 1,
  });

  // ولی سرفصل همچنان «مسند» است و نه «مسند در جاسوس».
  assert.equal(bucket.label, "مسند");
  assert.equal(bucket.total, 6);
});

test("نقشی که «شکار نقش‌ها» می‌سازد، همان کلیدی است که تحلیل می‌شناسد", () => {
  /* ⚠️ حلقه را می‌بندد: کلیدِ نقش از خودِ بازی بیرون می‌آید (و نه از یک
     رشتهٔ دستیِ این تست) و بعد به همان نگاشتی داده می‌شود که پنل استفاده
     می‌کند. اگر روزی بازی کلیدی بسازد که در کاتالوگ نباشد، برچسبِ فارسی
     پیدا نمی‌شود و اینجا معلوم می‌شود. */
  const question: GrammarCircuitQuestion = {
    id: "22222222-2222-4222-8222-222222222222",
    sourceId: "rh-unified-1",
    type: "hemistich",
    roleDefinitions: [],
    pieces: [],
    tokens: [
      { id: "t1", text: "توانا", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["predicate"] } },
      { id: "t2", text: "بود", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["verb"] } },
      { id: "t3", text: "هرکه", separatorAfter: "", roleSlot: { acceptedRoleKeys: ["subject"] } },
    ],
  };

  const round = buildRoleHuntRound(question);
  assert.ok(round);

  for (const a of round.asks) {
    assert.equal(roleLabelForKey(a.roleKey), a.roleLabel);
    assert.equal(roleBucketFor(a.roleLabel)?.key, a.roleKey);
  }
});
