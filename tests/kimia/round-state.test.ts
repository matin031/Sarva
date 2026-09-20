import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyDecision,
  decideAttempt,
  type AttemptInput,
  type RoundSnapshot,
} from "@/lib/kimia/round-state";
import { joinArk } from "@/lib/kimia/catalog";

const join = (feet: readonly string[]) => joinArk(feet).slice(0, 160);
const RIGHT = ["فاعلاتن", "فاعلاتن", "فاعلن"];
const WRONG = ["فاعلاتن", "فاعلن", "فاعلاتن"];

const fresh = (): RoundSnapshot => ({
  status: "active",
  attemptsCount: 0,
  lastAttemptId: null,
  lastCorrect: null,
  lastErrorType: null,
});

const attempt = (over: Partial<AttemptInput> = {}): AttemptInput => ({
  attemptId: "a1",
  selected: WRONG,
  isCorrect: false,
  errorType: "ORDER_ONLY",
  responseMs: 4200,
  ...over,
});

test("تلاشِ اول، شاهدِ یادگیری را می‌نویسد", () => {
  const plan = decideAttempt(fresh(), attempt(), join);
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.attemptsCount, 1);
  assert.equal(plan.write.status, "active");
  assert.ok(plan.write.first);
  assert.equal(plan.write.first?.isCorrect, false);
  assert.equal(plan.write.first?.errorType, "ORDER_ONLY");
  assert.equal(plan.write.first?.responseMs, 4200);
  assert.equal(plan.write.selectedText, "فاعلاتن فاعلن فاعلاتن");
});

test("تلاشِ درست، دور را می‌بندد", () => {
  const plan = decideAttempt(
    fresh(),
    attempt({ selected: RIGHT, isCorrect: true, errorType: null }),
    join,
  );
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.status, "completed");
  assert.equal(plan.write.errorType, null);
});

test("⚠️ تلاشِ دوم شاهدِ اول را بازنویسی نمی‌کند", () => {
  /* غلط → درست: کارنامه باید بگوید «بارِ اول غلط بود ولی بالاخره ساختش»
     و نه «درست بود». اگر `first` در تلاشِ دوم هم نوشته می‌شد، هر دورِ سختی
     که بازیکن بالاخره حلش کند، به‌عنوان «بلد بوده» ثبت می‌شد و تحلیل
     هیچ‌وقت ضعفی نمی‌دید. */
  const afterFirst: RoundSnapshot = {
    status: "active",
    attemptsCount: 1,
    lastAttemptId: "a1",
    lastCorrect: false,
    lastErrorType: "ORDER_ONLY",
  };
  const plan = decideAttempt(
    afterFirst,
    attempt({ attemptId: "a2", selected: RIGHT, isCorrect: true, errorType: null }),
    join,
  );
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.first, null, "شاهدِ تلاشِ اول نباید دوباره نوشته شود");
  assert.equal(plan.write.attemptsCount, 2);
  assert.equal(plan.write.status, "completed");
});

test("⚠️ غلط → غلط → درست = یک شاهد، سه تلاش", () => {
  /* دقیقاً سناریوی spec: یک دور، `firstTryCorrect=false`،
     `eventuallyCorrect=true`، `attemptsCount=3`. */
  let round = fresh();
  let firstSeen: { isCorrect: boolean } | null = null;

  for (const [i, step] of (
    [
      { id: "a1", correct: false },
      { id: "a2", correct: false },
      { id: "a3", correct: true },
    ] as const
  ).entries()) {
    const plan = decideAttempt(
      round,
      attempt({
        attemptId: step.id,
        selected: step.correct ? RIGHT : WRONG,
        isCorrect: step.correct,
        errorType: step.correct ? null : "FOOT_CONTENT",
      }),
      join,
    );
    assert.equal(plan.kind, "write", `گامِ ${i} باید یک تلاشِ واقعی باشد`);
    if (plan.kind !== "write") return;
    if (plan.write.first) firstSeen = { isCorrect: plan.write.first.isCorrect };
    round = { ...applyDecision(round, plan), lastAttemptId: step.id };
  }

  assert.equal(round.attemptsCount, 3);
  assert.equal(round.status, "completed");
  assert.equal(round.lastCorrect, true);
  assert.equal(firstSeen?.isCorrect, false, "تلاشِ اول باید غلط ثبت شده باشد");
});

