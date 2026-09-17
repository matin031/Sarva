import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_ORBIT_TOKENS,
  MIN_ORBIT_TOKENS,
  buildRoleHuntRound,
  resolveRoleHuntAnswer,
  summarizeRoleHuntSession,
  verseTextOfRound,
} from "@/lib/role-hunt/round";
import type { GrammarCircuitQuestion } from "@/lib/grammar-circuit/types";

/* ── دادهٔ کمکی ───────────────────────────────────────────────────────────── */

type TokenSpec = { id: string; text: string; sep?: string; roles?: string[] };

function question(
  tokens: TokenSpec[],
  overrides: Partial<GrammarCircuitQuestion> = {},
): GrammarCircuitQuestion {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    sourceId: "rh-test-1",
    type: "hemistich",
    roleDefinitions: [],
    pieces: [],
    tokens: tokens.map((t) => ({
      id: t.id,
      text: t.text,
      separatorAfter: t.sep ?? " ",
      ...(t.roles ? { roleSlot: { acceptedRoleKeys: t.roles } } : {}),
    })),
    ...overrides,
  };
}

/** مصراعِ سالم: سه سوکت، هر نقش دقیقاً یک دارنده. */
function healthy(overrides: Partial<GrammarCircuitQuestion> = {}) {
  return question(
    [
      { id: "t1", text: "گشت" },
      { id: "t2", text: "یکی" },
      { id: "t3", text: "چشمه", roles: ["subject"] },
      { id: "t4", text: "ز" },
      { id: "t5", text: "سنگی", roles: ["complement"] },
      { id: "t6", text: "جدا", sep: "", roles: ["predicate"] },
    ],
    overrides,
  );
}

/* ── ساختِ دور ────────────────────────────────────────────────────────────── */

test("مدار فقط واژه‌های دارای نقشِ تأییدشده را می‌گیرد", () => {
  const round = buildRoleHuntRound(healthy());
  assert.ok(round);
  assert.deepEqual(
    round.orbit.map((t) => t.id),
    ["t3", "t5", "t6"],
  );
  // «یکی» نقشِ تأییدشده ندارد؛ نبودش در مدار عمدی است.
  assert.ok(!round.orbit.some((t) => t.text === "یکی"));
});

test("نقشِ هدف و پاسخِ درست از خودِ پرسش می‌آیند و با هم جورند", () => {
  const round = buildRoleHuntRound(healthy());
  assert.ok(round);

  const holder = round.orbit.find((t) => t.id === round.correctTokenId);
  assert.ok(holder, "پاسخِ درست باید داخلِ مدار باشد");

  const slot = healthy().tokens.find((t) => t.id === round.correctTokenId);
  assert.ok(slot?.roleSlot?.acceptedRoleKeys.includes(round.roleKey));
});

test("انتخابِ نقش پایدار است — همان پرسش، همیشه همان نقش", () => {
  const a = buildRoleHuntRound(healthy());
  const b = buildRoleHuntRound(healthy());
  assert.equal(a?.roleKey, b?.roleKey);
  assert.equal(a?.correctTokenId, b?.correctTokenId);
});

test("جمله‌های درسنامه دور نمی‌سازند — این بازی دربارهٔ شعر است", () => {
  assert.equal(buildRoleHuntRound(healthy({ type: "sentence" })), null);
});

test("مدارِ کم‌گزینه رد می‌شود", () => {
  const q = question([
    { id: "t1", text: "الف", roles: ["subject"] },
    { id: "t2", text: "ب", roles: ["object"] },
    { id: "t3", text: "پ", sep: "" },
  ]);
  assert.ok(MIN_ORBIT_TOKENS > 2);
  assert.equal(buildRoleHuntRound(q), null);
});

test("مدارِ بیش از حد شلوغ رد می‌شود", () => {
  const roles = [
    "subject",
    "object",
    "verb",
    "predicate",
    "complement",
    "adverb",
    "adjective",
    "possessive",
  ];
  assert.ok(roles.length > MAX_ORBIT_TOKENS);
  const q = question(
    roles.map((role, i) => ({ id: `t${i}`, text: `w${i}`, roles: [role] })),
  );
  assert.equal(buildRoleHuntRound(q), null);
});

test("نقشی که دو دارنده دارد هرگز هدف نمی‌شود", () => {
  const q = question([
    { id: "t1", text: "الف", roles: ["adjective"] },
    { id: "t2", text: "ب", roles: ["adjective"] },
    { id: "t3", text: "پ", roles: ["subject"] },
    { id: "t4", text: "ت", sep: "", roles: ["object"] },
  ]);
  const round = buildRoleHuntRound(q);
  assert.ok(round);
  assert.notEqual(round.roleKey, "adjective");
});

test("پرسشی که هیچ نقشِ یکتایی ندارد اصلاً وارد بانک نمی‌شود", () => {
  const q = question([
    { id: "t1", text: "الف", roles: ["adjective"] },
    { id: "t2", text: "ب", roles: ["adjective"] },
    { id: "t3", text: "پ", sep: "", roles: ["subject", "adjective"] },
  ]);
  // subject یکتاست ولی مدار فقط سه عضو دارد → باید بسازد؛
  // اینجا هدف صریحاً subject است و نه adjective.
  const round = buildRoleHuntRound(q);
  assert.equal(round?.roleKey, "subject");
});

