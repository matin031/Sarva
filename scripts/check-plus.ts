/**
 * آزمونِ end-to-endِ سروا پلاس روی یک دیتابیس واقعی — `npm run db:check-plus`.
 *
 * ⚠️ چرا اینجا و نه در `tests/`:
 *
 * چیزی که این فایل می‌سنجد، *رفتارِ دیتابیس* است و نه منطقِ خالص: ایندکس‌های
 * یکتا، تریگرِ تغییرناپذیریِ قیمت، قفلِ هم‌زمانی و تراکنش‌ها. هیچ‌کدام را
 * نمی‌شود با mock تست کرد — mock دقیقاً همان چیزی را جعل می‌کند که قرار
 * است اثبات شود. و `npm test` باید روی ماشینی بدونِ دیتابیس هم سبز بماند،
 * پس این‌ها آنجا نمی‌روند.
 *
 * همین الگو از قبل در پروژه هست: `db:check-rotation`، `db:check-otp`،
 * `db:check-sql`.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه‌چیز داخل داده‌ای با پیشوندِ مشخص ساخته
 * می‌شود و در پایان پاک می‌شود.
 */
process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";

import { execute, query, queryOne, transaction } from "@/lib/db";
import { activateForOrder, manualGrant, revokeEntitlement } from "@/lib/plus/grants";
import { createOrGetPendingOrder, getOrderDetail, listOrders } from "@/lib/plus/orders";
import { getPlusStatusFor } from "@/lib/plus/entitlement";
import { tomansToRials } from "@/lib/plus/money";

const TAG = "chkplus";
let failures = 0;
let checks = 0;

