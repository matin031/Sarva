import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OTP_PARAMETER_NAME,
  SmsIrAdapter,
  describeSmsIrError,
  parseTemplateId,
  readSmsIrResult,
  redactCode,
  toSmsIrMobile,
  type SmsIrClient,
  type SmsIrHttpResponse,
} from "@/lib/sms/smsir";
import { normalizeSmsDriver } from "@/lib/sms/driver";

/**
 * آداپترِ SMS.ir.
 *
 * ⚠️ چیزی که این تست‌ها قفل می‌کنند، سه شکستِ *بی‌صدا* است — هر سه از جنسِ
 * «همه‌چیز موفق به نظر می‌رسد ولی کاربر هیچ کدی نمی‌گیرد»:
 *
 *   • پاسخِ HTTP 200 با `status` غیرِ ۱ (اعتبارِ ناکافی، قالبِ تأییدنشده …)
 *   • شمارهٔ `98…`ِ سروا که SMS.ir نمی‌شناسد
 *   • نامِ متغیرِ قالب اگر `Code` نباشد — پیامک می‌رود ولی جای کد خالی است
 *
 * و یک شکستِ پرصدا: نشتِ کد یا کلید در متنِ خطا.
 */

/** کلاینتِ جعلی: چیزی که به SDK داده می‌شد را نگه می‌دارد و پاسخِ دلخواه می‌دهد. */
function fakeClient(response: SmsIrHttpResponse | Error) {
  const calls: { mobile: string; templateId: number; parameters: { name: string; value: string }[] }[] =
    [];

  const client: SmsIrClient = {
    async SendVerifyCode(mobile, templateId, parameters) {
      calls.push({ mobile, templateId, parameters });
      if (response instanceof Error) throw response;
      return response;
    },
    async SendBulk() {
      throw new Error("در این تست استفاده نمی‌شود");
    },
  };

  return { client, calls };
}

const OK: SmsIrHttpResponse = {
  status: 200,
  data: { status: 1, message: "موفق", data: { messageId: 89545112, cost: 1 } },
};

describe("شمارهٔ گیرنده برای SMS.ir", () => {
  test("شکلِ متعارفِ سروا به ۰۹… تبدیل می‌شود", () => {
    // ⚠️ lib/auth/phone همه‌جا 98… ذخیره می‌کند؛ SMS.ir همان را نمی‌پذیرد.
    assert.equal(toSmsIrMobile("989123456789"), "09123456789");
  });

  test("۰۹…، ۹…، +۹۸… و شمارهٔ فاصله‌دار هم پذیرفته می‌شوند", () => {
    assert.equal(toSmsIrMobile("09123456789"), "09123456789");
    assert.equal(toSmsIrMobile("9123456789"), "09123456789");
    assert.equal(toSmsIrMobile("+98 912 345 6789"), "09123456789");
  });

  test("تلفنِ ثابت و شمارهٔ ناقص رد می‌شوند", () => {
    assert.throws(() => toSmsIrMobile("02188776655"), /معتبر نیست/);
    assert.throws(() => toSmsIrMobile("0912345"), /معتبر نیست/);
  });

  test("خودِ شماره در متنِ خطا نمی‌آید — این پیام به sms_log می‌رود", () => {
    try {
      toSmsIrMobile("02188776655");
      assert.fail("باید خطا می‌داد");
    } catch (err) {
      assert.ok(!(err as Error).message.includes("88776655"));
    }
  });
});

