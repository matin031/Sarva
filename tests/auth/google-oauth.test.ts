import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  verifyGoogleClaims,
  decodeJwtPayloadUnverified,
  mayLinkToExistingAccount,
} from "@/lib/auth/oauth/google-claims";

/**
 * ادعاهای id_token گوگل.
 *
 * ⚠️ این تست‌ها دو راهِ تصاحبِ حساب را قفل می‌کنند که هر دو با یک خطِ
 * جاافتاده باز می‌شوند:
 *
 *   • بررسی نکردنِ `aud` → هرکسی با اپِ گوگلِ خودش یک id_token می‌سازد و
 *     به‌جای هر کاربری وارد می‌شود.
 *   • اتصالِ خودکار با ایمیلِ تأییدنشده → مهاجم یک حسابِ گوگل با آدرسِ
 *     قربانی می‌سازد و بدونِ دانستنِ رمز واردِ حسابِ او می‌شود.
 */

const CLIENT = "123.apps.googleusercontent.com";
const NONCE = "n-abc123";
const NOW = 1_760_000_000;

function claims(over: Record<string, unknown> = {}) {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT,
    exp: NOW + 3600,
    sub: "google-user-1",
    email: "Kaveh@Example.com",
    email_verified: true,
    name: "کاوه",
    nonce: NONCE,
    ...over,
  };
}

const expected = { clientId: CLIENT, nonce: NONCE, now: NOW };

describe("بررسی ادعاهای گوگل", () => {
  test("توکنِ سالم پذیرفته می‌شود", () => {
    const r = verifyGoogleClaims(claims(), expected);
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.user.sub, "google-user-1");
    assert.equal(r.ok && r.user.name, "کاوه");
  });

  test("ایمیل به حروف کوچک برمی‌گردد", () => {
    // citext در دیتابیس بی‌تفاوت است، ولی مقایسه‌های داخل کد نباید به شکلِ
    // نوشتنِ گوگل وابسته باشند.
    const r = verifyGoogleClaims(claims(), expected);
    assert.equal(r.ok && r.user.email, "kaveh@example.com");
  });

  test("توکنی که برای اپِ دیگری صادر شده رد می‌شود", () => {
    const r = verifyGoogleClaims(claims({ aud: "999.apps.googleusercontent.com" }), expected);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.reason, "bad_audience");
  });

  test("صادرکنندهٔ جعلی رد می‌شود", () => {
    const r = verifyGoogleClaims(claims({ iss: "https://evil.example" }), expected);
    assert.equal(!r.ok && r.reason, "bad_issuer");
  });

  test("هر دو شکلِ رسمیِ iss پذیرفته‌اند", () => {
    assert.equal(verifyGoogleClaims(claims({ iss: "accounts.google.com" }), expected).ok, true);
  });

  test("توکنِ منقضی رد می‌شود", () => {
    assert.equal(verifyGoogleClaims(claims({ exp: NOW - 1 }), expected).ok, false);
  });

  test("nonceِ ناهماهنگ رد می‌شود", () => {
    // یعنی این توکن پاسخِ درخواستِ ما نیست.
    const r = verifyGoogleClaims(claims({ nonce: "n-other" }), expected);
    assert.equal(!r.ok && r.reason, "nonce_mismatch");
  });

  test("نبودِ nonce هم رد می‌شود", () => {
    const r = verifyGoogleClaims(claims({ nonce: undefined }), expected);
    assert.equal(!r.ok && r.reason, "nonce_mismatch");
  });

  test("توکنِ بدونِ sub رد می‌شود", () => {
    assert.equal(verifyGoogleClaims(claims({ sub: "" }), expected).ok, false);
  });

  test("نامِ خالی به null تبدیل می‌شود، نه رشتهٔ فاصله", () => {
    const r = verifyGoogleClaims(claims({ name: "   " }), expected);
    assert.equal(r.ok && r.user.name, null);
  });
});

describe("تأییدِ ایمیل توسط گوگل", () => {
  test("رشتهٔ «true» هم پذیرفته است", () => {
    // گوگل تاریخاً هر دو شکل را فرستاده.
    const r = verifyGoogleClaims(claims({ email_verified: "true" }), expected);
    assert.equal(r.ok && r.user.emailVerified, true);
  });

  test("هر چیزِ دیگری یعنی تأییدنشده", () => {
    for (const v of [false, "false", "yes", 1, null, undefined, {}]) {
      const r = verifyGoogleClaims(claims({ email_verified: v }), expected);
      assert.equal(
        r.ok && r.user.emailVerified,
        false,
        `email_verified=${JSON.stringify(v)} نباید تأیید حساب شود`,
      );
    }
  });

  test("اتصال به حسابِ موجود فقط با ایمیلِ تأییدشده", () => {
    const base = { sub: "s", email: "a@b.c", name: null };
    assert.equal(mayLinkToExistingAccount({ ...base, emailVerified: true }), true);
    // ⚠️ همان یک خطی که جلوی تصاحبِ حساب را می‌گیرد.
    assert.equal(mayLinkToExistingAccount({ ...base, emailVerified: false }), false);
  });
});

describe("باز کردن بدنهٔ JWT", () => {
  test("بدنهٔ درست خوانده می‌شود", () => {
    const body = Buffer.from(JSON.stringify({ sub: "x" })).toString("base64url");
    assert.deepEqual(decodeJwtPayloadUnverified(`a.${body}.c`), { sub: "x" });
  });

  test("شکلِ نادرست null می‌دهد، نه استثنا", () => {
    for (const bad of ["", "a.b", "a.b.c.d", "a.!!!.c", "a.eyJ9.c"]) {
      assert.doesNotThrow(() => decodeJwtPayloadUnverified(bad));
    }
  });

  test("بدنهٔ غیرشیء رد می‌شود", () => {
    const body = Buffer.from(JSON.stringify("رشته")).toString("base64url");
    assert.equal(decodeJwtPayloadUnverified(`a.${body}.c`), null);
  });
});
