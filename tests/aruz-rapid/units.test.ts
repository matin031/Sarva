import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatUnitSpec,
  parseUnitSpec,
  unitPattern,
  withRevealProgress,
} from "@/lib/aruz-rapid/units";
import { validateRapidAruzQuestion } from "@/lib/aruz-rapid/validator";

/**
 * قالبِ فشردهٔ هجاها در «کوتاه یا بلند؟».
 *
 * ⚠️ این قالب هم در فرمِ تکی و هم در افزودنِ انبوه و هم در پیش‌نمایشِ زندهٔ
 * پنل خوانده می‌شود. اگر تجزیه‌گر و قالب‌ساز با هم نخوانند، مدیر چیزی را
 * می‌بیند که ذخیره نمی‌شود — و هیچ‌جا خطایی هم نمی‌گیرد.
 */

describe("قالبِ هجاهای تقطیع", () => {
  test("متن و نمادِ هر هجا را می‌خواند", () => {
    const result = parseUnitSpec("تَ=U وا=- نا=-");
    assert.ok(result.ok);
    assert.deepEqual(result.units, [
      { display: "تَ", length: "short" },
      { display: "وا", length: "long" },
      { display: "نا", length: "long" },
    ]);
  });

  test("نمادهای جایگزین هم پذیرفته می‌شوند", () => {
    // u/v برای کوتاه، و کشیدهٔ فارسی و زیرخط برای بلند — چیزهایی که واقعاً
    // روی صفحه‌کلید فارسی تایپ می‌شوند.
    const result = parseUnitSpec("تَ:u وا=ـ نا=_ بُ=v");
    assert.ok(result.ok);
    assert.equal(unitPattern(result.units), "U--U");
  });

  test("نمادِ ناشناخته و هجای بی‌متن رد می‌شوند", () => {
    for (const bad of ["تَ=X وا=-", "=U وا=-", "تَ وا=-", "   "]) {
      assert.equal(parseUnitSpec(bad).ok, false, `«${bad}» باید رد می‌شد`);
    }
  });

  test("قالب‌ساز و تجزیه‌گر رفت‌وبرگشتِ بی‌تغییر دارند", () => {
    const spec = "بِشْ=- نَ=U وَز=- نِی=-";
    const parsed = parseUnitSpec(spec);
    assert.ok(parsed.ok);
    assert.equal(formatUnitSpec(parsed.units), spec);
  });

  test("revealProgress صعودی است و دقیقاً به ۱ می‌رسد", () => {
    const parsed = parseUnitSpec("تَ=U وا=- نا=- بُ=U وَد=-");
    assert.ok(parsed.ok);
    const units = withRevealProgress(parsed.units, "q1");

    assert.equal(units.length, 5);
    assert.equal(units[units.length - 1].revealProgress, 1);

    let previous = 0;
    for (const u of units) {
      const value = u.revealProgress as number;
      assert.ok(value >= previous, `${previous} → ${value} نزولی است`);
      assert.ok(value > 0 && value <= 1);
      previous = value;
    }
  });

  test("شناسهٔ هجاها یکتاست", () => {
    const parsed = parseUnitSpec("نا=- نا=- نا=-");
    assert.ok(parsed.ok);
    const ids = withRevealProgress(parsed.units, "q1").map((u) => u.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  /* پلِ بینِ این ماژول و اعتبارسنجِ خودِ بازی: چیزی که از قالب بیرون می‌آید
     باید بی‌دستکاری از اعتبارسنج رد شود، وگرنه مصراعِ ذخیره‌شده در بازی
     بی‌صدا کنار گذاشته می‌شود. */
  test("خروجی مستقیماً از اعتبارسنجِ بازی رد می‌شود", () => {
    const parsed = parseUnitSpec("تَ=U وا=- نا=- بُ=U وَد=-");
    assert.ok(parsed.ok);

    const result = validateRapidAruzQuestion({
      id: "q1",
      type: "hemistich",
      previewText: "تَوانا بُوَد",
      units: withRevealProgress(parsed.units, "q1"),
      hasUnitTextOverlap: true,
    });

    assert.equal(result.ok, true, result.issues.map((i) => i.message).join(" | "));
  });
});
