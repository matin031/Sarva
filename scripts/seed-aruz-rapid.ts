#!/usr/bin/env node
/**
 * seedِ «کوتاه یا بلند؟» — مصراع‌های تقطیع‌شده.
 *
 *   npm run db:seed-aruz-rapid                                  # اجرا روی DATABASE_URL
 *   npm run db:seed-aruz-rapid -- --sql > deploy/aruz-rapid-abyat.sql   # برای phpMyAdmin
 *
 * منبع: دو سندِ `public/ابیات بر اساس وزن_های عروضی … (اعراب_گذاری_شده).docx`.
 * اعرابِ سندها بازبینی شده و هر مصراع با وزنِ خودش سنجیده شده است؛ نتیجه در
 * `scripts/aruz-rapid/abyat.json` است، هجاها به همان قالبِ پنل («تَ=U وا=-»،
 * اختیارِ شاعری با «!» و «^»). مصراع‌هایی که با هیچ خوانشِ معتبری در وزن
 * نمی‌نشستند یا بیش از سه اختیار داشتند، در این فایل نیستند.
 *
 * ⚠️ شناسه از خودِ متنِ مصراع ساخته می‌شود تا روی هر دیتابیسی یکی باشد —
 * تکلیف‌های دبیر به شناسهٔ مصراع وصل‌اند. هیچ ردیفی پاک نمی‌شود و ویرایشِ
 * مدیر بازنویسی نمی‌شود: هر UPDATE فقط وقتی می‌خورد که هجاهای ذخیره‌شده
 * همان خروجیِ seedِ قبلی باشد. پس اجرای دوباره بی‌اثر است.
 */
import { createHash } from "node:crypto";
import mysql from "mysql2";
import { connect } from "./mysql/script-db.mjs";
import data from "./aruz-rapid/abyat.json";
import { parseUnitSpec, unitPattern, type ParsedUnit } from "../lib/aruz-rapid/units";
import { fitMeter } from "../lib/aruz-rapid/scan";

type Entry = {
  key: string;
  text: string;
  units: string;
  meter: string;
  poet: string;
  note: string;
  /** متنِ پیشین، وقتی اعرابِ خودِ مصراع اصلاح شده («نِه» → «نَه»). */
  was?: { text: string; units: string };
};

const asSql = process.argv.includes("--sql");

/** uuid نسخهٔ ۵-مانند از متن: روی هر دیتابیسی همان. */
function idFor(text: string): string {
  const h = createHash("sha1").update("aruz-rapid:" + text).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const strip = (s: string) => s.replace(/[\s‌-‏]/g, "");

function unitsOf(key: string, spec: string): ParsedUnit[] {
  const parsed = parseUnitSpec(spec);
  if (!parsed.ok) throw new Error(`${key}: ${parsed.error}`);
  return parsed.units;
}

/** هجاها بی‌نشانِ اختیار — همان چیزی که seedِ پیش از اختیارها نوشت. */
const bare = (units: ParsedUnit[]) => JSON.stringify(units.map(({ display, length }) => ({ display, length })));

const rows = (data as Entry[]).map((e, i) => {
  const units = unitsOf(e.key, e.units);
  if (!fitMeter(unitPattern(units), e.meter)) throw new Error(`${e.key}: الگو با «${e.meter}» نمی‌خواند`);
  if (e.text.length > 191) throw new Error(`${e.key}: متن بلندتر از ۱۹۱ نویسه`);
  return {
    id: idFor(e.text),
    text: e.text,
    units: JSON.stringify(units),
    licensed: units.some((u) => u.license),
    bare: bare(units),
    was: e.was && { text: e.was.text, units: bare(unitsOf(e.key, e.was.units)) },
    meter: e.meter,
    poet: e.poet,
    note: e.note || null,
    // هجاها «شنیده‌شده»اند («بودست»، «دِ لَ گَر»)، پس معمولاً با متن یکی نیستند.
    overlap: strip(units.map((u) => u.display).join("")) !== strip(e.text),
    sort: 1000 + i,
  };
});

const COLUMNS =
  "(id, preview_text, units, meter, attribution, explanation, has_unit_overlap, is_published, sort_index)";
// ستونِ JSON در MySQL با رشته برابر نمی‌شود؛ JSON_EXTRACT هر دو طرف را هم‌شکل می‌کند.
const SAME_UNITS = "JSON_EXTRACT(units, '$') = JSON_EXTRACT(?, '$')";

// ۱) مصراعی که متنش اصلاح شده، جای ردیفِ قبلی‌اش می‌نشیند (پیش از درج،
//    وگرنه کلیدِ یکتای متن تکراری می‌شود).
const renames = rows
  .filter((r) => r.was)
  .map((r) =>
    mysql.format(
      `UPDATE aruz_rapid_questions SET preview_text = ?, units = ?, explanation = ?, has_unit_overlap = ?
       WHERE preview_text = ? AND ${SAME_UNITS};`,
      [r.text, r.units, r.note, r.overlap, r.was!.text, r.was!.units],
    ),
  );

// ۲) مصراعِ تازه؛ آن‌چه هست دست نمی‌خورد.
const insert = `INSERT INTO aruz_rapid_questions ${COLUMNS} VALUES\n${rows
  .map((r) =>
    mysql.format("(?, ?, ?, ?, ?, ?, ?, 1, ?)", [r.id, r.text, r.units, r.meter, r.poet, r.note, r.overlap, r.sort]),
  )
  .join(",\n")}\nON DUPLICATE KEY UPDATE id = id;`;

// ۳) نشانِ اختیارِ شاعری روی ردیف‌هایی که پیش از آن seed شده‌اند.
const licenses = rows
  .filter((r) => r.licensed)
  .map((r) =>
    mysql.format(`UPDATE aruz_rapid_questions SET units = ? WHERE preview_text = ? AND ${SAME_UNITS};`, [
      r.units,
      r.text,
      r.bare,
    ]),
  );

async function main() {
  if (asSql) {
    console.log(`-- «کوتاه یا بلند؟»: ${rows.length} مصراع. در phpMyAdmin: دیتابیس ← Import.`);
    console.log("-- ویرایشِ مدیر دست نمی‌خورد؛ اجرای دوباره بی‌اثر است.");
    console.log("SET NAMES utf8mb4;");
    console.log([...renames, insert, ...licenses].join("\n"));
    return;
  }

  const conn = await connect();
  const run = async (sql: string) => ((await conn.query(sql)) as unknown as [{ affectedRows: number }])[0].affectedRows;
  // ⚠️ affectedRows برای «on duplicate key update» بسته به پرچمِ FOUND_ROWS
  // صفر، یک یا دو است؛ شمارشِ پیش و پس از درج قابلِ اعتماد است.
  const count = async () =>
    ((await conn.query("select count(*) as n from aruz_rapid_questions")) as unknown as [{ n: number }[]])[0][0].n;
  let renamed = 0;
  let inserted = 0;
  let marked = 0;
  try {
    for (const sql of renames) renamed += await run(sql);
    const before = await count();
    await run(insert);
    inserted = (await count()) - before;
    for (const sql of licenses) marked += await run(sql);
  } finally {
    await conn.end();
  }
  console.log(
    `کوتاه یا بلند؟: ${inserted} مصراعِ تازه، ${renamed} اصلاحِ متن، ${marked} نشانِ اختیار؛ بقیه از قبل بود و دست نخورد.`,
  );
}

void main();
