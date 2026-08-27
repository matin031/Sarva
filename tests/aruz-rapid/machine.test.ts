import test from "node:test";
import assert from "node:assert/strict";
import {
  rapidAruzReducer as reduce,
  createInitialState,
  canAcceptInput,
  activeNow,
  accuracy,
  averageResponseTime,
  isPaused,
  type RapidAruzState,
  type RapidAruzAction,
} from "../../lib/aruz-rapid/machine";
import { DEFAULT_RAPID_ARUZ_CONFIG } from "../../lib/aruz-rapid/config";
import type { RapidAruzQuestion, ScansionLength } from "../../lib/aruz-rapid/types";

const QUESTION: RapidAruzQuestion = {
  id: "q",
  type: "phrase",
  difficulty: 1, // ۳۰۰۰ms، واحدِ اول ۳۵۰۰ms
  previewText: "بادِ صَبا",
  units: [
    { id: "u1", display: "با", length: "long", revealProgress: 0.25 },
    { id: "u2", display: "دِ", length: "short", revealProgress: 0.5 },
    { id: "u3", display: "صَ", length: "short", revealProgress: 0.75 },
    { id: "u4", display: "با", length: "long", revealProgress: 1 },
  ],
};

const SECOND: RapidAruzQuestion = { ...QUESTION, id: "q2", previewText: "دِلِ ما" };

/** سؤال را تا لحظه‌ای که واحدِ اول مسلح شده جلو می‌برد. */
function armedState(questions: RapidAruzQuestion[] = [QUESTION], t = 1000): RapidAruzState {
  let s = createInitialState(DEFAULT_RAPID_ARUZ_CONFIG);
  s = reduce(s, { type: "REQUEST_QUESTIONS" });
  s = reduce(s, { type: "QUESTIONS_LOADED", questions });
  s = reduce(s, { type: "FONT_READY" });
  s = reduce(s, { type: "PREVIEW_DONE" });
  s = reduce(s, { type: "SPOILER_DONE" });
  return reduce(s, { type: "ARM_UNIT", occurredAt: t });
}

function answer(s: RapidAruzState, length: ScansionLength, occurredAt: number): RapidAruzState {
  return reduce(s, { type: "ANSWER", length, inputMethod: "pointer", occurredAt });
}

/** پاسخِ درستِ واحدِ جاری و مسلح‌کردنِ واحدِ بعد. */
function correctAndArm(s: RapidAruzState, at: number, armAt = at + 16): RapidAruzState {
  const unit = s.questions[s.questionIndex].units[s.unitIndex];
  const next = answer(s, unit.length, at);
  return next.phase === "armingUnit" ? reduce(next, { type: "ARM_UNIT", occurredAt: armAt }) : next;
}

function restartRun(s: RapidAruzState, armAt: number): RapidAruzState {
  let next = reduce(s, {
    type: "FEEDBACK_DONE",
    runId: s.runId,
    questionEpoch: s.questionEpoch,
  });
  next = reduce(next, { type: "START_NEW_RUN", questionEpoch: next.questionEpoch });
  return reduce(next, { type: "ARM_UNIT", occurredAt: armAt });
}

test("پیش از مسلح‌شدن هیچ ورودی‌ای پذیرفته نمی‌شود", () => {
  let s = createInitialState(DEFAULT_RAPID_ARUZ_CONFIG);
  s = reduce(s, { type: "REQUEST_QUESTIONS" });
  s = reduce(s, { type: "QUESTIONS_LOADED", questions: [QUESTION] });
  assert.equal(canAcceptInput(s), false);
  s = reduce(s, { type: "FONT_READY" });
  assert.equal(s.phase, "preview");
  assert.equal(canAcceptInput(s), false);
  const ignored = answer(s, "long", 10);
  assert.equal(ignored, s, "پاسخ در پیش‌نمایش باید بی‌اثر باشد");
  s = reduce(s, { type: "PREVIEW_DONE" });
  assert.equal(canAcceptInput(s), false);
  s = reduce(s, { type: "SPOILER_DONE" });
  assert.equal(s.phase, "armingUnit");
  assert.equal(canAcceptInput(s), false, "تا وقتی واحد مسلح نشده، ورودی بسته است");
});

