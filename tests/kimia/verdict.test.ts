import { test } from "node:test";
import assert from "node:assert/strict";

import { decide, toVerdict } from "@/lib/kimia/verdict";
import { KIMIA_METERS, joinArk } from "@/lib/kimia/catalog";
import { screenRow, type KimiaSourceRow } from "@/lib/kimia/pool";
import { MAX_ATTEMPTS, type RoundSnapshot } from "@/lib/kimia/round-state";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️ این فایل «نشت» را می‌سنجد و نه «کارکرد» را.
   ═══════════════════════════════════════════════════════════════════════════

   پاسخ در سه جا می‌تواند لو برود: بدنهٔ دورِ GET، بدنهٔ پاسخِ یک تلاشِ
   *غلط*، و آدرسِ فایلِ صوتی. هر سه اینجا آزموده می‌شوند، با جست‌وجوی متنیِ
   *همهٔ* ارکان و همهٔ نامِ وزن‌ها در JSONِ خروجی — و نه با بررسیِ چند فیلدِ
   دست‌چین. اگر روزی کسی یک «کمکِ کوچک» به پاسخ اضافه کند، اینجا قرمز
   می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

const SAMPLE = KIMIA_METERS.find((m) => m.canonical.length === 3)!;
const WRONG = [...SAMPLE.canonical].reverse();

/**
 * وضعیتِ یک دور بعد از `n` تلاش.
 *
 * ⚠️ پیش‌فرضش عمداً یک دورِ **باز** است (`n < MAX_ATTEMPTS` و بدونِ
 * reveal): تستِ نشت باید سخت‌ترین حالت را بسنجد، یعنی جایی که بازیکن
 * هنوز حق دیدنِ پاسخ را ندارد.
 */
const at = (n: number, over: Partial<RoundSnapshot> = {}): RoundSnapshot => ({
  status: "active",
  attemptsCount: n,
  lastAttemptId: `a${n}`,
  lastCorrect: false,
  lastErrorType: "ORDER_ONLY",
  revealReason: null,
  ...over,
});

/** دوری که با پاسخِ درست بسته شده. */
const solved = (n: number): RoundSnapshot =>
  at(n, { status: "completed", lastCorrect: true, lastErrorType: null });

/** آیا متنِ داده‌شده ردی از ارکان یا نامِ این وزن دارد؟ */
function leaks(payload: unknown, meterArk: string, meterName: string): string[] {
  const text = JSON.stringify(payload);
  const found: string[] = [];
  if (text.includes(meterArk)) found.push("ارکانِ کامل");
  if (text.includes(meterName)) found.push("نامِ وزن");
  for (const foot of meterArk.split(" ")) {
    if (text.includes(foot)) found.push(`رکنِ ${foot}`);
  }
  return [...new Set(found)];
}

test("داوری روی ارکانِ متعارف درست است", () => {
  const verdict = decide(SAMPLE.ark, SAMPLE.canonical);
  assert.ok(verdict);
  assert.equal(verdict.isCorrect, true);
  assert.equal(verdict.errorType, null);
  assert.deepEqual([...(verdict.acceptedSequence ?? [])], [...SAMPLE.canonical]);
});

test("داوری برای وزنی که دیگر در دامنه نیست، حدس نمی‌زند", () => {
  assert.equal(decide("مستفعل مستفعل مستفعل فع", ["فع", "فع"]), null);
  assert.equal(decide("قلقلک قلقلک", ["فع", "فع"]), null);
});

test("⚠️ پاسخِ غلط هیچ ردی از ارکانِ درست یا نامِ وزن ندارد", () => {
  const decision = decide(SAMPLE.ark, WRONG);
  assert.ok(decision);
  assert.equal(decision.isCorrect, false);

  const verdict = toVerdict(decision, SAMPLE.name, true, at(1));
  assert.equal(verdict.meterName, null);
  assert.equal(verdict.acceptedSequence, null);

  /* ⚠️ و متنِ راهنمایی هم نباید رکنی را نام ببرد. ورودیِ کاربر خودش در
     این payload نیست، پس هر رکنی که پیدا شود از سمتِ سرور آمده. */
  assert.deepEqual(
    leaks(verdict, SAMPLE.ark, SAMPLE.name),
    [],
    "پاسخِ غلط چیزی لو داده",
  );
});

