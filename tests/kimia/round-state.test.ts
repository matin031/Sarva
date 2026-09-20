import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ATTEMPTS,
  applyDecision,
  attemptsRemaining,
  decideAttempt,
  decideReveal,
  isRoundClosed,
  mayRevealSolution,
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
  revealReason: null,
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
    revealReason: null,
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
    revealReason: null,
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
    revealReason: null,
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
    revealReason: null,
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
    revealReason: null,
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
    /* قیدهای مهاجرت ۰۱۹. */
    if (r.revealReason !== null && attempts === 0) bad.push("reveal_needs_attempt");
    if (r.revealReason !== null && r.status === "completed") {
      /* پاسخِ درست هیچ‌وقت `revealed_at` نمی‌نویسد — وگرنه یک دورِ موفق
         در تحلیل از یک بن‌بست قابلِ تشخیص نبود. */
      bad.push("solved_round_marked_revealed");
    }
    if (attempts > MAX_ATTEMPTS) bad.push("over_cap");
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


/* ═══════════════════ سه تلاش، و پایانی که پاسخ دارد ═══════════════════ */

const after = (n: number, over: Partial<RoundSnapshot> = {}): RoundSnapshot => ({
  status: "active",
  attemptsCount: n,
  lastAttemptId: `a${n}`,
  lastCorrect: n === 0 ? null : false,
  lastErrorType: n === 0 ? null : "ORDER_ONLY",
  revealReason: null,
  ...over,
});

test("تلاشِ چهارم رد می‌شود و هیچ ستونی را تکان نمی‌دهد", () => {
  const plan = decideAttempt(after(MAX_ATTEMPTS), attempt({ attemptId: "a9" }), join);
  assert.equal(plan.kind, "rejected");
  if (plan.kind !== "rejected") return;
  assert.equal(plan.reason, "attempts-exhausted");
});

test("تلاش بعد از «نمایش پاسخ» رد می‌شود — با دلیلِ خودش", () => {
  /* ⚠️ دو کدِ متفاوت و نه یکی: بازیکنی که خودش پاسخ را دیده نباید پیامِ
     «تلاش‌هایت تمام شد» بگیرد، که دروغ است. */
  const plan = decideAttempt(after(1, { revealReason: "user" }), attempt({ attemptId: "a9" }), join);
  assert.equal(plan.kind, "rejected");
  if (plan.kind !== "rejected") return;
  assert.equal(plan.reason, "already-revealed");
});

test("⚠️ تلاشِ تکراری *پیش از* سنجشِ سقف بررسی می‌شود", () => {
  /* دورِ پر، و همان شناسه‌ای که آخرین بار آمده: این یک تلاشِ چهارم نیست،
     یک تلاشِ دوبارهٔ شبکه است و باید همان پاسخِ قبلی را بگیرد و نه ۴۰۹.
     اگر ترتیبِ شرط‌ها برعکس شود، هر لرزشِ شبکه روی تلاشِ سوم به بازیکن
     می‌گفت «تلاش‌هایت تمام شد» بی‌آنکه نتیجه‌اش را ببیند. */
  const round = after(MAX_ATTEMPTS, { lastAttemptId: "a3" });
  const plan = decideAttempt(round, attempt({ attemptId: "a3" }), join);
  assert.equal(plan.kind, "duplicate");
});

test("تلاشِ سومِ غلط، پاسخ را در همان تصمیم باز می‌کند", () => {
  const plan = decideAttempt(after(MAX_ATTEMPTS - 1), attempt({ attemptId: "a3" }), join);
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.attemptsCount, MAX_ATTEMPTS);
  assert.equal(plan.write.reveal, "exhausted");
  assert.equal(plan.write.status, "active", "دورِ reveal شده completed نمی‌شود");
});

test("تلاشِ سومِ *درست* پاسخ را باز نمی‌کند — می‌بندد", () => {
  const plan = decideAttempt(
    after(MAX_ATTEMPTS - 1),
    attempt({ attemptId: "a3", selected: RIGHT, isCorrect: true, errorType: null }),
    join,
  );
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.reveal, null, "دورِ موفق نباید «باز‌شده» ثبت شود");
  assert.equal(plan.write.status, "completed");
});

