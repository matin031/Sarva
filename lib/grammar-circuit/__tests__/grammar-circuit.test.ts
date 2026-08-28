import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_GRAMMAR_CIRCUIT_QUESTIONS } from "../demo-data";
import { hasCompleteAssignment, isChoiceSafe } from "../matching";
import { buildSessionQuestions, prepareQuestion, reconstructText } from "../prepare";
import {
  EXCLUDED_LESSONS,
  isSelectableLesson,
  isStorableLesson,
  selectableLessons,
} from "../curriculum";
import {
  grammarCircuitReducer,
  initialGrammarCircuitState,
  isArrangeable,
  type GrammarCircuitState,
} from "../reducer";
import type { GrammarCircuitQuestion } from "../types";
import { validateGrammarCircuitQuestion } from "../validator";

/* ── دادهٔ کمکی ───────────────────────────────────────────────────────────── */

function question(overrides: Partial<GrammarCircuitQuestion> = {}): GrammarCircuitQuestion {
  return {
    id: "q",
    type: "sentence",
    roleDefinitions: [
      { key: "subject", label: "نهاد" },
      { key: "object", label: "مفعول" },
      { key: "verb", label: "فعل" },
    ],
    tokens: [
      { id: "t1", text: "علی", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["subject"] } },
      { id: "t2", text: "کتاب", separatorAfter: " ", roleSlot: { acceptedRoleKeys: ["object"] } },
      { id: "t3", text: "را", separatorAfter: " " },
      { id: "t4", text: "خواند", separatorAfter: ".", roleSlot: { acceptedRoleKeys: ["verb"] } },
    ],
    pieces: [
      { id: "p1", roleKey: "subject" },
      { id: "p2", roleKey: "object" },
      { id: "p3", roleKey: "verb" },
    ],
    circuitOrder: ["t1", "t2", "t4"],
    ...overrides,
  };
}

/* ── اعتبارسنج ───────────────────────────────────────────────────────────── */

test("همهٔ سؤال‌های نمایشی از اعتبارسنج رد می‌شوند", () => {
  for (const q of DEMO_GRAMMAR_CIRCUIT_QUESTIONS) {
    const result = validateGrammarCircuitQuestion(q);
    assert.equal(result.ok, true, `${q.id}: ${result.errors.join(" | ")}`);
  }
});

test("شناسهٔ تکراریِ توکن رد می‌شود", () => {
  const q = question();
  q.tokens[1] = { ...q.tokens[1], id: "t1" };
  assert.equal(validateGrammarCircuitQuestion(q).ok, false);
});

test("شناسهٔ تکراریِ قطعه رد می‌شود", () => {
  const q = question({ pieces: [
    { id: "p1", roleKey: "subject" },
    { id: "p1", roleKey: "object" },
    { id: "p3", roleKey: "verb" },
  ] });
  assert.equal(validateGrammarCircuitQuestion(q).ok, false);
});

test("ارجاع به نقشِ تعریف‌نشده رد می‌شود", () => {
  const q = question();
  q.tokens[0] = {
    ...q.tokens[0],
    roleSlot: { acceptedRoleKeys: ["adverb"] },
  };
  assert.equal(validateGrammarCircuitQuestion(q).ok, false);
});

test("acceptedRoleKeys خالی رد می‌شود", () => {
  const q = question();
  q.tokens[0] = { ...q.tokens[0], roleSlot: { acceptedRoleKeys: [] } };
  assert.equal(validateGrammarCircuitQuestion(q).ok, false);
});

test("ترتیبِ مدار نباید توکنِ بدونِ سوکت یا شناسهٔ ناشناخته داشته باشد", () => {
  assert.equal(
    validateGrammarCircuitQuestion(question({ circuitOrder: ["t1", "t2", "t3"] })).ok,
    false,
  );
  assert.equal(
    validateGrammarCircuitQuestion(question({ circuitOrder: ["t1", "t2", "tX"] })).ok,
    false,
  );
  assert.equal(
    validateGrammarCircuitQuestion(question({ circuitOrder: ["t1", "t1", "t2", "t4"] })).ok,
    false,
  );
  // سوکتی که در ترتیبِ مدار جا افتاده باشد هم رد می‌شود.
  assert.equal(
    validateGrammarCircuitQuestion(question({ circuitOrder: ["t1", "t2"] })).ok,
    false,
  );
});