test("تایمر و ورودی با هم زنده می‌شوند", () => {
  const s = armedState();
  assert.equal(s.phase, "playing");
  assert.equal(canAcceptInput(s), true);
  assert.ok(s.attempt);
  // یک گذارِ واحد: همان لحظه هم ورودی باز شد و هم مهلت شروع شد.
  assert.equal(s.attempt!.startedActive, 0);
  assert.equal(s.attempt!.durationMs, 3500); // ۳۰۰۰ + ۵۰۰ برای واحدِ اول
  assert.equal(s.attempt!.deadlineActive, 3500);
  assert.equal(s.activeSince, 1000);
});

test("واحدهای بعدی وقتِ پایه می‌گیرند", () => {
  const s = correctAndArm(armedState(), 1400);
  assert.equal(s.attempt!.durationMs, 3000);
});

test("پاسخِ درست بدونِ وقتِ مرده به واحدِ بعد می‌رسد", () => {
  const s = armedState();
  const after = answer(s, "long", 1500);
  assert.equal(after.phase, "armingUnit", "بلافاصله آمادهٔ واحدِ بعد، نه یک فازِ انتظار");
  assert.equal(after.unitIndex, 1);
  assert.equal(after.attempt, null);
  assert.equal(after.activeSince, null, "ساعت بینِ دو واحد نمی‌دود");
  assert.equal(after.revealProgress, 0.25);
  assert.equal(after.feedback?.kind, "correct");
  assert.equal(after.questionStats.responseTimes.length, 1);
  assert.equal(after.questionStats.responseTimes[0], 500);
});

test("پاسخِ نادرست کلِ دور را از اول شروع می‌کند", () => {
  let s = armedState();
  s = correctAndArm(s, 1200); // واحد ۱
  s = correctAndArm(s, 1400); // واحد ۲
  s = correctAndArm(s, 1600); // واحد ۳
  assert.equal(s.unitIndex, 3);
  assert.equal(s.currentStreak, 3);

  const wrongLength: ScansionLength = "short"; // واحدِ چهارم بلند است
  s = answer(s, wrongLength, 1800);
  assert.equal(s.phase, "resetFeedbackWrong");
  assert.equal(s.questionStats.wrongChoices, 1);
  assert.equal(s.questionStats.timeouts, 0);
  assert.equal(s.currentStreak, 0);

  const beforeAttempts = s.questionStats.attemptCount;
  s = restartRun(s, 2000);
  assert.equal(s.unitIndex, 0, "بدونِ checkpoint، حتی روی واحدِ آخر");
  assert.equal(s.revealProgress, 0);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.questionStats.attemptCount, beforeAttempts + 1);
  assert.equal(s.questionStats.correctInputs, 3, "آمارِ سؤال حفظ می‌شود");
  assert.equal(s.questionStats.bestStreak, 3);
});

test("پایانِ زمان هم ریستِ کامل است ولی «پاسخِ نادرست» شمرده نمی‌شود", () => {
  let s = armedState();
  s = reduce(s, { type: "DEADLINE_REACHED", unitAttemptId: s.attempt!.id, occurredAt: 1000 + 3500 });
  assert.equal(s.phase, "resetFeedbackTimeout");
  assert.equal(s.questionStats.timeouts, 1);
  assert.equal(s.questionStats.wrongChoices, 0);
  assert.equal(s.questionStats.responseTimes.length, 0, "پایانِ زمان واردِ میانگین نمی‌شود");
  s = restartRun(s, 5000);
  assert.equal(s.unitIndex, 0);
  assert.equal(s.revealProgress, 0);
});

test("ورودیِ بعد از مهلت، پایانِ زمان است — نه پاسخ", () => {
  const s = armedState();
  // پاسخِ درست ولی یک میلی‌ثانیه بعد از مهلت، در حالی که callbackِ timeout
  // هنوز در صف مانده.
  const late = answer(s, "long", 1000 + 3501);
  assert.equal(late.phase, "resetFeedbackTimeout");
  assert.equal(late.questionStats.correctInputs, 0);
  assert.equal(late.questionStats.timeouts, 1);
});

