import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readCappedText, DEFAULT_MAX_JSON_BYTES } from "@/lib/api/read-capped";

/**
 * خواندنِ سقف‌دارِ بدنه.
 *
 * ⚠️ `readJson` قبلاً `await request.json()` بود — کلِ بدنه بی‌قید در حافظه،
 * پیش از هر اعتبارسنجی. یک POST با بدنهٔ چندصد مگابایتی همان‌قدر RAM از
 * فرایند می‌گرفت و چند درخواستِ هم‌زمان کانتینر را OOM می‌کرد.
 *
 * دو سناریو مهم‌اند و هر دو اینجا هستند:
 *
 *   • بدنه با `Content-Length` بزرگ  → پیش از خواندن رد می‌شود
 *   • بدنهٔ chunked بدونِ `Content-Length` → حین خواندن شمرده و لغو می‌شود
 *
 * دومی همانی است که یک مهاجم واقعاً می‌فرستد، چون هدر را می‌شود نفرستاد یا
 * دروغ گفت.
 */

/** یک Request با بدنهٔ آمادهٔ کامل — یعنی Content-Length دارد. */
function withLength(body: string): Request {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

/** یک Request با بدنهٔ جریانی — یعنی Content-Length ندارد (chunked). */
function chunked(chunks: string[]): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    // @ts-expect-error — undici لازم دارد وقتی بدنه یک stream است
    duplex: "half",
  });
}

describe("خواندنِ سقف‌دارِ بدنهٔ JSON", () => {
  test("بدنهٔ کوچک کامل خوانده می‌شود", async () => {
    const body = JSON.stringify({ a: "سلام" });
    assert.equal(await readCappedText(withLength(body), DEFAULT_MAX_JSON_BYTES), body);
  });

  test("بدنهٔ بزرگ با Content-Length پیش از خواندن رد می‌شود", async () => {
    const body = JSON.stringify({ a: "x".repeat(DEFAULT_MAX_JSON_BYTES + 1000) });
    assert.equal(await readCappedText(withLength(body), DEFAULT_MAX_JSON_BYTES), null);
  });

  test("بدنهٔ chunked بدونِ Content-Length هم رد می‌شود", async () => {
    // هیچ هدرِ طولی در کار نیست؛ تنها راه، شمردنِ بایت‌ها حین خواندن است.
    const piece = "y".repeat(4 * 1024);
    const chunks = Array.from({ length: 20 }, () => piece); // ۸۰ کیلوبایت
    assert.equal(await readCappedText(chunked(chunks), DEFAULT_MAX_JSON_BYTES), null);
  });

  test("بدنهٔ chunkedِ کوچک درست سرِ هم می‌شود", async () => {
    const text = await readCappedText(chunked(['{"a":', '"تکه‌تکه"', "}"]), DEFAULT_MAX_JSON_BYTES);
    assert.equal(text, '{"a":"تکه‌تکه"}');
    assert.equal(JSON.parse(text!).a, "تکه‌تکه");
  });

  test("سقفِ سفارشی رعایت می‌شود", async () => {
    const body = JSON.stringify({ a: "z".repeat(500) });
    assert.equal(await readCappedText(withLength(body), 100), null);
    assert.equal(await readCappedText(withLength(body), 4096), body);
  });

  test("Content-Lengthِ دروغینِ کوچک نجاتش نمی‌دهد", async () => {
    // هدر می‌گوید ۱۰ بایت، بدنه ۸۰ کیلوبایت است. سدِ دوم باید بگیردش.
    const piece = "y".repeat(4 * 1024);
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "10" },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          const enc = new TextEncoder();
          for (let i = 0; i < 20; i++) controller.enqueue(enc.encode(piece));
          controller.close();
        },
      }),
      // @ts-expect-error — undici لازم دارد وقتی بدنه یک stream است
      duplex: "half",
    });
    assert.equal(await readCappedText(req, DEFAULT_MAX_JSON_BYTES), null);
  });
});
