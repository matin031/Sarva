import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { userSearchClause } from "@/lib/admin/user-search";

/**
 * جست‌وجوی کاربر — به‌ویژه شاخهٔ موبایل.
 *
 * موبایل به شکلِ `989…` ذخیره شده و مدیر آن را هر جوری تایپ می‌کند. اگر
 * این تبدیل بشکند، کاربرِ فقط-موبایلی دوباره از جست‌وجو ناپدید می‌شود —
 * بی‌هیچ خطایی.
 */
describe("جست‌وجوی کاربر", () => {
  test("سه `?` و سه مقدار", () => {
    const { sql, values } = userSearchClause("ali");
    assert.equal(sql.split("?").length - 1, values.length);
  });

  for (const typed of ["۰۹۱۲۳۴۵۶۷۸۹", "09123456789", "+989123456789", "9123456789"]) {
    test(`«${typed}» به شکلِ ذخیره‌شده می‌رسد`, () => {
      assert.equal(userSearchClause(typed).values[2], "%989123456789%");
    });
  }

  test("متنِ بی‌رقم شاخهٔ موبایل را خاموش می‌کند", () => {
    const { values } = userSearchClause("ali@example.com");
    assert.equal(values[0], "%ali@example.com%");
    assert.equal(values[2], "\u0000");
  });
});
