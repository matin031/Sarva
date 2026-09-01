#!/usr/bin/env node
// اجراکنندهٔ migration ها.
//
// عمداً یک فایل ساده است و نه یک ابزار آماده: تنها چیزی که لازم داریم «فایل‌های
// .sql را به ترتیب یک بار اجرا کن» است، و یک وابستگیِ کمتر یعنی یک چیز کمتر که
// موقع build داکر بشکند. عمداً هم .mjs است نه .ts، چون داخل کانتینر اجرا می‌شود
// و آنجا هیچ tsc/tsx ای وجود ندارد.
//
// در entrypoint اپ قبل از بالا آمدن سرور صدا زده می‌شود، پس روی یک سرور خالی
// فقط `docker compose up` کافی است.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

// عددی دلخواه ولی ثابت. اگر دو کانتینر همزمان بالا بیایند، دومی پشت این قفل
// منتظر می‌ماند تا اولی تمام کند — به‌جای اینکه هر دو یک migration را اجرا کنند
// و یکی با «relation already exists» بمیرد.
const LOCK_ID = 947231;

function requireEnv(name) {
  /* در داکر متغیرها از compose می‌آیند و این فایل اصلاً وجود ندارد، پس
     نبودنش خطا نیست. ولی در اجرای محلی، `.env.local` همان‌جایی است که بقیهٔ
     اسکریپت‌ها (db:seed-exams و db:seed-grammar-circuit) DATABASE_URL را از
     آن می‌خوانند و README هم به همان اشاره می‌کند.

     تا امروز این یکی نمی‌خواندش، و نتیجه‌اش بدترین شکلِ ممکن بود: توسعه‌دهنده
     دقیقاً همان کاری را می‌کرد که مستندات گفته بود و «DATABASE_URL تنظیم نشده
     است» می‌گرفت — بعد بازی را بالا می‌آورد و به‌جای آن، «relation ... does
     not exist» از دلِ صفحهٔ ادمین بیرون می‌زد. */
  if (!process.env[name]) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // فایل نیست؛ اشکالی ندارد.
    }
  }

  const value = process.env[name];
  if (!value) {
    console.error(
      `[migrate] ${name} تنظیم نشده است.\n` +
        "  در داکر از docker-compose می‌آید؛ برای اجرای محلی در .env.local بگذارید.",
    );
    process.exit(1);
  }
  return value;
}

async function main() {
  const client = new pg.Client({ connectionString: requireEnv("DATABASE_URL") });
  await client.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);

    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query("select name from schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const pending = files.filter((f) => !applied.has(f));

    if (!pending.length) {
      console.log(`[migrate] چیزی برای اجرا نیست (${applied.size} migration از قبل اعمال شده).`);
      return;
    }

    for (const file of pending) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");

      // هر migration در تراکنش خودش: یک فایلِ نیمه‌اجراشده بدترین حالت ممکن است،
      // چون نه در schema_migrations ثبت می‌شود نه واقعاً برنگشته.
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        console.log(`[migrate] ✓ ${file}`);
      } catch (err) {
        await client.query("rollback");
        console.error(`[migrate] ✗ ${file}\n${err.message}`);
        throw err;
      }
    }

    console.log(`[migrate] ${pending.length} migration اعمال شد.`);
  } finally {
    // قفل با بسته شدن اتصال هم آزاد می‌شود؛ صریح آزادش می‌کنیم تا اگر روزی این
    // تابع در فرایندی طولانی‌تر صدا زده شد، قفل معلق نماند.
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] شکست خورد:", err.message);
  process.exit(1);
});