test("سؤالِ بدونِ هیچ سوکتی رد می‌شود", () => {
  const q = question({
    tokens: [{ id: "t1", text: "علی", separatorAfter: "." }],
    circuitOrder: [],
  });
  assert.equal(validateGrammarCircuitQuestion(q).ok, false);
});

/* ── حل‌پذیری ────────────────────────────────────────────────────────────── */

test("شمردنِ نقش‌ها کافی نیست: تطبیقِ واقعی لازم است", () => {
  // سه سوکت، سه قطعه، ولی «فعل» جایی برای رفتن ندارد.
  const slots = [
    { id: "a", acceptedRoleKeys: ["subject"] },
    { id: "b", acceptedRoleKeys: ["subject"] },
    { id: "c", acceptedRoleKeys: ["object"] },
  ];
  assert.equal(
    hasCompleteAssignment(slots, ["subject", "object", "verb"]).ok,
    false,
  );
});

test("سوکتِ بیشتر از قطعه حل‌شدنی نیست", () => {
  const q = question({ pieces: [{ id: "p1", roleKey: "subject" }] });
  assert.equal(validateGrammarCircuitQuestion(q).ok, false);
});

/* ── بن‌بست‌ناپذیری ───────────────────────────────────────────────────────── */

test("سؤالِ بن‌بست‌پذیرِ نمونهٔ مشخصات رد می‌شود", () => {
  // سوکت الف: نهاد یا مفعول — سوکت ب: فقط نهاد — قطعه‌ها: نهاد، مفعول.
  // گذاشتنِ «نهاد» روی الف علمی و مجاز است، ولی ب را بی‌جواب می‌کند.
  const slots = [
    { id: "a", acceptedRoleKeys: ["subject", "object"] },
    { id: "b", acceptedRoleKeys: ["subject"] },
  ];
  const pieces = ["subject", "object"];

  assert.equal(hasCompleteAssignment(slots, pieces).ok, true);
  const safe = isChoiceSafe(slots, pieces);
  assert.equal(safe.ok, false);
  assert.match(safe.reason ?? "", /بن‌بست/);
});

test("بن‌بستی که فقط بعد از دو حرکت پیدا می‌شود هم گرفته می‌شود", () => {
  // چرخهٔ چهارتایی: *هر* یال در یک تطبیقِ کامل هست، پس آزمونِ تک‌یالی از آن
  // رد می‌شود؛ ولی «الف→a» و بعد «ب→c» بازی را می‌بندد.
  const slots = [
    { id: "s1", acceptedRoleKeys: ["a", "b"] },
    { id: "s2", acceptedRoleKeys: ["b", "c"] },
    { id: "s3", acceptedRoleKeys: ["c", "d"] },
    { id: "s4", acceptedRoleKeys: ["d", "a"] },
  ];
  const pieces = ["a", "b", "c", "d"];
  assert.equal(hasCompleteAssignment(slots, pieces).ok, true);
  assert.equal(isChoiceSafe(slots, pieces).ok, false);
});

test("چندنقشیِ واقعاً امن پذیرفته می‌شود", () => {
  // هر دو سوکت هر دو نقش را می‌پذیرند: هیچ انتخابی بن‌بست نمی‌سازد.
  const slots = [
    { id: "a", acceptedRoleKeys: ["subject", "object"] },
    { id: "b", acceptedRoleKeys: ["subject", "object"] },
  ];
  assert.equal(isChoiceSafe(slots, ["subject", "object"]).ok, true);
});

test("قطعهٔ اضافه (طعمه) بن‌بست نمی‌سازد", () => {
  const slots = [
    { id: "a", acceptedRoleKeys: ["subject"] },
    { id: "b", acceptedRoleKeys: ["object"] },
  ];
  assert.equal(isChoiceSafe(slots, ["subject", "object", "verb"]).ok, true);
});

/* ── نقشِ تکراری و متنِ تکراری ────────────────────────────────────────────── */

test("دو قطعه با نقشِ یکسان هر دو مستقل کار می‌کنند", () => {
  const q = DEMO_GRAMMAR_CIRCUIT_QUESTIONS.find((x) => x.id === "gc-demo-parande")!;
  const complements = q.pieces.filter((p) => p.roleKey === "complement");
  assert.equal(complements.length, 2);
  assert.notEqual(complements[0].id, complements[1].id);

  let state = started(q);
  state = place(state, complements[0].id, "t3");
  state = place(state, complements[1].id, "t5");
  assert.equal(state.placementsByTokenId["t3"], complements[0].id);
  assert.equal(state.placementsByTokenId["t5"], complements[1].id);
});

