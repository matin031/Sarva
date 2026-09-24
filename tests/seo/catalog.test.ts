import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SEO_PAGES, SEO_PAGE_LIST, lessonOrdinal } from "@/lib/seo/catalog";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * فهرستِ صفحه‌های عمومی — تنها منبعِ عنوان و توضیح.
 *
 * ⚠️ چرا این آزمون: همین فهرست sitemap، `llms.txt` و پیش‌نمایشِ پنل را هم
 * می‌سازد. صفحه‌ای که اینجا باشد ولی فایلش نباشد، در sitemap یک ۴۰۴ می‌شود؛
 * و عنوانی که نامِ برند را خودش تکرار کند، در نتیجهٔ گوگل «… | سروا | سروا»
 * می‌شود.
 */
describe("SEO_PAGES", () => {
  it("هر مسیر واقعاً یک صفحه در app/ دارد", () => {
    for (const page of SEO_PAGE_LIST) {
      const dir = join(process.cwd(), "app", ...page.path.split("/").filter(Boolean));
      const exists = ["page.tsx", "layout.tsx"].some((f) => existsSync(join(dir, f)));
      assert.ok(exists, `${page.path} در فهرست هست ولی app${page.path}/page.tsx وجود ندارد`);
    }
  });

  it("کلیدِ هر ردیف همان مسیرِ خودش است", () => {
    for (const [key, page] of Object.entries(SEO_PAGES)) assert.equal(key, page.path);
  });

  it("عنوان‌ها نامِ برند را در انتها تکرار نمی‌کنند", () => {
    for (const page of SEO_PAGE_LIST) {
      if (page.path === "/") continue;
      assert.ok(!/\|\s*سروا\s*$/.test(page.title), `${page.path}: «| سروا» را قالبِ ریشه اضافه می‌کند`);
    }
  });

  it("توضیح‌ها طولِ مناسبِ نتیجهٔ جست‌وجو را دارند", () => {
    for (const page of SEO_PAGE_LIST) {
      const n = page.description.length;
      assert.ok(n >= 70 && n <= 175, `${page.path}: توضیح ${n} نویسه است (۷۰ تا ۱۷۵)`);
    }
  });

  it("هیچ رقمِ لاتینی وسطِ عنوانِ فارسی نیست", () => {
    for (const page of SEO_PAGE_LIST) assert.ok(!/[0-9]/.test(page.title), `${page.path}: ${page.title}`);
  });
});

describe("pageMetadata", () => {
  it("هر صفحه og:url و تصویرِ خودش را دارد — نه صفحهٔ خانه را", () => {
    const meta = pageMetadata({ path: "/game/kimia", title: "کیمیا", description: "توضیح" });
    const og = meta.openGraph as { url: string; images: { url: string }[]; title: string };
    assert.ok(og.url.endsWith("/game/kimia"));
    assert.equal(og.images[0].url, "/opengraph-image.png");
    assert.equal(og.title, "کیمیا | سروا");
  });

  it("noindex با follow برای فهرستِ فیلترشده", () => {
    const meta = pageMetadata({ path: "/x", title: "x", description: "y", noindex: true, follow: true });
    assert.deepEqual(meta.robots, { index: false, follow: true });
  });
});

describe("lessonOrdinal", () => {
  it("شکلِ رایجِ جست‌وجو را می‌دهد", () => {
    assert.equal(lessonOrdinal(1), "اول");
    assert.equal(lessonOrdinal(3), "سوم");
    assert.equal(lessonOrdinal(18), "هجدهم");
  });
});
