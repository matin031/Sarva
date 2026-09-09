#!/usr/bin/env node
// راستی‌آزماییِ اتصال و اسکیمای MySQL.
//
// این اسکریپت جای آن چیزی را می‌گیرد که بدون یک MySQL واقعی نمی‌شود تأیید کرد:
// اینکه migration واقعاً اجرا می‌شود، اسکیما همان است که انتظار می‌رود، و
// مبدل‌های نوعِ lib/db روی داده‌ای که از سیم می‌آید همان رفتاری را دارند که در
// تست جداگانه داشتند.
//
// اجرا:
//     docker compose exec app node scripts/db-check.mjs
// یا بیرون از داکر با DATABASE_URL در محیط:
//     node scripts/db-check.mjs
//
// ⚠️ فهرست جدول‌ها دیگر اینجا هاردکد نیست. از scripts/mysql/type-map.mjs
// خوانده می‌شود — همان فهرستی که مولدِ اسکیما از رویش DDL می‌سازد. پیش از این
// یک آرایهٔ دستی بود که با هر migration تازه از واقعیت عقب می‌افتاد.

import mysql from "mysql2/promise";
import { TABLE_ORDER } from "./mysql/type-map.mjs";

/** جدول‌هایی که اجراکننده migration می‌سازد، نه مولد اسکیما. */
const RUNNER_TABLES = ["schema_migrations"];

const EXPECTED_TABLES = [...TABLE_ORDER, ...RUNNER_TABLES].sort();

const EXPECTED_TRIGGERS = [
  // updated_at
  "users_touch",
  "club_posts_touch",
  "aruz_bridge_questions_touch",
  "grammar_circuit_questions_touch",
  "site_announcements_touch",
  "site_supporters_touch",
  "content_reports_touch",

  // MySQL replacements for PostgreSQL multi-event triggers
  "club_likes_count_ins",
  "club_likes_count_del",
  "club_comments_count_ins",
  "club_comments_count_del",
  "club_comments_count_upd",

  // login method protection
  "user_identities_keep_login_method",

  // Sarva Plus
  "plus_plans_touch",
  "plus_plan_versions_immutable_trg",
  "plus_orders_touch",
  "plus_payment_attempts_touch",
  "plus_entitlements_touch",
  "plus_tickets_touch",
];

const EXPECTED_VIEWS = ["exam_question_totals"];

const EXPECTED_ROUTINES = ["club_recount"];

/** ستون‌های محاسباتی */
const EXPECTED_GENERATED = [
  ["app_error_log", "fingerprint_open"],
  ["jasoos_suspects", "spy_level_id"],
  ["club_posts", "published_at_is_null"],
];

let failures = 0;

function ok(label, extra = "") {
  console.log(`  ✓ ${label}${extra ? ` — ${extra}` : ""}`);
}
function bad(label, detail) {
  failures += 1;
  console.log(`  ✗ ${label}\n      ${detail}`);
}
/**
 * چیزی که *بررسی نشد* — نه چیزی که خراب است.
 *
 * ⚠️ عمداً روی failures اثر ندارد. اگر db-check با حسابِ کم‌امتیازِ اپ اجرا
 * شود، بخشی از بررسی‌ها ممکن نیست؛ آن‌ها را «شکست» خواندن یعنی خروجیِ قرمز
 * برای دیتابیسِ سالم، و خروجیِ قرمزِ همیشگی خیلی زود نادیده گرفته می‌شود.
 */
function warn(label, detail) {
  console.log(`  ! ${label}\n      ${detail}`);
}
function section(title) {
  console.log(`\n${title}`);
}

function requireEnv(name) {
  if (!process.env[name]) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      /* فایل نیست؛ اشکالی ندارد. */
    }
  }
  const value = process.env[name];
  if (!value) {
    console.error(`[db-check] ${name} تنظیم نشده است.`);
    process.exit(1);
  }
  return value;
}

