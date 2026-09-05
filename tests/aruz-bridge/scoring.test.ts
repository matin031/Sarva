import test from "node:test";
import assert from "node:assert/strict";
import {
  initialMachineState,
  machineReducer as reduce,
  prepareSteps,
  type MachineState,
} from "../../lib/aruz-bridge/machine";
import { configForDifficulty, defaultScoring } from "../../lib/aruz-bridge/config";
import { PACE_TIMINGS } from "../../lib/aruz-bridge/session";
import type { AruzBridgeQuestion } from "../../lib/aruz-bridge/types";

/* سرعتِ «سریع»: فرصتِ پاسخ ۲۵۰۰ms، مدتِ پرش ۶۵۰ms — بدترین حالت برای این
   باگ، چون پرش سهمِ بزرگ‌تری از پنجرهٔ پاسخ می‌گیرد. */
const config = configForDifficulty(3, { ...PACE_TIMINGS.fast, questionsPerRun: 2 });

const QUESTIONS: AruzBridgeQuestion[] = [
  {
    id: "q1",
    promptText: "بادِ صَبا",
    correctPattern: "فاعلاتن",
    wrongPattern: "مفاعیلن",
    difficulty: 1,
  },
  {
    id: "q2",
    promptText: "دِلِ ما",
    correctPattern: "مفاعیلن",
    wrongPattern: "فاعلاتن",
    difficulty: 1,
  },
];

/** یک دور را تا لحظهٔ بازشدنِ پنجرهٔ پاسخ جلو می‌برد. */
function openAnswerWindow(at: number): MachineState {
  let s = initialMachineState(config, defaultScoring);
  s = reduce(s, { type: "start", steps: prepareSteps(QUESTIONS), config });
  s = reduce(s, { type: "countdownDone" });
  s = reduce(s, { type: "questionShown", now: at - 100 });
  s = reduce(s, { type: "answerWindowOpen", now: at });
  assert.equal(s.state, "waitingForAnswer");
  assert.equal(s.answerOpenedAt, at);
  return s;
}

/** پاسخِ درست در `thinkMs` پس از بازشدنِ پنجره؛ نمرهٔ به‌دست‌آمده را می‌دهد. */
function scoreFor(thinkMs: number): number {
  const opened = 10_000;
  let s = openAnswerWindow(opened);
  const correct = s.steps[0]!.correctSide;
  s = reduce(s, { type: "answer", side: correct, now: opened + thinkMs });
  assert.equal(s.state, "jumping");
  // پرش و فرود زمان می‌برند — همان زمانی که قبلاً به پای بازیکن نوشته می‌شد.
  s = reduce(s, { type: "landed" });
  s = reduce(s, { type: "resolve" });
  assert.equal(s.state, "correct");
  return s.score;
}

test("لحظهٔ انتخاب ثبت می‌شود، نه لحظهٔ پایانِ پرش", () => {
  const opened = 10_000;
  let s = openAnswerWindow(opened);
  s = reduce(s, { type: "answer", side: s.steps[0]!.correctSide, now: opened + 400 });
  assert.equal(s.answeredAt, opened + 400);
});

test("پاسخِ آنی بیشترین پاداشِ سرعت را می‌گیرد", () => {
  /* base=۱۰۰، maxSpeedBonus=۶۰، streak=۱ → ضریب ۱٫۱ (streakStep=۰٫۱).
     پاسخ در صفر ثانیه: (۱۰۰ + ۶۰×۱) × ۱٫۱ = ۱۷۶ */
  assert.equal(scoreFor(0), 176);
});

/* ⚠️ همین تست باگ را می‌گرفت.

   پیش از اصلاح، `elapsed` در `resolve` سنجیده می‌شد و مدتِ پرش (۶۵۰ms) را
   هم در خود داشت. یعنی پاسخِ آنی هم انگار ۶۵۰ms طول کشیده بود:
       remaining = ۱ − ۶۵۰/۲۵۰۰ = ۰٫۷۴  →  (۱۰۰ + ۶۰×۰٫۷۴) × ۱٫۱ ≈ ۱۵۹
   یعنی ۱۷ نمره کمتر، و سقفِ پاداش اصلاً دست‌یافتنی نبود. */
test("مدتِ پرش از پاداشِ سرعت کم نمی‌شود", () => {
  const instant = scoreFor(0);
  const max = Math.round((defaultScoring.base + defaultScoring.maxSpeedBonus) * 1.1);
  assert.equal(instant, max, "پاسخِ آنی باید به سقفِ پاداش برسد");
});

test("هر چه دیرتر، پاداشِ کمتر — و ترتیب حفظ می‌شود", () => {
  const scores = [0, 500, 1000, 1800, 2400].map(scoreFor);
  for (let i = 1; i < scores.length; i++) {
    assert.ok(
      scores[i]! < scores[i - 1]!,
      `پاسخِ دیرتر نباید نمرهٔ بیشتر بگیرد (${scores[i - 1]} → ${scores[i]})`,
    );
  }
});

/* ⚠️ این هم پیش از اصلاح شکست می‌خورد.

   با فرصتِ ۲۵۰۰ms و پرشِ ۶۵۰ms، هر پاسخی که بعد از ۱۸۵۰ms می‌آمد
   `elapsed ≥ answerTime` می‌داد و `remaining` صفر می‌شد — یعنی بازیکنی که
   ۶۵۰ میلی‌ثانیه وقت داشت، از نظرِ نمره با کسی که اصلاً پاسخ نداده بود فرقی
   نمی‌کرد. */
test("پاسخ در واپسین لحظه هنوز کمی پاداشِ سرعت دارد", () => {
  const late = scoreFor(1900);
  const floor = Math.round(defaultScoring.base * 1.1);
  assert.ok(
    late > floor,
    `پاسخ در ۱۹۰۰ms (با ۶۰۰ms فرصتِ باقی‌مانده) باید بیش از کفِ ${floor} بگیرد، ولی ${late} گرفت`,
  );
});

test("پاسخِ درست از پرسشِ بعد جدا حساب می‌شود و زمان‌ها نشت نمی‌کنند", () => {
  const opened = 10_000;
  let s = openAnswerWindow(opened);
  s = reduce(s, { type: "answer", side: s.steps[0]!.correctSide, now: opened + 300 });
  s = reduce(s, { type: "landed" });
  s = reduce(s, { type: "resolve" });
  /* `advance` وسطِ بازی مستقیم پنجرهٔ پاسخ را باز می‌کند و از
     `preparing`/`showingQuestion` نمی‌گذرد — پس پاک‌سازی باید همین‌جا هم
     انجام شود، نه فقط در آن مسیر. */
  s = reduce(s, { type: "advance", now: opened + 3000 });
  assert.equal(s.state, "waitingForAnswer");
  assert.equal(s.stepIndex, 1);
  assert.equal(s.answerOpenedAt, opened + 3000);
  assert.equal(s.answeredAt, null, "لحظهٔ انتخابِ پرسشِ قبلی نباید باقی بماند");
});
