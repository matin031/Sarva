/**
 * آزمونِ end-to-endِ ثبتِ فعالیت روی یک دیتابیس واقعی —
 * `npm run db:check-activity`.
 *
 * ⚠️ چرا اینجا و نه در `tests/`:
 *
 * تستِ واحد فقط می‌تواند بگوید تابعِ اعتبارسنجی درست کار می‌کند. چیزی که
 * اینجا سنجیده می‌شود، لایه‌ای است که mock نمی‌تواند جعلش کند:
 *
 *   • آیا بندهای `CHECK` واقعاً روی سرور فعال‌اند؟ (MariaDB بعضی بندها را
 *     بی‌صدا نادیده می‌گیرد اگر عبارتشان را نپذیرد — و آن حالت دقیقاً شبیهِ
 *     موفقیت است.)
 *   • آیا `occurred_at` که از Node رفته، همان چیزی است که برمی‌گردد؟
 *   • آیا بررسیِ مالکیتِ تلاش، تلاشِ کاربرِ دیگر را واقعاً رد می‌کند؟
 *
 * همان الگوی `db:check-teacher` و `db:check-plus`.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه‌چیز با پیشوندِ `zz-activitycheck` ساخته و در
 * پایان پاک می‌شود.
 */
process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";

import { execute, query, queryOne } from "@/lib/db";
import { recordActivity } from "@/lib/activity/record";
import { ACTIVITY_EVENT_TYPES } from "@/lib/activity/schema";

let failures = 0;
let checks = 0;

function ok(label: string) {
  checks++;
  console.log(`  ✓ ${label}`);
}
function bad(label: string, detail?: string) {
  checks++;
  failures++;
  console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
}
function is(actual: unknown, expected: unknown, label: string) {
  if (actual === expected) ok(label);
  else bad(label, `انتظار: ${JSON.stringify(expected)} — دریافت: ${JSON.stringify(actual)}`);
}
function section(title: string) {
  console.log(`\n${title}`);
}

const TAG = "zz-activitycheck";

async function makeUser(suffix: string): Promise<string> {
  const id = randomUUID();
  await execute(
    `insert into users (id, email, role) values (?, ?, 'student')`,
    [id, `${TAG}-${suffix}-${id.slice(0, 8)}@example.test`],
  );
  return id;
}

type EventRow = {
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
};

async function eventsOf(userId: string): Promise<EventRow[]> {
  return query<EventRow>(
    `select event_type, entity_type, entity_id, metadata, occurred_at, created_at
       from user_activity_events where user_id = ? order by occurred_at, event_type`,
    [userId],
  );
}

