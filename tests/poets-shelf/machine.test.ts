import test from "node:test";
import assert from "node:assert/strict";
import { defaultPoetsShelfConfig } from "../../lib/poets-shelf/config";
import {
  acceptsInput,
  initialMachineState,
  reduce,
  roundInProgress,
  type MachineAction,
  type MachineState,
} from "../../lib/poets-shelf/machine";
import { buildRound, type Round } from "../../lib/poets-shelf/questions";

/* ═══════════════════════════════════════════════════════════════════════════
   ماشینِ حالتِ قفسهٔ شاعران.
   ═══════════════════════════════════════════════════════════════════════════

   مهم‌ترین ادعای این بازی «کلیکِ سریع نباید حالت را بشکند» است. آن ادعا در
   مرورگر سخت آزموده می‌شود ولی اینجا آسان: ماشین خالص است، پس می‌شود هر
   رویدادِ نامربوط را در هر حالت فرستاد و دید که هیچ‌کدام نمی‌چسبند.
   ═══════════════════════════════════════════════════════════════════════════ */

/** مولدِ قطعی، تا هر اجرا همان دور را بسازد. */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function round(seed = 7): Round {
  return buildRound({ optionCount: 5, rng: seededRng(seed) });
}

/** ماشین را تا حالتِ خواسته‌شده جلو می‌برد. */
function advanceTo(state: MachineState["state"], correct: boolean): MachineState {
  let m = reduce(initialMachineState(defaultPoetsShelfConfig), { type: "start", round: round() });
  if (state === "ready") return m;

  const index = m.round!.options.findIndex((o) => o.correct === correct);
  m = reduce(m, { type: "select", index });
  if (state === "moving") return m;

  m = reduce(m, { type: "arrive" });
  if (state === "arrived") return m;

  m = reduce(m, { type: "resolve" });
  if (state === "resolving") return m;

  m = reduce(m, { type: "impact" });
  if (state === "success" || state === "failure") return m;

  m = reduce(m, { type: "recover" });
  return m;
}

test("تا پیش از شروع، هیچ ورودی‌ای پذیرفته نمی‌شود", () => {
  const m = initialMachineState(defaultPoetsShelfConfig);
  assert.equal(m.state, "intro");
  assert.equal(acceptsInput(m), false);
  assert.equal(roundInProgress(m), false);
  // انتخاب در حالتِ intro باید بی‌اثر باشد.
  assert.equal(reduce(m, { type: "select", index: 0 }), m);
});

test("فقط در حالتِ ready می‌شود کتاب انتخاب کرد", () => {
  const ready = advanceTo("ready", true);
  assert.equal(acceptsInput(ready), true);
  for (const state of ["moving", "arrived", "resolving", "success", "failure", "resetting"] as const) {
    const m = advanceTo(state, true);
    assert.equal(acceptsInput(m), false, `در حالتِ ${m.state} نباید ورودی پذیرفته شود`);
  }
});

test("کلیکِ سریعِ پشتِ‌هم روی چند کتاب، انتخاب را عوض نمی‌کند", () => {
  const ready = advanceTo("ready", true);

  /* بازیکن عصبی: پنج کلیکِ پیاپی در یک لحظه. */
  let m = reduce(ready, { type: "select", index: 0 });
  const firstChoice = m.chosen;
  const epochAfterFirst = m.epoch;

  for (const index of [1, 2, 3, 4, 0, 2]) {
    m = reduce(m, { type: "select", index });
  }

  assert.equal(m.chosen, firstChoice, "انتخاب باید همان اولی بماند");
  assert.equal(m.state, "moving", "حالت نباید عوض شود");
  assert.equal(m.epoch, epochAfterFirst, "هیچ گذاری نباید ثبت شده باشد");
});

test("انتخابِ خارج از محدوده رد می‌شود", () => {
  const ready = advanceTo("ready", true);
  assert.equal(reduce(ready, { type: "select", index: 99 }), ready);
  assert.equal(reduce(ready, { type: "select", index: -1 }), ready);
});