test("تلاشِ اولِ غلط هیچ‌چیز را باز نمی‌کند", () => {
  const plan = decideAttempt(after(0), attempt({ attemptId: "a1" }), join);
  assert.equal(plan.kind, "write");
  if (plan.kind !== "write") return;
  assert.equal(plan.write.reveal, null);
  assert.equal(plan.write.attemptsCount, 1);
});

test("«بسته» یک تعریف دارد و هر سه راهش را می‌شناسد", () => {
  assert.equal(isRoundClosed(after(0)), false);
  assert.equal(isRoundClosed(after(1)), false);
  assert.equal(isRoundClosed(after(MAX_ATTEMPTS)), true, "سقف");
  assert.equal(isRoundClosed(after(1, { revealReason: "user" })), true, "باز‌شده");
  assert.equal(
    isRoundClosed(after(1, { status: "completed", lastCorrect: true, lastErrorType: null })),
    true,
    "حل‌شده",
  );
});

test("شمارندهٔ باقی‌مانده هیچ‌وقت منفی یا گمراه‌کننده نیست", () => {
  assert.equal(attemptsRemaining(after(0)), MAX_ATTEMPTS);
  assert.equal(attemptsRemaining(after(1)), MAX_ATTEMPTS - 1);
  assert.equal(attemptsRemaining(after(MAX_ATTEMPTS)), 0);
  /* دورِ حل‌شده در تلاشِ اول: بسته است، پس «دو تلاشِ باقی‌مانده» دربارهٔ
     آن معنا ندارد و نباید روی صفحه بنشیند. */
  assert.equal(
    attemptsRemaining(after(1, { status: "completed", lastCorrect: true, lastErrorType: null })),
    0,
  );
});

test("دروازهٔ پاسخ فقط در سه حالت باز است", () => {
  assert.equal(mayRevealSolution(after(0)), false);
  assert.equal(mayRevealSolution(after(MAX_ATTEMPTS - 1)), false);
  assert.equal(mayRevealSolution(after(MAX_ATTEMPTS)), true);
  assert.equal(mayRevealSolution(after(1, { revealReason: "exhausted" })), true);
  assert.equal(
    mayRevealSolution(after(1, { status: "completed", lastCorrect: true, lastErrorType: null })),
    true,
  );
});

test("«نمایش پاسخ» بدونِ هیچ تلاشی رد می‌شود", () => {
  const plan = decideReveal(after(0));
  assert.equal(plan.kind, "rejected");
  if (plan.kind !== "rejected") return;
  assert.equal(plan.reason, "no-attempt-yet");
});

test("«نمایش پاسخ» بعد از یک تلاش می‌نویسد، و بارِ دوم نه", () => {
  assert.deepEqual(decideReveal(after(1)), { kind: "write" });
  /* ⚠️ زدنِ دوباره نباید زمانِ ثبت‌شده را جابه‌جا کند. */
  assert.deepEqual(decideReveal(after(1, { revealReason: "user" })), { kind: "already-open" });
});

test("«نمایش پاسخ» روی دورِ حل‌شده چیزی نمی‌نویسد", () => {
  /* ⚠️ بازیکن برنده شده؛ ثبتِ `revealed_at` روی او یعنی در تحلیل از یک
     بن‌بست قابلِ تشخیص نباشد. پاسخ را می‌گیرد، ولی ردیف دست‌نخورده
     می‌ماند. */
  const solvedRound = after(1, { status: "completed", lastCorrect: true, lastErrorType: null });
  assert.deepEqual(decideReveal(solvedRound), { kind: "already-open" });
});

test("«باز شدن با exhausted» با یک reveal دستی به user تبدیل نمی‌شود", () => {
  assert.deepEqual(decideReveal(after(MAX_ATTEMPTS, { revealReason: "exhausted" })), {
    kind: "already-open",
  });
});