test("دو توکن با متنِ یکسان دو حالتِ کاملاً جدا دارند", () => {
  const q = DEMO_GRAMMAR_CIRCUIT_QUESTIONS.find((x) => x.id === "gc-demo-madar")!;
  const repeated = q.tokens.filter((t) => t.text === "من");
  assert.equal(repeated.length, 2);
  assert.notEqual(repeated[0].id, repeated[1].id);
  assert.notDeepEqual(
    repeated[0].roleSlot?.acceptedRoleKeys,
    repeated[1].roleSlot?.acceptedRoleKeys,
  );
});

/* ── بازسازیِ دقیقِ متن ───────────────────────────────────────────────────── */

test("متن دقیقاً از داده بازسازی می‌شود، نه با join(' ')", () => {
  const q = DEMO_GRAMMAR_CIRCUIT_QUESTIONS.find((x) => x.id === "gc-demo-madar")!;
  assert.equal(reconstructText(q), "مادر، کتابِ من را به من می‌دهد.");
  assert.ok(reconstructText(q).includes("‌")); // نیم‌فاصله دست‌نخورده
});

test("عکسِ فوریِ سؤال با دانهٔ یکسان همیشه یکی است", () => {
  const q = question();
  const a = prepareQuestion(q, 42).trayPieces.map((p) => p.id);
  const b = prepareQuestion(q, 42).trayPieces.map((p) => p.id);
  assert.deepEqual(a, b);
});

test("ترتیبِ بررسی از دادهٔ معتبر می‌آید و در عکسِ فوری ثابت می‌شود", () => {
  const prepared = prepareQuestion(question(), 7);
  assert.deepEqual([...prepared.validationOrder], ["t1", "t2", "t4"]);
  // بدونِ circuitOrder هم ترتیبِ توکن‌ها مبناست، نه مختصاتِ صفحه.
  const noOrder = prepareQuestion(question({ circuitOrder: undefined }), 7);
  assert.deepEqual([...noOrder.validationOrder], ["t1", "t2", "t4"]);
});

/* ── چیدمان: غلط هم باید بنشیند ──────────────────────────────────────────── */

function started(q = question()): GrammarCircuitState {
  return grammarCircuitReducer(initialGrammarCircuitState, {
    type: "START",
    session: { grade: "dahom", lessons: [1] },
    questions: [prepareQuestion(q, 7)],
  });
}
function place(
  state: GrammarCircuitState,
  pieceId: string,
  tokenId: string,
): GrammarCircuitState {
  return grammarCircuitReducer(state, {
    type: "PLACE",
    pieceId,
    tokenId,
    inputMethod: "tap",
  });
}

test("پاسخِ غلط هم می‌نشیند — چیدن درستی را نمی‌سنجد", () => {
  // p2 نقشِ «مفعول» دارد ولی t1 نهاد می‌خواهد. باید بنشیند.
  const state = place(started(), "p2", "t1");
  assert.equal(state.placementsByTokenId["t1"], "p2");
  assert.equal(state.outcome.kind, "seated");
  // و هیچ نتیجه‌ای اعلام نشده باشد.
  assert.equal(state.validationByTokenId["t1"], "pending");
});

test("چیدن هیچ‌وقت نتیجهٔ درست/غلط تولید نمی‌کند", () => {
  const correct = place(started(), "p1", "t1");
  const wrong = place(started(), "p2", "t1");
  // هر دو دقیقاً یک شکل نتیجه دارند؛ هیچ چیزی درستی را لو نمی‌دهد.
  assert.equal(correct.outcome.kind, wrong.outcome.kind);
  assert.deepEqual(
    Object.values(correct.validationByTokenId),
    Object.values(wrong.validationByTokenId),
  );
});

test("یک قطعه نمی‌تواند دو خانه را پر کند", () => {
  let state = place(started(), "p1", "t1");
  const before = state;
  state = place(state, "p1", "t2");
  assert.equal(state, before);
});

test("خانهٔ پر، قطعهٔ تازه را نمی‌پذیرد و خطا هم حساب نمی‌شود", () => {
  let state = place(started(), "p1", "t1");
  state = place(state, "p2", "t1");
  assert.equal(state.placementsByTokenId["t1"], "p1");
  assert.equal(state.outcome.kind, "blocked");
});

