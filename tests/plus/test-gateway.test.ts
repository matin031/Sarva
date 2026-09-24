import { test } from "node:test";
import assert from "node:assert/strict";
import { orderStatusLabel } from "@/lib/plus/labels";
import { safeReturnTo } from "@/lib/auth/return-to";

/**
 * گیتِ درگاهِ آزمایشی و چند قاعدهٔ مسیرِ خرید که در این دور اضافه شدند.
 *
 * `test-provider.ts` «server-only» است، پس گیتش اینجا از روی همان قاعده
 * بازسازی نمی‌شود؛ به‌جایش ماژول با شرطِ react-server بارگذاری می‌شود.
 */

async function gate() {
  const mod = await import("@/lib/plus/payments/test-provider").catch(() => null);
  return mod?.testGatewayAllowedFor ?? null;
}

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("درگاهِ آزمایشی روی سرورِ اصلی فقط برای مدیر است", async (t) => {
  const allowed = await gate();
  if (!allowed) return t.skip("server-only بیرون از react-server بار نمی‌شود");
  withEnv({ NODE_ENV: "production", PLUS_ALLOW_TEST_GATEWAY: undefined }, () => {
    assert.equal(allowed("admin"), true);
    assert.equal(allowed("student"), false);
    assert.equal(allowed(null), false);
  });
  withEnv({ NODE_ENV: "production", PLUS_ALLOW_TEST_GATEWAY: "i-know" }, () => {
    assert.equal(allowed("student"), true);
  });
  withEnv({ NODE_ENV: "development", PLUS_ALLOW_TEST_GATEWAY: undefined }, () => {
    assert.equal(allowed("student"), true);
  });
});

test("پرداختِ لغوشده در درگاه با سفارشِ لغوشده یکی نیست", () => {
  assert.equal(orderStatusLabel("pending", "cancelled"), "پرداخت لغو شد");
  assert.equal(orderStatusLabel("cancelled", null), "لغوشده");
});

test("بازگشت از درگاه پس از ورود مجاز است", () => {
  const back = "/payment/return?order=abc&ref=test_x&token=paid.sig";
  assert.equal(safeReturnTo(back), back);
  assert.equal(safeReturnTo("/payment/sandbox?ref=x"), "/panel/home");
});
