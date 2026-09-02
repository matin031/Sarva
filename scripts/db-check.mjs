#!/usr/bin/env node
// راستی‌آزماییِ اتصال و اسکیما.
//
// این اسکریپت جای آن چیزی را می‌گیرد که بدون یک Postgres واقعی نمی‌شد تأیید کرد:
// اینکه migration واقعاً اجرا می‌شود، اسکیما همان است که انتظار می‌رود، و
// مبدل‌های نوعِ lib/db روی داده‌ای که از سیم می‌آید همان رفتاری را دارند که
// در تست جداگانه داشتند.
//
// اجرا:
//     docker compose exec app node scripts/db-check.mjs
// یا بیرون از داکر با DATABASE_URL در محیط:
//     node scripts/db-check.mjs

import pg from "pg";

const EXPECTED_TABLES = [
  // هویت
  "users", "sessions", "email_otps", "password_resets", "app_settings", "sms_log",
  // بانک آزمون
  "exams", "exam_sections", "exam_questions", "exam_question_parts",
  "exam_question_options", "exam_attempts",
  // کوییز وزن
  "questions", "question_options", "user_answers", "quiz_attempts", "quiz_attempt_answers",
  // واژه‌یاب
  "vocab_words", "vocab_answers",
  // جاسوس
  "jasoos_answers", "jasoos_levels", "jasoos_suspects",
  // پلِ وزن و مدار دستور
  "aruz_bridge_questions", "grammar_circuit_questions",
  // محتوای بازی‌ها
  "memory_pairs", "ninja_categories", "ninja_words",
  // نشان‌شده‌ها
  "user_bookmarks",
  // کلاب
  "club_posts", "club_comments", "club_likes", "club_reports",
  // لاگ مدیران و خطاها (۰۰۲)
  "admin_audit_log", "app_error_log",
  // اعلان سایت و حامیان (۰۰۸)
  "site_announcements", "site_supporters",
];

const EXPECTED_TRIGGERS = [
  // ۰۰۱
  "users_touch", "club_posts_touch", "club_likes_count", "club_comments_count",
  // ۰۰۴ / ۰۰۵
  "aruz_bridge_questions_touch", "grammar_circuit_questions_touch",
  // ۰۰۸
  "site_announcements_touch", "site_supporters_touch",
];

let failures = 0;

// آینهٔ installIsoTimestampParser در lib/db/index.ts — با همان برچسب، تا
// چند بار صدا زدنش بی‌اثر باشد.
const ISO_PARSER_BRAND = "__sarvaIsoTimestampParser";

function installIsoTimestampParser(oid) {
  const current = pg.types.getTypeParser(oid);
  if (current[ISO_PARSER_BRAND]) return;

  const wrapper = (raw) => {
    const parsed = current(raw);
    if (parsed instanceof Date) return parsed.toISOString();
    if (typeof parsed === "number") return raw; // infinity / -infinity
    if (typeof parsed === "string") return parsed;
    return parsed;
  };
  wrapper[ISO_PARSER_BRAND] = true;

  pg.types.setTypeParser(oid, wrapper);
}