describe("شناسهٔ قالب", () => {
  test("رشتهٔ عددی به عدد تبدیل می‌شود", () => {
    assert.equal(parseTemplateId(" 414026 "), 414026);
  });

  test("ارقامِ فارسی — همان‌طور که پنلِ SMS.ir نشان می‌دهد", () => {
    assert.equal(parseTemplateId("۵۲۷۹۴۶"), 527946);
  });

  test("خالی یا غیرعددی خطا می‌دهد و هیچ مقدارِ پیش‌فرضی جایش نمی‌نشیند", () => {
    // ⚠️ پیش‌فرضِ هاردکد یعنی ارسال با قالبِ حسابِ دیگری — که فقط روی سرورِ
    // اصلی و با خطای سرویس معلوم می‌شود.
    assert.throws(() => parseTemplateId(null), /ثبت نشده/);
    assert.throws(() => parseTemplateId(""), /ثبت نشده/);
    assert.throws(() => parseTemplateId("SarvaLogin"), /عدد/);
    assert.throws(() => parseTemplateId("-3"), /عدد/);
  });
});

describe("خواندنِ پاسخِ SMS.ir", () => {
  test("پاسخِ موفق، شناسهٔ پیام را می‌دهد", () => {
    assert.deepEqual(readSmsIrResult(OK), { providerMessageId: "89545112" });
  });

  test("HTTP 200 با status غیرِ ۱ شکست است", () => {
    // ⚠️ همان تلهٔ اصلی: بدونِ این، «اعتبار کافی نیست» به‌عنوان ارسالِ موفق
    // ثبت می‌شد و کاربر تا ابد منتظرِ کد می‌ماند.
    assert.throws(
      () =>
        readSmsIrResult({
          status: 200,
          data: { status: 20, message: "اعتبار کافی نیست", data: null },
        }),
      /خطای 20.*اعتبار کافی نیست/,
    );
  });

  test("پاسخِ موفق بدونِ شناسهٔ پیام هم شکست است", () => {
    assert.throws(
      () => readSmsIrResult({ status: 200, data: { status: 1, message: "موفق", data: null } }),
      /شناسهٔ پیام/,
    );
  });

  test("کدِ HTTP غیرِ ۲xx و بدنهٔ غیرِ JSON شکست‌اند", () => {
    assert.throws(() => readSmsIrResult({ status: 500, data: null }), /HTTP 500/);
    assert.throws(() => readSmsIrResult({ status: 200, data: "<html>" }), /قابلِ خواندن نبود/);
  });
});

describe("پیامِ خطا", () => {
  test("از پاسخِ خطای سرویس، کدِ HTTP و کدِ سرویس و پیام را می‌سازد", () => {
    const err = Object.assign(new Error("Request failed with status code 400"), {
      response: { status: 400, data: { status: 104, message: "قالب یافت نشد" } },
    });
    const message = describeSmsIrError(err);
    assert.match(message, /HTTP 400/);
    assert.match(message, /104/);
    assert.match(message, /قالب یافت نشد/);
  });

  test("خطای شبکه با کدِ خودش گزارش می‌شود", () => {
    const err = Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
    assert.match(describeSmsIrError(err), /ETIMEDOUT/);
  });

  test("کلیدِ API از خطای axios بیرون نمی‌آید", () => {
    /* ⚠️ خطای axios کلِ config را با هدرِ X-API-KEY همراه دارد. اگر روزی
       describeSmsIrError به JSON.stringify(err) تبدیل شود، این تست می‌شکند. */
    const err = Object.assign(new Error("Request failed"), {
      response: { status: 401, data: { status: 0, message: "کلید نامعتبر" } },
      config: { headers: { "X-API-KEY": "super-secret-key" } },
    });
    assert.ok(!describeSmsIrError(err).includes("super-secret-key"));
  });

  test("کد در متنِ خطا پوشانده می‌شود", () => {
    assert.equal(redactCode("Parameters invalid: 483921", "483921"), "Parameters invalid: ***");
    // کدِ خیلی کوتاه پوشانده نمی‌شود، وگرنه هر عددِ دیگری در پیام هم قربانی می‌شد.
    assert.equal(redactCode("HTTP 40", "40"), "HTTP 40");
  });
});

