import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { contentHref, FOCUS_PARAM } from "@/lib/admin/content-links";

/**
 * «رفتن به همین مورد» تنها راهی است که مدیر از یک گزارش به خودِ محتوا
 * می‌رسد. اگر نشانی محدوده را جا بیندازد، پنل روی *دستهٔ پیش‌فرض* باز می‌شود
 * و مدیر فکر می‌کند محتوا حذف شده — خرابی‌ای که هیچ خطایی نشان نمی‌دهد.
 */

describe("نشانیِ محتوا در پنل", () => {
  test("عروض سماعی فقط شناسه لازم دارد", () => {
    assert.equal(contentHref("quiz", "abc-1"), `/admin/quiz?${FOCUS_PARAM}=abc-1`);
  });

  test("واژه‌یاب پایه و درس را هم می‌برد", () => {
    const href = contentHref("vocab", "w-9", { grade: "yazdahom", lesson: 4 });
    assert.ok(href!.startsWith("/admin/vocab?"));
    const q = new URLSearchParams(href!.split("?")[1]);
    assert.equal(q.get("grade"), "yazdahom");
    assert.equal(q.get("lesson"), "4");
    assert.equal(q.get(FOCUS_PARAM), "w-9");
  });

  test("جفت‌ها پایه و نوبت را می‌برند", () => {
    const q = new URLSearchParams(contentHref("pairs", "p1", { grade: "dahom", term: "khordad" })!.split("?")[1]);
    assert.equal(q.get("term"), "khordad");
    assert.equal(q.get("grade"), "dahom");
  });

  test("گزارشِ جفت‌ها روی دسته است، پس شناسه‌اش خودِ محدوده است", () => {
    // «رفتنِ» یک گزارش با شناسهٔ «dahom:khordad» باید همان تخته را باز کند
    // و هیچ ردیفی را برجسته نکند — چون کاربر هم یک تخته دیده، نه یک جفت.
    const href = contentHref("pairs", "dahom:khordad")!;
    const q = new URLSearchParams(href.split("?")[1]);
    assert.equal(q.get("grade"), "dahom");
    assert.equal(q.get("term"), "khordad");
    assert.equal(q.get(FOCUS_PARAM), null);
  });

  test("نینجا نقش را می‌برد", () => {
    const q = new URLSearchParams(contentHref("ninja", "n1", { categoryId: "c7" })!.split("?")[1]);
    assert.equal(q.get("category"), "c7");
  });

  test("امتحان فقط *شمارهٔ* سؤال را می‌فرستد، نه کلِ شناسه", () => {
    const href = contentHref("exam", "final-1404#12", { examId: "e-77" });
    assert.equal(href, `/admin/exams/e-77?${FOCUS_PARAM}=12`);
  });

  test("امتحانِ بی‌شناسه به فهرست برمی‌گردد و نمی‌شکند", () => {
    assert.equal(contentHref("exam", "final#3"), "/admin/exams");
  });

  test("پلِ وزن پنل ندارد، پس با کوئریِ آماده به کنسول می‌رود", () => {
    const href = contentHref("aruz_bridge", "b-1")!;
    assert.ok(href.startsWith("/admin/sql?"));
    const q = new URLSearchParams(href.split("?")[1]).get("q")!;
    assert.ok(q.includes("aruz_bridge_questions"));
    assert.ok(q.includes("b-1"));
  });

  test("نقلِ قولِ داخلِ شناسه، کوئریِ کنسول را نمی‌شکند", () => {
    const q = new URLSearchParams(contentHref("aruz_bridge", "a'b")!.split("?")[1]).get("q")!;
    assert.ok(q.includes("'a''b'"));
  });

  test("بخش‌های بدونِ پنل، لینک نمی‌دهند", () => {
    assert.equal(contentHref("aruz_rapid", "x"), null);
    assert.equal(contentHref("doroos", "yazdahom/1#3"), null);
    assert.equal(contentHref("other", "x"), null);
  });

  test("بدونِ شناسه هم نشانیِ سالمی می‌دهد", () => {
    assert.equal(contentHref("quiz", null), "/admin/quiz");
    assert.equal(contentHref("jasoos", "  "), "/admin/games/jasoos");
  });
});
