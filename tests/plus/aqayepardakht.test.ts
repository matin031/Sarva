import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { configureLogger, resetLogger } from "@/lib/observability";
import { AqayePardakhtProvider, normalizePin } from "@/lib/plus/payments/aqayepardakht";

/**
 * آداپتورِ آقای پرداخت، با fetchِ ساختگی. شکلِ پاسخ‌ها همان است که API واقعی
 * (و حالتِ sandboxش) برمی‌گرداند: 200 برای موفق، 422 با `{status:"error",code}`
 * برای خطا، و 403 HTML از فایروالِ ArvanCloud.
 */

const REAL_PIN = "AEF16BF3E59DAA4BB7F0";
const realFetch = globalThis.fetch;

type Sent = { url: string; body: Record<string, unknown>; headers: Record<string, string> };

function mockFetch(reply: (sent: Sent) => { status: number; body: string; type?: string }) {
  const sent: Sent[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const s: Sent = {
      url: String(url),
      body: JSON.parse(String(init.body)),
      headers: init.headers as Record<string, string>,
    };
    sent.push(s);
    const r = reply(s);
    return new Response(r.body, { status: r.status, headers: { "content-type": r.type ?? "application/json" } });
  }) as typeof fetch;
  return sent;
}

function captureLogs() {
  const lines: string[] = [];
  // pretty: false = همان خطِ JSONی که production می‌نویسد.
  configureLogger({ level: "debug", pretty: false, write: (line) => lines.push(line) });
  return lines;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  resetLogger();
});

const provider = (pin: string | null) => new AqayePardakhtProvider(async () => pin);

const createInput = {
  orderId: "5f0c9d5e-1111-4222-8333-444455556666",
  orderNumber: "SRV-000012",
  amountRials: 100_000,
  description: "سروا پلاس — پلن تست پرداخت",
  returnUrl: "https://sarvaedu.ir/payment/return?order=5f0c9d5e-1111-4222-8333-444455556666",
};

const verifyInput = (returnParams: Record<string, string> = {}, redirectedAt: string | null = null) => ({
  orderId: createInput.orderId,
  amountRials: 100_000,
  providerRef: "YZAOR",
  returnParams,
  redirectedAt,
});

test("normalizePin: نویسه‌های نامرئی، ارقام فارسی و sandbox", () => {
  assert.equal(normalizePin(" sandbox\n"), "sandbox");
  assert.equal(normalizePin("‏SandBox‎"), "sandbox");
  assert.equal(normalizePin('"sandbox"'), "sandbox");
  assert.equal(normalizePin("AEF۱۶BF۳E۵۹DAA۴BB۷F۰"), REAL_PIN);
  assert.equal(normalizePin("‫AEF16BF3E59DAA4BB7F0‬"), REAL_PIN);
  assert.equal(normalizePin("   "), null);
  assert.equal(normalizePin(null), null);
});

test("create در sandbox: بدنه، واحدِ تومان و آدرسِ startpay/sandbox", async () => {
  const sent = mockFetch(() => ({ status: 200, body: '{"status":"success","transid":"YZAOR"}' }));
  const result = await provider(" Sandbox ").createPayment(createInput);

  assert.deepEqual(result, {
    ok: true,
    providerRef: "YZAOR",
    redirectUrl: "https://panel.aqayepardakht.ir/startpay/sandbox/YZAOR",
  });
  assert.equal(sent[0].url, "https://panel.aqayepardakht.ir/api/v2/create");
  assert.equal(sent[0].body.pin, "sandbox");
  assert.equal(sent[0].body.amount, 10_000); // ریال ÷ ۱۰
  assert.equal(sent[0].body.callback, createInput.returnUrl);
  assert.equal(sent[0].body.callback_method, "POST");
  assert.equal(sent[0].body.invoice_id, "SRV-000012");
  assert.ok(sent[0].headers.referer, "Referer لازم است (کد ‎-16‎)");
});

test("create با پینِ واقعی به startpay اصلی می‌رود", async () => {
  mockFetch(() => ({ status: 200, body: '{"status":"success","transid":"AB12C"}' }));
  const result = await provider(REAL_PIN).createPayment(createInput);
  assert.equal(result.ok && result.redirectUrl, "https://panel.aqayepardakht.ir/startpay/AB12C");
});

test("create ناموفق: کدِ درگاه در errorCode و لاگ، پین هیچ‌جا", async () => {
  mockFetch(() => ({ status: 422, body: '{"status":"error","code":"-6"}' }));
  const logs = captureLogs();
  const result = await provider(REAL_PIN).createPayment(createInput);

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.errorCode, "ap_-6");
  assert.equal(!result.ok && result.errorMessage, "ارتباط با درگاه پرداخت برقرار نشد.");

  const log = logs.join("\n");
  assert.match(log, /aqayepardakht\.create_failed/);
  assert.match(log, /"provider_code":"-6"/);
  assert.match(log, /پین درگاه اشتباه است/);
  assert.match(log, /"http_status":422/);
  assert.ok(!log.includes(REAL_PIN), "پین نباید لاگ شود");
});

