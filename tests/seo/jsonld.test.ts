import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeJsonLd, breadcrumbList } from "@/lib/seo/jsonld";

/**
 * ⚠️ چرا این آزمون هست: بخشی از دادهٔ ساختاریافته متنِ کاربر است — عنوانِ
 * سروده و تخلصِ شاعر در سروا کلاب. اگر آن متن بتواند از داخلِ `<script>`
 * بیرون بزند، هر بازدیدکننده‌ای کدِ دلخواهِ نویسندهٔ سروده را اجرا می‌کند.
 *
 * روی محتوای امروزِ سایت هیچ‌کدام از این‌ها اتفاق نمی‌افتد و همین آن را
 * خطرناک می‌کند: بدونِ آزمون، شکستنش تا روزی که کسی عمداً امتحان کند
 * دیده نمی‌شود.
 */
describe("safeJsonLd", () => {
  it("بستنِ تگ اسکریپت را خنثی می‌کند", () => {
    const out = safeJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
    assert.ok(!out.includes("</script"), "رشته هنوز می‌تواند تگ را ببندد");
    assert.ok(out.includes("\\u003c"), "کاراکتر < فرار داده نشده");
  });

  it("خروجی هنوز JSONِ معتبرِ هم‌ارز است", () => {
    const value = { name: "<b>الف</b>", nested: { x: ["<", ">"] } };
    assert.deepEqual(JSON.parse(safeJsonLd(value)), value);
  });

  it("جداکننده‌های خطِ یونیکد را فرار می‌دهد", () => {
    // U+2028 و U+2029 در JSON مجازند ولی در جاوااسکریپت پایانِ خط‌اند.
    const out = safeJsonLd({ a: "\u2028", b: "\u2029" });
    assert.ok(!out.includes("\u2028"));
    assert.ok(!out.includes("\u2029"));
    assert.deepEqual(JSON.parse(out), { a: "\u2028", b: "\u2029" });
  });

  it("متنِ معمولیِ فارسی را دست‌نخورده نگه می‌دارد", () => {
    const value = { name: "نیکی — درس ۱ فارسی ۲" };
    assert.deepEqual(JSON.parse(safeJsonLd(value)), value);
  });
});

describe("breadcrumbList", () => {
  it("ترتیب از یک شروع می‌شود و پشتِ سرِ هم است", () => {
    const list = breadcrumbList([
      { name: "خانه", path: "/" },
      { name: "درسنامه", path: "/doroos" },
      { name: "فارسی ۲", path: "/doroos/yazdahom" },
    ]);
    assert.equal(list["@type"], "BreadcrumbList");
    assert.deepEqual(
      list.itemListElement.map((i) => i.position),
      [1, 2, 3],
    );
  });

  it("هر حلقه آدرسِ مطلق دارد", () => {
    const list = breadcrumbList([{ name: "خانه", path: "/" }]);
    assert.match(list.itemListElement[0].item, /^https?:\/\//);
  });

  it("فهرستِ خالی خطا نمی‌دهد", () => {
    assert.deepEqual(breadcrumbList([]).itemListElement, []);
  });
});