describe("ارسالِ کد با آداپتر", () => {
  test("Verify با شمارهٔ ۰۹…، شناسهٔ قالب و متغیرِ Code صدا زده می‌شود", async () => {
    const { client, calls } = fakeClient(OK);
    const adapter = new SmsIrAdapter("api-key", 414026, null, client);

    const result = await adapter.sendOtp({ to: "989123456789", code: "483921" });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].mobile, "09123456789");
    assert.equal(calls[0].templateId, 414026);
    // ⚠️ نامِ متغیر باید دقیقاً همان چیزی باشد که قالبِ تأییدشده دارد؛ نامِ
    // اشتباه خطا نمی‌دهد، پیامکی می‌فرستد که جای کد در آن خالی است.
    assert.deepEqual(calls[0].parameters, [{ name: OTP_PARAMETER_NAME, value: "483921" }]);
    assert.equal(OTP_PARAMETER_NAME, "Code");
    assert.deepEqual(result, { providerMessageId: "89545112" });
  });

  test("شناسهٔ قالب هاردکد نیست — هر عددی که داده شود همان می‌رود", async () => {
    const { client, calls } = fakeClient(OK);
    await new SmsIrAdapter("api-key", 999001, null, client).sendOtp({
      to: "989123456789",
      code: "111222",
    });
    assert.equal(calls[0].templateId, 999001);
  });

  test("پاسخِ ۲۰۰ ولی ناموفق، throw می‌کند و کد را لو نمی‌دهد", async () => {
    const { client } = fakeClient({
      status: 200,
      data: { status: 12, message: "پارامتر 483921 نامعتبر است", data: null },
    });
    const adapter = new SmsIrAdapter("api-key", 414026, null, client);

    await assert.rejects(
      () => adapter.sendOtp({ to: "989123456789", code: "483921" }),
      (err: Error) => {
        assert.match(err.message, /خطای 12/);
        assert.ok(!err.message.includes("483921"), "کد نباید در پیامِ خطا بماند");
        return true;
      },
    );
  });

  test("خطای شبکه هم به یک پیامِ تمیز تبدیل می‌شود", async () => {
    const { client } = fakeClient(Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }));
    await assert.rejects(
      () => new SmsIrAdapter("api-key", 414026, null, client).sendOtp({ to: "989123456789", code: "483921" }),
      /ECONNRESET/,
    );
  });

  test("متنِ آزاد بدونِ شمارهٔ خط، صریح شکست می‌خورد و بی‌صدا از مسیرِ قالب نمی‌رود", async () => {
    const { client } = fakeClient(OK);
    await assert.rejects(
      () => new SmsIrAdapter("api-key", 414026, null, client).send({ to: "989123456789", body: "سلام" }),
      /شمارهٔ خط/,
    );
  });
});

describe("نامِ درایور در تنظیمات", () => {
  test("شکل‌های مختلفِ SMS.ir همه به smsir می‌رسند", () => {
    // ⚠️ گزینهٔ پنل پیش‌تر `sms_ir` ذخیره می‌شد؛ اگر این نگاشت نبود، سایتی که
    // از قبل تنظیم شده بود بی‌صدا به حالتِ غیرفعال برمی‌گشت.
    for (const raw of ["smsir", "sms_ir", "SMS.ir", "sms-ir", " SmsIr "]) {
      assert.equal(normalizeSmsDriver(raw), "smsir", raw);
    }
  });

  test("خالی و «غیرفعال» یعنی mock، و مقدارِ ناشناخته یعنی null", () => {
    assert.equal(normalizeSmsDriver(null), "mock");
    assert.equal(normalizeSmsDriver(""), "mock");
    assert.equal(normalizeSmsDriver("mock"), "mock");
    // ⚠️ null با mock یکی نیست: یعنی «مقداری ثبت شده که سروا نمی‌شناسد» و
    // باید هشدار بگیرد — مثلاً `najva`ی باقی‌مانده از قبل.
    assert.equal(normalizeSmsDriver("najva"), null);
    assert.equal(normalizeSmsDriver("kavenegar"), null);
  });
});
