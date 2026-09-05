import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  feedPath,
  feedCanonicalPath,
  feedIsIndexable,
  parseFeedPage,
  MAX_FEED_PAGE,
  type FeedQuery,
} from "@/lib/club/feed-url";

const base: FeedQuery = { page: 1, sort: "recent" };

describe("feedPath", () => {
  it("صفحهٔ یک هیچ پارامتری نمی‌گیرد", () => {
    assert.equal(feedPath(base), "/sarvaclub");
  });

  it("صفحهٔ دوم به بعد پارامتر می‌گیرد", () => {
    assert.equal(feedPath({ ...base, page: 2 }), "/sarvaclub?page=2");
  });

  it("مرتب‌سازیِ پیش‌فرض نوشته نمی‌شود", () => {
    assert.equal(feedPath({ ...base, sort: "recent" }), "/sarvaclub");
    assert.equal(feedPath({ ...base, sort: "popular" }), "/sarvaclub?sort=popular");
  });

  it("ترتیبِ پارامترها ثابت است", () => {
    // ⚠️ اگر ترتیب عوض شود، یک حالتِ واحد دو آدرسِ متفاوت می‌دهد و همان
    // آدرسِ تکراری‌ای ساخته می‌شود که می‌خواستیم نسازیم.
    const a = feedPath({ page: 3, sort: "popular", form: "ghazal", tag: "eshgh" });
    const b = feedPath({ tag: "eshgh", form: "ghazal", page: 3, sort: "popular" });
    assert.equal(a, b);
    assert.equal(a, "/sarvaclub?sort=popular&form=ghazal&tag=eshgh&page=3");
  });
});

describe("feedCanonicalPath", () => {
  it("صفحهٔ دوم به صفحهٔ یک نمی‌رود", () => {
    // این مهم‌ترین قاعده است: محتوای صفحهٔ دوم فرق دارد، پس canonicalِ خودش
    // را می‌گیرد. فرستادنش به صفحهٔ یک یعنی هرگز ایندکس نشود.
    assert.equal(feedCanonicalPath({ ...base, page: 2 }), "/sarvaclub?page=2");
  });

  it("مرتب‌سازی محتوای تازه نمی‌سازد، پس از canonical حذف می‌شود", () => {
    assert.equal(feedCanonicalPath({ ...base, sort: "popular" }), "/sarvaclub");
    assert.equal(
      feedCanonicalPath({ ...base, sort: "popular", page: 2 }),
      "/sarvaclub?page=2",
    );
  });

  it("فیلتر در canonical می‌ماند", () => {
    assert.equal(feedCanonicalPath({ ...base, form: "ghazal" }), "/sarvaclub?form=ghazal");
  });
});

describe("feedIsIndexable", () => {
  it("فهرستِ ساده در هر صفحه‌ای ایندکس می‌شود", () => {
    assert.equal(feedIsIndexable(base), true);
    assert.equal(feedIsIndexable({ ...base, page: 7 }), true);
  });

  it("مرتب‌سازی و فیلتر ایندکس نمی‌شوند", () => {
    assert.equal(feedIsIndexable({ ...base, sort: "popular" }), false);
    assert.equal(feedIsIndexable({ ...base, form: "ghazal" }), false);
    assert.equal(feedIsIndexable({ ...base, tag: "eshgh" }), false);
  });
});

describe("parseFeedPage", () => {
  it("نبودِ پارامتر یعنی صفحهٔ یک", () => {
    assert.equal(parseFeedPage(undefined), 1);
  });

  it("ورودیِ نامعتبر به صفحهٔ یک برمی‌گردد", () => {
    // ⚠️ این‌ها از آدرس می‌آیند، پس هر رشته‌ای ممکن است. هیچ‌کدام نباید
    // صفحه‌ای تازه بسازند یا به دیتابیس offset عجیب بدهند.
    for (const bad of ["0", "-3", "abc", "1.5", "", "1e5", "٢"]) {
      assert.equal(parseFeedPage(bad), 1, `ورودی: ${bad}`);
    }
  });

  it("شمارهٔ نجومی به سقف می‌رسد", () => {
    assert.equal(parseFeedPage("999999"), MAX_FEED_PAGE);
  });

  it("شمارهٔ معتبر همان می‌ماند", () => {
    assert.equal(parseFeedPage("4"), 4);
  });
});
