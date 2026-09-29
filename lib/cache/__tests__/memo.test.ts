import assert from "node:assert/strict";
import test from "node:test";

import { invalidate, memo } from "../memo";

test("هم‌زمان‌ها فقط یک بار بارگذاری می‌کنند", async () => {
  invalidate();
  let calls = 0;
  const load = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return "v";
  };
  const results = await Promise.all(Array.from({ length: 50 }, () => memo("t:a", 1000, load)));
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r === "v"));
  // تا پایانِ TTL از کش
  assert.equal(await memo("t:a", 1000, load), "v");
  assert.equal(calls, 1);
});

test("پس از TTL دوباره بارگذاری می‌شود", async () => {
  invalidate();
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await memo("t:b", 5, load), 1);
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(await memo("t:b", 5, load), 2);
});

test("خطا کش نمی‌شود", async () => {
  invalidate();
  let calls = 0;
  const load = async () => {
    calls++;
    if (calls === 1) throw new Error("db down");
    return "ok";
  };
  await assert.rejects(memo("t:c", 1000, load), /db down/);
  assert.equal(await memo("t:c", 1000, load), "ok");
});

test("خطای همگامِ load هم به‌صورتِ rejection می‌رسد", async () => {
  invalidate();
  const load = (): Promise<string> => {
    throw new Error("sync");
  };
  await assert.rejects(memo("t:sync", 1000, load), /sync/);
});

test("invalidate با پیشوند فقط همان‌ها را پاک می‌کند", async () => {
  invalidate();
  let x = 0;
  let y = 0;
  await memo("games:x", 1000, async () => ++x);
  await memo("club:y", 1000, async () => ++y);
  invalidate("games:");
  await memo("games:x", 1000, async () => ++x);
  await memo("club:y", 1000, async () => ++y);
  assert.equal(x, 2);
  assert.equal(y, 1);
});

test("بارگذاریِ پیش از invalidate در کش نمی‌نشیند", async () => {
  invalidate();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const stale = memo("t:race", 1000, async () => {
    await gate;
    return "stale";
  });
  invalidate("t:race");
  release();
  assert.equal(await stale, "stale");
  assert.equal(await memo("t:race", 1000, async () => "fresh"), "fresh");
});

test("keep=false یعنی نتیجه کش نمی‌شود", async () => {
  invalidate();
  let calls = 0;
  const load = async () => (++calls, null);
  await memo("t:null", 1000, load, (v) => v !== null);
  await memo("t:null", 1000, load, (v) => v !== null);
  assert.equal(calls, 2);
});