// ---------------------------------------------------------------------------
// همان typeCast که lib/db استفاده می‌کند
// ---------------------------------------------------------------------------
// ⚠️ عمداً کپی شده و import نشده: lib/db با "server-only" علامت خورده و از
// یک اسکریپت نود قابل import نیست. پس این آینه است — و اگر با اصل واگرا شود،
// همین بررسی‌ها آن را نشان می‌دهند.

function datetimeToIso(raw) {
  if (raw.startsWith("0000-")) return raw;
  const [d, t = "00:00:00"] = raw.split(" ");
  const [clock, frac] = t.split(".");
  return `${d}T${clock}.${(frac ?? "").padEnd(3, "0")}Z`;
}

function typeCast(field, next) {
  const value = next();
  if (value === null || value === undefined) return null;
  switch (field.type) {
    case "DATETIME":
    case "TIMESTAMP":
      return typeof value === "string"
        ? datetimeToIso(value)
        : value.toISOString();
    case "DATE":
    case "NEWDATE":
      return value;
    case "NEWDECIMAL":
    case "DECIMAL":
      return typeof value === "number" ? value : Number(value);
    case "LONGLONG": {
      if (typeof value === "number") return value;
      const n = Number(value);
      return Number.isSafeInteger(n) ? n : value;
    }
    case "TINY":
      return field.length === 1 ? value !== 0 : value;
    default:
      return value;
  }
}

// ---------------------------------------------------------------------------

/**
 * دو مقدارِ TINYINT(1) — یکی ۰ و یکی ۱ — همان‌طور که lib/db تحویلشان می‌دهد.
 *
 * راهِ اول جدولِ موقتی است چون همیشه جواب می‌دهد و به دادهٔ موجود وابسته
 * نیست. راهِ دوم برای وقتی است که امتیازش نباشد: یک ستونِ boolean واقعی که
 * هر دو مقدار را داشته باشد.
 *
 * ⚠️ چرا با `select false` نمی‌شود: MySQL آن را LONGLONG می‌دهد نه
 * TINYINT(1)، پس تست همیشه شکست می‌خورد حتی وقتی همه‌چیز درست است. باید یک
 * *ستونِ* واقعی خوانده شود.
 *
 * @returns {Promise<[unknown, unknown] | null>} null یعنی بررسی ممکن نشد.
 */
async function probeBoolean(conn) {
  try {
    await conn.query(
      "create temporary table __bool_probe (flag tinyint(1) not null)",
    );
    await conn.query("insert into __bool_probe values (0), (1)");
    const [rows] = await conn.query(
      "select flag from __bool_probe order by flag",
    );
    await conn.query("drop temporary table __bool_probe");
    return [rows[0].flag, rows[1].flag];
  } catch (e) {
    if (!/denied/i.test(e.message)) throw e;
  }

  // ستون‌هایی که در یک نصبِ واقعی معمولاً هر دو مقدار را دارند.
  for (const [table, column] of [
    ["users", "is_banned"],
    ["club_posts", "featured"],
    ["club_posts", "is_anonymous"],
    ["question_options", "is_correct"],
    ["jasoos_suspects", "is_spy"],
    ["aruz_bridge_questions", "is_published"],
  ]) {
    try {
      const [rows] = await conn.query(
        `select \`${column}\` as flag from \`${table}\` where \`${column}\` = ? limit 1`,
        [0],
      );
      const [ones] = await conn.query(
        `select \`${column}\` as flag from \`${table}\` where \`${column}\` = ? limit 1`,
        [1],
      );
      if (rows.length && ones.length) return [rows[0].flag, ones[0].flag];
    } catch {
      // این جدول در دسترس نیست؛ بعدی.
    }
  }
  return null;
}

