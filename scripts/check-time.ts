/**
 * تشخیصِ قراردادِ زمان — `npm run db:check-time`.
 *
 * =============================================================================
 * ⚠️ این اسکریپت فقط **می‌خواند**. هیچ ردیفی را تغییر نمی‌دهد.
 * =============================================================================
 *
 * ساخته شد چون یک ناسازگاریِ واقعی پیدا شد و پاسخِ «چقدر بد است؟» به
 * تنظیماتِ سرور بستگی دارد — چیزی که فقط روی خودِ آن سرور قابل اندازه‌گیری
 * است.
 *
 * ── مسئله ─────────────────────────────────────────────────────────────────
 * `lib/db` به درایور می‌گوید هر DATETIME را UTC بخواند (`timezone: "Z"`)، ولی
 * هیچ‌جا `time_zone`ِ نشست را تنظیم نمی‌کند. اگر سرور روی `SYSTEM` باشد و
 * ساعتِ سیستم UTC نباشد، آن‌وقت:
 *
 *   • هر `now(6)` و هر `DEFAULT CURRENT_TIMESTAMP(6)` وقتِ *محلی* می‌نویسد،
 *   • ولی کد آن را UTC می‌خواند،
 *   • و `CONVERT_TZ(x, '+00:00', 'Asia/Tehran')` یک بارِ دیگر هم جابه‌جایش
 *     می‌کند.
 *
 * پیامدش در دو جا دیده می‌شود:
 *   ۱) هر مقایسه‌ای که یک طرفش ساعتِ دیتابیس و طرف دیگرش `Date.now()` است.
 *   ۲) سطل‌بندیِ روزانه — فعالیتِ شب به روزِ بعد می‌افتد.
 *
 * ── چه چیزی این اسکریپت جواب می‌دهد ───────────────────────────────────────
 *   • منطقهٔ زمانیِ نشست و سراسری
 *   • اختلافِ ساعتِ دیتابیس با ساعتِ Node
 *   • آیا جدول‌های منطقهٔ زمانی بارگذاری شده‌اند (برای `Asia/Tehran`)
 *   • برای هر جدولِ زمان‌دار: تازه‌ترین مقدار در برابر «حالا»، تا معلوم شود
 *     دادهٔ موجود محلی نوشته شده یا UTC — و چند ردیف در میان است.
 *   • و اینکه همین اختلاف روی `extendEntitlement` چه اثری می‌گذارد.
 */
process.loadEnvFile(".env.local");

import { queryOne } from "@/lib/db";

const say = (m = "") => console.log(m);
const section = (t: string) => say(`\n${t}`);

/** جدول‌هایی که ستونِ زمانشان با ساعتِ *دیتابیس* پر می‌شود. */
const CLOCK_TABLES: { table: string; column: string; why: string }[] = [
  { table: "user_answers", column: "answered_at", why: "نمودار روزانه / روزهای فعال" },
  { table: "vocab_answers", column: "answered_at", why: "نمودار روزانه" },
  { table: "jasoos_answers", column: "answered_at", why: "نمودار روزانه" },
  { table: "aruz_bridge_answers", column: "answered_at", why: "تحلیل وزن" },
  { table: "grammar_circuit_answers", column: "answered_at", why: "تحلیل نقش دستوری" },
  { table: "quiz_attempts", column: "created_at", why: "کارنامه" },
  { table: "exam_attempts", column: "created_at", why: "کارنامه" },
  { table: "sessions", column: "created_at", why: "آخرین ورود" },
  { table: "users", column: "created_at", why: "تاریخ عضویت" },
  { table: "plus_entitlements", column: "created_at", why: "سابقهٔ اشتراک" },
  { table: "teacher_requests", column: "created_at", why: "صف بررسی دبیران" },
];

