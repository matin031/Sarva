// بیت‌های مخصوصِ «کیمیای وزن» را در `kimia_verses` می‌ریزد — و فقط آنجا.
//
// اجرا:
//     npm run db:seed-kimia
//
// ⚠️ چرا جدولِ جدا و نه `questions`:
//
// `questions` بانکِ «آزمون وزن شعر» است و `/quiz`، تکلیف‌های دبیر و
// گزارش‌ها همه‌اش را می‌خوانند. بیتی که فقط برای کیمیا آمده اگر آنجا بنشیند،
// بی‌صدا واردِ آزمون می‌شود. «کوتاه یا بلند؟» (`aruz_rapid_questions`) و
// «پلِ وزن» (جدول‌های `aruz_bridge_*`) هم جدول‌های خودشان را دارند. این
// اسکریپت هیچ‌کدام از آن‌ها را نه می‌خواند و نه می‌نویسد.
//
// ⚠️ سه تصمیم که عمدی‌اند:
//
// ۱) **افزودنی است، نه جایگزین.** ردیفِ موجود دست نمی‌خورد؛ اگر مدیر بیتی
//    را از انتشار برداشته باشد، اجرای دوباره برش نمی‌گرداند.
//
// ۲) **بی‌خطر در اجرای دوباره.** کلیدِ هر بیت اثرانگشتِ متنِ یکسان‌سازی‌شدهٔ
//    آن است (`source_key`، یکتا در ۰۲۵).
//
// ۳) **هیچ بیتی بی‌غربال وارد نمی‌شود.** همان `screenRow` که بازی با آن
//    نامزدها را می‌سنجد اینجا هم اجرا می‌شود؛ وزنی که صدا یا جدولِ اوزان
//    ندارد، پیش از هر درجی کلِ اجرا را متوقف می‌کند.
//
// دادهٔ خام: `lib/kimia/seed-data/ganjoor-verses.json` — بیت‌های گنجور که وزنِ
// برچسبِ گنجورشان را موتورِ عروضِ مخزن (`lib/aruz`) هم در سطحِ غزل تأیید
// کرده است.

import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { RowDataPacket } from "mysql2/promise";

import { connect } from "./mysql/script-db.mjs";
import { screenRow } from "../lib/kimia/pool";
import { normalizeFoot } from "../lib/kimia/catalog";
import seedData from "../lib/kimia/seed-data/ganjoor-verses.json";

type SeedVerse = { verse: string[]; ark: string; source?: string };
type KeyRow = RowDataPacket & { source_key: string };
type CountRow = RowDataPacket & { meter_ark: string; n: number };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const MAX_LINE = 300; // همان VARCHAR(300) در ۰۲۵

/** یکسان‌سازی برای اثرانگشت: «ی/ي»، اعراب، نیم‌فاصله و نشانه‌ها بی‌اثرند. */
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

function sourceKey(lines: readonly string[]): string {
  return createHash("sha1").update(`${norm(lines[0])} / ${norm(lines[1])}`).digest("hex");
}

function audioFile(ark: string): string {
  return `${ark.trim().replace(/\s+/g, "-")}.mp3`;
}

async function main() {
  const seeds = seedData as SeedVerse[];

  // ── ۱) اعتبارسنجیِ کلِ فایل، پیش از اتصال
  const problems: string[] = [];
  const keys = new Map<string, number>();
  seeds.forEach((s, i) => {
    const where = `ردیف ${i + 1}`;
    const lines = (s.verse ?? []).map((l) => (typeof l === "string" ? l.trim() : ""));
    if (lines.length !== 2 || lines.some((l) => l.length === 0)) {
      problems.push(`${where}: بیت باید دقیقاً دو مصراعِ ناتهی باشد`);
      return;
    }
    if (lines.some((l) => [...l].length > MAX_LINE)) problems.push(`${where}: مصراع بلندتر از ${MAX_LINE} نویسه`);
    if (s.ark !== normalizeFoot(s.ark)) problems.push(`${where}: ارکان یکسان‌سازی نشده است («${s.ark}»)`);
    const screened = screenRow({
      id: `seed-${i}`,
      source: "kimia",
      type: "poem-to-audio",
      poem: lines,
      audio_url: null,
      option_poem: null,
      option_audio_url: `/audio/${audioFile(s.ark)}`,
    });
    if (!screened.ok) problems.push(`${where}: در کیمیا قابلِ بازی نیست (${screened.reason})`);
    if (!existsSync(join(AUDIO_DIR, audioFile(s.ark)))) problems.push(`${where}: فایلِ صوتیِ «${s.ark}» نیست`);
    const key = sourceKey(lines);
    const dup = keys.get(key);
    if (dup !== undefined) problems.push(`${where}: تکراریِ ردیف ${dup + 1}`);
    keys.set(key, i);
  });
  if (problems.length) {
    console.error(`✗ ${problems.length} ایراد در دادهٔ seed:`);
    for (const p of problems.slice(0, 20)) console.error("   " + p);
    process.exit(1);
  }

  const conn = await connect();
  try {
    // ── ۲) آنچه از قبل هست
    const [existing] = await conn.execute<KeyRow[]>(`select source_key from kimia_verses`);
    const seen = new Set(existing.map((r) => r.source_key));
    const fresh = seeds.filter((s) => !seen.has(sourceKey(s.verse)));
    console.log(
      `فایل: ${seeds.length} بیت · از قبل موجود: ${seeds.length - fresh.length} · تازه: ${fresh.length}`,
    );

    // ── ۳) درج — همه یا هیچ
    if (fresh.length) {
      await conn.beginTransaction();
      try {
        for (const s of fresh) {
          const lines = s.verse.map((l) => l.trim());
          await conn.execute(
            `insert into kimia_verses (id, source_key, line_1, line_2, meter_ark, source_url)
             values (?, ?, ?, ?, ?, ?)`,
            [randomUUID(), sourceKey(lines), lines[0], lines[1], s.ark, s.source ?? null],
          );
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    }

    // ── ۴) بسامدِ هر وزن در جدول
    const [counts] = await conn.execute<CountRow[]>(
      `select meter_ark, count(*) as n
         from kimia_verses
        where is_published = 1
        group by meter_ark
        order by n desc, meter_ark`,
    );
    const total = counts.reduce((sum, r) => sum + Number(r.n), 0);
    console.log(`✓ ${fresh.length} بیت افزوده شد. اکنون ${total} بیتِ منتشرشده در kimia_verses:`);
    for (const r of counts) console.log(`   ${String(r.n).padStart(4)}  ${r.meter_ark}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
