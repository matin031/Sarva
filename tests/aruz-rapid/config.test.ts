import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RAPID_ARUZ_CONFIG, getUnitDuration } from "../../lib/aruz-rapid/config";

test("مدتِ هر واحد فقط از یک جا می‌آید", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  assert.equal(getUnitDuration(c, 1, 1), 3000);
  assert.equal(getUnitDuration(c, 2, 1), 2500);
  assert.equal(getUnitDuration(c, 3, 1), 1750);
});

test("واحدِ اولِ هر دور وقتِ بیشتری می‌گیرد", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  assert.equal(getUnitDuration(c, 1, 0), 3000 + c.firstUnitExtraTimeMs);
  assert.equal(getUnitDuration(c, 3, 0), 1750 + c.firstUnitExtraTimeMs);
});

test("سختیِ نامعلوم به آسان‌ترین حالت برمی‌گردد", () => {
  assert.equal(getUnitDuration(DEFAULT_RAPID_ARUZ_CONFIG, undefined, 1), 3000);
});

test("پیکربندی عمداً correctFeedbackMs ندارد", () => {
  // اگر روزی کسی چنین چیزی اضافه کرد، یعنی دارد بینِ دو واحدِ درست تأخیر
  // می‌گذارد — و همان چیزی است که این بازی نباید داشته باشد.
  assert.equal("correctFeedbackMs" in DEFAULT_RAPID_ARUZ_CONFIG, false);
});

test("پیش‌فرض‌ها همان چیزی‌اند که طراحی می‌گوید", () => {
  const c = DEFAULT_RAPID_ARUZ_CONFIG;
  assert.equal(c.previewDurationMs, 4000);
  assert.equal(c.firstUnitExtraTimeMs, 500);
  assert.equal(c.replayPreviewOnReset, false, "بعد از شکست، پیش‌نمایش دوباره پخش نمی‌شود");
  assert.equal(c.resetRevealOnMistake, true);
  assert.equal(c.pauseOnVisibilityLoss, true);
  assert.equal(c.audioSourceMode, "procedural", "تا وقتی فایلِ صوتی نداریم، هیچ ۴۰۴ ای نباید بخورد");
  assert.equal(c.shortSymbol, "U");
  assert.equal(c.longSymbol, "_");
  assert.ok(c.completionRevealMs >= 650 && c.completionRevealMs <= 900);
  assert.ok(c.resumeOverlayMs >= 500 && c.resumeOverlayMs <= 900);
});
