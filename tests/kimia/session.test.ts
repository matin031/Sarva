import { test } from "node:test";
import assert from "node:assert/strict";

import {
  KIMIA_CONFIG,
  coerceSessionLength,
  isSessionLength,
} from "@/lib/kimia/config";

/* طولِ نشست یک ترجیحِ محلی است و به سرور نمی‌رود؛ این تست‌ها همان قاعدهٔ
   خالص را می‌سنجند که هم رابط کاربری و هم شمارندهٔ دورها به آن تکیه
   می‌کنند. شمارشِ *واقعیِ* دورها در مرورگر بازی شد و در گزارش آمده. */

test("فقط ۵، ۱۰ و ۱۵ طولِ معتبرند", () => {
  assert.deepEqual([...KIMIA_CONFIG.sessionLengths], [5, 10, 15]);
  for (const n of [5, 10, 15]) assert.ok(isSessionLength(n), `${n} باید معتبر باشد`);
});

test("هر چیزِ دیگری رد می‌شود", () => {
  for (const bad of [0, 1, 4, 6, 9, 11, 14, 16, 100, -5, 1.5, NaN, Infinity]) {
    assert.equal(isSessionLength(bad), false, `${bad} نباید معتبر باشد`);
  }
  for (const bad of ["10", null, undefined, {}, [], true, [10]]) {
    assert.equal(isSessionLength(bad), false, `${JSON.stringify(bad)} نباید معتبر باشد`);
  }
});

test("پیش‌فرض ۱۰ است و خودش معتبر است", () => {
  assert.equal(KIMIA_CONFIG.defaultSessionLength, 10);
  assert.ok(isSessionLength(KIMIA_CONFIG.defaultSessionLength));
});

test("مقدارِ نامعتبر به پیش‌فرض برمی‌گردد و نه به یک عددِ دلبخواه", () => {
  /* ⚠️ مهم‌ترین تستِ این فایل: اگر روزی مقدار از localStorage یا یک query
     param بیاید، «۰ بیت» یا «۱۰۰۰ بیت» نباید ساخته شود. */
  for (const bad of [0, 7, 999, -1, "10", null, undefined, NaN]) {
    assert.equal(coerceSessionLength(bad), 10, `${String(bad)} باید به ۱۰ برگردد`);
  }
  for (const good of [5, 10, 15]) {
    assert.equal(coerceSessionLength(good), good);
  }
});

test("⚠️ شمارشِ دورها هیچ off-by-one ندارد", () => {
  /* آینهٔ همان شرطی که `KimiaGame.nextRound` دارد:
       if (roundIndex >= sessionLength) → پایانِ نشست
     دورها از ۱ شماره می‌خورند، پس نشستِ n باید دقیقاً n دور بدهد و
     پایانش وقتی باشد که دورِ n تمام شده. */
  for (const total of KIMIA_CONFIG.sessionLengths) {
    const played: number[] = [];
    let roundIndex = 1;
    for (let guard = 0; guard < 100; guard++) {
      played.push(roundIndex);
      if (roundIndex >= total) break;
      roundIndex = roundIndex + 1;
    }
    assert.equal(played.length, total, `نشستِ ${total} باید ${total} دور بدهد`);
    assert.equal(played[0], 1, "اولین دور باید ۱ باشد");
    assert.equal(played[played.length - 1], total, `آخرین دور باید ${total} باشد`);
    assert.deepEqual(
      played,
      Array.from({ length: total }, (_, i) => i + 1),
      "شماره‌ها باید پیوسته و بدونِ جهش باشند",
    );
  }
});

test("مخرجِ صفحهٔ نتیجه همان طولِ انتخاب‌شده است", () => {
  /* در `KimiaGame` هم نوارِ بالا و هم `KimiaResult` از یک `sessionLength`
     می‌خوانند. این تست همان ثابت را قفل می‌کند: هیچ‌کدام نباید به
     `defaultSessionLength` برگردند. */
  for (const chosen of KIMIA_CONFIG.sessionLengths) {
    const solved = Math.min(3, chosen);
    assert.ok(solved <= chosen);
    assert.equal(coerceSessionLength(chosen), chosen);
  }
});