test("ورودیِ درست دقیقاً پیش از مهلت پذیرفته می‌شود", () => {
  const s = armedState();
  const justInTime = answer(s, "long", 1000 + 3498);
  assert.equal(justInTime.phase, "armingUnit");
  assert.equal(justInTime.questionStats.correctInputs, 1);
});

test("یک تلاش فقط یک نتیجه می‌گیرد", () => {
  const s = armedState();
  const attemptId = s.attempt!.id;
  const answered = answer(s, "long", 1300);
  // پایانِ زمانِ دیررس روی همان تلاش باید بی‌اثر باشد
  const afterLateTimeout = reduce(answered, {
    type: "DEADLINE_REACHED",
    unitAttemptId: attemptId,
    occurredAt: 1000 + 4000,
  });
  assert.equal(afterLateTimeout, answered);
  assert.equal(afterLateTimeout.questionStats.timeouts, 0);
  assert.equal(afterLateTimeout.questionStats.correctInputs, 1);
});

test("دو ضربهٔ پشتِ‌هم یک واحد را رد می‌کند، نه دو تا", () => {
  const s = armedState();
  const first = answer(s, "long", 1200);
  assert.equal(first.unitIndex, 1);
  // ضربهٔ دوم پیش از مسلح‌شدنِ واحدِ بعد می‌رسد
  const second = answer(first, "long", 1203);
  assert.equal(second, first, "ورودیِ دوم باید دور انداخته شود");
  assert.equal(second.unitIndex, 1);
  assert.equal(second.questionStats.correctInputs, 1);
});

test("پاسخِ صفحه‌کلید و لمس هم‌زمان، دو نتیجه نمی‌سازند", () => {
  const s = armedState();
  const a = reduce(s, {
    type: "ANSWER",
    length: "long",
    inputMethod: "keyboard",
    occurredAt: 1100,
  });
  const b = reduce(a, {
    type: "ANSWER",
    length: "short",
    inputMethod: "pointer",
    occurredAt: 1100,
  });
  assert.equal(b, a);
  assert.equal(b.questionStats.wrongChoices, 0);
});

test("پایانِ زمانِ مربوط به تلاشِ قدیمی نادیده گرفته می‌شود", () => {
  const s = armedState();
  const staleId = s.attempt!.id;
  const next = correctAndArm(s, 1200);
  const after = reduce(next, {
    type: "DEADLINE_REACHED",
    unitAttemptId: staleId,
    occurredAt: 9999,
  });
  assert.equal(after, next);
});

test("بیدارباشِ زودهنگام نتیجه نمی‌سازد", () => {
  const s = armedState();
  const after = reduce(s, {
    type: "DEADLINE_REACHED",
    unitAttemptId: s.attempt!.id,
    occurredAt: 1000 + 100,
  });
  assert.equal(after, s);
});

test("مکث: نه زمان می‌گذرد، نه ورودی پذیرفته می‌شود", () => {
  let s = armedState();
  s = reduce(s, { type: "PAUSE", reason: "visibility", occurredAt: 1500 });
  assert.equal(isPaused(s), true);
  assert.equal(canAcceptInput(s), false);
  assert.equal(s.activeSince, null);
  assert.equal(s.activeAccumMs, 500);

  // ده ثانیه پنهان بودن نباید پایانِ زمان بسازد
  const ignored = reduce(s, {
    type: "DEADLINE_REACHED",
    unitAttemptId: s.attempt!.id,
    occurredAt: 11500,
  });
  assert.equal(ignored, s);

  s = reduce(s, { type: "RESUME", reason: "visibility", occurredAt: 11500 });
  assert.equal(s.resuming, true, "روپوشِ کوتاهِ «آماده؟»");
  assert.equal(canAcceptInput(s), false);
  assert.equal(s.activeSince, null, "زمانِ روپوش از مهلت کم نمی‌شود");

  s = reduce(s, { type: "RESUME_READY", occurredAt: 12200 });
  assert.equal(s.resuming, false);
  assert.equal(canAcceptInput(s), true);
  assert.equal(s.activeSince, 12200);
  assert.equal(activeNow(s, 12200), 500, "ساعت از همان‌جا ادامه می‌دهد");

  // زمانِ پاسخ هم مکث را نمی‌شمارد
  const answered = answer(s, "long", 12400);
  assert.equal(answered.questionStats.responseTimes[0], 700);
});

