import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { matchesAny, normalizeFa } from "@/lib/exam/grading";
import { validateSeedExam } from "@/lib/exam/seed-data/seed-types";
import { lintSeedExam } from "@/lib/exam/seed-data/lint";
import { seedExams, findSeedExam } from "@/lib/exam/seed-data";
import { ul } from "@/lib/exam/seed-data/helpers";
import { splitUnderlined } from "@/lib/exam/underline";
import { nemooneFarsi } from "@/docs/exam-authoring/nemoone-farsi";
import { nemooneOlumFonoon } from "@/docs/exam-authoring/nemoone-olum-fonoon";

/**
 * دو چیز که یک برگهٔ تازه می‌تواند بی‌صدا خراب کند.
 *
 * ۱. **جمعِ بارم.** بخش‌ها باید با `sectionScore` و مجموعشان با `totalScore`
 *    بخواند، وگرنه دانش‌آموز آزمونی می‌دهد که از ۱۹٫۷۵ نمره دارد و کسی
 *    متوجه نمی‌شود. scripts/validate-exam-seeds.ts همین را دستی می‌سنجد؛
 *    اینجا در CI هم می‌سنجد.
 *
 * ۲. **نرمال‌سازیِ پاسخ.** کلیدِ پاسخ «به‌کارگیری» و «میرزادهٔ عشقی»
 *    می‌نویسد و دانش‌آموز «به کارگیری» و «میرزاده عشقی» تایپ می‌کند.
 *    نیم‌فاصله و همزهٔ روی «ه» دو پاسخِ یکسان را نادرست نشان می‌دادند.
 */
describe("seed papers", () => {
  for (const paper of seedExams) {
    test(`${paper.examSession}: schema + score checks`, () => {
      assert.deepEqual(validateSeedExam(paper), []);
    });
    test(`${paper.examSession}: ساختار و زیرخطِ واژه‌های مشخص‌شده`, () => {
      assert.deepEqual(lintSeedExam(paper).errors, []);
    });
  }

  test("examSession ها یکتا و همه پایهٔ دوازدهم‌اند", () => {
    const keys = seedExams.map((e) => e.examSession);
    assert.equal(new Set(keys).size, keys.length);
    for (const e of seedExams) assert.equal(e.grade, 12, e.examSession);
  });

  test("کلیدهای آزمون‌های قدیمی عوض نشده‌اند (آدرس و کارنامه به آن‌ها بسته است)", () => {
    for (const k of ["1403-kherdad", "1401-dey", "olum-fonoon-1405-mordad"]) assert.ok(findSeedExam(k), k);
  });

  test("ul() یک زیرخطِ پیوسته می‌سازد، حتی روی عبارتِ چندکلمه‌ای", () => {
    const runs = splitUnderlined(`پیش ${ul("دست محبّت")} پس`);
    assert.deepEqual(runs, [
      { text: "پیش ", underlined: false },
      { text: "دست محبّت", underlined: true },
      { text: " پس", underlined: false },
    ]);
  });

  test("علوم و فنون: سؤال حذف‌شدهٔ ۱۲ نیامده و بارمش به ۱۵ رفته", () => {
    const olumFonoon3Mordad1405 = findSeedExam("olum-fonoon-1405-mordad")!;
    const music = olumFonoon3Mordad1405.sections.find((s) => s.title === "موسیقی شعر");
    assert.ok(music);
    const numbers = music.questions.map((q) => q.number);
    assert.equal(numbers.includes(12), false);
    const q15 = music.questions.find((q) => q.number === 15);
    assert.equal(q15?.parts[0].score, 0.5);
  });
});

/** نمونه‌های docs/exam-authoring قرار است الگوی ساختنِ آزمون باشند؛
 *  اگر خودشان از قاعده‌ها بیفتند، هر آزمونی که از رویشان نوشته شود هم می‌افتد. */
describe("exam authoring templates", () => {
  for (const template of [nemooneFarsi, nemooneOlumFonoon]) {
    test(`${template.examSession}: معتبر است`, () => {
      assert.deepEqual(validateSeedExam(template), []);
    });
  }

  test("هر دو نمونه، هر ۱۸ نوع سؤال را نشان می‌دهند", () => {
    for (const template of [nemooneFarsi, nemooneOlumFonoon]) {
      const types = new Set(
        template.sections.flatMap((s) => s.questions.flatMap((q) => q.parts.map((p) => p.type))),
      );
      assert.equal(types.size, 18, `${template.examSession}: ${types.size} نوع`);
    }
  });
});

describe("normalizeFa", () => {
  test("نیم‌فاصله مثل فاصله رفتار می‌کند", () => {
    assert.equal(normalizeFa("به‌کارگیری"), normalizeFa("به کارگیری"));
    assert.equal(matchesAny("مراعات نظیر", ["مراعات‌نظیر"]), true);
  });

  test("همزهٔ روی «ه» نادیده گرفته می‌شود", () => {
    assert.equal(matchesAny("میرزاده عشقی", ["میرزادهٔ عشقی"]), true);
  });

  test("ی و ک عربی، اعراب و نشانه‌گذاری هنوز نادیده گرفته می‌شوند", () => {
    assert.equal(matchesAny("مصوّت كوتاه،", ["مصوت کوتاه"]), true);
  });

  test("پاسخِ خالی هیچ‌وقت درست نیست", () => {
    assert.equal(matchesAny("   ", ["قلب"]), false);
  });
});