test("قطعه را می‌شود از خانه برداشت و دوباره جای دیگر گذاشت", () => {
  let state = place(started(), "p1", "t1");
  state = grammarCircuitReducer(state, { type: "LIFT", tokenId: "t1", inputMethod: "tap" });
  assert.equal(state.placementsByTokenId["t1"], undefined);
  assert.equal(state.outcome.kind, "lifted");
  state = place(state, "p1", "t2");
  assert.equal(state.placementsByTokenId["t2"], "p1");
});

test("توکنِ بدونِ خانه هرگز هدف نیست", () => {
  const state = started();
  assert.equal(place(state, "p1", "t3"), state);
});

/* ── آمادگی برای بررسی ───────────────────────────────────────────────────── */

test("readyToValidate یعنی همهٔ خانه‌ها پر است، نه سینی خالی", () => {
  let state = started();
  assert.equal(state.phase, "arranging");
  state = place(state, "p1", "t1");
  state = place(state, "p2", "t2");
  assert.equal(state.phase, "arranging");
  state = place(state, "p3", "t4");
  assert.equal(state.phase, "readyToValidate");
});

test("قطعهٔ اضافه در سینی مانعِ آمادگی نیست", () => {
  const q = question({
    pieces: [
      { id: "p1", roleKey: "subject" },
      { id: "p2", roleKey: "object" },
      { id: "p3", roleKey: "verb" },
      { id: "p4", roleKey: "object" }, // طعمه
    ],
  });
  let state = started(q);
  state = place(state, "p1", "t1");
  state = place(state, "p2", "t2");
  state = place(state, "p3", "t4");
  assert.equal(state.phase, "readyToValidate");
});

test("بدونِ پر بودنِ همهٔ خانه‌ها بررسی شروع نمی‌شود", () => {
  let state = place(started(), "p1", "t1");
  const before = state;
  state = grammarCircuitReducer(state, { type: "BEGIN_VALIDATION" });
  assert.equal(state, before);
});

/* ── بررسی ───────────────────────────────────────────────────────────────── */

function filledBoard(map: Array<[string, string]>): GrammarCircuitState {
  let state = started();
  for (const [pieceId, tokenId] of map) state = place(state, pieceId, tokenId);
  return state;
}

test("بررسی چیدمان را قفل می‌کند و شناسهٔ اجرا را بالا می‌برد", () => {
  const ready = filledBoard([["p1", "t1"], ["p2", "t2"], ["p3", "t4"]]);
  const runBefore = ready.validationRunId;
  const state = grammarCircuitReducer(ready, { type: "BEGIN_VALIDATION" });
  assert.equal(state.phase, "validating");
  assert.ok(state.validationRunId > runBefore);
  assert.equal(isArrangeable(state.phase), false);
  assert.equal(state.attempts, 1);
  // همهٔ خانه‌ها در انتظارِ بررسی‌اند.
  assert.deepEqual(Object.values(state.validationByTokenId), [
    "pending",
    "pending",
    "pending",
  ]);
});

test("نتیجهٔ یک اجرای کهنه روی اجرای تازه اثر ندارد", () => {
  const ready = filledBoard([["p1", "t1"], ["p2", "t2"], ["p3", "t4"]]);
  const state = grammarCircuitReducer(ready, { type: "BEGIN_VALIDATION" });
  const stale = grammarCircuitReducer(state, {
    type: "SET_RESULT",
    tokenId: "t1",
    result: "correct",
    runId: state.validationRunId - 1,
  });
  assert.equal(stale, state);
});

test("همهٔ خانه‌ها درست → جریانِ کامل", () => {
  let state = grammarCircuitReducer(
    filledBoard([["p1", "t1"], ["p2", "t2"], ["p3", "t4"]]),
    { type: "BEGIN_VALIDATION" },
  );
  const run = state.validationRunId;
  for (const tokenId of ["t1", "t2", "t4"]) {
    state = grammarCircuitReducer(state, {
      type: "SET_RESULT", tokenId, result: "correct", runId: run,
    });
  }
  state = grammarCircuitReducer(state, {
    type: "VALIDATION_FINISHED", runId: run, allCorrect: true,
  });
  assert.equal(state.phase, "successCurrent");
  assert.equal(state.firstAttemptCorrect, 3);
});

