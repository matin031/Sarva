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
import { randomUUID } from "node:crypto";
import { connect } from "./mysql/script-db.mjs";

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

  const conn = await connect(requireEnv("DATABASE_URL"));

  try {
    const [existing] = await conn.execute("select id, role from users where email = ?", [email]);

    if (existing.length) {
      // ⚠️ رمز و نقشِ کاربرِ موجود عمداً دست‌نخورده می‌ماند (جز ارتقا به مدیر).
      //
      // این اسکریپت در docker-entrypoint هر بار بالا آمدن اجرا می‌شود. اگر
      // رمز را بازنویسی می‌کرد، هر ری‌استارت رمزِ مدیر را به مقدارِ env
      // برمی‌گرداند — و در جریان مهاجرت، کاربرِ منتقل‌شده رمزِ واقعی‌اش را
      // از دست می‌داد.
      if (existing[0].role === "admin") {
        console.log(`[seed-admin] ${email} از قبل مدیر است.`);
      } else {
        await conn.execute("update users set role = 'admin' where id = ?", [existing[0].id]);
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

    await conn.execute(
      `insert into users (id, email, password_hash, full_name, role, email_verified_at)
       values (?, ?, ?, ?, 'admin', now(6))`,
      [randomUUID(), email, passwordHash, process.env.ADMIN_NAME?.trim() || "مدیر سروا"],
    );

    console.log(`[seed-admin] حساب مدیر ساخته شد: ${email}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[seed-admin] شکست خورد:", err.message);
  process.exit(1);
});