test("⚠️ همان شناسهٔ تلاش، هیچ تغییری نمی‌دهد", () => {
  const afterFirst: RoundSnapshot = {
    status: "active",
    attemptsCount: 1,
    lastAttemptId: "a1",
    lastCorrect: false,
    lastErrorType: "ORDER_ONLY",
  };
  const plan = decideAttempt(afterFirst, attempt({ attemptId: "a1" }), join);
  assert.equal(plan.kind, "duplicate");
  const after = applyDecision(afterFirst, plan);
  assert.deepEqual(after, afterFirst, "شمارنده نباید بالا برود");
});

test("⚠️ شناسهٔ تازه بعد از تغییرِ پاسخ، یک تلاشِ واقعی است", () => {
  const afterFirst: RoundSnapshot = {
    status: "active",
    attemptsCount: 1,
    lastAttemptId: "a1",
    lastCorrect: false,
    lastErrorType: "ORDER_ONLY",
  };
  const plan = decideAttempt(afterFirst, attempt({ attemptId: "a2" }), join);
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.attemptsCount, 2, "دقیقاً یکی، نه بیشتر");
});

test("⚠️ دورِ بسته تغییرناپذیر است", () => {
  const done: RoundSnapshot = {
    status: "completed",
    attemptsCount: 2,
    lastAttemptId: "a2",
    lastCorrect: true,
    lastErrorType: null,
  };
  for (const id of ["a3", "a4"]) {
    const plan = decideAttempt(done, attempt({ attemptId: id }), join);
    assert.equal(plan.kind, "immutable");
    assert.deepEqual(applyDecision(done, plan), done);
  }
});

test("تکراری بر بسته مقدم است", () => {
  const done: RoundSnapshot = {
    status: "completed",
    attemptsCount: 1,
    lastAttemptId: "a1",
    lastCorrect: true,
    lastErrorType: null,
  };
  assert.equal(decideAttempt(done, attempt({ attemptId: "a1" }), join).kind, "duplicate");
});

test("⚠️ هیچ دنباله‌ای از تلاش‌ها CHECKهای مهاجرت ۰۱۸ را نمی‌شکند", () => {
  /* آینهٔ همان شرط‌هایی که در `mysql-migrations/018_kimia.sql` نوشته شده.
     اینجا روی *همهٔ* دنباله‌های تا چهار تلاش اجرا می‌شود، چون یک درجِ
     ردشده در production یعنی پاسخِ دانش‌آموز اصلاً ثبت نشود. */
  const violates = (r: RoundSnapshot, attempts: number) => {
    const bad: string[] = [];
    const completed = r.status === "completed";
    if (completed !== (r.lastCorrect === true)) bad.push("completed_is_correct");
    if ((attempts === 0) !== (r.lastCorrect === null)) bad.push("last_attempt_matches");
    if (r.lastCorrect !== null && (r.lastCorrect === true) !== (r.lastErrorType === null)) {
      bad.push("last_error_matches");
    }
    return bad;
  };

  const walk = (round: RoundSnapshot, depth: number, n: number) => {
    if (depth === 0) return;
    for (const correct of [true, false]) {
      const plan = decideAttempt(
        round,
        attempt({
          attemptId: `a${n + 1}`,
          selected: correct ? RIGHT : WRONG,
          isCorrect: correct,
          errorType: correct ? null : "FOOT_CONTENT",
        }),
        join,
      );
      const next = { ...applyDecision(round, plan), lastAttemptId: `a${n + 1}` };
      const nextCount = plan.kind === "write" ? plan.write.attemptsCount : round.attemptsCount;
      const bad = violates(next, nextCount);
      assert.deepEqual(bad, [], `حالتِ نامعتبر بعد از ${nextCount} تلاش: ${bad.join(",")}`);
      walk(next, depth - 1, nextCount);
    }
  };

  walk(fresh(), 4, 0);
});