test("کلیدِ نقشی که در کاتالوگ نیست هدف نمی‌شود", () => {
  const q = question([
    { id: "t1", text: "الف", roles: ["copular_verb"] },
    { id: "t2", text: "ب", roles: ["preposition"] },
    { id: "t3", text: "پ", sep: "", roles: ["subject"] },
  ]);
  const round = buildRoleHuntRound(q);
  assert.equal(round?.roleKey, "subject");
  assert.equal(round?.roleLabel, "نهاد");
});

/* ── واژه‌های تکراری ──────────────────────────────────────────────────────── */

test("دو «بود» دو رخدادِ مستقل‌اند و فقط یکی پاسخ است", () => {
  const q = question([
    { id: "t1", text: "بود", roles: ["verb"] },
    { id: "t2", text: "دانا", roles: ["predicate"] },
    { id: "t3", text: "هرکه", roles: ["subject"] },
    { id: "t4", text: "بود", sep: "", roles: ["adverb"] },
  ]);

  const round = buildRoleHuntRound(q);
  assert.ok(round);

  const duplicates = round.orbit.filter((t) => t.text === "بود");
  assert.equal(duplicates.length, 2);
  assert.notEqual(duplicates[0]!.id, duplicates[1]!.id);

  // انتخابِ رخدادِ *دیگرِ* همان رشته نباید درست شمرده شود.
  const wrongTwin = duplicates.find((t) => t.id !== round.correctTokenId)!;
  const resolved = resolveRoleHuntAnswer(q, wrongTwin.id);
  assert.ok(resolved);
  assert.equal(resolved.isCorrect, false);
  assert.equal(resolved.chosenToken.text, resolved.correctToken.text);
});

/* ── مصراع و بیت ─────────────────────────────────────────────────────────── */

test("یک خط یعنی مصراع", () => {
  const round = buildRoleHuntRound(healthy());
  assert.equal(round?.lines.length, 1);
  assert.equal(verseTextOfRound(round!), "گشت یکی چشمه ز سنگی جدا");
});

test("جداکنندهٔ « / » بیت را به دو مصراع می‌شکند", () => {
  const q = question([
    { id: "t1", text: "توانا", roles: ["predicate"] },
    { id: "t2", text: "بود", sep: " / ", roles: ["verb"] },
    { id: "t3", text: "هرکه", roles: ["subject"] },
    { id: "t4", text: "دانا", sep: "", roles: ["adjective"] },
  ]);
  const round = buildRoleHuntRound(q);
  assert.ok(round);
  assert.equal(round.lines.length, 2);
  assert.deepEqual(round.lines[0]!.map((t) => t.text), ["توانا", "بود"]);
  assert.deepEqual(round.lines[1]!.map((t) => t.text), ["هرکه", "دانا"]);
  assert.equal(verseTextOfRound(round), "توانا بود / هرکه دانا");
});

/* ── سنجشِ پاسخ ──────────────────────────────────────────────────────────── */

test("پاسخِ درست", () => {
  const q = healthy();
  const round = buildRoleHuntRound(q)!;
  const resolved = resolveRoleHuntAnswer(q, round.correctTokenId);
  assert.equal(resolved?.isCorrect, true);
  assert.equal(resolved?.verse, "گشت یکی چشمه ز سنگی جدا");
});

test("پاسخِ غلط", () => {
  const q = healthy();
  const round = buildRoleHuntRound(q)!;
  const other = round.orbit.find((t) => t.id !== round.correctTokenId)!;
  assert.equal(resolveRoleHuntAnswer(q, other.id)?.isCorrect, false);
});

test("واژه‌ای بیرونِ مدار اصلاً پاسخ نیست — نه درست و نه غلط", () => {
  // «یکی» روی صفحه نبوده؛ ثبتِ آن به‌عنوان یک اشتباه، تحلیل را آلوده می‌کرد.
  assert.equal(resolveRoleHuntAnswer(healthy(), "t2"), null);
  assert.equal(resolveRoleHuntAnswer(healthy(), "does-not-exist"), null);
});

test("پرسشی که واجدِ شرایط نیست هیچ پاسخی نمی‌پذیرد", () => {
  assert.equal(resolveRoleHuntAnswer(healthy({ type: "sentence" }), "t3"), null);
});

/* ── جمع‌بندیِ نشست ───────────────────────────────────────────────────────── */

test("جمع‌بندی: درست، غلط، دقت و بهترین زنجیره", () => {
  const summary = summarizeRoleHuntSession([
    { roleKey: "predicate", roleLabel: "مسند", isCorrect: true },
    { roleKey: "adverb", roleLabel: "قید", isCorrect: true },
    { roleKey: "predicate", roleLabel: "مسند", isCorrect: false },
    { roleKey: "subject", roleLabel: "نهاد", isCorrect: true },
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.correct, 3);
  assert.equal(summary.wrong, 1);
  assert.equal(summary.accuracy, 0.75);
  assert.equal(summary.bestStreak, 2);
  assert.deepEqual(summary.weakRoles, [
    { roleKey: "predicate", roleLabel: "مسند", total: 2, wrong: 1 },
  ]);
});

test("نشستِ خالی صفر می‌دهد و نه NaN", () => {
  const summary = summarizeRoleHuntSession([]);
  assert.equal(summary.accuracy, 0);
  assert.equal(summary.bestStreak, 0);
  assert.deepEqual(summary.weakRoles, []);
});