test("تا وقتی یک دلیلِ مکث مانده، بازی برنمی‌گردد", () => {
  let s = armedState();
  s = reduce(s, { type: "PAUSE", reason: "visibility", occurredAt: 1500 });
  s = reduce(s, { type: "PAUSE", reason: "windowBlur", occurredAt: 1500 });
  s = reduce(s, { type: "RESUME", reason: "visibility", occurredAt: 3000 });
  assert.equal(isPaused(s), true);
  assert.equal(s.resuming, false);
  s = reduce(s, { type: "RESUME", reason: "windowBlur", occurredAt: 3000 });
  assert.equal(isPaused(s), false);
  assert.equal(s.resuming, true);
});

test("دلیلِ تکراری دو بار حساب نمی‌شود", () => {
  let s = armedState();
  s = reduce(s, { type: "PAUSE", reason: "visibility", occurredAt: 1500 });
  const again = reduce(s, { type: "PAUSE", reason: "visibility", occurredAt: 1600 });
  assert.equal(again, s);
  assert.equal(again.activeAccumMs, 500, "ساعت دوباره کم نمی‌شود");
});

test("همهٔ واحدها درست: آشکارسازیِ کامل و زمانِ دورِ موفق", () => {
  let s = armedState();
  s = correctAndArm(s, 1200);
  s = correctAndArm(s, 1400);
  s = correctAndArm(s, 1600);
  const done = answer(s, "long", 1800);
  assert.equal(done.phase, "completed");
  assert.equal(done.revealProgress, 1);
  assert.equal(done.feedback?.kind, "complete");
  assert.equal(done.questionStats.correctInputs, 4);
  assert.equal(done.questionStats.bestStreak, 4);
  assert.equal(done.sessionStats.questionsCompleted, 1);
  assert.ok(done.questionStats.successfulRunTimeMs !== null);
  assert.ok(done.questionStats.successfulRunTimeMs! > 0);
  assert.equal(canAcceptInput(done), false, "بعد از تکمیل، ورودی بسته است");
});

test("زمانِ دورِ موفق فقط آخرین دور را می‌شمارد", () => {
  let s = armedState();
  s = correctAndArm(s, 2000); // ۱۰۰۰ms روی واحدِ اول
  s = answer(s, "long", 2500); // واحدِ دوم کوتاه است — این نادرست است
  s = restartRun(s, 3000);
  s = correctAndArm(s, 3100);
  s = correctAndArm(s, 3200);
  s = correctAndArm(s, 3300);
  const done = answer(s, "long", 3400);
  assert.equal(done.phase, "completed");
  const runTime = done.questionStats.successfulRunTimeMs!;
  // دورِ موفق: ۱۰۰ + ۸۴ + ۸۴ + ۸۴ = ۳۵۲ms زمانِ تعاملی (فاصلهٔ بینِ دو واحد
  // که ساعت در آن ایستاده، شمرده نمی‌شود). دورِ شکست‌خورده در آن نیست.
  assert.equal(runTime, 352, `زمانِ دورِ موفق: ${runTime}`);
});

test("سؤالِ بعدی آمارِ نشست را نگه می‌دارد و آمارِ سؤال را از نو می‌سازد", () => {
  let s = armedState([QUESTION, SECOND]);
  s = answer(s, "short", 1100); // نادرست
  s = restartRun(s, 1500);
  s = correctAndArm(s, 1600);
  s = correctAndArm(s, 1700);
  s = correctAndArm(s, 1800);
  s = answer(s, "long", 1900);
  assert.equal(s.phase, "completed");
  s = reduce(s, { type: "COMPLETION_DONE", questionEpoch: s.questionEpoch });
  assert.equal(s.phase, "questionResults");

  const epochBefore = s.questionEpoch;
  const sessionBefore = s.sessionStats;
  s = reduce(s, { type: "NEXT_QUESTION" });
  assert.equal(s.questionEpoch, epochBefore + 1, "شناسهٔ تازه، تا callbackهای قدیمی بمیرند");
  assert.equal(s.questionIndex, 1);
  assert.equal(s.phase, "waitingForFont");
  assert.equal(s.revealProgress, 0);
  assert.equal(s.activeAccumMs, 0);
  assert.equal(s.attempt, null);
  assert.equal(s.questionStats.questionId, "q2");
  assert.equal(s.questionStats.wrongChoices, 0);
  assert.deepEqual(s.sessionStats, sessionBefore, "آمارِ نشست دست‌نخورده می‌ماند");
  assert.equal(s.sessionStats.totalWrongChoices, 1);
});