async function main() {
  console.log("آزمونِ ثبتِ فعالیت روی دیتابیس واقعی\n");

  const student = await makeUser("student");
  const other = await makeUser("other");

  /* ── ۱) ثبتِ ساده ──────────────────────────────────────────────── */
  section("۱) ثبتِ ساده");

  const before = Date.now();
  const login = await recordActivity({ userId: student, eventType: "login" });
  const after = Date.now();
  is(login.ok, true, "رویدادِ login ثبت شد");

  const rows = await eventsOf(student);
  is(rows.length, 1, "دقیقاً یک ردیف نوشته شد");
  is(rows[0]?.entity_type, null, "login نوعِ موجودیت ندارد");
  is(rows[0]?.entity_id, null, "login شناسهٔ موجودیت ندارد");
  is(rows[0]?.metadata, null, "login متادیتا ندارد");

  /* ⚠️ همان چیزی که کلِ تصمیمِ «occurred_at را Node بنویسد» برایش بود:
     مقداری که برمی‌گردد باید در همان بازه‌ای باشد که ساعتِ Node می‌گوید.
     اگر `now(6)` استفاده می‌شد و سرور UTC نبود، این بررسی می‌شکست. */
  const occurred = Date.parse(String(rows[0]?.occurred_at));
  if (occurred >= before - 2000 && occurred <= after + 2000) {
    ok("occurred_at با ساعتِ Node می‌خواند (بی‌ابهام UTC)");
  } else {
    bad(
      "occurred_at با ساعتِ Node نمی‌خواند",
      `Node: ${new Date(before).toISOString()} … ${new Date(after).toISOString()} — ` +
        `ستون: ${rows[0]?.occurred_at}`,
    );
  }

  /* و ستونِ دوم عمداً ساعتِ دیتابیس است — اختلافشان همان سنجهٔ همیشگیِ
     انحرافِ ساعت است که در `docs/activity-events.md` توضیح داده شده. */
  const skew = Math.round(
    (Date.parse(String(rows[0]?.created_at)) - occurred) / 1000,
  );
  console.log(`      (اختلافِ ساعتِ دیتابیس با Node: ${skew} ثانیه)`);

  /* ── ۲) متادیتا ────────────────────────────────────────────────── */
  section("۲) متادیتا");

  const withMeta = await recordActivity({
    userId: student,
    eventType: "game_started",
    entityId: "aruz-bridge",
    metadata: { mode: "easy", level: "dahom" },
  });
  is(withMeta.ok, true, "رویدادِ بازی با متادیتای مجاز ثبت شد");

  const gameRow = await queryOne<EventRow>(
    `select event_type, entity_type, entity_id, metadata, occurred_at, created_at
       from user_activity_events where user_id = ? and event_type = 'game_started'`,
    [student],
  );
  is(gameRow?.entity_type, "game", "نوعِ موجودیت از خودِ رویداد مشتق شد");
  is(gameRow?.entity_id, "aruz-bridge", "شناسهٔ بازی ذخیره شد");
  // ⚠️ درایور ستونِ JSON را خودش تجزیه می‌کند؛ اگر رشته برگردد یعنی
  // `JSON.stringify` جا افتاده و مصرف‌کننده‌ها بعداً `[object Object]`
  // می‌بینند.
  is(typeof gameRow?.metadata, "object", "متادیتا به‌صورت شیء برمی‌گردد");
  is(gameRow?.metadata?.mode, "easy", "کلیدِ mode سالم است");

  const badKey = await recordActivity({
    userId: student,
    eventType: "game_started",
    entityId: "ninja",
    metadata: { score: 100 },
  });
  is(badKey.ok, false, "کلیدِ نمره‌ایِ خارج از فهرست رد شد");

  const huge = await recordActivity({
    userId: student,
    eventType: "game_started",
    entityId: "ninja",
    metadata: { mode: "x".repeat(50_000) },
  });
  is(huge.ok, false, "متادیتای عظیم رد شد");

  /* ── ۳) بندهای CHECK واقعاً فعال‌اند ────────────────────────────── */
  section("۳) بندهای CHECK روی خودِ سرور");

  /* ⚠️ اینجا عمداً `recordActivity` دور زده می‌شود و مستقیم INSERT می‌شود.
     هدف سنجشِ *دیتابیس* است و نه کد: اگر روزی مسیرِ دومی برای نوشتن ساخته
     شود، این بندها آخرین خطِ دفاع‌اند. */
  const tryInsert = async (
    label: string,
    eventType: string,
    entityType: string | null,
    entityId: string | null,
  ) => {
    try {
      await execute(
        `insert into user_activity_events
           (id, user_id, event_type, entity_type, entity_id, occurred_at)
         values (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), student, eventType, entityType, entityId, new Date()],
      );
      bad(label, "دیتابیس ردیفِ نامعتبر را پذیرفت");
    } catch {
      ok(label);
    }
  };

  await tryInsert("نوعِ رویدادِ ناشناخته رد شد", "mouse_moved", null, null);
  await tryInsert("نوعِ موجودیتِ ناشناخته رد شد", "login", "wallet", null);
  await tryInsert("شناسهٔ حاویِ «..» رد شد", "game_started", "game", "../../etc/passwd");
  await tryInsert("شناسهٔ حاویِ فاصله رد شد", "game_started", "game", "a b");

  try {
    await execute(
      `insert into user_activity_events
         (id, user_id, event_type, metadata, occurred_at)
       values (?, ?, 'login', json_quote('not-an-object'), ?)`,
      [randomUUID(), student, new Date()],
    );
    bad("متادیتای غیرِشیء رد شد", "دیتابیس یک رشتهٔ JSON را پذیرفت");
  } catch {
    ok("متادیتای غیرِشیء رد شد");
  }

  /* هر نوعِ رویدادِ فهرستِ تایپ‌اسکریپت باید از CHECK رد شود — یعنی دو
     فهرست واقعاً یکی‌اند و نه فقط روی کاغذ. */
  let allAccepted = true;
  for (const type of ACTIVITY_EVENT_TYPES) {
    try {
      await execute(
        `insert into user_activity_events (id, user_id, event_type, occurred_at)
         values (?, ?, ?, ?)`,
        [randomUUID(), other, type, new Date()],
      );
    } catch (err) {
      allAccepted = false;
      bad(`نوعِ «${type}» را دیتابیس نپذیرفت`, String(err));
    }
  }
  if (allAccepted) ok(`هر ${ACTIVITY_EVENT_TYPES.length} نوعِ رویداد را دیتابیس می‌پذیرد`);
  await execute("delete from user_activity_events where user_id = ?", [other]);

  /* ── ۴) مالکیتِ تلاش ───────────────────────────────────────────── */
  section("۴) مالکیتِ تلاش");

  const myAttempt = randomUUID();
  const theirAttempt = randomUUID();
  await execute(
    `insert into quiz_attempts (id, user_id, total, correct) values (?, ?, 10, 7)`,
    [myAttempt, student],
  );
  await execute(
    `insert into quiz_attempts (id, user_id, total, correct) values (?, ?, 10, 3)`,
    [theirAttempt, other],
  );

  const mine = await recordActivity({
    userId: student,
    eventType: "quiz_completed",
    entityId: myAttempt,
  });
  is(mine.ok, true, "تلاشِ خودِ کاربر پذیرفته شد");

  const theirs = await recordActivity({
    userId: student,
    eventType: "quiz_completed",
    entityId: theirAttempt,
  });
  is(theirs.ok, false, "تلاشِ کاربرِ دیگر رد شد");
  if (!theirs.ok) {
    is(theirs.status, 403, "کدِ پاسخ ۴۰۳ است");
    /* ⚠️ «مالِ تو نیست» و «وجود ندارد» باید یک پیام بدهند، وگرنه می‌شد با
       امتحان کردنِ شناسه‌ها فهمید کدام‌ها تلاشِ واقعی‌اند. */
    const ghost = await recordActivity({
      userId: student,
      eventType: "quiz_completed",
      entityId: randomUUID(),
    });
    if (!ghost.ok) is(ghost.error, theirs.error, "شناسهٔ ناموجود همان پیام را می‌دهد");
    else bad("شناسهٔ ناموجود رد نشد");
  }

  /* ── ۵) حذفِ کاربر، حذفِ رویدادها ───────────────────────────────── */
  section("۵) cascade");

  await execute("delete from users where id = ?", [student]);
  const left = await queryOne<{ n: number }>(
    "select count(*) as n from user_activity_events where user_id = ?",
    [student],
  );
  is(Number(left?.n ?? -1), 0, "با حذفِ کاربر، رویدادهایش هم رفتند");

  /* ── پاک‌سازی ──────────────────────────────────────────────────── */
  await execute("delete from users where email like ?", [`${TAG}-%`]);

  console.log(
    `\n${checks} بررسی — ${failures === 0 ? "همه سالم" : `${failures} شکست`}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("\nآزمون با خطا متوقف شد:\n", err);
  await execute("delete from users where email like ?", [`${TAG}-%`]).catch(() => {});
  process.exit(1);
});
