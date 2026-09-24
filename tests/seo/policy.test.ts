import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AI_BOTS, blockedAiBots, parseAiPolicy, parseSameAs, robotsRules } from "@/lib/seo/policy";

describe("robotsRules", () => {
  it("«همه مجاز» هیچ گروهِ اختصاصی نمی‌سازد", () => {
    // ⚠️ گروهِ اختصاصی با Allow:/ یعنی آن ربات Disallowهای گروهِ * را نمی‌بیند.
    const rules = robotsRules("all");
    assert.equal(rules.length, 1);
    assert.equal(rules[0].userAgent, "*");
    assert.ok((rules[0].disallow as string[]).includes("/api/"));
  });

  it("«فقط پاسخ» ربات‌های پاسخ‌گو را باز نگه می‌دارد", () => {
    const blocked = blockedAiBots("search-only");
    assert.ok(blocked.includes("GPTBot"));
    assert.ok(!blocked.includes("OAI-SearchBot"), "بستنِ OAI-SearchBot یعنی حذف از جست‌وجوی ChatGPT");
    assert.ok(!blocked.includes("PerplexityBot"));
  });

  it("Googlebot هرگز در فهرست نیست", () => {
    assert.ok(!AI_BOTS.some((b) => /^Googlebot/i.test(b.ua)));
    assert.ok(!blockedAiBots("none").includes("Googlebot"));
  });

  it("مقدارِ ناشناخته به «همه مجاز» برمی‌گردد", () => {
    assert.equal(parseAiPolicy(null), "all");
    assert.equal(parseAiPolicy("chert"), "all");
    assert.equal(parseAiPolicy("none"), "none");
  });
});

describe("parseSameAs", () => {
  it("خط، فاصله و ویرگول را جداکننده می‌گیرد و تکراری‌ها را حذف می‌کند", () => {
    const out = parseSameAs("https://t.me/sarva\nhttps://instagram.com/sarva، https://t.me/sarva");
    assert.deepEqual(out, ["https://t.me/sarva", "https://instagram.com/sarva"]);
  });

  it("چیزی جز نشانیِ http(s) را رد می‌کند", () => {
    assert.deepEqual(parseSameAs("javascript:alert(1) t.me/x ftp://a.b"), []);
  });
});
