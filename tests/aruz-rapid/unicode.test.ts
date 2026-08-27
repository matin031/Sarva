import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_RAPID_ARUZ_QUESTIONS } from "../../lib/aruz-rapid/demo-questions";
import { LocalRapidAruzSource } from "../../lib/aruz-rapid/source";
import { screenRapidAruzQuestions } from "../../lib/aruz-rapid/validator";
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
  assert.ok(byId("demo-h-tavana").previewText.includes(FATHA));
  assert.ok(byId("demo-h-beshno").previewText.includes(KASRA));
  assert.ok(byId("demo-h-khodaya").previewText.includes(DAMMA));
});

test("سکون حفظ می‌شود", () => {
  const q = byId("demo-h-khodaya");
  assert.ok(q.previewText.includes(SUKUN));
  assert.ok(q.units.some((u) => u.display.includes(SUKUN)));
});

test("نیم‌فاصله حفظ می‌شود", () => {
  assert.ok(byId("demo-h-beshno").previewText.includes(ZWNJ));
});

test("چند علامتِ ترکیبی پشتِ‌هم", () => {
  const q = byId("demo-h-beshno");
  assert.ok(q.previewText.includes(`ش${SUKUN}ن${FATHA}`));
});

test("تشدید و تشدیدِ همراهِ حرکت از خطِ لوله سالم رد می‌شوند", () => {
  // در استخرِ نمایشیِ فعلی مصراعی با تشدید نیست، ولی مسیرِ داده باید
  // بتواند آن را دست‌نخورده عبور دهد.
  const withShadda: RapidAruzQuestion = {
    id: "shadda-probe",
    type: "hemistich",
    previewText: `م${DAMMA}ع${FATHA}ل${SHADDA}${KASRA}م`,
    hasUnitTextOverlap: true,
    units: [
      { id: "s1", display: `م${DAMMA}`, length: "short", revealProgress: 0.25 },
      { id: "s2", display: `ع${FATHA}ل${SUKUN}`, length: "long", revealProgress: 0.75 },
      { id: "s3", display: `ل${KASRA}م`, length: "long", revealProgress: 1 },
    ],
  };
  const [passed] = screenRapidAruzQuestions([withShadda]).questions;
  assert.ok(passed, "سؤالِ دارای تشدید باید معتبر باشد");
  assert.equal(passed.previewText, `م${DAMMA}ع${FATHA}ل${SHADDA}${KASRA}م`);
  assert.ok(passed.previewText.includes(SHADDA + KASRA), "ترتیبِ تشدید و کسره نباید عوض شود");
  assert.equal(passed.units[1].display, `ع${FATHA}ل${SUKUN}`);
});

test("منبعِ محلی متن را دست‌کاری نمی‌کند", async () => {
  const source = new LocalRapidAruzSource();
  const [question] = await source.getQuestions({ limit: 50, shuffle: false });
  const original = DEMO_RAPID_ARUZ_QUESTIONS.find((q) => q.id === question.id)!;
  assert.equal(question.previewText, original.previewText);
  assert.deepEqual(
    question.units.map((u) => u.display),
    original.units.map((u) => u.display),
  );
});

test("طولِ رشته هرگز معیارِ واحدِ عروضی نیست", () => {
  // «بِشْ» چهار code point دارد و یک واحدِ بلند است؛ «نَ» دو code point دارد
  // و یک واحدِ کوتاه. هر منطقی که به string.length تکیه کند غلط است.
  const q = byId("demo-h-beshno");
  assert.equal([...q.units[0].display].length, 4);
  assert.equal(q.units[0].length, "long");
  assert.equal([...q.units[1].display].length, 2);
  assert.equal(q.units[1].length, "short");
  // و برعکسش هم: «آ» یک code point دارد و بلند است.
  const adam = byId("demo-h-bani-adam");
  assert.equal([...adam.units[2].display].length, 1);
  assert.equal(adam.units[2].length, "long");
});

test("ترتیبِ نشست وقتی shuffle خاموش است ثابت می‌ماند", async () => {
  const source = new LocalRapidAruzSource();
  const a = await source.getQuestions({ shuffle: false });
  const b = await source.getQuestions({ shuffle: false });
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
  assert.ok(a.length > 0);
});

test("همهٔ محتوا مصراع است — «واژه» و «ترکیب» برداشته شده‌اند", () => {
  assert.ok(DEMO_RAPID_ARUZ_QUESTIONS.length > 0);
  for (const q of DEMO_RAPID_ARUZ_QUESTIONS) {
    assert.equal(q.type, "hemistich", q.id);
    assert.ok(q.units.length >= 8, `${q.id} باید یک مصراعِ کامل باشد`);
    assert.equal(q.isDemo, true, `${q.id} باید نمایشی علامت خورده باشد`);
  }
});
