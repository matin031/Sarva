import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { join, sep } from "node:path";
import {
  documentKeyFingerprint,
  isPrivateRootSafe,
  safeDocumentPath,
} from "@/lib/teacher/doc-paths";

/**
 * قواعدِ مسیرِ انبارِ خصوصیِ مدارک.
 *
 * ⚠️ این مهم‌ترین تستِ کلِ قابلیتِ «دبیر شدن» است.
 *
 * چیزی که این دو تابع محافظت می‌کنند، حکمِ کارگزینیِ آدم‌های واقعی است — یک
 * سندِ هویتی. شکستنِ هرکدامشان یک باگِ معمولی نیست؛ یعنی آن سند یا از
 * `/uploads` برای همه قابل دانلود می‌شود، یا یک کلیدِ دستکاری‌شده می‌تواند
 * فایلی بیرونِ انبار را بخواند.
 */

describe("جداییِ انبارِ خصوصی از انبارِ عمومی", () => {
  const publicRoot = join("/home", "u", "sarva-uploads");

  test("دو پوشهٔ کاملاً جدا امن‌اند", () => {
    assert.ok(isPrivateRootSafe(join("/home", "u", "sarva-private"), publicRoot));
  });

  /**
   * ⚠️ حالتی که کلِ این تابع برایش نوشته شده: یک
   * `TEACHER_DOCS_DIR=.../sarva-uploads/docs` که کاملاً بی‌گناه به نظر
   * می‌رسد و هر حکمی را از `/uploads/docs/…` عمومی می‌کند.
   */
  test("خصوصی داخلِ عمومی رد می‌شود", () => {
    assert.equal(isPrivateRootSafe(join(publicRoot, "docs"), publicRoot), false);
    assert.equal(isPrivateRootSafe(join(publicRoot, "a", "b", "c"), publicRoot), false);
  });

  test("عمومی داخلِ خصوصی هم رد می‌شود", () => {
    const privateRoot = join("/home", "u");
    assert.equal(isPrivateRootSafe(privateRoot, publicRoot), false);
  });

  test("یکی بودنشان رد می‌شود", () => {
    assert.equal(isPrivateRootSafe(publicRoot, publicRoot), false);
  });

  /**
   * ⚠️ پیشوندِ مشترک بدونِ جداکننده، «داخل بودن» نیست.
   *
   * `sarva-uploads-private` تصادفاً با `sarva-uploads` شروع می‌شود ولی یک
   * پوشهٔ کاملاً جداست. با یک `startsWith` ساده و بدونِ `sep`، این حالتِ
   * کاملاً امن رد می‌شد — و کاربر با یک پیام خطای گیج‌کننده روبه‌رو می‌شد
   * که هیچ راهی برای رفعش نداشت.
   */
  test("پیشوندِ مشترک با عمومی، «داخل بودن» حساب نمی‌شود", () => {
    assert.ok(isPrivateRootSafe(join("/home", "u", "sarva-uploads-private"), publicRoot));
  });

  test("مسیرهای غیرنرمال هم درست سنجیده می‌شوند", () => {
    // `/home/u/sarva-uploads/../sarva-uploads/docs` در عمل داخلِ عمومی است.
    const sneaky = join(publicRoot, "..", "sarva-uploads", "docs");
    assert.equal(isPrivateRootSafe(sneaky, publicRoot), false);
  });
});