test("رویدادهای بی‌جا در هر حالت بی‌صدا نادیده گرفته می‌شوند", () => {
  const all: MachineAction[] = [
    { type: "select", index: 0 },
    { type: "arrive" },
    { type: "resolve" },
    { type: "impact" },
    { type: "recover" },
    { type: "next", round: round(11) },
  ];

  const states = ["ready", "moving", "arrived", "resolving", "success", "failure", "resetting"] as const;
  for (const state of states) {
    const base = advanceTo(state, true);
    for (const action of all) {
      const next = reduce(base, action);
      /* یا هیچ اتفاقی نیفتاده (همان شیء برگشته)، یا یک گذارِ *مجاز* رخ داده
         و در آن صورت epoch باید دقیقاً یکی جلو رفته باشد. هیچ حالتِ سومی
         نباید ممکن باشد. */
      if (next !== base) {
        assert.equal(next.epoch, base.epoch + 1, `گذارِ ${action.type} از ${base.state} باید epoch را یکی جلو ببرد`);
      }
    }
  }
});

test("مسیرِ پاسخِ درست: امتیاز و زنجیره درست جمع می‌شوند", () => {
  const m = advanceTo("success", true);
  assert.equal(m.state, "success");
  assert.equal(m.outcome, "correct");
  assert.equal(m.score, defaultPoetsShelfConfig.scoring.correct);
  assert.equal(m.streak, 1);
  assert.equal(m.correctCount, 1);
  assert.equal(m.answeredCount, 1);
});

test("مسیرِ پاسخِ نادرست: زنجیره صفر می‌شود و امتیاز جلو نمی‌رود", () => {
  const m = advanceTo("failure", false);
  assert.equal(m.state, "failure");
  assert.equal(m.outcome, "wrong");
  assert.equal(m.score, 0);
  assert.equal(m.streak, 0);
  assert.equal(m.correctCount, 0);
  assert.equal(m.answeredCount, 1);
});

test("پاداشِ زنجیره پلکانی است و نه ضربی", () => {
  const { correct, streakBonus } = defaultPoetsShelfConfig.scoring;
  let m = reduce(initialMachineState(defaultPoetsShelfConfig), { type: "start", round: round() });

  for (let i = 1; i <= 3; i++) {
    const index = m.round!.options.findIndex((o) => o.correct);
    m = reduce(m, { type: "select", index });
    m = reduce(m, { type: "arrive" });
    m = reduce(m, { type: "resolve" });
    m = reduce(m, { type: "impact" });
    assert.equal(m.streak, i);
    m = reduce(m, { type: "recover" });
    m = reduce(m, { type: "next", round: round(20 + i) });
  }

  // ۱۰۰ + (۱۰۰+۲۰) + (۱۰۰+۴۰)
  assert.equal(m.score, correct + (correct + streakBonus) + (correct + 2 * streakBonus));
  assert.equal(m.bestStreak, 3);
});

test("دورهای پیاپی حالتِ گذرا را با خود نمی‌برند", () => {
  let m = advanceTo("failure", false);
  m = reduce(m, { type: "recover" });
  m = reduce(m, { type: "next", round: round(31) });

  assert.equal(m.state, "ready");
  assert.equal(m.chosen, null, "انتخابِ دورِ قبل باید پاک شده باشد");
  assert.equal(m.outcome, null, "نتیجهٔ دورِ قبل باید پاک شده باشد");
  assert.equal(m.roundNumber, 2);
  assert.equal(acceptsInput(m), true, "ورودی باید دوباره باز شده باشد");
});

test("epoch در هر گذار دقیقاً یکی جلو می‌رود", () => {
  let m = reduce(initialMachineState(defaultPoetsShelfConfig), { type: "start", round: round() });
  const seen = [m.epoch];
  const index = m.round!.options.findIndex((o) => o.correct);
  for (const action of [
    { type: "select", index } as const,
    { type: "arrive" } as const,
    { type: "resolve" } as const,
    { type: "impact" } as const,
    { type: "recover" } as const,
  ]) {
    m = reduce(m, action);
    seen.push(m.epoch);
  }
  for (let i = 1; i < seen.length; i++) {
    assert.equal(seen[i], seen[i - 1] + 1, "هر گذار باید دقیقاً یک epoch جلو برود");
  }
});

test("شروعِ دوباره امتیاز را صفر می‌کند", () => {
  const played = advanceTo("success", true);
  const fresh = reduce(played, { type: "start", round: round(41) });
  assert.equal(fresh.score, 0);
  assert.equal(fresh.streak, 0);
  assert.equal(fresh.answeredCount, 0);
  assert.equal(fresh.roundNumber, 1);
  assert.equal(fresh.state, "ready");
});
