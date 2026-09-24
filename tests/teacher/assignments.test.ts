import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import {
  ASSIGNMENT_KINDS,
  assignmentHref,
  assignmentStatus,
  pickByWeight,
  readConfig,
  resultSummary,
  sameItems,
  shortageMessage,
  subsetOfItems,
  validateWeightRequest,
  weightAvailability,
  type PoolQuestion,
} from "@/lib/teacher/assignment-rules";
import { quizQuestionWeight } from "@/lib/quiz/weight";

/**
 * قواعدِ تکلیفِ عروض.
 *
 * ⚠️ این‌ها همان تصمیم‌هایی‌اند که اگر بی‌صدا بشکنند، دبیر آزمونی با سؤالِ
 * تکراری می‌سازد در حالی که «عدم تکرار» را زده، یا دانش‌آموز تکلیف را با
 * سؤال‌های دیگری کامل می‌کند.
 */

function checkValues(file: string, constraint: string): string[] {
  const sql = readFileSync(joinPath(process.cwd(), "mysql-migrations", file), "utf8");
  const start = sql.indexOf(constraint);
  const open = sql.indexOf("IN (", start);
  const close = sql.indexOf(")", open);
  return [...sql.slice(open + 4, close).matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("فهرست‌ها با CHECKِ دیتابیس یکی‌اند", () => {
  test("نوعِ تکلیف — ۰۲۳", () => {
    assert.deepEqual(
      [...ASSIGNMENT_KINDS].sort(),
      checkValues("023_teacher_assignments.sql", "teacher_assignments_kind_check").sort(),
    );
  });

  test("نوعِ اعلان: ۰۲۳ همهٔ ۰۲۰ را دارد و فقط `teacher_assignment` اضافه شده", () => {
    const before = checkValues("020_outbound_notifications.sql", "ADD CONSTRAINT `plus_notifications_kind_check`");
    const after = checkValues("023_teacher_assignments.sql", "ADD CONSTRAINT `plus_notifications_kind_check`");
    assert.deepEqual(after.sort(), [...before, "teacher_assignment"].sort());
  });
});

describe("وزنِ سؤالِ عروضِ سماعی", () => {
  const base = { poem: null, audioUrl: null, correctLabel: null, correctAudioUrl: null };

  test("صوت → بیت: از نامِ فایلِ خودِ سؤال", () => {
    assert.equal(
      quizQuestionWeight({ ...base, type: "audio-to-poem", audioUrl: "/audio/مفتعلن-فع-مفتعلن-فع.mp3" }),
      "مفتعلن فع مفتعلن فع",
    );
  });

  test("بیت → صوت: از نامِ فایلِ گزینهٔ درست، حتی درصد-کدشده", () => {
    assert.equal(
      quizQuestionWeight({
        ...base,
        type: "poem-to-audio",
        correctAudioUrl: `/audio/${encodeURIComponent("فعولن-فعولن-فعولن-فعل")}.mp3`,
      }),
      "فعولن فعولن فعولن فعل",
    );
  });

  test("فایلِ دلخواهِ آپلودی وزن نیست", () => {
    assert.equal(
      quizQuestionWeight({ ...base, type: "audio-to-poem", audioUrl: "/uploads/audio/x1a2.mp3" }),
      null,
    );
  });

  test("وزن → صوت: `poem[0]`، هم آرایه (MySQL) هم رشتهٔ JSON (MariaDB)", () => {
    const poem = ["فاعلاتن  فاعلاتن فاعلاتن فاعلن"];
    const want = "فاعلاتن فاعلاتن فاعلاتن فاعلن";
    assert.equal(quizQuestionWeight({ ...base, type: "weight-to-audio", poem }), want);
    assert.equal(quizQuestionWeight({ ...base, type: "weight-to-audio", poem: JSON.stringify(poem) }), want);
  });

  test("صوت → وزن: برچسبِ گزینهٔ درست", () => {
    assert.equal(
      quizQuestionWeight({ ...base, type: "audio-to-weight", correctLabel: " مفاعیلن مفاعیلن فعولن " }),
      "مفاعیلن مفاعیلن فعولن",
    );
  });
});

describe("انتخابِ سؤال برای هر وزن", () => {
  const A = "مفاعیلن مفاعیلن مفاعیلن مفاعیلن";
  const B = "فعولن فعولن فعولن فعل";
  const pool: PoolQuestion[] = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, weight: A })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, weight: B })),
    { id: "x", weight: null },
  ];
  /* سه سؤالِ A را این دانش‌آموز دیده است. */
  const seen = new Set(["a0", "a1", "a2"]);

  test("شمارش: کل و دیده‌نشده، سؤالِ بی‌وزن بیرون", () => {
    assert.deepEqual(weightAvailability(pool, seen), [
      { weight: A, total: 10, unseen: 7 },
      { weight: B, total: 5, unseen: 5 },
    ]);
  });

  test("تعدادِ خواسته‌شده دقیق، یکتا، و هر وزن از خودش", () => {
    const r = pickByWeight({ pool, seen, request: { [A]: 6, [B]: 5 }, excludeSeen: true });
    assert.ok(r.ok);
    assert.equal(r.items.length, 11);
    assert.equal(new Set(r.items).size, 11);
    assert.equal(r.items.filter((id) => id.startsWith("a")).length, 6);
    assert.ok(r.items.every((id) => !seen.has(id)), "سؤالِ دیده‌شده آمد");
  });

  test("⚠️ کمبود: هیچ آزمونی ساخته نمی‌شود و سؤالِ دیده‌شده جای خالی را پر نمی‌کند", () => {
    const r = pickByWeight({ pool, seen, request: { [A]: 10, [B]: 2 }, excludeSeen: true });
    assert.equal(r.ok, false);
    assert.ok(!r.ok);
    assert.deepEqual(r.shortages, [{ weight: A, requested: 10, available: 7 }]);
    assert.equal(
      shortageMessage(r.shortages[0], true),
      `برای وزن «${A}» فقط ۷ سؤال دیده‌نشده برای این دانش‌آموز باقی مانده است.`,
    );
  });

  test("با خاموش شدنِ «عدم تکرار»، همان ده سؤال شدنی است", () => {
    const r = pickByWeight({ pool, seen, request: { [A]: 10 }, excludeSeen: false });
    assert.ok(r.ok);
    assert.equal(r.items.length, 10);
  });

  test("وزنی که در بانک نیست کمبودِ صفر می‌گیرد، نه سکوت", () => {
    const r = pickByWeight({ pool, seen, request: { "فعلن": 1 }, excludeSeen: false });
    assert.ok(!r.ok);
    assert.equal(r.shortages[0].available, 0);
  });

  test("سقف‌ها", () => {
    assert.equal(validateWeightRequest({ [A]: 5 }), null);
    assert.notEqual(validateWeightRequest({}), null);
    assert.notEqual(validateWeightRequest({ [A]: 0 }), null);
    assert.notEqual(validateWeightRequest({ [A]: 31 }), null);
    assert.notEqual(validateWeightRequest({ [A]: 30, [B]: 30, x: 1 }), null);
    assert.notEqual(validateWeightRequest({ [A]: 2.5 }), null);
    assert.notEqual(validateWeightRequest({ [A]: -1 }), null);
  });
});

