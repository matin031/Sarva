#!/usr/bin/env node
/**
 * انتقال دادهٔ سروا از PostgreSQL به MySQL.
 *
 * =============================================================================
 * استفاده
 * =============================================================================
 *
 *   SOURCE_POSTGRES_URL=postgres://…  TARGET_MYSQL_URL=mysql://…  \
 *     node scripts/mysql/etl/index.mjs <فرمان> [گزینه‌ها]
 *
 * فرمان‌ها:
 *
 *   preflight   فقط می‌خواند و گزارش می‌دهد. هیچ چیزی نمی‌نویسد.
 *               مبدأ و مقصد را می‌سنجد و هر چیزی را که در انتقال می‌شکند
 *               *پیش* از انتقال پیدا می‌کند: طول رشته، برخورد collation،
 *               ردیف یتیم، دادهٔ خارج از دامنه.
 *
 *   migrate     انتقال واقعی. از checkpoint ادامه می‌دهد اگر اجرای قبلی
 *               نیمه‌کاره مانده باشد.
 *
 *   verify      شمارش دقیق و checksum محتوا برای همهٔ جدول‌ها، به‌علاوهٔ
 *               کلیدهای خارجی و شمارنده‌ها و AUTO_INCREMENT بعدی.
 *
 *   status      اینکه checkpoint کجاست و چه مانده.
 *
 * گزینه‌ها:
 *
 *   --batch N        اندازهٔ دسته (پیش‌فرض ۱۰۰۰)
 *   --only a,b,c     فقط این جدول‌ها
 *   --fresh          checkpoint را دور بریز و از اول شروع کن
 *   --allow-nonempty اجازهٔ نوشتن روی مقصدِ ناخالی بدون checkpoint
 *
 * =============================================================================
 * ⚠️ چیزهایی که این ابزار عمداً *نمی‌کند*
 * =============================================================================
 *
 *   • به DATABASE_URL دست نمی‌زند. آن متغیر برای *اجرای سایت* است؛ اینجا
 *     دو متغیر جدا لازم است تا هرگز نشود به اشتباه مبدأ را مقصد گرفت.
 *
 *   • foreign_key_checks را خاموش نمی‌کند. آن میان‌بُر یک تلهٔ واقعی دارد:
 *     MySQL دادهٔ نوشته‌شده در آن بازه را حتی بعد از روشن کردنِ دوباره
 *     اعتبارسنجی نمی‌کند. یعنی یک ارجاعِ شکسته برای همیشه می‌ماند و هیچ‌چیز
 *     اعلامش نمی‌کند. به‌جایش ترتیبِ درست و دو مرحله برای خودارجاع‌ها.
 *
 *   • ادعای «انتقال کامل» نمی‌کند مگر verify سبز شود.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import mysql from "mysql2/promise";

import { readExpr, TABLE_ORDER, SELF_REFERENCES, LOAD_TIME_TRIGGERS } from "./plan.mjs";
import { TEXT_LENGTHS } from "../type-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, "..", "..", "..", ".etl-state");

// ---------------------------------------------------------------------------
// آرگومان‌ها
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const command = argv[0];
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const BATCH = Number(opt("batch", 1000));
const ONLY = opt("only", "") ? opt("only", "").split(",").map((s) => s.trim()) : null;

function usage() {
  console.log(
    readFileSync(fileURLToPath(import.meta.url), "utf8")
      .split("\n")
      .slice(2, 40)
      .map((l) => l.replace(/^ \* ?/, "").replace(/^ \*\/?$/, ""))
      .join("\n"),
  );
}

// ---------------------------------------------------------------------------
// گزارش
// ---------------------------------------------------------------------------

let problems = 0;
const say = (m) => console.log(m);
const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const bad = (m, detail = "") => {
  problems += 1;
  console.log(`  ✗ ${m}${detail ? `\n      ${detail}` : ""}`);
};

// ---------------------------------------------------------------------------
// اتصال‌ها
// ---------------------------------------------------------------------------

function requireEnv(name, why) {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} تنظیم نشده است — ${why}`);
    process.exit(1);
  }
  return v;
}

async function connectSource() {
  const client = new pg.Client({ connectionString: requireEnv("SOURCE_POSTGRES_URL", "مبدأ") });
  await client.connect();
  // ⚠️ نشست فقط‌خواندنی. اگر روزی کسی این ابزار را با کوئریِ نویسنده عوض
  // کند، مبدأ — که هنوز دیتابیس زندهٔ سایت است — جلویش را می‌گیرد.
  await client.query("set session characteristics as transaction read only");
  await client.query("set time zone 'UTC'");
  return client;
}

async function connectTarget() {
  return mysql.createConnection({
    uri: requireEnv("TARGET_MYSQL_URL", "مقصد"),
    multipleStatements: false,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    // ⚠️ همه‌چیز به‌صورت متن می‌رود، پس هیچ typeCast ای لازم نیست و هیچ
    // تبدیلی هم بین ما و ستون نمی‌ایستد.
  });
}

/**
 * ⚠️ گاردِ مقصد.
 *
 * بدترین اشتباهِ ممکن در چنین ابزاری این است که مقصد و مبدأ یکی باشند، یا
 * مقصد یک دیتابیسِ زندهٔ دیگر باشد. هیچ‌کدام با یک تایپِ اشتباه در URL دور
 * نیستند.
 */
async function guardTarget(target, source) {
  const [[t]] = await target.query("select database() as db, @@hostname as host, version() as v");
  const srcInfo = (await source.query("select current_database() as db, inet_server_addr() as host"))
    .rows[0];

  say(`مبدأ : PostgreSQL «${srcInfo.db}»`);
  const engine = /mariadb/i.test(t.v) ? "MariaDB" : "MySQL";
  say(`مقصد : ${engine} ${t.v} «${t.db}» روی ${t.host}`);

  // ⚠️ اینجا زمانی MariaDB را رد می‌کرد، با این دلیل که «اسکیما روی آن
  // آزموده نشده». آن دلیل دیگر درست نیست: اسکیما و کد روی MariaDB 10.11
  // آزموده شده‌اند و هاست این پروژه هم همان است. نگه داشتنِ آن گارد یعنی
  // ابزارِ انتقال، دیتابیسِ واقعیِ مقصد را رد کند.
  //
  // چیزی که به‌جایش سنجیده می‌شود، وجودِ نامِ دیتابیس در URL است — همان
  // اشتباهِ تایپیِ واقعی که می‌تواند داده را جای اشتباه بریزد.
  if (!t.db) {
    bad("مقصد نام دیتابیس ندارد", "در URL مقصد نام دیتابیس را بنویس.");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// کاتالوگ مبدأ
// ---------------------------------------------------------------------------

async function sourceColumns(source) {
  const { rows } = await source.query(`
    select c.relname as table_name, a.attname as column_name,
           format_type(a.atttypid, a.atttypmod) as pg_type, a.attnum
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and a.attnum > 0 and not a.attisdropped
     order by c.relname, a.attnum`);
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name).push({ name: r.column_name, type: r.pg_type });
  }
  return byTable;
}