describe("مسیرِ امنِ یک کلید", () => {
  const root = join("/srv", "private", "teacher-docs");

  test("کلیدِ عادی به مسیرِ زیرِ ریشه می‌رسد", () => {
    const target = safeDocumentPath(root, "1700000000-abcdef.pdf");
    assert.equal(target, join(root, "1700000000-abcdef.pdf"));
  });

  test("کلیدِ خالی رد می‌شود", () => {
    assert.equal(safeDocumentPath(root, ""), null);
  });

  /** ⚠️ کلاسیک‌ترین حملهٔ مسیر. */
  test("«..» در هر جای کلید رد می‌شود", () => {
    assert.equal(safeDocumentPath(root, "../etc/passwd"), null);
    assert.equal(safeDocumentPath(root, "a/../../b"), null);
    assert.equal(safeDocumentPath(root, ".."), null);
  });

  test("«.» و جزءِ خالی رد می‌شوند", () => {
    assert.equal(safeDocumentPath(root, "./x.pdf"), null);
    assert.equal(safeDocumentPath(root, "a//b.pdf"), null);
    assert.equal(safeDocumentPath(root, "/x.pdf"), null);
  });

  /**
   * ⚠️ در بعضی لایه‌های نیتیو رشته سرِ بایتِ صفر بریده می‌شود، و آن‌وقت
   * «x.pdf\0../../etc/passwd» معنای دیگری می‌گیرد.
   */
  test("بایتِ صفر رد می‌شود", () => {
    assert.equal(safeDocumentPath(root, "x.pdf\0../../etc/passwd"), null);
  });

  /** ⚠️ روی ویندوز بک‌اسلش جداکنندهٔ مسیر است. */
  test("بک‌اسلش رد می‌شود", () => {
    assert.equal(safeDocumentPath(root, "..\\..\\x.pdf"), null);
    assert.equal(safeDocumentPath(root, "a\\b.pdf"), null);
  });

  test("خروجی همیشه زیرِ ریشه است", () => {
    for (const key of ["a.pdf", "sub/b.png", "x/y/z.webp"]) {
      const target = safeDocumentPath(root, key);
      assert.ok(target, `${key} باید مسیر بدهد`);
      assert.ok(target.startsWith(root + sep), `${target} زیرِ ریشه نیست`);
    }
  });
});

/**
 * اثرِ انگشتِ کلید — چیزی که در لاگ می‌نشیند به‌جای نامِ فایلِ حکم.
 *
 * ⚠️ خاصیتی که باید نگه داشته شود دو تاست و هر دو لازم‌اند:
 *   ۱) از خروجی نشود کلید را ساخت (وگرنه بی‌فایده است).
 *   ۲) برای یک کلید همیشه یکی باشد (وگرنه برای پیگیری بی‌فایده است).
 */
describe("اثرِ انگشتِ کلیدِ مدرک", () => {
  const key = "1757900000000-0123456789abcdef0123456789abcdef.pdf";

  test("پایدار است — همان کلید، همان اثرِ انگشت", () => {
    assert.equal(documentKeyFingerprint(key), documentKeyFingerprint(key));
  });

  test("دو کلیدِ متفاوت دو اثرِ انگشتِ متفاوت می‌دهند", () => {
    assert.notEqual(documentKeyFingerprint("a.pdf"), documentKeyFingerprint("b.pdf"));
  });

  /** ⚠️ خودِ قاعده: هیچ بخشی از کلید نباید در خروجی دیده شود — نه پسوند،
   *  نه مهرِ زمان، نه هیچ زیررشته‌ای. */
  test("هیچ تکه‌ای از کلید در خروجی نیست", () => {
    const fp = documentKeyFingerprint(key);
    assert.ok(!fp.includes("pdf"), "پسوند نباید بماند");
    assert.ok(!fp.includes("1757900000000"), "مهرِ زمان نباید بماند");
    assert.ok(!fp.includes("0123456789abcdef"), "بخشِ تصادفی نباید بماند");
    // و برعکسش هم: هیچ زیررشتهٔ ۸نویسه‌ای از کلید نباید در اثرِ انگشت باشد.
    for (let i = 0; i + 8 <= key.length; i++) {
      assert.ok(!fp.includes(key.slice(i, i + 8)), `«${key.slice(i, i + 8)}» نشت کرده`);
    }
  });

  test("شکلش ثابت و کوتاه است", () => {
    assert.match(documentKeyFingerprint(key), /^dk_[0-9a-f]{12}$/);
  });
});
