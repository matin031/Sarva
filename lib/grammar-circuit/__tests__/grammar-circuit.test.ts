import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_GRAMMAR_CIRCUIT_QUESTIONS } from "../demo-data";
import { solveHitExtents, solveSlotCenters } from "../layout";
import { hasCompleteAssignment, isChoiceSafe } from "../matching";
import { prepareQuestion, reconstructText } from "../prepare";
import {
  grammarCircuitReducer,
  initialGrammarCircuitState,
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

  const prepared = prepareQuestion(q, 1);
  let state = grammarCircuitReducer(initialGrammarCircuitState, {
    type: "START",
    questions: [prepared],
  });
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT",
    pieceId: complements[0].id,
    tokenId: "t3",
    inputMethod: "tap",
  });
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT",
    pieceId: complements[1].id,
    tokenId: "t5",
    inputMethod: "tap",
  });
  assert.equal(state.placementsByTokenId["t3"], complements[0].id);
  assert.equal(state.placementsByTokenId["t5"], complements[1].id);
  assert.equal(state.wrongAttempts, 0);
});

test("دو توکن با متنِ یکسان دو حالتِ کاملاً جدا دارند", () => {
  const q = DEMO_GRAMMAR_CIRCUIT_QUESTIONS.find((x) => x.id === "gc-demo-madar")!;
  const repeated = q.tokens.filter((t) => t.text === "من");
  assert.equal(repeated.length, 2);
  assert.notEqual(repeated[0].id, repeated[1].id);
  // نقششان هم یکی نیست: مضاف‌الیه در برابر متمم.
  assert.notDeepEqual(
    repeated[0].roleSlot?.acceptedRoleKeys,
    repeated[1].roleSlot?.acceptedRoleKeys,
  );
});

/* ── بازسازیِ دقیقِ متن ───────────────────────────────────────────────────── */

test("متن دقیقاً از داده بازسازی می‌شود، نه با join(' ')", () => {
  const q = DEMO_GRAMMAR_CIRCUIT_QUESTIONS.find((x) => x.id === "gc-demo-madar")!;
  assert.equal(reconstructText(q), "مادر، کتابِ من را به من می‌دهد.");
  // نیم‌فاصله دست‌نخورده مانده است.
  assert.ok(reconstructText(q).includes("‌"));
});

test("عکسِ فوریِ سؤال با دانهٔ یکسان همیشه یکی است", () => {
  const q = question();
  const a = prepareQuestion(q, 42).trayPieces.map((p) => p.id);
  const b = prepareQuestion(q, 42).trayPieces.map((p) => p.id);
  assert.deepEqual(a, b);
  assert.equal(a.length, q.pieces.length);
});

/* ── reducer ─────────────────────────────────────────────────────────────── */

function started(): GrammarCircuitState {
  const prepared = prepareQuestion(question(), 7);
  return grammarCircuitReducer(initialGrammarCircuitState, {
    type: "START",
    questions: [prepared],
  });
}

test("اتصالِ درست ثبت می‌شود و بازی قفل نمی‌شود", () => {
  const state = grammarCircuitReducer(started(), {
    type: "ATTEMPT",
    pieceId: "p1",
    tokenId: "t1",
    inputMethod: "pointer",
  });
  assert.equal(state.placementsByTokenId["t1"], "p1");
  assert.equal(state.correctPlacements, 1);
  assert.equal(state.status, "playing");
  assert.equal(state.outcome.kind, "correct");
  assert.equal(state.outcome.final, false);
});

test("اتصالِ نادرست چیزی را ثبت نمی‌کند و جواب را فاش نمی‌کند", () => {
  const state = grammarCircuitReducer(started(), {
    type: "ATTEMPT",
    pieceId: "p2",
    tokenId: "t1",
    inputMethod: "pointer",
  });
  assert.equal(state.placementsByTokenId["t1"], undefined);
  assert.equal(state.wrongAttempts, 1);
  assert.equal(state.wrongByTokenId["t1"], 1);
  assert.equal(state.outcome.kind, "wrong");
});

test("یک قطعه نمی‌تواند دو سوکت را پر کند", () => {
  let state = started();
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t1", inputMethod: "pointer",
  });
  const before = state;
  // همان قطعه، بلافاصله دوباره — مثلِ «کشیدن و بعد کلیک» یا دابل‌تپ.
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t2", inputMethod: "tap",
  });
  assert.equal(state, before, "تلاشِ دوم باید کاملاً بی‌اثر باشد");
});

test("سوکتِ بسته‌شده دیگر هدف نیست و «پاسخِ غلط» هم نمی‌سازد", () => {
  let state = started();
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t1", inputMethod: "pointer",
  });
  const before = state;
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p2", tokenId: "t1", inputMethod: "pointer",
  });
  assert.equal(state, before);
  assert.equal(state.wrongAttempts, 0);
});

test("توکنِ بدونِ سوکت هرگز هدف نیست", () => {
  const state = started();
  const next = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t3", inputMethod: "tap",
  });
  assert.equal(next, state);
});