test("create: صفحهٔ HTMLِ فایروال خطای ۵۰۰ نمی‌سازد و خوانا لاگ می‌شود", async () => {
  mockFetch(() => ({ status: 403, body: "<!DOCTYPE html><html>ArvanCloud</html>", type: "text/html" }));
  const logs = captureLogs();
  const result = await provider("sandbox").createPayment(createInput);

  assert.equal(!result.ok && result.errorCode, "ap_http_403");
  assert.match(logs.join("\n"), /پاسخ JSON نبود/);
});

test("create: خطای شبکه پرتاب نمی‌شود", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const logs = captureLogs();
  const result = await provider("sandbox").createPayment(createInput);
  assert.equal(!result.ok && result.errorCode, "ap_network");
  assert.match(logs.join("\n"), /خطای شبکه/);
});

test("create: بدونِ پین یا با مبلغِ کمتر از ۱۰۰۰ تومان اصلاً درخواست نمی‌رود", async () => {
  const sent = mockFetch(() => ({ status: 500, body: "" }));
  captureLogs();
  const noPin = await provider(null).createPayment(createInput);
  const tooSmall = await provider("sandbox").createPayment({ ...createInput, amountRials: 9_990 });
  assert.equal(!noPin.ok && noPin.errorCode, "ap_no_pin");
  assert.equal(!tooSmall.ok && tooSmall.errorCode, "ap_amount");
  assert.equal(sent.length, 0);
});

test("callback: transid از پارامترهای بازگشت خوانده می‌شود", () => {
  const p = provider("sandbox");
  assert.equal(p.refFromReturn({ transid: "YZAOR", status: "1", tracking_number: "123" }), "YZAOR");
  assert.equal(p.refFromReturn({ transid: "../x" }), null);
  assert.equal(p.refFromReturn({}), null);
});

test("verify موفق (۱) و تکراری (۲) هر دو verified", async () => {
  // پاسخ‌ها همان‌اند که sandbox واقعی داد: ۱ با 200/success، ۲ با 422/error.
  const replies = [
    { status: 200, body: '{"status":"success","code":"1"}' },
    { status: 422, body: '{"status":"error","code":"2"}' },
  ];
  for (const reply of replies) {
    const sent = mockFetch(() => reply);
    const r = await provider("sandbox").verifyPayment(verifyInput({ transid: "YZAOR", tracking_number: "987654" }));
    assert.equal(r.state, "verified");
    assert.equal(r.trackingId, "987654");
    assert.equal(r.paidAmountRials, 100_000);
    assert.deepEqual(sent[0].body, { pin: "sandbox", amount: 10_000, transid: "YZAOR" });
    assert.equal(sent[0].url, "https://panel.aqayepardakht.ir/api/v2/verify");
  }
});

test("verify کدِ ۰ بعد از بازگشت = لغو", async () => {
  mockFetch(() => ({ status: 422, body: '{"status":"error","code":"0"}' }));
  const r = await provider("sandbox").verifyPayment(verifyInput({ transid: "YZAOR", status: "0" }));
  assert.equal(r.state, "cancelled");
});

test("بررسیِ دوبارهٔ زودهنگام به درگاه درخواست نمی‌فرستد (verify تراکنشِ باز را باطل می‌کند)", async () => {
  const sent = mockFetch(() => ({ status: 422, body: '{"status":"error","code":"0"}' }));
  const p = provider("sandbox");

  const early = await p.getPaymentStatus(verifyInput({}, new Date().toISOString()));
  assert.equal(early.state, "pending");
  assert.equal(sent.length, 0);

  // بعد از مهلت: می‌پرسد، و ۰ یعنی رها شده.
  const old = new Date(Date.now() - 60 * 60_000).toISOString();
  assert.equal((await p.getPaymentStatus(verifyInput({}, old))).state, "cancelled");
  assert.equal(sent.length, 1);

  // اگر درگاه برگشته (transid در پارامترها)، مهلت مهم نیست.
  mockFetch(() => ({ status: 200, body: '{"status":"success","code":"1"}' }));
  const back = await p.getPaymentStatus(verifyInput({ transid: "YZAOR" }, new Date().toISOString()));
  assert.equal(back.state, "verified");
});

test("verify با خطای پیکربندی (مثلاً ‎-10‎) نامعلوم است، نه ناموفق، و لاگ می‌شود", async () => {
  mockFetch(() => ({ status: 422, body: '{"status":"error","code":"-10"}' }));
  const logs = captureLogs();
  const r = await provider(REAL_PIN).verifyPayment(verifyInput({ transid: "YZAOR" }));
  assert.equal(r.state, "unknown");
  assert.equal(r.errorCode, "ap_-10");
  const log = logs.join("\n");
  assert.match(log, /verify_failed/);
  assert.ok(!log.includes(REAL_PIN));
});
