import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveJasoosAnswer } from "@/lib/jasoos-answer";
import { JASOOS_LEVELS } from "@/lib/jasoos-data";
import type { JasoosLevel } from "@/lib/jasoos-data";

/**
 * ثبتِ پاسخ در بازی جاسوس.
 *
 * ⚠️ این تست‌ها یک آسیب‌پذیریِ واقعی را نگه می‌دارند که بسته شد:
 *
 * `/api/v1/jasoos/answer` هم `chosenRole` و هم `correctRole` را از کلاینت
 * می‌گرفت و `is_correct` را از مقایسهٔ همان دو حساب می‌کرد. هر دو طرفِ
 * مقایسه دستِ پاسخ‌دهنده بود، پس یک درخواست با `chosenRole = correctRole`
 * همیشه «درست» ثبت می‌شد. دسته و بیت هم متنِ آزاد بودند.
 */

const level: JasoosLevel = {
  id: 1,
  title: "درِ آزمایشی",
  category: "دستوری",
  contentType: "poem",
  verseLines: ["مصراع نخست", "مصراع دوم"],
  suspects: [
    { role: "صفت", isSpy: true, evidence: "شاهد", wordInVerse: "" },
    { role: "مفعول", isSpy: false, evidence: "شاهد", wordInVerse: "الف" },
    { role: "متمم", isSpy: false, evidence: "شاهد", wordInVerse: "ب" },
    { role: "قید", isSpy: false, evidence: "شاهد", wordInVerse: "ج" },
  ],
} as JasoosLevel;

const levels = [level];

describe("ثبتِ پاسخ جاسوس", () => {
  test("نقشِ درست از خودِ پرونده می‌آید، نه از ورودی", () => {
    const r = resolveJasoosAnswer(levels, 1, "مفعول");
    assert.ok(r.ok);
    assert.equal(r.row.correctRole, "صفت"); // جاسوسِ واقعی
    assert.equal(r.row.isCorrect, false);
  });

  test("جعلِ کلاسیک: زدنِ بی‌گناه نمی‌تواند «درست» ثبت شود", () => {
    // مهاجم قبلاً `correctRole: "مفعول"` می‌فرستاد تا با انتخابش یکی شود.
    // حالا correctRole اصلاً ورودی نیست.
    const r = resolveJasoosAnswer(levels, 1, "مفعول");
    assert.ok(r.ok);
    assert.equal(r.row.isCorrect, false);
  });

  test("زدنِ جاسوسِ واقعی «درست» ثبت می‌شود", () => {
    const r = resolveJasoosAnswer(levels, 1, "صفت");
    assert.ok(r.ok);
    assert.equal(r.row.isCorrect, true);
  });

  test("بیت و دسته از پرونده می‌آیند، نه از کلاینت", () => {
    const r = resolveJasoosAnswer(levels, 1, "صفت");
    assert.ok(r.ok);
    assert.equal(r.row.category, "دستوری");
    assert.equal(r.row.verseLine1, "مصراع نخست");
    assert.equal(r.row.verseLine2, "مصراع دوم");
  });

  test("نقشی که در این پرونده نیست رد می‌شود", () => {
    const r = resolveJasoosAnswer(levels, 1, "نهاد");
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "role_not_in_level");
  });

  test("پروندهٔ ناموجود رد می‌شود", () => {
    const r = resolveJasoosAnswer(levels, 99999, "صفت");
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "unknown_level");
  });

  test("پروندهٔ بی‌جاسوس رد می‌شود، نه اینکه بی‌صدا ثبت شود", () => {
    const broken = {
      ...level,
      suspects: level.suspects.map((s) => ({ ...s, isSpy: false })),
    } as JasoosLevel;
    const r = resolveJasoosAnswer([broken], 1, "صفت");
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "broken_level");
  });

  test("هر پروندهٔ واقعی دقیقاً یک جاسوس دارد", () => {
    for (const l of JASOOS_LEVELS) {
      const spies = l.suspects.filter((s) => s.isSpy).length;
      assert.equal(spies, 1, `پروندهٔ ${l.id} — ${spies} جاسوس`);
    }
  });

  test("روی هر پروندهٔ واقعی، فقط زدنِ جاسوس «درست» است", () => {
    for (const l of JASOOS_LEVELS) {
      for (const s of l.suspects) {
        const r = resolveJasoosAnswer(JASOOS_LEVELS, l.id, s.role);
        assert.ok(r.ok, `پروندهٔ ${l.id} نقش ${s.role} رد شد`);
        assert.equal(
          r.row.isCorrect,
          s.isSpy,
          `پروندهٔ ${l.id}: «${s.role}» باید ${s.isSpy ? "درست" : "نادرست"} باشد`,
        );
      }
    }
  });
});