test("یک خانهٔ نادرست → دنبالهٔ شکست، نه جریان", () => {
  let state = grammarCircuitReducer(
    filledBoard([["p2", "t1"], ["p1", "t2"], ["p3", "t4"]]),
    { type: "BEGIN_VALIDATION" },
  );
  const run = state.validationRunId;
  state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId: "t1", result: "wrong", runId: run });
  state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId: "t2", result: "wrong", runId: run });
  state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId: "t4", result: "correct", runId: run });
  state = grammarCircuitReducer(state, { type: "VALIDATION_FINISHED", runId: run, allCorrect: false });
  assert.equal(state.phase, "failureSequence");
  state = grammarCircuitReducer(state, { type: "FAILURE_SEQUENCE_DONE", runId: run });
  assert.equal(state.phase, "failureReview");
  // نتیجهٔ هر خانه جدا مانده؛ چیدمان دست‌نخورده است.
  assert.equal(state.validationByTokenId["t4"], "correct");
  assert.equal(state.placementsByTokenId["t1"], "p2");
});

/* ── اصلاح ───────────────────────────────────────────────────────────────── */

test("اصلاح فقط خانه‌های نادرست را آزاد می‌کند و جواب را لو نمی‌دهد", () => {
  let state = grammarCircuitReducer(
    filledBoard([["p2", "t1"], ["p1", "t2"], ["p3", "t4"]]),
    { type: "BEGIN_VALIDATION" },
  );
  const run = state.validationRunId;
  state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId: "t1", result: "wrong", runId: run });
  state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId: "t2", result: "wrong", runId: run });
  state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId: "t4", result: "correct", runId: run });
  state = grammarCircuitReducer(state, { type: "VALIDATION_FINISHED", runId: run, allCorrect: false });
  state = grammarCircuitReducer(state, { type: "FAILURE_SEQUENCE_DONE", runId: run });
  state = grammarCircuitReducer(state, { type: "ENTER_CORRECTION" });

  // خانهٔ درست قفل و سبز مانده، خانه‌های نادرست خالی شده‌اند.
  assert.equal(state.placementsByTokenId["t4"], "p3");
  assert.deepEqual([...state.lockedTokenIds], ["t4"]);
  assert.equal(state.placementsByTokenId["t1"], undefined);
  assert.equal(state.placementsByTokenId["t2"], undefined);
  // هیچ‌جا نگفته که جوابِ درستِ t1 چه بود.
  assert.equal(state.validationByTokenId["t1"], undefined);
  assert.equal(state.phase, "arranging");
});

test("خانهٔ قفل‌شده دیگر ویرایش نمی‌شود", () => {
  let state = grammarCircuitReducer(
    filledBoard([["p2", "t1"], ["p1", "t2"], ["p3", "t4"]]),
    { type: "BEGIN_VALIDATION" },
  );
  const run = state.validationRunId;
  for (const [tokenId, result] of [["t1", "wrong"], ["t2", "wrong"], ["t4", "correct"]] as const) {
    state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId, result, runId: run });
  }
  state = grammarCircuitReducer(state, { type: "VALIDATION_FINISHED", runId: run, allCorrect: false });
  state = grammarCircuitReducer(state, { type: "FAILURE_SEQUENCE_DONE", runId: run });
  state = grammarCircuitReducer(state, { type: "ENTER_CORRECTION" });
  const before = state;
  state = grammarCircuitReducer(state, { type: "LIFT", tokenId: "t4", inputMethod: "tap" });
  assert.equal(state, before);
});

test("اصلاح و بررسیِ دوباره تا موفقیت", () => {
  let state = grammarCircuitReducer(
    filledBoard([["p2", "t1"], ["p1", "t2"], ["p3", "t4"]]),
    { type: "BEGIN_VALIDATION" },
  );
  let run = state.validationRunId;
  for (const [tokenId, result] of [["t1", "wrong"], ["t2", "wrong"], ["t4", "correct"]] as const) {
    state = grammarCircuitReducer(state, { type: "SET_RESULT", tokenId, result, runId: run });
  }
  state = grammarCircuitReducer(state, { type: "VALIDATION_FINISHED", runId: run, allCorrect: false });
  state = grammarCircuitReducer(state, { type: "FAILURE_SEQUENCE_DONE", runId: run });
  state = grammarCircuitReducer(state, { type: "ENTER_CORRECTION" });

  state = place(state, "p1", "t1");
  state = place(state, "p2", "t2");
  assert.equal(state.phase, "readyToValidate");

  state = grammarCircuitReducer(state, { type: "BEGIN_VALIDATION" });
  run = state.validationRunId;
  assert.equal(state.attempts, 2);
  // خانهٔ قفل‌شده از همان اول درست شمرده می‌شود.
  assert.equal(state.validationByTokenId["t4"], "correct");
  state = grammarCircuitReducer(state, { type: "VALIDATION_FINISHED", runId: run, allCorrect: true });
  assert.equal(state.phase, "successCurrent");
  // «بارِ اولِ درست» همان بررسیِ نخست می‌ماند و با تلاشِ دوم بازنویسی نمی‌شود.
  assert.equal(state.firstAttemptCorrect, 1);
});