test("سؤالِ آخر به نتیجهٔ نشست می‌رسد", () => {
  let s = armedState([QUESTION]);
  s = correctAndArm(s, 1100);
  s = correctAndArm(s, 1200);
  s = correctAndArm(s, 1300);
  s = answer(s, "long", 1400);
  s = reduce(s, { type: "COMPLETION_DONE", questionEpoch: s.questionEpoch });
  assert.equal(s.phase, "sessionResults");
});

test("callbackِ متعلق به سؤالِ قبلی بی‌اثر است", () => {
  let s = armedState([QUESTION, SECOND]);
  s = answer(s, "short", 1100);
  const staleRun = s.runId;
  const staleEpoch = s.questionEpoch;
  const bumped = reduce(s, { type: "FEEDBACK_DONE", runId: staleRun + 5, questionEpoch: staleEpoch });
  assert.equal(bumped, s);
  const wrongEpoch = reduce(s, {
    type: "FEEDBACK_DONE",
    runId: staleRun,
    questionEpoch: staleEpoch + 3,
  });
  assert.equal(wrongEpoch, s);
});

test("ترتیبِ سؤال‌ها با هر رویداد دوباره ساخته نمی‌شود", () => {
  const s = armedState([QUESTION, SECOND]);
  const ids = s.questions.map((q) => q.id);
  const after = correctAndArm(s, 1200);
  assert.deepEqual(after.questions.map((q) => q.id), ids);
  assert.equal(after.questions, s.questions, "همان آرایه، نه یک کپیِ تازه");
});

test("دقتِ پاسخ‌ها و میانگینِ زمان", () => {
  const stats = {
    questionId: "q",
    attemptCount: 2,
    wrongChoices: 1,
    timeouts: 1,
    correctInputs: 2,
    bestStreak: 2,
    responseTimes: [400, 600],
    successfulRunTimeMs: null,
  };
  assert.equal(accuracy(stats), 0.5);
  assert.equal(averageResponseTime(stats), 500);
  assert.equal(
    accuracy({ ...stats, correctInputs: 0, wrongChoices: 0, timeouts: 0 }),
    0,
    "تقسیم بر صفر نباید NaN بدهد",
  );
  assert.equal(averageResponseTime({ ...stats, responseTimes: [] }), null);
});

test("نشستِ بدونِ سؤالِ معتبر، حالتِ خطای امن دارد", () => {
  let s = createInitialState(DEFAULT_RAPID_ARUZ_CONFIG);
  s = reduce(s, { type: "REQUEST_QUESTIONS" });
  s = reduce(s, { type: "QUESTIONS_LOADED", questions: [] });
  assert.equal(s.phase, "error");
  assert.ok(s.error);
});

test("هر کنشِ ناهم‌زمان در فازِ غلط، همان state را برمی‌گرداند", () => {
  const s = armedState();
  const noops: RapidAruzAction[] = [
    { type: "FONT_READY" },
    { type: "PREVIEW_DONE" },
    { type: "SPOILER_DONE" },
    { type: "ARM_UNIT", occurredAt: 2000 },
    { type: "START_NEW_RUN", questionEpoch: s.questionEpoch },
    { type: "COMPLETION_DONE", questionEpoch: s.questionEpoch },
    { type: "NEXT_QUESTION" },
    { type: "RESUME_READY", occurredAt: 2000 },
  ];
  for (const action of noops) {
    assert.equal(reduce(s, action), s, `${action.type} نباید کاری کند`);
  }
});

test("بارگذاریِ تکراری (StrictMode) نشست را از نو نمی‌چیند", () => {
  const s = armedState();
  const again = reduce(s, { type: "QUESTIONS_LOADED", questions: [SECOND] });
  assert.equal(again, s, "سؤال‌ها فقط وقتی جا می‌افتند که بازی منتظرشان باشد");
});