describe("تکمیل فقط با سؤال‌های خودِ تکلیف", () => {
  const items = ["q1", "q2", "q3"];

  test("آزمون و «کوتاه یا بلند»: دقیقاً همان مجموعه، هر ترتیبی", () => {
    assert.equal(sameItems(items, ["q3", "q1", "q2"]), true);
    assert.equal(sameItems(items, ["q1", "q2"]), false);
    assert.equal(sameItems(items, ["q1", "q2", "q2"]), false);
    assert.equal(sameItems(items, ["q1", "q2", "zz"]), false);
    assert.equal(sameItems(items, ["q1", "q2", "q3", "q4"]), false);
  });

  test("پل وزن: دور با اولین اشتباه تمام می‌شود، پس زیرمجموعه — ولی نه بیرون از آن", () => {
    assert.equal(subsetOfItems(items, ["q2"]), true);
    assert.equal(subsetOfItems(items, ["q2", "q1", "q3"]), true);
    assert.equal(subsetOfItems(items, []), false);
    assert.equal(subsetOfItems(items, ["q2", "q2"]), false);
    assert.equal(subsetOfItems(items, ["zz"]), false);
  });
});

describe("وضعیت و نمایش", () => {
  const t = "2026-09-24T10:00:00.000Z";

  test("لغو بر همه مقدم است، بعد انجام، بعد شروع", () => {
    assert.equal(assignmentStatus({ startedAt: null, completedAt: null, cancelledAt: null }), "pending");
    assert.equal(assignmentStatus({ startedAt: t, completedAt: null, cancelledAt: null }), "started");
    assert.equal(assignmentStatus({ startedAt: t, completedAt: t, cancelledAt: null }), "done");
    assert.equal(assignmentStatus({ startedAt: t, completedAt: null, cancelledAt: t }), "cancelled");
  });

  test("«کوتاه یا بلند؟» گزارشِ خودِ بازی است و همین برچسب را می‌گیرد", () => {
    assert.equal(resultSummary("aruz_rapid", { total: 5, wrongChoices: 2, timeouts: 1 })?.clientReported, true);
    assert.equal(resultSummary("aruz_quiz", { total: 10, correct: 8 })?.clientReported, false);
    assert.equal(resultSummary("aruz_quiz", { total: 10, correct: 8 })?.text, "۸ از ۱۰ درست · ۸۰٪");
    assert.equal(resultSummary("aruz_bridge", { total: 20, correct: 20 })?.text, "هر ۲۰ سؤال درست");
    assert.equal(resultSummary("aruz_quiz", null), null);
  });

  test("نشانیِ اجرا فقط شناسه را دارد", () => {
    assert.equal(assignmentHref("aruz_bridge", "abc"), "/game/aruz-bridge?assignment=abc");
    assert.equal(assignmentHref("aruz_quiz", "abc"), "/quiz?assignment=abc");
  });

  test("`config` هم رشتهٔ JSON (MariaDB) و هم شیء، و آشغال خالی می‌شود", () => {
    assert.deepEqual(readConfig('{"items":["a","b"],"source":"mistakes"}').items, ["a", "b"]);
    assert.equal(readConfig({ items: ["a"], source: "mistakes" }).source, "mistakes");
    assert.deepEqual(readConfig("not json").items, []);
    assert.deepEqual(readConfig({ items: [1, "a", null] }).items, ["a"]);
  });
});