test("«بازچینی» همه‌چیزِ سؤال را پاک می‌کند", () => {
  let state = filledBoard([["p1", "t1"], ["p2", "t2"], ["p3", "t4"]]);
  state = grammarCircuitReducer(state, { type: "CLEAR_BOARD" });
  assert.deepEqual(state.placementsByTokenId, {});
  assert.deepEqual([...state.lockedTokenIds], []);
  assert.equal(state.phase, "arranging");
});

test("تعویضِ سؤال epoch را بالا می‌برد و آمارِ جلسه را نگه می‌دارد", () => {
  let state = grammarCircuitReducer(initialGrammarCircuitState, {
    type: "START",
    session: { grade: "dahom", lessons: [1] },
    questions: [prepareQuestion(question(), 7), prepareQuestion(question({ id: "q2" }), 9)],
  });
  const epoch = state.epoch;
  state = grammarCircuitReducer(state, { type: "NEXT_QUESTION", activeTimeMs: 1234 });
  assert.ok(state.epoch > epoch);
  assert.equal(state.questionIndex, 1);
  assert.deepEqual(state.placementsByTokenId, {});
  assert.equal(state.results.length, 1);
  assert.equal(state.results[0].activeTimeMs, 1234);
});

/* ── برنامهٔ درسی ─────────────────────────────────────────────────────────── */

test("درس‌های آزادِ هر پایه دقیقاً همان‌هایی‌اند که باید", () => {
  assert.deepEqual([...EXCLUDED_LESSONS.dahom], [4, 15]);
  assert.deepEqual([...EXCLUDED_LESSONS.yazdahom], [4, 13]);
  assert.deepEqual([...EXCLUDED_LESSONS.davazdahom], [4, 15]);
});

test("درس‌های آزاد در فهرستِ انتخاب نمی‌آیند ولی ۱۶ درسِ دیگر می‌آیند", () => {
  for (const grade of ["dahom", "yazdahom", "davazdahom"] as const) {
    const listed = selectableLessons(grade);
    assert.equal(listed.length, 16);
    for (const excluded of EXCLUDED_LESSONS[grade]) {
      assert.ok(!listed.includes(excluded), `درس ${excluded} نباید در ${grade} باشد`);
    }
    assert.equal(Math.min(...listed) >= 1, true);
    assert.equal(Math.max(...listed) <= 18, true);
  }
});

test("درسِ آزاد قابلِ انتخاب نیست ولی قابلِ ذخیره هست", () => {
  assert.equal(isSelectableLesson("yazdahom", 13), false);
  assert.equal(isSelectableLesson("yazdahom", 15), true);
  // محدودیتِ محصولی است، نه محدودیتِ دیتابیس.
  assert.equal(isStorableLesson(13), true);
});

/* ── نمونه‌گیریِ چنددرسی ─────────────────────────────────────────────────── */

test("با چند درس، پرسش‌ها چرخشی برداشته می‌شوند نه پشتِ سرِ هم", () => {
  const pool = [1, 1, 1, 2, 2, 2, 3, 3, 3].map((lesson, i) => ({
    ...question({ id: `q-${lesson}-${i}` }),
    lesson,
  }));
  const picked = buildSessionQuestions(pool, 6, 42, [1, 2, 3]);
  assert.equal(picked.length, 6);
  // سه پرسشِ اول باید از سه درسِ متفاوت باشند.
  const firstThree = new Set(picked.slice(0, 3).map((q) => q.lesson));
  assert.equal(firstThree.size, 3);
});

test("با یک درس، فقط بُر می‌خورد", () => {
  const pool = [1, 1, 1, 1].map((lesson, i) => ({
    ...question({ id: `q-${i}` }),
    lesson,
  }));
  assert.equal(buildSessionQuestions(pool, 3, 7, [1]).length, 3);
});