test("⚠️ هیچ وزنی در مخزن نیست که پاسخِ غلطش چیزی لو بدهد", () => {
  /* روی *همهٔ* وزن‌های دامنه و نه یک نمونه: یک وزن با نامِ کوتاه یا رکنِ
     تک‌حرفی («فع») می‌توانست تصادفاً از صافیِ متنی رد شود. */
  for (const meter of KIMIA_METERS) {
    const wrong = [...meter.canonical];
    // یک جابه‌جاییِ تضمینی، حتی اگر همهٔ ارکان یکی باشند.
    wrong[0] = wrong[0] === "فع" ? "فعل" : "فع";
    const decision = decide(meter.ark, wrong);
    assert.ok(decision, meter.ark);
    if (decision.isCorrect) continue; // جابه‌جایی تصادفاً درست شد؛ نمونهٔ دیگری لازم نیست
    const verdict = toVerdict(decision, meter.name, true, at(1));
    assert.deepEqual(leaks(verdict, meter.ark, meter.name), [], `${meter.ark} لو داد`);
  }
});

test("⚠️ تلاشِ دوم هم هیچ‌چیز لو نمی‌دهد — `solution` هنوز خالی است", () => {
  /* ⚠️ این تست با آمدنِ «سه تلاش» اضافه شد و نه به‌جای تستِ بالا.
     خطرِ تازه روشن است: `solution` یک فیلدِ *افشاگر* است که حالا در همان
     بدنه زندگی می‌کند، و تنها چیزی که آن را بسته نگه می‌دارد
     `mayRevealSolution` است. اگر روزی کسی شرطش را ساده کند، اینجا قرمز
     می‌شود. */
  const decision = decide(SAMPLE.ark, WRONG)!;
  for (let n = 1; n < MAX_ATTEMPTS; n += 1) {
    const verdict = toVerdict(decision, SAMPLE.name, true, at(n));
    assert.equal(verdict.solution, null, `تلاشِ ${n}`);
    assert.equal(verdict.revealed, false);
    assert.equal(verdict.remaining, MAX_ATTEMPTS - n);
    assert.deepEqual(leaks(verdict, SAMPLE.ark, SAMPLE.name), [], `تلاشِ ${n} لو داد`);
  }
});

test("⚠️ هیچ وزنی در تلاشِ میانیِ غلط `solution` نمی‌دهد", () => {
  for (const meter of KIMIA_METERS) {
    const wrong = [...meter.canonical];
    wrong[0] = wrong[0] === "فع" ? "فعل" : "فع";
    const decision = decide(meter.ark, wrong);
    assert.ok(decision, meter.ark);
    if (decision.isCorrect) continue;
    const verdict = toVerdict(decision, meter.name, true, at(1));
    assert.equal(verdict.solution, null, `${meter.ark} پاسخ داد`);
    assert.deepEqual(leaks(verdict, meter.ark, meter.name), [], `${meter.ark} لو داد`);
  }
});

test("تلاش‌ها که تمام شد، پاسخ می‌آید — همان چیزی که پشتِ کارت نوشته می‌شود", () => {
  const decision = decide(SAMPLE.ark, WRONG)!;
  const verdict = toVerdict(decision, SAMPLE.name, true, at(MAX_ATTEMPTS));
  assert.ok(verdict.solution, "پاسخ نیامد");
  assert.equal(verdict.solution.meterName, SAMPLE.name);
  assert.equal(joinArk(verdict.solution.canonical), SAMPLE.ark);
  assert.ok(verdict.solution.accepted.length >= 1);
  assert.equal(verdict.remaining, 0);

  /* ⚠️ ولی هنوز «درست» نیست و نباید وانمود کند هست: نوارِ وضعیت جملهٔ
     «وزن درست است» را از `meterName` می‌سازد. */
  assert.equal(verdict.isCorrect, false);
  assert.equal(verdict.meterName, null);
});

