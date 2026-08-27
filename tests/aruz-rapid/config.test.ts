import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RAPID_ARUZ_CONFIG, getUnitDuration } from "../../lib/aruz-rapid/config";

test("مدتِ هر واحد فقط از یک جا می‌آید", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  assert.equal(getUnitDuration(c, 1), 2800);
  assert.equal(getUnitDuration(c, 5), 2800);
});

test("واحدِ اولِ هر دور وقتِ بیشتری می‌گیرد", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  assert.equal(getUnitDuration(c, 0), 2800 + 1200);
  assert.equal(getUnitDuration(c, 0) - getUnitDuration(c, 1), c.firstUnitExtraTimeMs);
});

test("پیکربندی عمداً correctFeedbackMs ندارد", () => {
  // اگر روزی کسی چنین چیزی اضافه کرد، یعنی دارد بینِ دو واحدِ درست تأخیر
  // می‌گذارد — و همان چیزی است که این بازی نباید داشته باشد.
  assert.equal("correctFeedbackMs" in DEFAULT_RAPID_ARUZ_CONFIG, false);
});

test("دیگر زمان‌بندیِ درجه‌بندی‌شده وجود ندارد", () => {
  // محصول فقط حالتِ مصراع دارد؛ یک مدلِ زمانیِ منصف، نه سه سطحِ تند و کند.
  assert.equal("answerTimeByDifficulty" in DEFAULT_RAPID_ARUZ_CONFIG, false);
});

test("پیش‌فرض‌ها همان چیزی‌اند که طراحی می‌گوید", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  assert.equal(c.previewDurationMs, 7000, "خواندنِ یک مصراعِ اعراب‌دار وقت می‌خواهد");
  assert.equal(c.answerTimeMs, 2800);
  assert.equal(c.firstUnitExtraTimeMs, 1200);
  assert.equal(c.wrongFeedbackMs, 260);
  assert.equal(c.timeoutFeedbackMs, 260);
  assert.equal(c.resetDelayMs, 80);
  assert.equal(c.completionRevealMs, 850);
  assert.equal(c.resumeOverlayMs, 650);
  assert.equal(c.replayPreviewOnReset, false, "بعد از شکست، پیش‌نمایش دوباره پخش نمی‌شود");
  assert.equal(c.resetRevealOnMistake, true);
  assert.equal(c.pauseOnVisibilityLoss, true);
  assert.equal(c.audioSourceMode, "procedural", "تا وقتی فایلِ صوتی نداریم، هیچ ۴۰۴ ای نباید بخورد");
  assert.equal(c.shortSymbol, "U");
  assert.equal(c.longSymbol, "_");
});
