#!/usr/bin/env node
// ساختِ اولین حساب مدیر.
//
// بدون این، یک نصبِ تازه بن‌بست است: هیچ‌کس نمی‌تواند وارد /admin شود، و راهی هم
// برای ادمین کردن کسی از داخل خودِ اپ نیست (تغییر نقش خودش کارِ ادمین است).
//
// idempotent است: اگر حساب با آن ایمیل باشد فقط نقشش را به admin ارتقا می‌دهد و
// رمز موجود را دست نمی‌زند. پس اجرای دوباره‌اش امن است و در entrypoint می‌ماند.
//
// اجرای دستی:  docker compose exec app node scripts/seed-admin.mjs

import { hash } from "@node-rs/argon2";
import pg from "pg";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[seed-admin] ${name} تنظیم نشده است.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  // نبودنشان خطا نیست: در محیطی که ادمین از قبل ساخته شده، این متغیرها معمولاً
  // از .env برداشته می‌شوند تا رمز در فایل نماند.
  if (!email || !password) {
    console.log("[seed-admin] ADMIN_EMAIL/ADMIN_PASSWORD تنظیم نشده — رد شد.");
    return;
  }

  if (password.length < 8) {
    console.error("[seed-admin] ADMIN_PASSWORD باید حداقل ۸ کاراکتر باشد.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: requireEnv("DATABASE_URL") });
  await client.connect();

  try {
    const existing = await client.query("select id, role from users where email = $1", [email]);

    if (existing.rowCount) {
      if (existing.rows[0].role === "admin") {
        console.log(`[seed-admin] ${email} از قبل مدیر است.`);
      } else {
        await client.query("update users set role = 'admin' where id = $1", [existing.rows[0].id]);
        console.log(`[seed-admin] ${email} به مدیر ارتقا یافت.`);
      }
      return;
    }

    // پارامترهای argon2id باید دقیقاً همانی باشند که lib/auth/password.ts
    // استفاده می‌کند، وگرنه رمزِ ساخته‌شده اینجا آنجا قابل تأیید نیست.
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await client.query(
      `insert into users (email, password_hash, full_name, role, email_verified_at)
       values ($1, $2, $3, 'admin', now())`,
      [email, passwordHash, process.env.ADMIN_NAME?.trim() || "مدیر سروا"],
    );

    console.log(`[seed-admin] حساب مدیر ساخته شد: ${email}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[seed-admin] شکست خورد:", err.message);
  process.exit(1);
});