async function main() {
  say("تشخیصِ قراردادِ زمان — فقط خواندنی\n");

  /* ── ۱) ساعت و منطقهٔ زمانی ─────────────────────────────────────── */
  section("۱) ساعتِ سرور");

  const jsBefore = Date.now();
  const clock = await queryOne<{
    db_now: string;
    session_tz: string;
    global_tz: string;
    sys_tz: string;
  }>(
    `select now(6) as db_now,
            @@session.time_zone as session_tz,
            @@global.time_zone  as global_tz,
            @@system_time_zone  as sys_tz`,
  );
  const jsAfter = Date.now();

  // میانهٔ دو اندازه‌گیری، تا تأخیرِ شبکه در عدد نیفتد.
  const jsNow = (jsBefore + jsAfter) / 2;
  const dbNow = Date.parse(String(clock?.db_now));
  const skewSec = Math.round((dbNow - jsNow) / 1000);

  say(`  time_zone نشست   : ${clock?.session_tz}`);
  say(`  time_zone سراسری : ${clock?.global_tz}`);
  say(`  منطقهٔ سیستم      : ${clock?.sys_tz}`);
  say(`  now(6) دیتابیس   : ${clock?.db_now}`);
  say(`  new Date() نود   : ${new Date(jsNow).toISOString()}`);
  say(`  اختلاف           : ${skewSec} ثانیه (${(skewSec / 3600).toFixed(2)} ساعت)`);

  const skewed = Math.abs(skewSec) > 120;
  if (skewed) {
    say("");
    say("  ⚠️ اختلافِ معنادار. یعنی `now(6)` و `Date.now()` یک لحظه را");
    say("     نمی‌گویند. هر مقایسه‌ای که یک طرفش SQL و طرف دیگرش JS باشد،");
    say("     به همین اندازه غلط است.");
  } else {
    say("  ✓ ساعتِ دیتابیس و نود یکی‌اند (نشست عملاً UTC است).");
  }

  /* ── ۲) جدول‌های منطقهٔ زمانی ────────────────────────────────────── */
  section("۲) جدول‌های منطقهٔ زمانی (برای Asia/Tehran)");

  const tz = await queryOne<{ converted: string | null }>(
    `select convert_tz('2026-01-01 12:00:00', '+00:00', 'Asia/Tehran') as converted`,
  );
  if (tz?.converted == null) {
    say("  ✗ بارگذاری نشده‌اند — `CONVERT_TZ` با نامِ منطقه NULL می‌دهد.");
    say("     هر گزارشِ روزانه‌ای که از آن استفاده کند، **خالی** می‌شود");
    say("     بی‌آنکه خطایی بدهد.");
    say("     راه‌حل روی لینوکس:");
    say("       mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root mysql");
  } else {
    say(`  ✓ بارگذاری شده‌اند — 12:00Z → ${tz.converted} (باید 15:30 باشد)`);
  }

  /* ── ۳) دادهٔ موجود: محلی نوشته شده یا UTC؟ ──────────────────────── */
  section("۳) دادهٔ موجود");
  say("  «فاصلهٔ تازه‌ترین ردیف تا حالا» — اگر داده محلی نوشته شده باشد و");
  say("  سرور جلوتر از UTC باشد، این عدد منفیِ بزرگ می‌شود (زمانِ آینده).");
  say("");
  say("  جدول                      ردیف      تازه‌ترین مقدار             فاصله تا حالا");

  let suspicious = 0;
  let totalRows = 0;

  for (const { table, column, why } of CLOCK_TABLES) {
    let row: { n: number; newest: string | null } | null = null;
    try {
      row = await queryOne<{ n: number; newest: string | null }>(
        `select count(*) as n, max(\`${column}\`) as newest from \`${table}\``,
      );
    } catch {
      say(`  ${table.padEnd(26)} — جدول نیست`);
      continue;
    }

    const n = row?.n ?? 0;
    totalRows += n;
    if (!row?.newest) {
      say(`  ${table.padEnd(26)}${String(n).padEnd(10)}—`);
      continue;
    }

    const ageSec = Math.round((Date.now() - Date.parse(row.newest)) / 1000);
    const future = ageSec < -120;
    if (future) suspicious++;

    const ageLabel = future
      ? `${Math.abs(ageSec / 3600).toFixed(2)} ساعت در آینده ⚠️`
      : `${(ageSec / 3600).toFixed(2)} ساعت پیش`;

    say(`  ${table.padEnd(26)}${String(n).padEnd(10)}${row.newest.padEnd(28)}${ageLabel}`);
    if (future) say(`  ${"".padEnd(26)}↳ ${why}`);
  }

  /* ── ۴) اثرِ اختلافِ ساعت روی تمدیدِ اشتراک ─────────────────────── */
  section("۴) تمدیدِ اشتراک در برابرِ اختلافِ ساعت");

  say("  `extendEntitlement` این عبارت را دارد:");
  say("      set ends_at = date_add(greatest(ends_at, now(6)), interval ? day)");
  say("");
  say("  `ends_at` را برنامه می‌نویسد (UTC) ولی `now(6)` ساعتِ سرور است.");
  say("  اگر آن دو یکی نباشند، `greatest` دو چیزِ ناهم‌مقیاس را می‌سنجد.");
  say("");

  /* ⚠️ فقط خواندن: عبارت روی مقادیرِ *ادبی* اجرا می‌شود و هیچ ردیفی
     تغییر نمی‌کند. هدف، دیدنِ همان تصمیمی است که آن UPDATE می‌گیرد. */
  const nowUtc = new Date();
  const soon = new Date(nowUtc.getTime() + 60 * 60 * 1000); // یک ساعت دیگر
  const toSql = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

  const pick = await queryOne<{ chosen: string; is_now: number }>(
    "select greatest(?, now(6)) as chosen, greatest(?, now(6)) = now(6) as is_now",
    [toSql(soon), toSql(soon)],
  );

  say(`  اشتراکی که یک ساعت دیگر تمام می‌شود : ${toSql(soon)}`);
  say(`  عبارت این را انتخاب می‌کند           : ${pick?.chosen}`);
  say("");

  if (pick?.is_now) {
    /* ساعتِ دیتابیس جلوتر از UTC است — «هنوز فعال» را «منقضی» می‌بیند. */
    const driftHours = Math.abs(skewSec / 3600);
    say("  ⚠️ اشتراکِ **هنوز فعال** را منقضی دیده و از ساعتِ خودش شمرده.");
    say(`     یعنی کاربر تا حدودِ ${driftHours.toFixed(2)} ساعت بیشتر از`);
    say("     مقدارِ تعیین‌شده اشتراک می‌گیرد.");
    say("");
    say("     اثرش کوچک و به نفعِ کاربر است — به همین دلیل هم عجله‌ای برای");
    say("     تغییرش نیست. ولی اگر ساعتِ سرور **عقب‌تر** از UTC بود، جهتش");
    say("     برعکس می‌شد: اشتراکی که تازه منقضی شده، از لحظهٔ انقضا تمدید");
    say("     می‌شد و کاربر همان اندازه کمتر می‌گرفت.");
  } else {
    say("  ✓ همان چیزی را انتخاب کرد که انتظار می‌رود.");
  }

  say("");
  say("  ⚠️ راهِ درست همان کاری است که `grantTeacherPlus` شد: به‌جای");
  say("     `now(6)`، یک `Date` از Node پارامتر شود.");
  say("");
  say("     ولی **هنوز نه**: اگر `ends_at`های موجودِ production خودشان با");
  say("     ساعتِ محلی نوشته شده باشند، مقایسه‌شان با یک `Date`ِ UTC خطا را");
  say("     برعکس می‌کند. اول خروجیِ بخشِ ۳ همین گزارش روی خودِ هاست،");
  say("     بعد تصمیم.");

  /* ── ۵) جمع‌بندی ─────────────────────────────────────────────────── */
  section("۵) جمع‌بندی");

  if (!skewed && suspicious === 0) {
    say("  ✓ قرارداد سالم است: نشست UTC، و دادهٔ موجود هم UTC نوشته شده.");
    say("    تنظیمِ صریحِ `time_zone` روی نشست بی‌خطر است و چیزی را عوض");
    say("    نمی‌کند — فقط این وضعیت را در برابر تغییرِ تنظیماتِ سرور قفل");
    say("    می‌کند.");
  } else {
    say(`  ⚠️ ${suspicious} جدول دادهٔ «آینده» دارد و اختلافِ ساعت ${skewSec} ثانیه است.`);
    say("");
    say("    یعنی دادهٔ موجود با ساعتِ محلیِ سرور نوشته شده. تنظیمِ");
    say("    `time_zone = '+00:00'` از این به بعد درست می‌نویسد، ولی ردیف‌های");
    say("    قدیمی به اندازهٔ همان اختلاف جابه‌جا می‌مانند.");
    say("");
    say(`    مجموع ردیف‌های زمان‌دارِ بررسی‌شده: ${totalRows}`);
    say("    پیش از هر backfill، از دیتابیس نسخهٔ پشتیبان بگیرید.");
  }

  say("");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nتشخیص با خطا متوقف شد:\n", err);
  process.exit(1);
});