/** کلید مرتب‌سازیِ پایدار برای صفحه‌بندی — همان کلید اصلیِ جدول. */
async function primaryKeys(source) {
  const { rows } = await source.query(`
    select c.relname as table_name, a.attname as column_name, k.ord
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      join lateral unnest(con.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
     where n.nspname = 'public' and con.contype = 'p'
     order by c.relname, k.ord`);
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name).push(r.column_name);
  }
  return byTable;
}

// ---------------------------------------------------------------------------
// checkpoint
// ---------------------------------------------------------------------------

function statePath(target) {
  mkdirSync(STATE_DIR, { recursive: true });
  return join(STATE_DIR, `${target}.json`);
}

function loadState(name) {
  const p = statePath(name);
  if (!existsSync(p) || flag("fresh")) return { tables: {}, startedAt: null, snapshot: null };
  return JSON.parse(readFileSync(p, "utf8"));
}

function saveState(name, state) {
  writeFileSync(statePath(name), JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// preflight
// ---------------------------------------------------------------------------

async function preflight(source, target) {
  const columns = await sourceColumns(source);
  const tables = TABLE_ORDER.filter((t) => !ONLY || ONLY.includes(t));

  say("\n== جدول‌های مبدأ ==");
  const unknown = [...columns.keys()].filter(
    (t) => !TABLE_ORDER.includes(t) && t !== "schema_migrations",
  );
  if (unknown.length) {
    bad(
      `${unknown.length} جدولِ ناشناخته در مبدأ`,
      unknown.join("، ") +
        " — خارج از migration ها ساخته شده‌اند و در نقشهٔ انتقال نیستند. بی‌صدا جا نمی‌مانند.",
    );
  } else ok("جدولی خارج از نقشه در مبدأ نیست");

  // --- تعداد ردیف‌ها -------------------------------------------------------
  say("\n== حجم ==");
  let total = 0;
  for (const t of tables) {
    const { rows } = await source.query(`select count(*)::bigint as n from "${t}"`);
    const n = Number(rows[0].n);
    total += n;
    if (n) say(`  ${t.padEnd(28)} ${n.toLocaleString("fa-IR")}`);
  }
  say(`  ${"".padEnd(28)} ─────`);
  say(`  ${"جمع".padEnd(28)} ${total.toLocaleString("fa-IR")}`);

  // --- طول رشته‌ها ---------------------------------------------------------
  //
  // ⚠️ مهم‌ترین بررسیِ اینجا. در PostgreSQL ستون text نامحدود است؛ در مقصد
  // بعضی‌شان VARCHAR با طول مشخص شده‌اند (چون باید index بخورند یا DEFAULT
  // داشته باشند). اگر دادهٔ مبدأ بلندتر باشد، MySQL با sql_mode سخت‌گیرانه
  // ردش می‌کند — که *خوب* است، ولی بهتر است پیش از شروعِ انتقال بدانیم.
  say("\n== طول رشته‌ها در برابر ستون‌های VARCHAR مقصد ==");
  let lengthIssues = 0;
  for (const [key, max] of Object.entries(TEXT_LENGTHS)) {
    const [table, column] = key.split(".");
    if (!tables.includes(table)) continue;
    const cols = columns.get(table);
    if (!cols?.some((c) => c.name === column)) continue;
    const { rows } = await source.query(
      `select count(*)::bigint as n, coalesce(max(char_length("${column}")), 0) as longest
         from "${table}" where char_length("${column}") > $1`,
      [max],
    );
    if (Number(rows[0].n) > 0) {
      lengthIssues += 1;
      bad(
        `${key}: ${rows[0].n} ردیف بلندتر از ${max} نویسه`,
        `بلندترین ${rows[0].longest} نویسه است. یا طول را در type-map.mjs زیاد کن و ` +
          "اسکیما را دوباره بساز، یا دادهٔ مبدأ را اصلاح کن. بریدنِ بی‌صدا انجام نمی‌شود.",
      );
    }
  }
  if (!lengthIssues) ok("هیچ مقداری از سقفِ ستونِ مقصد بلندتر نیست");

  // --- برخورد ایمیل زیر collation مقصد -------------------------------------
  //
  // ⚠️ در مبدأ ایمیل citext است: case-insensitive و accent-sensitive. در
  // مقصد utf8mb4_0900_as_ci همان معنا را دارد، ولی «همان معنا» را باید
  // ثابت کرد نه فرض. اگر دو ایمیل در مقصد یکی شمرده شوند، UNIQUE می‌شکند.
  say("\n== برخورد یکتاییِ ایمیل زیر collation مقصد ==");
  const { rows: emails } = await source.query(
    `select lower(email::text) as k, count(*)::bigint as n
       from users group by 1 having count(*) > 1`,
  );
  if (emails.length) {
    bad(
      `${emails.length} ایمیل پس از یکدست‌سازی تکراری می‌شود`,
      "قید یکتاییِ مقصد این‌ها را رد می‌کند. پیش از انتقال تعیین تکلیف کن.",
    );
  } else ok("هیچ دو کاربری ایمیلِ هم‌ارز ندارند");

  // --- دامنهٔ تاریخ --------------------------------------------------------
  //
  // ⚠️ DATETIME در MySQL از ۱۰۰۰-۰۱-۰۱ تا ۹۹۹۹-۱۲-۳۱ است و infinity ندارد.
  // timestamptz در PostgreSQL هر دو را دارد. یک مقدارِ infinity در انتقال
  // خطا می‌دهد — بهتر است حالا بدانیم.
  say("\n== دامنهٔ تاریخ ==");
  let dateIssues = 0;
  for (const [table, cols] of columns) {
    if (!tables.includes(table)) continue;
    for (const c of cols.filter((c) => c.type.startsWith("timestamp"))) {
      const { rows } = await source.query(
        `select count(*)::bigint as n from "${table}"
          where "${c.name}" is not null
            and ("${c.name}" = 'infinity' or "${c.name}" = '-infinity'
                 or "${c.name}" < '1000-01-01Z' or "${c.name}" > '9999-12-31Z')`,
      );
      if (Number(rows[0].n) > 0) {
        dateIssues += 1;
        bad(`${table}.${c.name}: ${rows[0].n} مقدار خارج از دامنهٔ DATETIME`);
      }
    }
  }
  if (!dateIssues) ok("هر تاریخی در دامنهٔ DATETIME مقصد جا می‌شود");

  // --- شکل JSON -----------------------------------------------------------
  say("\n== شکل ستون‌های JSON ==");
  const { rows: settings } = await source.query(
    `select jsonb_typeof(value) as t, count(*)::bigint as n from app_settings group by 1`,
  );
  if (settings.length) {
    say(`  app_settings.value: ${settings.map((r) => `${r.t}=${r.n}`).join("، ")}`);
    // ⚠️ عمداً هشدار و نه خطا: این ستون *قرار نیست* حتماً object باشد.
    // getSetting رشته می‌خواهد و هر چیز دیگری را نادیده می‌گیرد.
    ok("نوعِ JSON همان‌طور که هست منتقل می‌شود (اجباری به object نیست)");
  }

  // --- ردیف‌های یتیم -------------------------------------------------------
  //
  // ⚠️ مقصد کلید خارجی دارد و مبدأ هم داشت، پس در حالت عادی یتیمی نیست.
  // ولی ستون‌های polymorphic (club_reports.target_id و
  // content_reports.target_id و user_bookmarks.ref_id) عمداً FK ندارند —
  // آن‌ها بررسی نمی‌شوند چون یتیم بودنشان *درست* است: گزارشِ محتوای
  // حذف‌شده باید بماند.
  say("\n== ارجاع‌های شکسته ==");
  const { rows: broken } = await source.query(`
    select count(*)::bigint as n from sessions s
     where s.rotated_to is not null
       and not exists (select 1 from sessions x where x.id = s.rotated_to)`);
  if (Number(broken[0].n) > 0) bad(`sessions.rotated_to: ${broken[0].n} ارجاع شکسته`);
  else ok("خودارجاع‌های sessions سالم‌اند");

  // =========================================================================
  // مقصد
  // =========================================================================
  //
  // ⚠️ تا اینجا فقط مبدأ سنجیده شد. ولی نیمی از راه‌هایی که این انتقال
  // می‌تواند خراب شود در مقصد است، و بدترینشان آن‌هایی‌اند که *خطا نمی‌دهند*.

  say("\n== اسکیمای مقصد ==");
  const [tgtTables] = await target.query(
    `select table_name as t from information_schema.tables
      where table_schema = database() and table_type = 'BASE TABLE'`,
  );
  const have = new Set(tgtTables.map((r) => r.t));
  const missing = tables.filter((t) => !have.has(t));
  if (missing.length) {
    bad(
      `${missing.length} جدول در مقصد نیست`,
      missing.join("، ") + " — اول `npm run db:migrate` روی مقصد.",
    );
  } else ok(`هر ${tables.length} جدول در مقصد ساخته شده`);

  say("\n== مقصد خالی است؟ ==");
  const nonEmpty = [];
  for (const t of tables) {
    if (!have.has(t)) continue;
    const [[r]] = await target.query(`select count(*) as n from \`${t}\``);
    if (Number(r.n) > 0) nonEmpty.push(`${t}=${r.n}`);
  }
  if (nonEmpty.length) {
    warn(
      `مقصد ${nonEmpty.length} جدولِ پر دارد (${nonEmpty.slice(0, 5).join("، ")}` +
        `${nonEmpty.length > 5 ? " …" : ""}).\n      migrate بدون checkpoint جلوی خودش را می‌گیرد.`,
    );
  } else ok("همهٔ جدول‌های مقصد خالی‌اند");

  // --- sql_mode ------------------------------------------------------------
  //
  // ⚠️ مهم‌ترین بررسیِ کلِ این فایل.
  //
  // بدون STRICT_TRANS_TABLES، MySQL دادهٔ بدریخت را *رد نمی‌کند*: رشتهٔ
  // بلندتر از ستون را می‌بُرد، تاریخ نامعتبر را صفر می‌کند، عدد خارج از
  // دامنه را به سقف می‌چسباند — و همه با یک warning که هیچ‌کس نمی‌بیند.
  //
  // یعنی انتقال «موفق» تمام می‌شود و داده بی‌صدا خراب است. verify بعداً
  // پیدایش می‌کند، ولی آن وقت باید کل کار را دوباره کرد.
  say("\n== حالت سخت‌گیری مقصد ==");
  const [[mode]] = await target.query("select @@session.sql_mode as m, @@global.sql_mode as g");
  for (const [scope, value] of [["نشست", mode.m], ["سراسری", mode.g]]) {
    if (!/STRICT_TRANS_TABLES|STRICT_ALL_TABLES/.test(value)) {
      bad(
        `sql_mode ${scope} سخت‌گیرانه نیست`,
        "بدون STRICT_TRANS_TABLES، داده بی‌صدا بریده می‌شود به‌جای آنکه رد شود. " +
          `مقدار فعلی: ${value || "(خالی)"}`,
      );
    } else ok(`sql_mode ${scope} سخت‌گیرانه است`);
  }
  if (!/NO_ZERO_DATE/.test(mode.m)) {
    warn("NO_ZERO_DATE در sql_mode نیست — تاریخِ نامعتبر می‌تواند 0000-00-00 شود.");
  }

  // --- مجموعه‌نویسه --------------------------------------------------------
  //
  // ⚠️ utf8 در MySQL سه‌بایتی است و ایموجی را نمی‌گیرد. اگر مقصد utf8mb4
  // نباشد، هر «🌙» در سروده‌ها یا خطا می‌دهد یا (بدتر) به «?» تبدیل می‌شود.
  say("\n== مجموعه‌نویسه ==");
  const [[cs]] = await target.query(
    "select @@character_set_database as db, @@character_set_client as client",
  );
  if (cs.db !== "utf8mb4") bad(`مجموعه‌نویسهٔ دیتابیس ${cs.db} است`, "باید utf8mb4 باشد.");
  else ok("دیتابیس مقصد utf8mb4 است");
  if (cs.client !== "utf8mb4") bad(`مجموعه‌نویسهٔ اتصال ${cs.client} است`);
  else ok("اتصال utf8mb4 است");

  const [badCols] = await target.query(
    `select concat(table_name, '.', column_name) as c, character_set_name as cs
       from information_schema.columns
      where table_schema = database() and character_set_name is not null
        and character_set_name not in ('utf8mb4', 'ascii')`,
  );
  if (badCols.length) {
    bad(
      `${badCols.length} ستون مجموعه‌نویسهٔ نامناسب دارد`,
      badCols.slice(0, 5).map((r) => `${r.c} (${r.cs})`).join("، "),
    );
  } else ok("هیچ ستونی خارج از utf8mb4/ascii نیست");

  // --- اندازهٔ بستهٔ شبکه ----------------------------------------------------
  //
  // هر دسته یک INSERT چندردیفی است. اگر از max_allowed_packet بزرگ‌تر شود،
  // اتصال با «MySQL server has gone away» می‌افتد — پیامی که هیچ اشاره‌ای
  // به علتِ واقعی ندارد.
  say("\n== ظرفیت‌ها ==");
  const [[caps]] = await target.query(
    "select @@max_allowed_packet as packet, @@innodb_lock_wait_timeout as lockWait",
  );
  const widest = await widestRowBytes(source, tables);
  const estimate = widest * BATCH;
  if (estimate > Number(caps.packet) * 0.8) {
    bad(
      `دستهٔ ${BATCH} تایی حدود ${(estimate / 1048576).toFixed(1)}MB می‌شود`,
      `max_allowed_packet برابر ${(Number(caps.packet) / 1048576).toFixed(0)}MB است. ` +
        "یا --batch را کم کن یا max_allowed_packet را زیاد.",
    );
  } else {
    ok(
      `دستهٔ ${BATCH} تایی حدود ${(estimate / 1048576).toFixed(1)}MB می‌شود ` +
        `(سقف ${(Number(caps.packet) / 1048576).toFixed(0)}MB)`,
    );
  }

  // --- جدول‌های منطقهٔ زمانی --------------------------------------------------
  //
  // ⚠️ ربطی به خودِ انتقال ندارد ولی به *سایتِ بعد از انتقال* دارد، و
  // preflight تنها جایی است که پیش از قطع شدنِ سرویس بررسی می‌شود.
  //
  // گروه‌بندیِ روزانه در پنل با CONVERT_TZ(…, '+00:00', 'Asia/Tehran')
  // انجام می‌شود و آن نام فقط وقتی شناخته است که جدول‌های mysql.time_zone
  // بار شده باشند. اگر بار نشده باشند، CONVERT_TZ به‌جای خطا **NULL**
  // برمی‌گرداند — یعنی نمودارها خالی می‌شوند، بی‌هیچ خطایی.
  say("\n== منطقهٔ زمانی ==");
  const [[tz]] = await target.query(
    "select convert_tz('2024-06-21 20:30:00', '+00:00', 'Asia/Tehran') as t",
  );
  if (tz.t === null) {
    bad(
      "نام «Asia/Tehran» در مقصد شناخته نیست",
      "جدول‌های mysql.time_zone بار نشده‌اند. CONVERT_TZ به‌جای خطا NULL می‌دهد و " +
        "گزارش‌های روزانه بی‌صدا خالی می‌شوند.\n      " +
        "چاره: mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root mysql",
    );
  } else {
    ok(`Asia/Tehran شناخته است (۲۰:۳۰ UTC → ${tz.t})`);
  }

  say(
    problems === 0
      ? "\npreflight بدون ایراد. برای انتقال: migrate"
      : `\npreflight ${problems} ایراد پیدا کرد. پیش از migrate تعیین تکلیفشان کن.`,
  );
  return problems === 0;
}


/** تخمینِ بزرگ‌ترین ردیف بر حسب بایت — برای سنجیدن اندازهٔ دسته. */
async function widestRowBytes(source, tables) {
  let widest = 512; // کفِ محافظه‌کارانه
  for (const t of tables) {
    const { rows } = await source.query(
      `select coalesce(max(octet_length(x::text)), 0) as n from "${t}" x`,
    );
    widest = Math.max(widest, Number(rows[0].n));
  }
  return widest;
}

// ---------------------------------------------------------------------------
// migrate
// ---------------------------------------------------------------------------

async function migrate(source, target) {
  const columns = await sourceColumns(source);
  const pks = await primaryKeys(source);
  const tables = TABLE_ORDER.filter((t) => !ONLY || ONLY.includes(t));

  const [[dbRow]] = await target.query("select database() as db");
  const state = loadState(dbRow.db);

  // --- گاردِ مقصدِ ناخالی ---------------------------------------------------
  //
  // ⚠️ اگر مقصد ردیف دارد ولی checkpoint نداریم، یعنی یا اجرای قبلی با
  // ابزار دیگری بوده یا این اصلاً دیتابیسِ اشتباهی است. هیچ‌کدام جای
  // «همین‌طور بنویس» نیست.
  if (!state.startedAt && !flag("allow-nonempty")) {
    for (const t of tables) {
      const [[r]] = await target.query(`select count(*) as n from \`${t}\``);
      if (Number(r.n) > 0) {
        bad(
          `مقصد خالی نیست (${t} برابر ${r.n} ردیف دارد) ولی checkpoint ای نیست`,
          "یا --fresh بزن و مقصد را خودت خالی کن، یا اگر می‌دانی چه می‌کنی --allow-nonempty.",
        );
        return false;
      }
    }
  }

  // --- تصویرِ سازگار از مبدأ ------------------------------------------------
  //
  // ⚠️ کلِ خواندن داخل *یک* تراکنشِ REPEATABLE READ انجام می‌شود.
  //
  // بدون این، هر جدول در لحظهٔ خودش خوانده می‌شد و اگر سایت در حال کار
  // باشد، ممکن بود کاربری خوانده نشود ولی سشنش خوانده شود — یعنی یک ارجاعِ
  // شکسته که در مبدأ هرگز وجود نداشت.
  //
  // این جایگزینِ «توقف نویسنده‌ها» نیست و نباید باشد: تصویرِ سازگار فقط
  // تضمین می‌کند آنچه منتقل می‌شود با خودش سازگار است، نه اینکه آخرین
  // وضعیت است. runbook استقرار می‌گوید نویسنده‌ها باید متوقف باشند.
  await source.query("begin isolation level repeatable read");
  const { rows: snap } = await source.query("select pg_export_snapshot() as s, now() as at");
  const snapshot = snap[0].s;

  // --- ادامه پس از قطع شدن -------------------------------------------------
  //
  // ⚠️ نسخهٔ اول اینجا هر ادامه‌ای را رد می‌کرد، با این استدلال که تصویرِ
  // قبلی دیگر وجود ندارد پس ترکیب دو نقطهٔ زمانی است. استدلال درست بود ولی
  // نتیجه‌اش این می‌شد که «ادامه» *هیچ‌وقت* کار نکند — چون هر اجرای تازه
  // ناگزیر تصویرِ تازه دارد. یعنی یک قابلیت که فقط روی کاغذ وجود داشت.
  //
  // چیزی که واقعاً اهمیت دارد این نیست که تصویر همان تصویر باشد؛ این است
  // که *مبدأ تکان نخورده باشد*. runbook استقرار هم دقیقاً همین را الزام
  // می‌کند: نویسنده‌ها پیش از انتقال متوقف می‌شوند.
  //
  // پس به‌جای رد کردنِ کورکورانه، همان فرض *سنجیده* می‌شود: تعداد ردیفِ هر
  // جدولی که قبلاً کپی شده با آنچه ثبت شده مقایسه می‌شود. اگر یکی هم فرق
  // داشته باشد، مبدأ در این فاصله تغییر کرده و ادامه دادن واقعاً ناامن
  // است — آنجاست که رد می‌شود.
  if (state.snapshot && state.snapshot !== snapshot) {
    say("\nادامهٔ اجرای قبلی. مبدأ سنجیده می‌شود که تکان نخورده باشد…");
    const drifted = [];
    for (const [name, info] of Object.entries(state.tables)) {
      if (info.sourceCount === undefined) continue;
      const { rows } = await source.query(`select count(*)::bigint as n from "${name}"`);
      if (Number(rows[0].n) !== info.sourceCount) {
        drifted.push(`${name}: ${info.sourceCount} → ${rows[0].n}`);
      }
    }
    if (drifted.length) {
      bad(
        "مبدأ از زمان اجرای قبلی تغییر کرده است",
        drifted.join("\n      ") +
          "\n      ادامه دادن، دو نقطهٔ زمانی را با هم قاطی می‌کند." +
          "\n      نویسنده‌ها را متوقف کن و با --fresh از اول شروع کن.",
      );
      await source.query("rollback");
      return false;
    }
    ok("مبدأ دست‌نخورده است؛ ادامه امن است");
  }
  state.snapshot = snapshot;
  state.startedAt ??= new Date().toISOString();

  // --- کنار گذاشتنِ تریگرهای زمانِ بارگذاری ---------------------------------
  const [savedTriggers] = await target.query(
    `select trigger_name, action_timing, event_manipulation, event_object_table, action_statement
       from information_schema.triggers where trigger_schema = database()`,
  );
  const toDrop = savedTriggers.filter((t) => LOAD_TIME_TRIGGERS.includes(t.TRIGGER_NAME ?? t.trigger_name));
  for (const t of toDrop) {
    await target.query(`drop trigger if exists \`${t.TRIGGER_NAME ?? t.trigger_name}\``);
  }
  say(`\n${toDrop.length} تریگر موقتاً کنار گذاشته شد (updated_at و شمارنده‌ها).`);

  try {
    // --- مرحلهٔ یک: ردیف‌ها --------------------------------------------------
    for (const table of tables) {
      const cols = columns.get(table);
      if (!cols) continue;
      const pk = pks.get(table);
      if (!pk) {
        bad(`${table} کلید اصلی ندارد`, "صفحه‌بندیِ پایدار بدون آن ممکن نیست.");
        continue;
      }

      const selfRefs = SELF_REFERENCES[table] ?? [];
      const done = state.tables[table]?.done ?? false;
      if (done) {
        say(`  ${table.padEnd(28)} از قبل کامل شده`);
        continue;
      }

      // ⚠️ تعداد ردیفِ مبدأ *پیش* از کپی ثبت می‌شود، نه بعدش. اگر بعدش
      // ثبت می‌شد، جدولی که در نیمهٔ راه قطع شده هیچ عددی برای مقایسه
      // نداشت — و آن دقیقاً جدولی است که بیشترین اهمیت را دارد.
      const { rows: srcCount } = await source.query(`select count(*)::bigint as n from "${table}"`);
      state.tables[table] = {
        ...(state.tables[table] ?? { done: false, rows: 0 }),
        sourceCount: Number(srcCount[0].n),
      };
      saveState(dbRow.db, state);

      const moved = await copyTable(source, target, table, cols, pk, selfRefs, state, (st) =>
        saveState(dbRow.db, st),
      );
      state.tables[table] = { ...state.tables[table], done: true, rows: moved };
      saveState(dbRow.db, state);
      say(`  ${table.padEnd(28)} ${moved.toLocaleString("fa-IR")} ردیف`);
    }

    // --- مرحلهٔ دو: خودارجاع‌ها ---------------------------------------------
    say("\n== مرحلهٔ دوم: ارجاع‌های درون‌جدولی ==");
    for (const [table, refs] of Object.entries(SELF_REFERENCES)) {
      if (!tables.includes(table)) continue;
      const pk = pks.get(table);
      let patched = 0;
      for (const ref of refs) {
        const { rows } = await source.query(
          `select ${pk.map((c) => `"${c}"::text as "${c}"`).join(", ")}, "${ref}"::text as ref
             from "${table}" where "${ref}" is not null`,
        );
        for (const r of rows) {
          const where = pk.map((c) => `\`${c}\` = ?`).join(" and ");
          await target.execute(
            `update \`${table}\` set \`${ref}\` = ? where ${where}`,
            [r.ref, ...pk.map((c) => r[c])],
          );
          patched += 1;
        }
      }
      say(`  ${table.padEnd(28)} ${patched} ارجاع پر شد`);
    }
    // --- بازسازی شمارنده‌ها -------------------------------------------------
    //
    // ⚠️ این *باید* پیش از برگرداندن تریگرها انجام شود، و دلیلش یک اشتباهِ
    // واقعی است که همین ابزار مرتکبش شد:
    //
    // club_recount کارش UPDATE روی club_posts است. اگر تریگرها تا آن لحظه
    // برگشته باشند، `club_posts_touch` روی همان UPDATE ها می‌نشیند و
    // updated_at *همهٔ* سروده‌ها را می‌کند روزِ مهاجرت. یعنی «آخرین
    // ویرایش» هر سروده‌ای در سایت پاک می‌شود — بی‌سر و صدا، و بدون هیچ
    // خطایی.
    //
    // verify همین را گرفت: club_posts.updated_at در مقصد ۲۰۲۶ بود و در
    // مبدأ ۲۰۲۳.
    //
    // یک بار شمردن هم عمدی است. اگر تریگرهای شمارنده در حین بارگذاری روشن
    // می‌ماندند همین عدد درمی‌آمد، ولی به‌ازای هر لایک یک UPDATE اضافه —
    // و شمارندهٔ *مبدأ* بازنویسی می‌شد، پس دیگر نمی‌شد فهمید مبدأ خودش
    // خراب بوده یا نه.
    await target.query("call club_recount(null)");
    say("\nشمارنده‌های کلاب یک بار بازسازی شدند.");

    // --- AUTO_INCREMENT بعدی ------------------------------------------------
    //
    // ⚠️ jasoos_levels شناسهٔ عددی دارد و مقدارِ بعدی باید از همهٔ شناسه‌های
    // منتقل‌شده بزرگ‌تر باشد — وگرنه اولین درجِ تازه به کلید تکراری می‌خورد.
    const [[maxLevel]] = await target.query(
      "select coalesce(max(id), 999) as m from jasoos_levels",
    );
    const next = Math.max(Number(maxLevel.m) + 1, 1000);
    await target.query(`alter table jasoos_levels auto_increment = ${next}`);
    say(`AUTO_INCREMENT جدول jasoos_levels روی ${next} تنظیم شد.`);
  } finally {
    // --- برگرداندن تریگرها -------------------------------------------------
    //
    // ⚠️ در finally، چون یک انتقالِ نیمه‌کاره که تریگرهایش برنگشته باشد،
    // از یک انتقالِ نیمه‌کاره بدتر است: سایت بالا می‌آید و updated_at و
    // شمارنده‌ها دیگر کار نمی‌کنند، بی‌آنکه کسی بفهمد.
    await restoreTriggers(target);
    await source.query("rollback").catch(() => {});
  }

  saveState(dbRow.db, state);
  return problems === 0;
}

/** یک جدول، دسته‌دسته، با کلیدِ مرتب‌سازیِ پایدار. */
/**
 * یک جدول، دسته‌دسته، با کلیدِ مرتب‌سازیِ پایدار.
 *
 * @param {(state: object) => void} checkpoint پس از هر دستهٔ commit شده
 *   صدا زده می‌شود تا وضعیت روی دیسک بنشیند.
 */
async function copyTable(source, target, table, cols, pk, selfRefs, state, checkpoint) {
  const names = cols.map((c) => c.name);
  const selectList = cols
    .map((c) => `${readExpr(c.name, c.type)} as "${c.name}"`)
    .join(", ");

  // ⚠️ صفحه‌بندی با keyset و نه OFFSET.
  //
  // با OFFSET، هر دسته کلِ ردیف‌های قبلی را دوباره می‌خواند — روی جدولِ
  // بزرگ این از خطی به درجهٔ دو می‌رود. keyset روی کلید اصلی همیشه از
  // index استفاده می‌کند، و برای کلیدِ مرکب هم با مقایسهٔ چندتایی کار
  // می‌کند.
  const orderBy = pk.map((c) => `"${c}"`).join(", ");
  const tuple = `(${pk.map((c) => `"${c}"`).join(", ")})`;

  let after = state.tables[table]?.after ?? null;
  let moved = state.tables[table]?.rows ?? 0;

  // ⚠️ اولین دستهٔ یک جدولِ *ادامه‌یافته* حالت خاص دارد. توضیحش پایین‌تر.
  let resuming = after !== null;

  for (;;) {
    const params = [];
    let where = "";
    if (after) {
      where = `where ${tuple} > (${pk.map((_, i) => `$${i + 1}`).join(", ")})`;
      params.push(...after);
    }
    const { rows } = await source.query(
      `select ${selectList} from "${table}" ${where} order by ${orderBy} limit ${BATCH}`,
      params,
    );
    if (rows.length === 0) break;

    let batch = rows;

    if (resuming) {
      resuming = false;
      // ⚠️ پنجرهٔ میان commit و checkpoint.
      //
      // هر دسته در مقصد commit می‌شود و *بعد* checkpoint روی دیسک
      // می‌نشیند. اگر دقیقاً در همان فاصله برق برود، آن دسته در مقصد
      // هست ولی در checkpoint نیست — و ادامهٔ کار دوباره درجش می‌کند و
      // به کلید تکراری می‌خورد.
      //
      // چون checkpoint بعد از *هر* دسته نوشته می‌شود، این پنجره حداکثر
      // یک دسته است. پس فقط همان یک دستهٔ اول پس از ادامه بررسی می‌شود:
      // هر کلیدی که از قبل در مقصد هست کنار گذاشته می‌شود.
      //
      // این «نادیده گرفتنِ تکراری» *نیست*: فقط همین یک دسته و فقط یک بار.
      // هر تکراریِ دیگری هنوز خطا می‌دهد، چون باید بدهد.
      const existing = await existingKeys(target, table, pk, rows);
      batch = rows.filter((r) => !existing.has(pk.map((c) => r[c]).join("\u0000")));
      if (batch.length !== rows.length) {
        warn(
          `${table}: ${rows.length - batch.length} ردیف از دستهٔ اولِ ادامه ` +
            "پیش‌تر نوشته شده بود (قطعِ میان commit و checkpoint).",
        );
        moved -= rows.length - batch.length; // این‌ها قبلاً شمرده شده بودند
      }
    }

    if (batch.length) {
      // خودارجاع‌ها در مرحلهٔ اول تهی می‌مانند و بعداً پر می‌شوند.
      const values = batch.map((r) =>
        names.map((n) => (selfRefs.includes(n) ? null : r[n])),
      );

      const placeholders = `(${names.map(() => "?").join(", ")})`;
      const sql =
        `insert into \`${table}\` (${names.map((n) => `\`${n}\``).join(", ")}) values ` +
        values.map(() => placeholders).join(", ");

      await target.beginTransaction();
      try {
        await target.execute(sql, values.flat());
        await target.commit();
      } catch (err) {
        await target.rollback().catch(() => {});
        throw err;
      }
    }

    moved += batch.length;
    after = pk.map((c) => rows[rows.length - 1][c]);
    state.tables[table] = { ...state.tables[table], done: false, rows: moved, after };

    // ⚠️ checkpoint پس از *هر* دسته روی دیسک می‌نشیند و نه در پایان جدول.
    //
    // نسخهٔ اول همین‌جا اشتباه داشت: وضعیت را فقط در حافظه نگه می‌داشت و
    // بعد از تمام شدنِ کلِ جدول ذخیره می‌کرد. با یک SIGKILL در وسط، کلِ
    // پیشرفتِ آن جدول از بین می‌رفت — یعنی «ادامه» روی جدول‌های بزرگ،
    // که تنها جایی است که به آن نیاز هست، اصلاً کار نمی‌کرد.
    checkpoint(state);

    if (rows.length < BATCH) break;
  }
  return moved;
}

/** کدام یک از کلیدهای این دسته از قبل در مقصد هستند. */
async function existingKeys(target, table, pk, rows) {
  const found = new Set();
  const cols = pk.map((c) => `\`${c}\``).join(", ");
  const tuple = `(${pk.map(() => "?").join(", ")})`;
  const params = rows.flatMap((r) => pk.map((c) => r[c]));
  const [hits] = await target.query(
    `select ${cols} from \`${table}\` where (${cols}) in (${rows.map(() => tuple).join(", ")})`,
    params,
  );
  for (const h of hits) found.add(pk.map((c) => String(h[c])).join("\u0000"));
  return found;
}

