import test from "node:test";
import assert from "node:assert/strict";
import {
  validateRapidAruzQuestion,
  screenRapidAruzQuestions,
} from "../../lib/aruz-rapid/validator";
import { DEMO_RAPID_ARUZ_QUESTIONS } from "../../lib/aruz-rapid/demo-questions";
import type { RapidAruzQuestion } from "../../lib/aruz-rapid/types";

function baseQuestion(): RapidAruzQuestion {
  return {
    id: "q1",
    type: "hemistich",
    previewText: "سَحَر",
    units: [
      { id: "u1", display: "سَ", length: "short", revealProgress: 0.4 },
      { id: "u2", display: "حَر", length: "long", revealProgress: 1 },
    ],
  };
}

function codes(q: unknown): string[] {
  return validateRapidAruzQuestion(q).issues.map((i) => i.code);
}

test("سؤالِ سالم پذیرفته می‌شود", () => {
  const result = validateRapidAruzQuestion(baseQuestion());
  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.warnings, []);
});

test("همهٔ سؤال‌های نمایشی معتبرند و هشدارِ ناخواسته ندارند", () => {
  for (const q of DEMO_RAPID_ARUZ_QUESTIONS) {
    const result = validateRapidAruzQuestion(q);
    assert.equal(result.ok, true, `${q.id}: ${JSON.stringify(result.issues)}`);
    assert.deepEqual(result.warnings, [], `${q.id}: ${JSON.stringify(result.warnings)}`);
  }
});

test("شناسهٔ خالیِ سؤال", () => {
  assert.ok(codes({ ...baseQuestion(), id: "  " }).includes("question_id_empty"));
});

test("متنِ پیش‌نمایشِ خالی", () => {
  assert.ok(codes({ ...baseQuestion(), previewText: "" }).includes("preview_text_empty"));
});

test("سؤالِ بدونِ واحد", () => {
  assert.ok(codes({ ...baseQuestion(), units: [] }).includes("units_empty"));
});

test("شناسهٔ تکراریِ واحد", () => {
  const q = baseQuestion();
  q.units[1] = { ...q.units[1], id: "u1" };
  assert.ok(codes(q).includes("unit_id_duplicate"));
});

test("متنِ نمایشیِ خالیِ واحد", () => {
  const q = baseQuestion();
  q.units[0] = { ...q.units[0], display: "" };
  assert.ok(codes(q).includes("unit_display_empty"));
});

test("کمیتِ ناشناخته", () => {
  const q = baseQuestion();
  q.units[0] = { ...q.units[0], length: "medium" as never };
  assert.ok(codes(q).includes("unit_length_invalid"));
});

test("نوعِ ناشناخته — «واژه» و «ترکیب» دیگر معتبر نیستند", () => {
  assert.ok(codes({ ...baseQuestion(), type: "beyt" }).includes("question_type_invalid"));
  assert.ok(codes({ ...baseQuestion(), type: "word" }).includes("question_type_invalid"));
  assert.ok(codes({ ...baseQuestion(), type: "phrase" }).includes("question_type_invalid"));
});

test("revealProgress غیرعددی", () => {
  const q = baseQuestion();
  q.units[0] = { ...q.units[0], revealProgress: Number.NaN };
  assert.ok(codes(q).includes("reveal_not_finite"));
});

test("revealProgress بیرون از بازهٔ ۰ تا ۱", () => {
  const low = baseQuestion();
  low.units[0] = { ...low.units[0], revealProgress: -0.2 };
  assert.ok(codes(low).includes("reveal_out_of_range"));

  const high = baseQuestion();
  high.units[0] = { ...high.units[0], revealProgress: 1.4 };
  assert.ok(codes(high).includes("reveal_out_of_range"));
});

test("revealProgress نزولی", () => {
  const q = baseQuestion();
  q.units[0] = { ...q.units[0], revealProgress: 0.9 };
  q.units[1] = { ...q.units[1], revealProgress: 0.5 };
  assert.ok(codes(q).includes("reveal_not_monotonic"));
});

test("وقتی همهٔ واحدها revealProgress دارند، آخری باید به ۱ برسد", () => {
  const q = baseQuestion();
  q.units[1] = { ...q.units[1], revealProgress: 0.8 };
  assert.ok(codes(q).includes("reveal_incomplete"));
});

test("revealProgressِ ناقص فقط هشدار است، نه خطا", () => {
  const q = baseQuestion();
  q.units[1] = { id: "u2", display: "حَر", length: "long" };
  const result = validateRapidAruzQuestion(q);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.code === "reveal_partial"));
});

test("سؤالِ نامعتبر و سؤالِ تکراری وارد بازی نمی‌شوند", () => {
  const good = baseQuestion();
  const broken = { ...baseQuestion(), id: "q2", units: [] };
  const duplicate = { ...baseQuestion() };
  const result = screenRapidAruzQuestions([good, broken, duplicate]);
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].id, "q1");
  assert.deepEqual(
    result.rejected.map((r) => r.id).sort(),
    ["q1", "q2"],
  );
});

test("متنِ فارسی دست‌نخورده می‌ماند", () => {
  const q = screenRapidAruzQuestions([baseQuestion()]).questions[0];
  assert.equal(q.previewText, "سَحَر");
  assert.equal([...q.previewText].length, 5);
  assert.equal(q.units[0].display, "سَ");
});

test("پرچمِ hasUnitTextOverlap هشدارِ «متن با واحدها یکی نیست» را می‌خوابانَد", () => {
  const q = baseQuestion();
  // تشدید: «ل» دو بار شمرده می‌شود، پس چسباندنِ واحدها با متن یکی نمی‌شود.
  q.previewText = "مُعَلِّم";
  q.units = [
    { id: "u1", display: "مُ", length: "short", revealProgress: 0.25 },
    { id: "u2", display: "عَلْ", length: "long", revealProgress: 0.75 },
    { id: "u3", display: "لِم", length: "long", revealProgress: 1 },
  ];

  const noisy = validateRapidAruzQuestion(q);
  assert.equal(noisy.ok, true);
  assert.ok(noisy.warnings.some((w) => w.code === "units_text_mismatch"));

  const flagged = validateRapidAruzQuestion({ ...q, hasUnitTextOverlap: true });
  assert.equal(flagged.ok, true);
  assert.deepEqual(flagged.warnings, [], "با پرچم، دیگر هشداری نمی‌دهد");
});

test("همهٔ سؤال‌های نمایشی بی‌هیچ هشداری از اعتبارسنج رد می‌شوند", () => {
  for (const q of DEMO_RAPID_ARUZ_QUESTIONS) {
    const result = validateRapidAruzQuestion(q);
    assert.deepEqual(result.warnings, [], `${q.id}: ${JSON.stringify(result.warnings)}`);
  }
});
