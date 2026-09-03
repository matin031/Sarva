import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pickTier, downgrade, shouldDowngrade, TIERS } from "@/lib/perf/quality";

/**
 * انتخابِ سطحِ کیفیت.
 *
 * ⚠️ تا دیروز تنها معیار `(pointer: coarse)` بود — یعنی «انگشت یا موس؟» که
 * دربارهٔ توانِ دستگاه چیزی نمی‌گوید. یک لپ‌تاپِ دوهسته‌ای با موس کاملِ بار
 * را می‌گرفت. این تست‌ها همان اشتباه را قفل می‌کنند.
 */
describe("سطحِ کیفیت", () => {
  test("دستگاهِ قوی سطحِ کامل می‌گیرد", () => {
    assert.equal(pickTier({ cores: 12, memoryGb: 16, dpr: 1, viewportPixels: 1440 * 900 }), "high");
  });

  test("لپ‌تاپِ ضعیف با موس دیگر «دسکتاپ» حساب نمی‌شود", () => {
    // همان موردی که معیارِ قبلی از دست می‌داد: اشاره‌گرِ دقیق، ولی دو هسته.
    const tier = pickTier({ cores: 2, memoryGb: 2, coarsePointer: false, dpr: 1 });
    assert.equal(tier, "low");
  });

  test("تبلتِ قوی بی‌دلیل تنزل نمی‌خورد", () => {
    // لمسی است، ولی هشت هسته و ۸ گیگ — معیارِ قبلی این را هم اشتباه می‌گرفت.
    assert.notEqual(pickTier({ cores: 8, memoryGb: 8, coarsePointer: true, dpr: 2 }), "low");
  });

  test("خواستهٔ کاربر بر همه‌چیز مقدم است", () => {
    assert.equal(pickTier({ reducedMotion: true, cores: 32, memoryGb: 64 }), "low");
  });

  test("saveData یعنی پایین‌ترین سطح", () => {
    assert.equal(pickTier({ saveData: true, cores: 16 }), "low");
  });

  test("نبودِ سیگنال باعثِ تنزل نمی‌شود", () => {
    // مرورگری که deviceMemory و hardwareConcurrency ندارد (سافاری) نباید
    // فقط به‌خاطرِ سکوتش جریمه شود.
    assert.equal(pickTier({}), "high");
  });

  test("چند سیگنالِ متوسط روی هم جمع می‌شوند", () => {
    // هیچ‌کدام به‌تنهایی فاجعه نیست، ولی با هم یعنی دستگاهِ متوسط.
    assert.equal(pickTier({ cores: 4, memoryGb: 4, coarsePointer: true }), "low");
    assert.equal(pickTier({ cores: 4 }), "balanced");
  });

  test("DPR بالا و صفحهٔ بزرگ هرکدام یک نشانه‌اند", () => {
    assert.equal(pickTier({ cores: 8, memoryGb: 8, dpr: 3 }), "balanced");
  });

  test("هر سطح تنظیماتِ سبک‌تری از سطحِ بالاتر دارد", () => {
    assert.ok(TIERS.high.dust > TIERS.balanced.dust);
    assert.ok(TIERS.balanced.dust > TIERS.low.dust);
    assert.ok(TIERS.high.fps >= TIERS.balanced.fps);
    assert.ok(TIERS.balanced.fps >= TIERS.low.fps);
    assert.equal(TIERS.low.spotlight, false);
    assert.equal(TIERS.low.ambient, false);
    assert.equal(TIERS.low.blur, false);
  });

  test("تنزل هرگز از low پایین‌تر نمی‌رود", () => {
    assert.equal(downgrade("high"), "balanced");
    assert.equal(downgrade("balanced"), "low");
    assert.equal(downgrade("low"), "low");
  });
});

describe("تطبیق با فریم‌های واقعی", () => {
  test("نمونهٔ کم تصمیم نمی‌سازد", () => {
    assert.equal(shouldDowngrade([100, 100, 100], 30), false);
  });

  test("فریم‌های سالم تنزل نمی‌دهند", () => {
    const ok = Array.from({ length: 24 }, () => 33);
    assert.equal(shouldDowngrade(ok, 30), false);
  });

  test("فریم‌های واقعاً کند تنزل می‌دهند", () => {
    const slow = Array.from({ length: 24 }, () => 90); // بودجه ۳۳ms
    assert.equal(shouldDowngrade(slow, 30), true);
  });

  test("چند فریمِ پرت تصمیم را عوض نمی‌کنند", () => {
    // میانه استفاده می‌شود نه میانگین: سه فریمِ ۵۰۰ms اولِ کار (کامپایل،
    // فونت، رمزگشایی) نباید کلِ صفحه را تنزل بدهد.
    const mostlyFine = [...Array.from({ length: 21 }, () => 33), 500, 500, 500];
    assert.equal(shouldDowngrade(mostlyFine, 30), false);
  });
});