test("کامل‌شدن فقط با پرشدنِ همهٔ سوکت‌های لازم اتفاق می‌افتد", () => {
  let state = started();
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t1", inputMethod: "tap",
  });
  assert.equal(state.status, "playing");
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p2", tokenId: "t2", inputMethod: "tap",
  });
  assert.equal(state.status, "playing");
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p3", tokenId: "t4", inputMethod: "tap",
  });
  assert.equal(state.status, "completing");
  assert.equal(state.outcome.final, true);

  // بعد از قفل‌شدن، هیچ ورودیِ دیگری اثر ندارد.
  const locked = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t2", inputMethod: "tap",
  });
  assert.equal(locked, state);
});

test("«بارِ اول درست» فقط وقتی است که پیش از آن روی همان واژه اشتباهی نشده باشد", () => {
  let state = started();
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p2", tokenId: "t1", inputMethod: "tap",
  });
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t1", inputMethod: "tap",
  });
  assert.equal(state.correctPlacements, 1);
  assert.equal(state.firstTryPlacements, 0);

  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p2", tokenId: "t2", inputMethod: "tap",
  });
  assert.equal(state.firstTryPlacements, 1);
});

test("تعویضِ سؤال epoch را بالا می‌برد و آمارِ جلسه را نگه می‌دارد", () => {
  const prepared = prepareQuestion(question(), 7);
  let state = grammarCircuitReducer(initialGrammarCircuitState, {
    type: "START",
    questions: [prepared, prepareQuestion(question({ id: "q2" }), 9)],
  });
  const epoch = state.epoch;
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t1", inputMethod: "tap",
  });
  state = grammarCircuitReducer(state, { type: "NEXT_QUESTION", activeTimeMs: 1234 });
  assert.ok(state.epoch > epoch);
  assert.equal(state.questionIndex, 1);
  assert.deepEqual(state.placementsByTokenId, {});
  assert.equal(state.results.length, 1);
  assert.equal(state.results[0].activeTimeMs, 1234);
});

test("قطعهٔ مصرف‌شده دیگر انتخاب نمی‌شود", () => {
  let state = started();
  state = grammarCircuitReducer(state, {
    type: "ATTEMPT", pieceId: "p1", tokenId: "t1", inputMethod: "tap",
  });
  const next = grammarCircuitReducer(state, { type: "SELECT_PIECE", pieceId: "p1" });
  assert.equal(next.selectedPieceId, null);
});

/* ── هندسه ───────────────────────────────────────────────────────────────── */

test("حل‌کنندهٔ هم‌پوشانی ترتیب و حداقلِ فاصله را نگه می‌دارد", () => {
  // چهار واژهٔ کوتاهِ پشتِ هم در راست‌به‌چپ: مرکزها با پیشرفتِ جمله کم می‌شوند.
  const desired = [600, 580, 555, 530];
  const centers = solveSlotCenters({
    desiredCenters: desired,
    minSeparation: 110,
    direction: -1,
    minCenter: 60,
    maxCenter: 1200,
  });
  for (let i = 1; i < centers.length; i++) {
    assert.ok(
      centers[i - 1] - centers[i] >= 110 - 1e-6,
      `فاصلهٔ ${i} کمتر از حداقل شد: ${centers[i - 1] - centers[i]}`,
    );
  }
  // ترتیبِ توکن‌ها حفظ شده است.
  for (let i = 1; i < centers.length; i++) {
    assert.ok(centers[i] < centers[i - 1]);
  }
});

test("سوکت‌هایی که از قبل جا دارند اصلاً جابه‌جا نمی‌شوند", () => {
  const desired = [600, 480, 360];
  const centers = solveSlotCenters({
    desiredCenters: desired,
    minSeparation: 110,
    direction: -1,
    minCenter: 60,
    maxCenter: 1200,
  });
  centers.forEach((c, i) => assert.ok(Math.abs(c - desired[i]) < 1e-6));
});

test("زنجیره داخلِ بازه می‌ماند", () => {
  const centers = solveSlotCenters({
    desiredCenters: [100, 90, 80],
    minSeparation: 110,
    direction: -1,
    minCenter: 60,
    maxCenter: 400,
  });
  assert.ok(Math.min(...centers) >= 60 - 1e-6);
  assert.ok(Math.max(...centers) <= 400 + 1e-6);
});

test("ناحیه‌های لمسی هرگز هم‌پوشانی ندارند و شکافِ واقعی می‌ماند", () => {
  const centers = [500, 380, 270];
  const extents = solveHitExtents(centers, 96, 10, 8);
  const boxes = centers
    .map((c, i) => ({ left: c - extents[i].left, right: c + extents[i].right }))
    .sort((a, b) => a.left - b.left);
  for (let i = 1; i < boxes.length; i++) {
    assert.ok(
      boxes[i].left - boxes[i - 1].right >= 8 - 1e-6,
      `شکافِ بینِ ناحیه‌ها کمتر از ۸ پیکسل شد: ${boxes[i].left - boxes[i - 1].right}`,
    );
  }
});

test("حتی با مرکزهای خیلی نزدیک هم ناحیه‌ها روی هم نمی‌افتند", () => {
  const centers = [300, 260];
  const extents = solveHitExtents(centers, 96, 10, 8);
  const gap =
    centers[0] - extents[0].left - (centers[1] + extents[1].right);
  assert.ok(gap >= 8 - 1e-6, `شکاف: ${gap}`);
});
