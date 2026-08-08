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
  "jasoos_answers",
  // نشان‌شده‌ها
  "user_bookmarks",
  // کلاب
  "club_posts", "club_comments", "club_likes", "club_reports",
];

let failures = 0;
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
  const parseTimestamptz = pg.types.getTypeParser(pg.types.builtins.TIMESTAMPTZ);
  pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (v) => parseTimestamptz(v).toISOString());
  pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
  pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

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
    check("تریگرها", trigs.length === 4, trigs.map((t) => t.tgname).join(", "));

    // --- مبدل‌های نوع، روی داده‌ای که واقعاً از سیم می‌آید --------------------
    console.log("\n  مبدل‌های نوع:");
    const { rows: t } = await client.query(`
      select count(*)                              as int8_val,
             12.50::numeric(5,2)                   as numeric_val,
             '2026-08-09 10:20:30.5+00'::timestamptz as ts_val
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
      typeof r.ts_val === "string" && !Number.isNaN(Date.parse(r.ts_val)),
      `${typeof r.ts_val} ${JSON.stringify(r.ts_val)}`,
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