function ok(label: string, condition: boolean, detail = ""): void {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/* ─────────────────────────── داده آزمایشی ──────────────────────────────── */

// ⚠️ MySQL هیچ `RETURNING` ندارد؛ پس شناسه اینجا ساخته می‌شود و همان
// برمی‌گردد — نه `LAST_INSERT_ID()`، که برای ستونِ CHAR(36) چیزی نمی‌داند.
async function makeUser(suffix: string): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into users (id, email, password_hash, full_name)
     values (?, ?, 'x', ?)`,
    [id, `${TAG}+${suffix}+${Date.now()}@example.invalid`, `کاربر ${suffix}`],
  );
  return id;
}

async function makePlan(code: string, days: number, tomans: number) {
  const planId = randomUUID();
  await execute(
    `insert into plus_plans (id, code, title, duration_days)
     values (?, ?, ?, ?)`,
    [planId, code, `پلن ${code}`, days],
  );

  const versionId = randomUUID();
  await execute(
    `insert into plus_plan_versions
       (id, plan_id, version, title, duration_days, amount_rials, is_sellable)
     values (?, ?, 1, ?, ?, ?, 1)`,
    [versionId, planId, `پلن ${code}`, days, tomansToRials(tomans)],
  );

  return { planId, versionId };
}

async function cleanup(): Promise<void> {
  // ⚠️ ترتیب اجباری است و خودش یک بررسیِ ضمنی:
  //   • حذف کاربر، سفارش‌هایش را cascade می‌برد.
  //   • نسخهٔ پلن و پلن هر دو `on delete restrict` دارند — عمدی، تا هیچ
  //     حذفی نتواند بی‌سروصدا تاریخچهٔ قیمت را ببرد. پس باید صریح و به
  //     ترتیب حذف شوند.
  await execute(`delete from users where email like ?`, [`${TAG}+%`]);
  await execute(
    `delete from plus_plan_versions
      where plan_id in (select id from plus_plans where code like ?)`,
    [`${TAG}%`],
  );
  await execute(`delete from plus_plans where code like ?`, [`${TAG}%`]);
}

/* ────────────────────────────── آزمون‌ها ───────────────────────────────── */

async function main(): Promise<void> {
  console.log("آزمون سروا پلاس روی دیتابیس واقعی\n" + "=".repeat(40));

  await cleanup();

  // سروا پلاس باید روشن باشد وگرنه resolver همه‌چیز را "off" می‌دهد.
  // ⚠️ `key` در MySQL کلمهٔ کلیدی است؛ بدون backtick خطای نحوی می‌دهد.
  // json_quote به‌جای to_jsonb، و on duplicate key به‌جای on conflict.
  await execute(
    "insert into app_settings (`key`, value) values ('plus.enabled', json_quote('on'))\n" +
      "     on duplicate key update value = values(value)",
  );

  const day = 86_400_000;

  /* ── ۱. حالت‌های پایه ───────────────────────────────────────────────── */
  section("۱) وضعیت پایه");
  {
    const free = await makeUser("free");
    const status = await getPlusStatusFor(free);
    ok("کاربر بدون اشتراک، پلاس ندارد", status.state === "free" && !status.isActive);

    // ⚠️ نقشِ مدیر به‌تنهایی پلاس نمی‌سازد.
    const admin = await makeUser("admin");
    await execute("update users set role = 'admin' where id = ?", [admin]);
    const adminStatus = await getPlusStatusFor(admin);
    ok("مدیر بودن به‌تنهایی پلاس نمی‌سازد", !adminStatus.isActive, adminStatus.state);

    // ⚠️ سفارشِ پرداخت‌نشده هم پلاس نمی‌سازد.
    const { planId } = await makePlan(`${TAG}_pending`, 30, 199_000);
    const buyer = await makeUser("pending-order");
    await createOrGetPendingOrder({ userId: buyer, planCode: `${TAG}_pending` });
    ok(
      "سفارشِ در انتظار پرداخت پلاس نمی‌سازد",
      !(await getPlusStatusFor(buyer)).isActive,
    );
    void planId;
  }

  /* ── ۲. idempotency ساخت سفارش ─────────────────────────────────────── */
  section("۲) idempotency ساخت سفارش");
  {
    await makePlan(`${TAG}_1m`, 30, 199_000);
    const user = await makeUser("double-click");

    // دو کلیکِ پشت‌سرهم
    const first = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` });
    const second = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` });
    ok("دوبار کلیک، یک سفارش می‌سازد", first.id === second.id);

    // دو درخواستِ کاملاً هم‌زمان — همان چیزی که «دو تب» است
    const [a, b] = await Promise.all([
      createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` }),
      createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` }),
    ]);
    ok("دو درخواست موازی، یک سفارش می‌سازند", a.id === b.id && a.id === first.id);

    const count = await queryOne<{ n: number }>(
      "select count(*) as n from plus_orders where user_id = ?",
      [user],
    );
    ok("در دیتابیس هم فقط یک سفارش هست", count?.n === 1, `تعداد: ${count?.n}`);

    // مبلغ از پلن آمده، نه از ورودی.
    ok("مبلغ سفارش برابر مبلغ نسخهٔ پلن است", first.amountRials === tomansToRials(199_000));
  }

  /* ── ۳. idempotency فعال‌سازی ──────────────────────────────────────── */
  section("۳) idempotency فعال‌سازی (callback تکراری / رفرش)");
  {
    const user = await makeUser("activate");
    const order = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` });

    const now = new Date();
    const first = await transaction((tx) =>
      activateForOrder(tx, { orderId: order.id, userId: user, durationDays: 30, now }),
    );
    const second = await transaction((tx) =>
      activateForOrder(tx, { orderId: order.id, userId: user, durationDays: 30, now }),
    );

    ok("بار اول دسترسی ساخته می‌شود", first.created);
    ok("بار دوم دسترسیِ تازه نمی‌سازد", !second.created);

    const rows = await queryOne<{ n: number }>(
      "select count(*) as n from plus_entitlements where source_order_id = ?",
      [order.id],
    );
    ok("فقط یک ردیف دسترسی برای این سفارش هست", rows?.n === 1, `تعداد: ${rows?.n}`);

    const status = await getPlusStatusFor(user);
    ok("کاربر حالا پلاس دارد", status.isActive && status.source === "purchase");
  }

  /* ── ۴. تمدید از انتهای دوره ───────────────────────────────────────── */
  section("۴) تمدید، از انتهای دورهٔ فعلی");
  {
    const user = await makeUser("renew");

    // دسترسی فعلی: تا ۱۰ روز دیگر
    const currentEnd = new Date(Date.now() + 10 * day);
    await execute(
      `insert into plus_entitlements
         (id, user_id, source, starts_at, ends_at, reason, granted_by)
       values (?, ?, 'manual_grant', now(6), ?, 'آزمون', null)`,
      [randomUUID(), user, currentEnd],
    );

    const order = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` });
    const result = await transaction((tx) =>
      activateForOrder(tx, { orderId: order.id, userId: user, durationDays: 30, now: new Date() }),
    );

    const startsAt = Date.parse(result.startsAt);
    const drift = Math.abs(startsAt - currentEnd.getTime());
    ok("دورهٔ تازه از انتهای دورهٔ فعلی شروع می‌شود", drift < 2000, `اختلاف: ${drift}ms`);
    ok("سیستم تمدید را تمدید می‌شناسد", result.isRenewal);

    const expectedEnd = currentEnd.getTime() + 30 * day;
    ok(
      "روزهای باقی‌مانده از بین نمی‌رود",
      Math.abs(Date.parse(result.endsAt) - expectedEnd) < 2000,
    );
  }

  /* ── ۵. تعارض هدیهٔ دستی و خرید ────────────────────────────────────── */
  section("۵) هدیهٔ دستی + خرید، دسترسی را کوتاه نمی‌کند");
  {
    const user = await makeUser("grant-vs-buy");

    // دسترسیِ آزمایشی تا ۱۰ روز دیگر
    await manualGrant({
      userId: user,
      days: 10,
      reason: "پایلوت",
      grantedBy: user,
      startFrom: "now",
    });
    const before = await getPlusStatusFor(user);

    // پنج روز بعد خرید می‌کند (شبیه‌سازی: همین حالا)
    const order = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_1m` });
    await transaction((tx) =>
      activateForOrder(tx, { orderId: order.id, userId: user, durationDays: 30, now: new Date() }),
    );

    const after = await getPlusStatusFor(user);
    ok(
      "پایانِ دسترسی بعد از خرید عقب‌تر رفته، نه جلوتر",
      Date.parse(after.expiresAt ?? "") > Date.parse(before.expiresAt ?? ""),
    );
  }

  /* ── ۶. تمدید هم‌زمان (lost update) ────────────────────────────────── */
  section("۶) دو تمدید هم‌زمان، هم را بازنویسی نمی‌کنند");
  {
    const user = await makeUser("concurrent");
    await makePlan(`${TAG}_a`, 30, 100_000);
    await makePlan(`${TAG}_b`, 30, 100_000);

    const orderA = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_a` });
    const orderB = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_b` });

    const now = new Date();
    // ⚠️ واقعاً موازی: بدونِ قفلِ مشورتی، هر دو «بیشترین پایان» را یکسان
    // می‌خوانند و یکی از دو ماه از بین می‌رود.
    await Promise.all([
      transaction((tx) =>
        activateForOrder(tx, { orderId: orderA.id, userId: user, durationDays: 30, now }),
      ),
      transaction((tx) =>
        activateForOrder(tx, { orderId: orderB.id, userId: user, durationDays: 30, now }),
      ),
    ]);

    const status = await getPlusStatusFor(user);
    const days = status.daysRemaining ?? 0;
    ok(
      "دو خریدِ سی‌روزه واقعاً شصت روز می‌دهند",
      days >= 59 && days <= 61,
      `روزهای باقی‌مانده: ${days}`,
    );
  }

  /* ── ۷. لغو و انقضا ───────────────────────────────────────────────── */
  section("۷) لغو و انقضا");
  {
    const user = await makeUser("revoke");
    const granted = await manualGrant({
      userId: user,
      days: 30,
      reason: "آزمون",
      grantedBy: user,
    });
    ok("قبل از لغو فعال است", (await getPlusStatusFor(user)).isActive);

    await revokeEntitlement(granted.id);
    const after = await getPlusStatusFor(user);
    ok("لغو فوری اثر می‌کند", !after.isActive);
    ok("وضعیت «لغوشده» است نه «رایگان»", after.state === "revoked", after.state);

    const stillThere = await queryOne<{ n: number }>(
      "select count(*) as n from plus_entitlements where id = ?",
      [granted.id],
    );
    ok("ردیف حذف نمی‌شود، فقط علامت می‌خورد", stillThere?.n === 1);

    // انقضا
    const expiredUser = await makeUser("expired");
    await execute(
      `insert into plus_entitlements (id, user_id, source, starts_at, ends_at)
       values (?, ?, 'manual_grant',
               date_sub(now(6), interval 40 day), date_sub(now(6), interval 10 day))`,
      [randomUUID(), expiredUser],
    );
    const expired = await getPlusStatusFor(expiredUser);
    ok("دسترسیِ تمام‌شده «expired» است", expired.state === "expired", expired.state);
    ok("دسترسیِ تمام‌شده فعال نیست", !expired.isActive);
  }

  /* ── ۸. دسترسی دائمی ──────────────────────────────────────────────── */
  section("۸) دسترسی دائمی");
  {
    const user = await makeUser("permanent");
    await manualGrant({ userId: user, days: null, reason: "همیشگی", grantedBy: user });

    const status = await getPlusStatusFor(user);
    ok("دسترسی دائمی فعال است", status.isActive);
    ok("تاریخ پایان ندارد", status.expiresAt === null);
    ok("«نزدیک پایان» نیست", !status.expiringSoon);
    ok("روز باقی‌مانده معنی ندارد", status.daysRemaining === null);
  }

  /* ── ۹. مرزِ زمانی ────────────────────────────────────────────────── */
  section("۹) مرزِ بازه: starts_at <= now < ends_at");
  {
    const future = await makeUser("future");
    await execute(
      `insert into plus_entitlements (id, user_id, source, starts_at, ends_at)
       values (?, ?, 'manual_grant',
               date_add(now(6), interval 1 day), date_add(now(6), interval 30 day))`,
      [randomUUID(), future],
    );
    ok("دسترسیِ آینده هنوز فعال نیست", !(await getPlusStatusFor(future)).isActive);

    const edge = await makeUser("edge");
    await execute(
      `insert into plus_entitlements (id, user_id, source, starts_at, ends_at)
       values (?, ?, 'manual_grant',
               date_sub(now(6), interval 30 day), date_sub(now(6), interval 1 second))`,
      [randomUUID(), edge],
    );
    ok("لحظهٔ پایان دیگر دسترسی نیست", !(await getPlusStatusFor(edge)).isActive);
  }

  /* ── ۱۰. مالکیت ───────────────────────────────────────────────────── */
  section("۱۰) مالکیت داده‌های مالی");
  {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");

    const aliceOrder = await createOrGetPendingOrder({ userId: alice, planCode: `${TAG}_1m` });

    const asBob = await getOrderDetail(bob, aliceOrder.id);
    ok("کاربر B سفارش کاربر A را نمی‌بیند", asBob === null);

    const asAlice = await getOrderDetail(alice, aliceOrder.id);
    ok("کاربر A سفارش خودش را می‌بیند", asAlice !== null);

    const bobList = await listOrders(bob);
    ok("فهرست خریدهای B خالی است", bobList.orders.length === 0);
  }

  /* ── ۱۱. تغییرناپذیریِ نسخهٔ فروخته‌شده ───────────────────────────── */
  section("۱۱) نسخهٔ پلن پس از ساخت تغییر نمی‌کند");
  {
    const { versionId } = await makePlan(`${TAG}_imm`, 30, 149_000);

    let rejected = false;
    try {
      await execute("update plus_plan_versions set amount_rials = 1 where id = ?", [versionId]);
    } catch {
      rejected = true;
    }
    ok("تغییر مبلغ نسخه رد می‌شود (تریگر دیتابیس)", rejected);

    let sellableOk = true;
    try {
      await execute("update plus_plan_versions set is_sellable = 0 where id = ?", [versionId]);
    } catch {
      sellableOk = false;
    }
    ok("ولی خارج کردن از فروش مجاز است", sellableOk);

    const amount = await queryOne<{ amount_rials: number }>(
      "select amount_rials from plus_plan_versions where id = ?",
      [versionId],
    );
    ok("مبلغ دست‌نخورده مانده", amount?.amount_rials === tomansToRials(149_000));
  }

  /* ── ۱۲. سفارشِ قدیمی با تغییر قیمت عوض نمی‌شود ──────────────────── */
  section("۱۲) تغییر قیمت، سفارش‌های گذشته را بازنویسی نمی‌کند");
  {
    const { planId } = await makePlan(`${TAG}_price`, 30, 100_000);
    const user = await makeUser("old-price");
    const order = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_price` });

    // نسخهٔ تازه با قیمت بالاتر
    await execute(
      "update plus_plan_versions set is_sellable = 0 where plan_id = ?",
      [planId],
    );
    await execute(
      `insert into plus_plan_versions
         (id, plan_id, version, title, duration_days, amount_rials, is_sellable)
       values (?, ?, 2, 'گران‌تر', 30, ?, 1)`,
      [randomUUID(), planId, tomansToRials(300_000)],
    );

    const again = await getOrderDetail(user, order.id);
    ok(
      "سفارش قدیمی همان قیمتِ لحظهٔ خرید را دارد",
      again?.amountRials === tomansToRials(100_000),
      `مبلغ: ${again?.amountRials}`,
    );

    const fresh = await createOrGetPendingOrder({ userId: user, planCode: `${TAG}_price` });
    ok("سفارش تازه با قیمت تازه ساخته می‌شود", fresh.amountRials === tomansToRials(300_000));
    ok("و سفارشِ تازه، سفارشِ دیگری است", fresh.id !== order.id);
  }

  /* ── ۱۳. جدول‌های سیگنالِ تمرین ────────────────────────────────────── */
  section("۱۳) سیگنال‌های تمرین (پل وزن / مدار دستور)");
  {
    const user = await makeUser("signals");

    // constraint هم‌خوانیِ outcome و is_correct
    let mismatchRejected = false;
    try {
      await execute(
        `insert into aruz_bridge_answers
           (id, user_id, phrase, correct_pattern, chosen_pattern, outcome, is_correct)
         values (?, ?, 'الف', 'فعولن', 'فعولن', 'wrong', 1)`,
        [randomUUID(), user],
      );
    } catch {
      mismatchRejected = true;
    }
    ok("ردیفِ ناسازگار (wrong ولی is_correct) رد می‌شود", mismatchRejected);

    let timeoutRejected = false;
    try {
      await execute(
        `insert into aruz_bridge_answers
           (id, user_id, phrase, correct_pattern, chosen_pattern, outcome, is_correct)
         values (?, ?, 'ب', 'فعولن', 'مفاعیلن', 'timeout', 0)`,
        [randomUUID(), user],
      );
    } catch {
      timeoutRejected = true;
    }
    ok("timeout با انتخاب رد می‌شود", timeoutRejected);

    await execute(
      `insert into aruz_bridge_answers
         (id, user_id, phrase, correct_pattern, chosen_pattern, outcome, is_correct)
       values (?, ?, 'ج', 'فعولن', null, 'timeout', 0)`,
      [randomUUID(), user],
    );
    const saved = await query<{ outcome: string }>(
      "select outcome from aruz_bridge_answers where user_id = ?",
      [user],
    );
    ok("ردیفِ سالم ثبت می‌شود", saved.length === 1 && saved[0].outcome === "timeout");
  }

  await cleanup();

  console.log("\n" + "=".repeat(40));
  if (failures === 0) {
    console.log(`همهٔ ${checks} بررسی سالم‌اند.`);
  } else {
    console.error(`${failures} بررسی از ${checks} شکست خورد.`);
    process.exitCode = 1;
  }
}

main()
  .catch(async (err) => {
    console.error("\nآزمون با خطا متوقف شد:", err);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    const { getPool } = await import("@/lib/db");
    await getPool().end();
  });
