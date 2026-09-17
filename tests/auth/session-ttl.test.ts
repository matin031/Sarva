import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "@/lib/auth/duration";

/**
 * «کاربر سی روز وارد می‌ماند.»
 *
 * =============================================================================
 * ⚠️ چرا این آزمون وجود دارد
 * =============================================================================
 *
 * مدتِ ورود از `AUTH_REFRESH_TTL` خوانده می‌شود، و `.env.example` آن را
 * **تعریف نمی‌کند** — یعنی روی هاست، مقدارِ واقعی همان پیش‌فرضِ داخلِ
 * `lib/auth/config.ts` است. آن عدد تنها چیزی است که بینِ کاربر و «چرا هفتهٔ
 * پیش وارد شدم و الان بیرونم؟» ایستاده، و هیچ‌جای دیگری اعلامش نمی‌کند.
 *
 * ⚠️ و `parseDuration` روی ورودیِ بد **throw نمی‌کند**؛ هشدار می‌دهد و به
 * پیش‌فرض برمی‌گردد. این رفتار عمدی است (یک `.env` بدشکل نباید سایت را از
 * کار بیندازد) ولی یعنی یک اشتباهِ تایپی مثل `30 days` بی‌صدا مدتِ ورود را
 * عوض می‌کند. این آزمون می‌گوید آن حالت دقیقاً به کجا می‌افتد.
 *
 * ⚠️ فقط `parseDuration` آزموده می‌شود و نه `refreshTtlSeconds`: آن یکی در
 * `lib/auth/config.ts` است که `server-only` دارد و `node --test` واردش
 * نمی‌کند. خودِ `parseDuration` دقیقاً به همین دلیل به `lib/auth/duration.ts`
 * منتقل شد و `config` فقط دوباره export اش می‌کند — پس کدِ برنامه هیچ
 * تغییری ندید و این آزمون ممکن شد. (همان کاری که برای `lib/db/errors.ts`
 * انجام شد.)
 */

const DAY = 86_400;
const DEFAULT_REFRESH = 30 * DAY;
const DEFAULT_ACCESS = 15 * 60;

describe("parseDuration", () => {
  it("«30d» یعنی سی روز — همان مدتی که ورود باید دوام بیاورد", () => {
    assert.equal(parseDuration("30d", DEFAULT_REFRESH), DEFAULT_REFRESH);
    assert.equal(parseDuration("30d", 1), 2_592_000);
  });

  it("واحدهای دیگر هم درست خوانده می‌شوند", () => {
    assert.equal(parseDuration("15m", 0), 900);
    assert.equal(parseDuration("2h", 0), 7200);
    assert.equal(parseDuration("45", 0), 45, "بدونِ واحد یعنی ثانیه");
    assert.equal(parseDuration("  7d  ", 0), 7 * DAY, "فاصلهٔ اضافه اشکالی ندارد");
    assert.equal(parseDuration("30D", 0), 30 * DAY, "حرفِ بزرگ هم قبول است");
  });

  it("نبودنِ متغیر به پیش‌فرض می‌افتد — و پیش‌فرضِ ورود سی روز است", () => {
    /* ⚠️ این همان مسیری است که روی هاست طی می‌شود: `.env.example`
       `AUTH_REFRESH_TTL` را ندارد، پس مقدارِ مؤثر همین است. */
    assert.equal(parseDuration(undefined, DEFAULT_REFRESH), 30 * DAY);
    assert.equal(parseDuration("", DEFAULT_REFRESH), 30 * DAY);
    assert.equal(parseDuration(undefined, DEFAULT_ACCESS), 15 * 60);
  });

  it("ورودیِ بدشکل throw نمی‌کند و به پیش‌فرض برمی‌گردد", () => {
    /* ⚠️ «30 days» و «1w» هر دو شبیهِ مقدارِ درست‌اند و هیچ‌کدام نیستند.
       اگر این تابع throw می‌کرد، یک تایپو کلِ سایت را پایین می‌آورد؛ چون
       برنمی‌گرداند، تنها نشانه‌اش یک خطِ warn در لاگ است. */
    for (const bad of ["30 days", "1w", "abc", "-5d", "3.5d", "d", "۳۰d"]) {
      assert.equal(parseDuration(bad, DEFAULT_REFRESH), DEFAULT_REFRESH, bad);
    }
  });
});
