import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_RAPID_ARUZ_QUESTIONS } from "../../lib/aruz-rapid/demo-questions";
import { LocalRapidAruzSource } from "../../lib/aruz-rapid/source";
import type { RapidAruzQuestion } from "../../lib/aruz-rapid/types";

/**
 * متنِ فارسی باید عیناً همان‌طور که در داده آمده به بازی برسد.
 *
 * هر جا کسی وسوسه شد normalize کند، حرفِ عربی را با فارسی عوض کند یا
 * نیم‌فاصله را «تمیز» کند، این تست باید بیفتد.
 */

const FATHA = "َ";
const KASRA = "ِ";
const DAMMA = "ُ";
const SUKUN = "ْ";
const SHADDA = "ّ";
const ZWNJ = "‌";

function byId(id: string): RapidAruzQuestion {
  const q = DEMO_RAPID_ARUZ_QUESTIONS.find((x) => x.id === id);
  assert.ok(q, `سؤالِ ${id} پیدا نشد`);
  return q;
}

test("فتحه، کسره و ضمه حفظ می‌شوند", () => {
  assert.ok(byId("demo-w-sahar").previewText.includes(FATHA));
  assert.ok(byId("demo-w-ketab").previewText.includes(KASRA));
  assert.ok(byId("demo-p-moallem").previewText.includes(DAMMA));
});

test("سکون حفظ می‌شود", () => {
  const q = byId("demo-w-parande");
  assert.ok(q.previewText.includes(SUKUN));
  assert.ok(q.units.some((u) => u.display.includes(SUKUN)));
});

test("تشدید و تشدیدِ همراهِ حرکت حفظ می‌شوند", () => {
  const q = byId("demo-p-moallem");
  assert.equal(q.previewText, `م${DAMMA}ع${FATHA}ل${SHADDA}${KASRA}م`);
  assert.ok(q.previewText.includes(SHADDA + KASRA), "ترتیبِ تشدید و کسره نباید عوض شود");
});

test("نیم‌فاصله حفظ می‌شود", () => {
  assert.ok(byId("demo-w-miravad").previewText.includes(ZWNJ));
  assert.ok(byId("demo-h-beshno").previewText.includes(ZWNJ));
});

test("چند علامتِ ترکیبی پشتِ‌هم", () => {
  const q = byId("demo-h-beshno");
  assert.ok(q.previewText.includes(`ش${SUKUN}ن${FATHA}`));
});

test("منبعِ محلی متن را دست‌کاری نمی‌کند", async () => {
  const source = new LocalRapidAruzSource();
  const [question] = await source.getQuestions({ difficulty: 1, limit: 50, shuffle: false });
  const original = DEMO_RAPID_ARUZ_QUESTIONS.find((q) => q.id === question.id)!;
  assert.equal(question.previewText, original.previewText);
  assert.deepEqual(
    question.units.map((u) => u.display),
    original.units.map((u) => u.display),
  );
});

test("طولِ رشته هرگز معیارِ واحدِ عروضی نیست", () => {
  // «چَشْ» چهار code point دارد ولی یک واحدِ عروضی است، و «سی» دو code point
  // دارد و آن هم یک واحد است. هر منطقی که به string.length تکیه کند غلط است.
  const q = byId("demo-p-chashme-siah");
  assert.equal([...q.units[0].display].length, 4);
  assert.equal([...q.units[2].display].length, 2);
  assert.equal(q.units[0].length, "long");
  assert.equal(q.units[2].length, "long");
});

test("ترتیبِ نشست وقتی shuffle خاموش است ثابت می‌ماند", async () => {
  const source = new LocalRapidAruzSource();
  const a = await source.getQuestions({ difficulty: 2, shuffle: false });
  const b = await source.getQuestions({ difficulty: 2, shuffle: false });
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
  assert.ok(a.length > 0);
  assert.ok(a.every((q) => q.difficulty === 2));
});
