import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { screenRow } from "@/lib/kimia/pool";

/* ═══════════════════════════════════════════════════════════════════════════
   بیت‌های مخصوصِ کیمیا (`kimia_verses`) — و اینکه با هیچ بانکِ دیگری قاطی
   نشوند.
   ═══════════════════════════════════════════════════════════════════════════

   `lib/kimia/seed-data/ganjoor-verses.json` همان فایلی است که
   `npm run db:seed-kimia` جدولِ `kimia_verses` را با آن پر می‌کند. دو چیز
   سنجیده می‌شود:

     • هر بیتش در کیمیا قابلِ بازی است (همان غربالِ بازی)
     • هیچ‌کدام در بانکِ «آزمون وزن شعر» نیست، و اسکریپت و خواننده‌اش هیچ‌وقت
       به جدول‌های آزمون، «کوتاه یا بلند؟» و «پلِ وزن» دست نمی‌زنند
   ═══════════════════════════════════════════════════════════════════════════ */

type SeedVerse = { verse: string[]; ark: string; source?: string };

const ROOT = process.cwd();
const verses = JSON.parse(
  readFileSync(join(ROOT, "lib/kimia/seed-data/ganjoor-verses.json"), "utf8"),
) as SeedVerse[];

function norm(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[يۍى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ْٰ]/g, "")
    .replace(/‌/g, " ")
    .replace(/[،,.!؟?«»"'():؛;\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test("هر بیتِ کیمیا در همان غربالِ بازی قبول می‌شود", () => {
  assert.ok(verses.length > 1000, `فایل کوچک شده: ${verses.length}`);
  for (const [i, v] of verses.entries()) {
    const screened = screenRow({
      id: `v-${i}`,
      source: "kimia",
      type: "poem-to-audio",
      poem: v.verse,
      audio_url: null,
      option_poem: null,
      option_audio_url: `/audio/${v.ark.replace(/\s+/g, "-")}.mp3`,
    });
    assert.ok(screened.ok, `ردیف ${i + 1} (${v.ark}): ${screened.ok ? "" : screened.reason}`);
    assert.equal(screened.candidate.source, "kimia");
    assert.equal(screened.candidate.verse.length, 2);
    for (const line of v.verse) assert.ok([...line].length <= 300);
  }
});

test("رباعی وارد نشده — پاسخِ بازی شکلِ متعارف است و مصراع‌های رباعی گونه دارند", () => {
  assert.equal(verses.filter((v) => v.ark === "مفعول مفاعیل مفاعیل فعل").length, 0);
});

test("بیتِ تکراری نیست", () => {
  const keys = new Set<string>();
  for (const v of verses) {
    const key = `${norm(v.verse[0])} / ${norm(v.verse[1])}`;
    assert.ok(!keys.has(key), `تکراری: ${key}`);
    keys.add(key);
  }
});

test("⚠️ هیچ بیتی از کیمیا در بانکِ «آزمون وزن شعر» نیست", () => {
  type Opt = { poem?: string[] };
  const bank = JSON.parse(
    readFileSync(join(ROOT, "lib/quiz/seed-data/aruz-questions.json"), "utf8"),
  ) as { poem?: string[]; options: Opt[] }[];
  const inBank = new Set<string>();
  for (const q of bank) {
    for (const p of [q.poem, ...q.options.map((o) => o.poem)]) {
      if (p) for (const line of p) inBank.add(norm(line));
    }
  }
  for (const v of verses) {
    for (const line of v.verse) assert.ok(!inBank.has(norm(line)), `در بانکِ آزمون هم هست: ${line}`);
  }
});

test("⚠️ seed و خوانندهٔ کیمیا فقط kimia_verses را می‌نویسند؛ بانک‌های دیگر فقط خوانده می‌شوند", () => {
  const seed = readFileSync(join(ROOT, "scripts/seed-kimia.ts"), "utf8");
  const reader = readFileSync(join(ROOT, "lib/kimia/server/source.ts"), "utf8");

  const writes = /\b(insert\s+into|update|delete\s+from|replace\s+into)\s+`?([a-z_]+)/gi;
  const writtenBySeed = [...seed.matchAll(writes)].map((m) => m[2].toLowerCase());
  assert.deepEqual([...new Set(writtenBySeed)], ["kimia_verses"]);

  // خواننده هیچ‌جا نمی‌نویسد
  assert.equal([...reader.matchAll(writes)].length, 0);

  // و به جدول‌های «کوتاه یا بلند؟» و «پلِ وزن» اصلاً کاری ندارد — نه خواندن
  // نه نوشتن. (فقط SQL؛ توضیحاتِ اسکریپت نامِ آن جدول‌ها را عمداً می‌برند.)
  const touches = /\b(from|join|into|update)\s+`?aruz_(rapid|bridge)/i;
  for (const text of [seed, reader]) assert.ok(!touches.test(text));
});