function installTypeParsers() {
  installIsoTimestampParser(pg.types.builtins.TIMESTAMPTZ);
  installIsoTimestampParser(pg.types.builtins.TIMESTAMP);
  // این دو پارسرِ قبلی را نمی‌گیرند، پس ثبتِ مکرر خودبه‌خود بی‌خطر است.
  pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
  pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
}
function check(label, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  // همان مبدل‌هایی که lib/db/index.ts ثبت می‌کند — اینجا تکرار شده‌اند چون این
  // فایل .mjs است و آن ماژول TypeScript ای است که فقط داخل Next بار می‌شود.
  // اگر آنجا عوضشان کردید، اینجا هم عوض کنید وگرنه این آزمون بی‌معنی می‌شود.
  installTypeParsers();

  // و یک بار دیگر: داخل Next این ماژول می‌تواند بیش از یک بار اجرا شود (یک
  // نمونه در باندلِ proxy، یکی در باندلِ route ها) و جدولِ پارسرها مشترک است.
  // نسخهٔ قبلی در همین حالت لاگین را با «parseTimestamptz(...).toISOString is
  // not a function» می‌شکست، ولی این اسکریپت متوجهش نمی‌شد چون یک بار ثبت
  // می‌کرد. حالا دوباره‌ثبت هم آزمون می‌شود.
  installTypeParsers();

  const client = new pg.Client({ connectionString: url });

  const t0 = Date.now();
  await client.connect();
  check("اتصال به دیتابیس", true, `${Date.now() - t0}ms`);

  try {
    const { rows: version } = await client.query("select version()");
    console.log(`  ${version[0].version.split(",")[0]}\n`);

    // --- migration ها -------------------------------------------------------
    const { rows: applied } = await client.query(
      "select name from schema_migrations order by name",
    );
    check("جدول schema_migrations", true, `${applied.length} migration اعمال شده`);
    applied.forEach((r) => console.log(`     ${r.name}`));
    console.log();

    // --- جداول --------------------------------------------------------------
    const { rows: found } = await client.query(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const names = new Set(found.map((r) => r.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !names.has(t));
    // schema_migrations جزو انتظار نیست ولی باید باشد
    const extra = [...names].filter(
      (t) => !EXPECTED_TABLES.includes(t) && t !== "schema_migrations",
    );

    check(
      `جداول (${EXPECTED_TABLES.length} مورد انتظار)`,
      missing.length === 0,
      missing.length ? `کم است: ${missing.join(", ")}` : `همه موجودند`,
    );
    if (extra.length) console.log(`  ℹ جدول اضافه: ${extra.join(", ")}`);

    // --- ویو، enum، تریگر ----------------------------------------------------
    const { rows: views } = await client.query(
      `select table_name from information_schema.views where table_schema='public'`,
    );
    check("ویو exam_question_totals", views.some((v) => v.table_name === "exam_question_totals"));

    const { rows: enums } = await client.query(
      `select typname from pg_type where typtype='e' and typnamespace='public'::regnamespace`,
    );
    const enumNames = enums.map((e) => e.typname);
    check("enum ها", enumNames.length === 2, enumNames.join(", "));

    const { rows: trigs } = await client.query(
      `select tgname from pg_trigger where not tgisinternal`,
    );
    // با نام بررسی می‌شود و نه با شمارش.
    //
    // قبلاً `trigs.length === 5` بود، با یک توضیح که می‌گفت این عدد از کجا
    // آمده. مشکلش این است که هر migration تازه‌ای که تریگر بیاورد، این بررسی
    // را می‌شکند بی‌آنکه چیزی *خراب* باشد — و پیامش هم نمی‌گوید کدام تریگر
    // اضافه یا کم است. دقیقاً همین اتفاق با ۰۰۵ افتاد.
    const missingTrigs = EXPECTED_TRIGGERS.filter(
      (name) => !trigs.some((t) => t.tgname === name),
    );
    check(
      "تریگرها",
      missingTrigs.length === 0,
      missingTrigs.length ? `کم است: ${missingTrigs.join(", ")}` : trigs.map((t) => t.tgname).join(", "),
    );

    // --- مبدل‌های نوع، روی داده‌ای که واقعاً از سیم می‌آید --------------------
    console.log("\n  مبدل‌های نوع:");
    const { rows: t } = await client.query(`
      select count(*)                              as int8_val,
             12.50::numeric(5,2)                   as numeric_val,
             '2026-08-09 10:20:30.5+00'::timestamptz as ts_val,
             '2026-08-09 10:20:30.5'::timestamp      as ts_plain_val,
             'infinity'::timestamptz                 as ts_inf_val,
             now()                                   as ts_now_val
        from users
    `);
    const r = t[0];
    check(
      "  int8 (count) → number",
      typeof r.int8_val === "number",
      `${typeof r.int8_val} ${JSON.stringify(r.int8_val)}`,
    );
    check(
      "  numeric → number",
      typeof r.numeric_val === "number" && r.numeric_val === 12.5,
      `${typeof r.numeric_val} ${JSON.stringify(r.numeric_val)}`,
    );
    check(
      "  timestamptz → رشتهٔ ISO",
      typeof r.ts_val === "string" && r.ts_val === "2026-08-09T10:20:30.500Z",
      `${typeof r.ts_val} ${JSON.stringify(r.ts_val)}`,
    );
    // now() همان مسیری است که لاگین از آن رد می‌شود (created_at). جدا آزمون
    // می‌شود چون مقدارِ بالا literal است و این یکی از خودِ سرور می‌آید.
    check(
      "  now() → رشتهٔ ISO",
      typeof r.ts_now_val === "string" && !Number.isNaN(Date.parse(r.ts_now_val)),
      `${typeof r.ts_now_val} ${JSON.stringify(r.ts_now_val)}`,
    );
    check(
      "  timestamp (بدون منطقهٔ زمانی) → رشتهٔ ISO",
      typeof r.ts_plain_val === "string" && !Number.isNaN(Date.parse(r.ts_plain_val)),
      `${typeof r.ts_plain_val} ${JSON.stringify(r.ts_plain_val)}`,
    );
    // 'infinity' نباید ۵۰۰ بدهد. متن خام رد می‌شود، نه Infinity عددی.
    check(
      "  infinity → متن خام (نه سقوط)",
      r.ts_inf_val === "infinity",
      `${typeof r.ts_inf_val} ${JSON.stringify(r.ts_inf_val)}`,
    );

    // آرایهٔ متن (questions.poem) باید آرایهٔ JS شود، همان‌طور که PostgREST می‌داد
    const { rows: arr } = await client.query(
      `select array['مصراع اول','مصراع دوم']::text[] as poem`,
    );
    check(
      "  text[] → آرایهٔ JS",
      Array.isArray(arr[0].poem) && arr[0].poem.length === 2,
      JSON.stringify(arr[0].poem),
    );

    // jsonb باید شیء شود
    const { rows: js } = await client.query(`select '{"a":1}'::jsonb as j`);
    check("  jsonb → شیء JS", typeof js[0].j === "object" && js[0].j.a === 1);

    // --- وضعیت داده ---------------------------------------------------------
    const { rows: counts } = await client.query(`
      select (select count(*) from users)      as users,
             (select count(*) from users where role='admin') as admins
    `);
    console.log(`\n  کاربران: ${counts[0].users} (مدیر: ${counts[0].admins})`);
    if (counts[0].admins === 0) {
      console.log("  ⚠ هیچ مدیری وجود ندارد — ADMIN_EMAIL/ADMIN_PASSWORD را ست کنید و کانتینر را ری‌استارت کنید.");
    }
  } finally {
    await client.end();
  }

  console.log(failures ? `\n✗ ${failures} بررسی رد شد.` : "\n✓ همه‌چیز درست است.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error("\n✗ شکست خورد:", err.message);
  process.exit(1);
});