async function main() {
  const url = requireEnv("DATABASE_URL");
  const conn = await mysql.createConnection({
    uri: url,
    typeCast,
    dateStrings: true,
    timezone: "Z",
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: false,
  });

  const [[dbInfo]] = await conn.query(
    "select version() as v, database() as db",
  );
  console.log(`اتصال برقرار شد — MySQL ${dbInfo.v}، دیتابیس «${dbInfo.db}»`);
  const schema = dbInfo.db;

  // --- نسخهٔ موتور -----------------------------------------------------------
  section("موتور");
  const major = Number(dbInfo.v.split(".")[0]);
  // ⚠️ هر دو موتور پشتیبانی می‌شوند و این عمدی است.
  //
  // نسخهٔ اول این بررسی MariaDB را *رد* می‌کرد. آن موضع درست بود تا وقتی
  // اسکیما به نحوِ مخصوص MySQL 8 تکیه داشت (collation های utf8mb4_0900_*،
  // نمایهٔ چندمقداری، `member of`). حالا هیچ‌کدام نمانده و اسکیما و کد روی
  // MariaDB 10.11 هم آزموده شده‌اند، پس رد کردنش فقط یک هشدارِ دروغین بود.
  //
  // کفِ نسخه: MariaDB 10.4 و MySQL 8. پایین‌تر از این‌ها یا CHECK constraint
  // اجرا نمی‌شود یا ستون محاسباتی رفتار دیگری دارد.
  const isMaria = /mariadb/i.test(dbInfo.v);
  const minMajor = isMaria ? 10 : 8;
  const minMinor = isMaria ? 4 : 0;
  const [, minorRaw = "0"] = dbInfo.v.split(".");
  const minor = Number.parseInt(minorRaw, 10) || 0;
  const enough = major > minMajor || (major === minMajor && minor >= minMinor);

  if (enough) ok(`موتور: ${isMaria ? "MariaDB" : "MySQL"}`, dbInfo.v);
  else {
    bad(
      "نسخهٔ دیتابیس کافی نیست",
      `${dbInfo.v} — دست‌کم ${isMaria ? "MariaDB 10.4" : "MySQL 8.0"} لازم است.`,
    );
  }

  // --- sql_mode -------------------------------------------------------------
  //
  // ⚠️ حالتِ *نشست* سنجیده می‌شود و نه سراسری، چون اپ خودش روی هر اتصالِ
  // تازه sql_mode را تنظیم می‌کند (lib/db). دلیلش این است که MariaDB به‌طور
  // پیش‌فرض ONLY_FULL_GROUP_BY ندارد و روی هاست اشتراکی دستِ ما به my.cnf
  // نمی‌رسد. پس آنچه اهمیت دارد حالتی است که کوئری‌های اپ واقعاً در آن اجرا
  // می‌شوند.
  //
  // این اسکریپت از همان مسیرِ اتصالِ اپ نمی‌آید، پس اینجا هم صریح تنظیمش
  // می‌کنیم تا همان چیزی سنجیده شود که در عمل هست.
  await conn.query(
    "set session sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES," +
      "NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
  );
  const [[modeRow]] = await conn.query("select @@session.sql_mode as m");
  for (const need of ["STRICT_TRANS_TABLES", "ONLY_FULL_GROUP_BY"]) {
    if (modeRow.m.includes(need)) ok(`sql_mode شامل ${need}`);
    else
      bad(
        `sql_mode شامل ${need} نیست`,
        need === "STRICT_TRANS_TABLES"
          ? "بدون آن، دادهٔ بیش از حد بلند بی‌صدا بریده می‌شود به‌جای اینکه رد شود."
          : "بدون آن، GROUP BY ناقص خطا نمی‌دهد و ستونِ دلخواهی برمی‌گرداند.",
      );
  }

  // --- جدول‌ها ---------------------------------------------------------------
  section(`جدول‌ها (${EXPECTED_TABLES.length} مورد انتظار)`);
  const [tableRows] = await conn.query(
    "select table_name as t, engine as engine, table_collation as coll " +
      "from information_schema.tables " +
      "where table_schema = ? and table_type = 'BASE TABLE'",
    [schema],
  );
  const present = new Map(tableRows.map((r) => [r.t, r]));
  const missing = EXPECTED_TABLES.filter((t) => !present.has(t));
  const extra = [...present.keys()].filter((t) => !EXPECTED_TABLES.includes(t));

  if (!missing.length) ok(`هر ${EXPECTED_TABLES.length} جدول هست`);
  else bad(`${missing.length} جدول نیست`, missing.join("، "));
  if (extra.length) bad(`${extra.length} جدولِ ناشناخته`, extra.join("، "));

  const notInnoDb = [...present.values()].filter((r) => r.engine !== "InnoDB");
  if (!notInnoDb.length) ok("همه InnoDB اند");
  else
    bad(
      "جدولِ غیر-InnoDB",
      notInnoDb.map((r) => `${r.t} (${r.engine})`).join("، ") +
        " — بدون InnoDB نه کلید خارجی هست نه تراکنش.",
    );

  // --- view و روتین و تریگر --------------------------------------------------
  section("view، تریگر و رویه");
  const [viewRows] = await conn.query(
    "select table_name as v from information_schema.views where table_schema = ?",
    [schema],
  );
  const views = viewRows.map((r) => r.v);
  for (const v of EXPECTED_VIEWS) {
    if (views.includes(v)) ok(`view ${v}`);
    else bad(`view ${v} نیست`, "کارنامهٔ امتحان به آن تکیه دارد.");
  }

  const [trigRows] = await conn.query(
    "select trigger_name as t from information_schema.triggers where trigger_schema = ?",
    [schema],
  );
  const triggers = trigRows.map((r) => r.t);
  const missingTriggers = EXPECTED_TRIGGERS.filter(
    (t) => !triggers.includes(t),
  );
  if (!missingTriggers.length) {
    ok(`هر ${EXPECTED_TRIGGERS.length} تریگر هست`);
  } else if (triggers.length === 0) {
    // ⚠️ «هیچ تریگری نیست» و «هیچ تریگری دیده نمی‌شود» دو چیزند و MySQL
    // فرقشان را نمی‌گذارد.
    //
    // information_schema.triggers فقط سطرهایی را نشان می‌دهد که کاربر روی
    // جدولشان امتیاز TRIGGER دارد. کاربرِ کم‌امتیازِ اپ آن را ندارد و نباید
    // هم داشته باشد — ولی تریگرها کماکان کار می‌کنند.
    //
    // بدون این تفکیک، db-check با کاربرِ درستِ اپ می‌گفت «۱۳ تریگر نیست»
    // و اپراتور یا می‌ترسید یا (بدتر) یاد می‌گرفت این پیام را نادیده بگیرد.
    warn(
      "هیچ تریگری دیده نمی‌شود — احتمالاً این کاربر امتیاز TRIGGER ندارد",
      "این *نبودنِ* تریگر نیست؛ نادیدنی بودنشان است. برای بررسی واقعی، " +
        "db:check را با حساب migration اجرا کن.",
    );
  } else {
    bad(`${missingTriggers.length} تریگر نیست`, missingTriggers.join("، "));
  }

  const [routineRows] = await conn.query(
    "select routine_name as r from information_schema.routines where routine_schema = ?",
    [schema],
  );
  const routines = routineRows.map((r) => r.r);
  for (const r of EXPECTED_ROUTINES) {
    if (routines.includes(r)) ok(`رویهٔ ${r}`);
    else
      bad(
        `رویهٔ ${r} نیست`,
        "مسیر حذف کاربر برای بازسازی شمارنده‌های کلاب صدایش می‌زند.",
      );
  }

  // --- ستون‌های محاسباتی ----------------------------------------------------
  section("ستون‌های محاسباتی (جانشینِ partial index)");
  for (const [table, column] of EXPECTED_GENERATED) {
    const [[row]] = await conn.query(
      "select generation_expression as g from information_schema.columns " +
        "where table_schema = ? and table_name = ? and column_name = ?",
      [schema, table, column],
    );
    if (row?.g) ok(`${table}.${column}`);
    else
      bad(
        `${table}.${column} نیست یا محاسباتی نیست`,
        "قیدِ یکتاییِ جزئی بی‌اثر می‌شود.",
      );
  }

  // --- جدول‌های منطقهٔ زمانی ---------------------------------------------------
  section("منطقهٔ زمانی");
  // ⚠️ این یکی بی‌صدا خراب می‌کند و برای همین اینجاست.
  //
  // CONVERT_TZ با *نامِ* منطقه فقط وقتی کار می‌کند که جدول‌های mysql.time_zone
  // بارگذاری شده باشند. اگر نباشند، تابع خطا نمی‌دهد — مقدار NULL می‌دهد. یعنی
  // نمودار روزانهٔ پنل کاملاً خالی می‌شود و هیچ‌جا خطایی ثبت نمی‌شود.
  const [[tz]] = await conn.query(
    "select convert_tz('2020-06-01 12:00:00','+00:00','Asia/Tehran') as dst, " +
      "convert_tz('2020-12-01 12:00:00','+00:00','Asia/Tehran') as std",
  );
  if (tz.dst === null || tz.std === null) {
    bad(
      "جدول‌های منطقهٔ زمانی بارگذاری نشده‌اند",
      "CONVERT_TZ با 'Asia/Tehran' مقدار NULL می‌دهد، پس نمودار روزانهٔ پنل\n" +
        "      خالی می‌شود بی‌آنکه خطایی بدهد. راه‌حل:\n" +
        "      mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root mysql",
    );
  } else {
    // ایران تا ۲۰۲۲ ساعت تابستانی داشت: ژوئن +۰۴:۳۰ و دسامبر +۰۳:۳۰.
    // اگر هر دو یکی باشند یعنی offset ثابت است و تاریخ‌های قدیمی غلط می‌شوند.
    const dstHour = tz.dst.slice(11, 16);
    const stdHour = tz.std.slice(11, 16);
    if (dstHour === "16:30" && stdHour === "15:30") {
      ok(
        "Asia/Tehran با ساعت تابستانی درست است",
        `ژوئن ${dstHour}، دسامبر ${stdHour}`,
      );
    } else {
      bad(
        "تبدیل منطقهٔ زمانی درست نیست",
        `انتظار ژوئن ۱۶:۳۰ و دسامبر ۱۵:۳۰ بود، ولی ${dstHour} و ${stdHour} آمد.`,
      );
    }
  }

  // --- رفتار مبدل‌های نوع ------------------------------------------------------
  section("مبدل‌های نوع (همان چیزی که lib/db به کد می‌دهد)");

  const [[types]] = await conn.query(
    "select cast(12.50 as decimal(5,2)) as dec_val, " +
      "count(*) as count_val, " +
      "cast('2020-03-04 05:06:07.123456' as datetime(6)) as dt_val, " +
      "cast('2020-03-04' as date) as date_val, " +
      // ⚠️ بدون cast: MariaDB نوعِ JSON برای CAST ندارد. مقدار از یک ستونِ
      // واقعیِ JSON خوانده می‌شود که هم پرتابل است و هم دقیقاً همان چیزی را
      // می‌سنجد که در عمل اتفاق می‌افتد.
      "json_extract('{\"a\":[1,2],\"b\":null}', '$') as json_val " +
      "from users",
  );

  if (typeof types.dec_val === "number" && types.dec_val === 12.5)
    ok("DECIMAL → عدد", String(types.dec_val));
  else
    bad(
      "DECIMAL عدد نشد",
      `${typeof types.dec_val}: ${types.dec_val} — جمعِ نمرات الحاقِ رشته می‌شود.`,
    );

  if (typeof types.count_val === "number")
    ok("count(*) → عدد", String(types.count_val));
  else
    bad(
      "count(*) عدد نشد",
      `${typeof types.count_val} — total + 1 الحاقِ رشته می‌شود.`,
    );

  if (types.dt_val === "2020-03-04T05:06:07.123456Z")
    ok("DATETIME(6) → ISO با میکروثانیه", types.dt_val);
  else
    bad(
      "DATETIME درست تبدیل نشد",
      `${types.dt_val} — انتظار 2020-03-04T05:06:07.123456Z`,
    );

  if (types.date_val === "2020-03-04") ok("DATE → رشتهٔ تاریخ", types.date_val);
  else bad("DATE درست تبدیل نشد", `${types.date_val} — روز نباید جابه‌جا شود.`);

  if (
    types.json_val &&
    Array.isArray(types.json_val.a) &&
    types.json_val.b === null
  )
    ok("JSON → شیء با آرایه و null سالم");
  else bad("JSON درست تبدیل نشد", JSON.stringify(types.json_val));

  // boolean واقعیِ ستون.
  //
  // ⚠️ با یک عبارتِ ثابت (`select false`) نمی‌شود سنجید: MySQL آن را LONGLONG
  // می‌دهد و نه TINYINT(1)، پس تست همیشه شکست می‌خورد حتی وقتی همه‌چیز درست
  // است. باید یک *ستونِ* واقعیِ TINYINT(1) خوانده شود.
  //
  // ⚠️ و جدولِ موقتی امتیاز CREATE TEMPORARY TABLES می‌خواهد، که کاربرِ
  // اجرای سایت ندارد و نباید داشته باشد. پس اگر نشد، به‌جای مردن با یک
  // «Access denied» خام، همان بررسی روی یک ستونِ واقعی انجام می‌شود.
  const boolRows = await probeBoolean(conn);
  if (boolRows === null) {
    warn(
      "تبدیل TINYINT(1) بررسی نشد",
      "نه جدولِ موقتی ساخته شد (امتیاز CREATE TEMPORARY TABLES نیست) و نه " +
        "ستونی با هر دو مقدار ۰ و ۱ پیدا شد. با حساب migration دوباره اجرا کن.",
    );
  } else if (boolRows[0] === false && boolRows[1] === true) {
    ok("TINYINT(1) → boolean واقعی");
  } else {
    bad(
      "TINYINT(1) boolean نشد",
      `${typeof boolRows[0]} — عدد ۰ در JS truthy نیست ولی رشتهٔ "0" هست، ` +
        "و JSON.stringify هم عدد به کلاینت می‌فرستد.",
    );
  }

  // --- یونیکد ----------------------------------------------------------------
  section("یونیکد");
  const sample = "سلامِ می‌رود 🌸 ی ک";
  const [[uni]] = await conn.query("select ? as s, char_length(?) as n", [
    sample,
    sample,
  ]);
  if (uni.s === sample && uni.n === [...sample].length)
    ok("فارسی، نیم‌فاصله، اعراب و اموجی سالم رد و بدل می‌شوند");
  else bad("رفت‌وبرگشتِ یونیکد خراب است", `${uni.s} (${uni.n} نویسه)`);

  // --- migration ها ----------------------------------------------------------
  section("migration ها");
  const [migRows] = await conn.query(
    "select name, finished_at from schema_migrations order by name",
  );
  const unfinished = migRows.filter((r) => r.finished_at === null);
  if (migRows.length === 0)
    bad("هیچ migration ای اعمال نشده", "npm run db:migrate");
  else if (unfinished.length)
    bad(
      `${unfinished.length} migration نیمه‌تمام`,
      unfinished.map((r) => r.name).join("، ") +
        " — در MySQL DDL برنمی‌گردد، دستی بررسی کن.",
    );
  else ok(`${migRows.length} migration کامل اعمال شده`);

  await conn.end();

  console.log(
    failures === 0 ? "\nهمه چیز درست است." : `\n${failures} بررسی شکست خورد.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[db-check] شکست خورد:", err.message);
  process.exit(1);
});