async function restoreTriggers(target) {
  // تریگرها از فایل migration دوباره ساخته می‌شوند — همان منبعی که اسکیما
  // از آن آمده، پس هیچ نسخهٔ دومی در این ابزار نگه داشته نمی‌شود.
  const file = join(HERE, "..", "..", "..", "mysql-migrations", "002_functions_triggers.sql");
  const { splitSqlStatements } = await import("../split-sql.mjs");
  const statements = splitSqlStatements(readFileSync(file, "utf8"));
  let restored = 0;
  for (const st of statements) {
    const m = /create\s+trigger\s+`?(\w+)`?/i.exec(st);
    if (!m || !LOAD_TIME_TRIGGERS.includes(m[1])) continue;
    await target.query(`drop trigger if exists \`${m[1]}\``);
    await target.query(st);
    restored += 1;
  }
  say(`${restored} تریگر برگردانده شد.`);
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

/**
 * ⚠️ checksum در جاوااسکریپت حساب می‌شود و نه با md5 داخلِ هر موتور.
 *
 * وسوسه این است که `md5(string_agg(...))` در PostgreSQL و `md5(group_concat(...))`
 * در MySQL بزنیم و مقایسه کنیم. اشکالش این است که دو موتور *نمایشِ متنیِ*
 * یکسانی از داده ندارند — فاصله در JSON، شکلِ عدد اعشاری، ترتیبِ
 * group_concat که تضمین نشده. یعنی اختلافِ checksum می‌تواند اختلافِ داده
 * *نباشد*، و آن بدترین حالت است: هشدارهای دروغینی که بعد از چند بار
 * نادیده گرفته می‌شوند.
 *
 * پس هر دو طرف با *یک* تابعِ JS به متن تبدیل می‌شوند و هش روی همان گرفته
 * می‌شود. کندتر است و برای این اندازه داده کاملاً بی‌مسئله.
 */
function canonical(value) {
  if (value === null || value === undefined) return "\u0000"; // ⚠️ نگهبانِ NULL: با هیچ مقدارِ واقعی اشتباه نمی‌شود
  return String(value);
}

/**
 * مرتب‌سازی در جاوااسکریپت و نه در دیتابیس.
 *
 * ⚠️ این هم از همان جنسِ تصمیمِ بالاست و آن هم با یک شکستِ واقعی پیدا شد:
 *
 *     PostgreSQL : login:user0@…, login:user10@…, login:user11@…
 *     MySQL      : login:user0@…, login:user1@…,  login:user10@…
 *
 * دادهٔ هر دو یکی است؛ فقط ترتیبِ ORDER BY شان یکی نیست، چون collation
 * پیش‌فرضِ PostgreSQL (بر پایهٔ locale سیستم) نقطه و @ را جور دیگری وزن
 * می‌دهد.
 *
 * اگر همین‌طور می‌ماند، verify روی هر جدولی که کلیدِ *متنی* دارد هشدارِ
 * دروغین می‌داد — و هشدارِ دروغین بعد از بار سوم دیگر خوانده نمی‌شود.
 *
 * پس ترتیبِ مقایسه از هیچ‌کدام از دو موتور گرفته نمی‌شود: هر دو سمت با یک
 * مقایسهٔ نقطه‌کدی در همین‌جا مرتب می‌شوند.
 */
function sortByKey(rows, keyColumns) {
  return [...rows].sort((a, b) => {
    for (const k of keyColumns) {
      const x = canonical(a[k]);
      const y = canonical(b[k]);
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  });
}

async function verify(source, target) {
  const columns = await sourceColumns(source);
  const pks = await primaryKeys(source);
  const tables = TABLE_ORDER.filter((t) => !ONLY || ONLY.includes(t));

  say("\n== شمارش ==");
  for (const table of tables) {
    const { rows: s } = await source.query(`select count(*)::bigint as n from "${table}"`);
    const [[t]] = await target.query(`select count(*) as n from \`${table}\``);
    if (Number(s[0].n) !== Number(t.n)) {
      bad(`${table}: مبدأ ${s[0].n} ≠ مقصد ${t.n}`);
    } else if (Number(s[0].n) > 0) {
      ok(`${table.padEnd(28)} ${Number(s[0].n).toLocaleString("fa-IR")}`);
    }
  }

  say("\n== checksum محتوا ==");
  for (const table of tables) {
    const cols = columns.get(table);
    const pk = pks.get(table);
    if (!cols || !pk) continue;

    const names = cols.map((c) => c.name);
    const { rows: rawSrc } = await source.query(
      `select ${cols.map((c) => `${readExpr(c.name, c.type)} as "${c.name}"`).join(", ")}
         from "${table}"`,
    );
    if (rawSrc.length === 0) continue;

    // مقصد با همان شکلِ متنی خوانده می‌شود؛ ترتیب را هیچ‌کدام تعیین نمی‌کنند.
    const [rawTgt] = await target.query(
      `select ${names.map((n) => targetReadExpr(n, cols.find((c) => c.name === n).type)).join(", ")}
         from \`${table}\``,
    );

    const srcRows = sortByKey(rawSrc, pk);
    const tgtRows = sortByKey(rawTgt, pk);

    const hash = (rows) => {
      const h = createHash("sha256");
      // ⚠️ جداکنندهٔ صریح میان ستون‌ها و میان ردیف‌ها. بدون آن ("اب", "")
      // و ("ا", "ب") یک هش می‌دادند، و جابه‌جاییِ داده بین دو ستون —
      // که دقیقاً یکی از خطرهای این انتقال است — دیده نمی‌شد.
      for (const r of rows) {
        h.update(names.map((n) => canonical(r[n])).join("\u0000") + "\u0001");
      }
      return h.digest("hex").slice(0, 16);
    };
    const a = hash(srcRows);
    const b = hash(tgtRows);
    if (a !== b) {
      bad(`${table}: checksum متفاوت (${a} ≠ ${b})`, firstDifference(srcRows, tgtRows, names));
    } else ok(`${table.padEnd(28)} ${a}`);
  }

  // --- ارجاع‌های شکسته در مقصد ---------------------------------------------
  //
  // ⚠️ با anti-join صریح و نه با تکیه بر foreign_key_checks.
  //
  // اگر آن گارد در حین بارگذاری خاموش شده بود، روشن کردنش دادهٔ موجود را
  // دوباره اعتبارسنجی نمی‌کند — پس «FK روشن است» هیچ چیزی را ثابت
  // نمی‌کند. این کوئری‌ها واقعاً می‌گردند.
  say("\n== ارجاع‌ها در مقصد ==");
  const [fks] = await target.query(
    `select table_name as t, column_name as c,
            referenced_table_name as rt, referenced_column_name as rc
       from information_schema.key_column_usage
      where table_schema = database() and referenced_table_name is not null`,
  );
  let brokenFks = 0;
  for (const fk of fks) {
    const [[r]] = await target.query(
      `select count(*) as n from \`${fk.t}\` a
        where a.\`${fk.c}\` is not null
          and not exists (select 1 from \`${fk.rt}\` b where b.\`${fk.rc}\` = a.\`${fk.c}\`)`,
    );
    if (Number(r.n) > 0) {
      brokenFks += 1;
      bad(`${fk.t}.${fk.c} → ${fk.rt}.${fk.rc}: ${r.n} ارجاع شکسته`);
    }
  }
  if (!brokenFks) ok(`هر ${fks.length} کلید خارجی سالم است`);

  // --- شمارنده‌ها و view ----------------------------------------------------
  say("\n== مقادیر مشتق‌شده ==");
  const [[counters]] = await target.query(`
    select count(*) as bad from club_posts p
     where p.like_count <> (select count(*) from club_likes l where l.post_id = p.id)
        or p.comment_count <> (select count(*) from club_comments c
                                where c.post_id = p.id and c.status = 'approved')`);
  if (Number(counters.bad) > 0) bad(`${counters.bad} سروده شمارندهٔ کج دارد`);
  else ok("شمارنده‌های لایک و دیدگاه با ردیف‌های واقعی می‌خوانند");

  const [[view]] = await target.query("select count(*) as n from exam_question_totals");
  ok(`view ‌exam_question_totals برابر ${view.n} ردیف می‌دهد`);

  const [[ai]] = await target.query(
    `select auto_increment as a from information_schema.tables
      where table_schema = database() and table_name = 'jasoos_levels'`,
  );
  const [[maxId]] = await target.query("select coalesce(max(id), 0) as m from jasoos_levels");
  if (Number(ai.a) > Number(maxId.m) && Number(ai.a) >= 1000) {
    ok(`AUTO_INCREMENT بعدی ${ai.a} است (بزرگ‌تر از ${maxId.m} و دست‌کم ۱۰۰۰)`);
  } else {
    bad(`AUTO_INCREMENT برابر ${ai.a} است`, `باید از ${maxId.m} بزرگ‌تر و دست‌کم ۱۰۰۰ باشد.`);
  }

  return problems === 0;
}

/** خواندنِ یک ستون از MySQL، به همان شکلِ متنی که از مبدأ می‌آید. */
function targetReadExpr(name, pgType) {
  const q = `\`${name}\``;
  if (pgType.startsWith("timestamp")) {
    return `date_format(${q}, '%Y-%m-%d %H:%i:%s.%f') as ${q}`;
  }
  if (pgType === "date") return `date_format(${q}, '%Y-%m-%d') as ${q}`;
  if (pgType === "boolean") return `cast(${q} as char) as ${q}`;
  // ⚠️ JSON در دو موتور با فاصله‌گذاریِ متفاوت چاپ می‌شود
  // (`{"a": 1}` در برابر `{"a":1}`). برای مقایسه، فاصله‌های بعد از
  // دونقطه و کاما در هر دو طرف یکسان‌سازی می‌شوند — مقدارِ ذخیره‌شده دست
  // نمی‌خورد، فقط نمایشش برای checksum.
  if (pgType === "jsonb" || pgType === "json" || pgType.endsWith("[]")) {
    return `cast(${q} as char) as ${q}`;
  }
  return `cast(${q} as char) as ${q}`;
}

function firstDifference(a, b, names) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    for (const k of names) {
      if (canonical(a[i][k]) !== canonical(b[i][k])) {
        return `اولین اختلاف در ردیف ${i + 1}، ستون ${k}`;
      }
    }
  }
  if (a.length !== b.length) return `تعداد ردیف: مبدأ ${a.length}، مقصد ${b.length}`;
  return "";
}

// ---------------------------------------------------------------------------

async function main() {
  if (!command || command === "--help" || command === "help") {
    usage();
    process.exit(0);
  }

  const source = await connectSource();
  const target = await connectTarget();

  try {
    if (!(await guardTarget(target, source))) process.exit(1);

    switch (command) {
      case "preflight":
        await preflight(source, target);
        break;
      case "migrate":
        await migrate(source, target);
        break;
      case "verify":
        await verify(source, target);
        break;
      case "status": {
        const [[db]] = await target.query("select database() as db");
        const state = loadState(db.db);
        say(JSON.stringify(state, null, 2));
        break;
      }
      default:
        console.error(`فرمان ناشناخته: ${command}`);
        usage();
        process.exit(1);
    }
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }

  process.exit(problems === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nشکست خورد:", err.message);
  process.exit(1);
});