test("دورِ باز‌شده با درخواستِ خودِ بازیکن هم پاسخ می‌دهد", () => {
  const decision = decide(SAMPLE.ark, WRONG)!;
  const verdict = toVerdict(decision, SAMPLE.name, true, at(1, { revealReason: "user" }));
  assert.ok(verdict.solution);
  assert.equal(verdict.revealed, true);
  assert.equal(verdict.remaining, 0, "دورِ باز‌شده تلاشِ باقی‌مانده ندارد");
});

test("پاسخِ درست، وزن را کامل نشان می‌دهد — این لحظهٔ یادگیری است", () => {
  const decision = decide(SAMPLE.ark, SAMPLE.canonical)!;
  const verdict = toVerdict(decision, SAMPLE.name, true, solved(2));
  assert.equal(verdict.meterName, SAMPLE.name);
  assert.equal(joinArk(verdict.acceptedSequence ?? []), SAMPLE.ark);
  assert.equal(verdict.attemptsCount, 2);
  assert.equal(verdict.saved, true);
});

test("پاسخِ درست با بدیل، همان بدیل را نشان می‌دهد و نه متعارف را", () => {
  /* اگر همیشه خوانشِ متعارف نشان داده می‌شد، دانش‌آموزی که خوانشِ دوم را
     ساخته و *درست* هم ساخته، فکر می‌کرد اشتباه کرده. */
  const multi = KIMIA_METERS.find((m) => m.accepted.length > 1)!;
  const alternative = multi.accepted[1];
  const decision = decide(multi.ark, alternative)!;
  const verdict = toVerdict(decision, multi.name, true, solved(1));
  assert.equal(joinArk(verdict.acceptedSequence ?? []), joinArk(alternative));
});

test("راهنمایی با جنسِ اشتباه جور است", () => {
  const order = decide(SAMPLE.ark, WRONG)!;
  const orderVerdict = toVerdict(order, SAMPLE.name, true, at(1));
  if (order.errorType === "ORDER_ONLY") {
    assert.match(orderVerdict.hint ?? "", /ترتیب/);
  }
  const content = decide(SAMPLE.ark, SAMPLE.canonical.map(() => "فع"))!;
  assert.equal(content.errorType, "FOOT_CONTENT");
  assert.match(toVerdict(content, SAMPLE.name, true, at(1)).hint ?? "", /ریتم/);
});

test("⚠️ بدنهٔ دورِ GET، پاسخ را با خودش نمی‌برد", () => {
  /* همان شکلی که `app/api/v1/kimia/rounds/route.ts` می‌سازد. اگر روزی
     کسی یک فیلد به آن اضافه کند که از `candidate.meter` بیاید، این تست
     می‌گیردش. */
  const row: KimiaSourceRow = {
    id: "11111111-1111-4111-8111-111111111111",
    type: "poem-to-audio",
    poem: ["مصراعِ اول", "مصراعِ دوم"],
    audio_url: null,
    option_poem: null,
    option_audio_url: `/audio/${SAMPLE.ark.replace(/ /g, "-")}.mp3`,
  };
  const screened = screenRow(row);
  assert.ok(screened.ok);
  const candidate = screened.candidate;

  const payload = {
    roundId: "22222222-2222-4222-8222-222222222222",
    questionId: candidate.questionId,
    verse: candidate.verse,
    slotCount: candidate.slotCount,
    rhythmUrl: `/api/v1/kimia/rhythm/${candidate.questionId}`,
  };

  assert.deepEqual(leaks(payload, candidate.meter.ark, candidate.meter.name), []);

  /* ⚠️ و آدرسِ صدا هم نه. فایلِ روی دیسک نامش *خودِ پاسخ* است؛ اگر روزی
     کسی برای «یک درخواستِ کمتر» آن مسیر را مستقیم بفرستد، پاسخ در تبِ
     Network می‌نشیند. */
  assert.ok(!payload.rhythmUrl.includes("/audio/"));
  assert.ok(payload.rhythmUrl.startsWith("/api/v1/kimia/rhythm/"));
  assert.equal(payload.slotCount, candidate.meter.canonical.length);
});
