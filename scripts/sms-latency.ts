/**
 * «کدِ پیامکی دیر می‌رسد — از ماست یا از سرویس؟»  —  `npm run sms:latency`
 *
 * ⚠️ هم‌خانوادهٔ `scripts/sms-diagnose.mjs` است و نه جایگزینِ آن. آن یکی
 * خودِ سرویس را *همین الان* می‌آزماید (دسترسی، IPِ خروجی، اعتبارِ
 * حساب) و باید روی خودِ سرور اجرا شود. این یکی به سرویس دست
 * نمی‌زند و فقط چیزی را می‌خواند که خودمان ثبت کرده‌ایم — پس تاریخچه
 * می‌دهد و نه وضعیتِ لحظه.
 *
 * برای تشخیصِ کامل، هر دو لازم‌اند.
 *
 * =============================================================================
 * ⚠️ این اسکریپت یک سؤالِ مشخص را جواب می‌دهد و نه بیشتر
 * =============================================================================
 *
 * چیزی که اندازه گرفته می‌شود: **مدتِ رفت‌وبرگشتِ درخواستِ HTTP به سرویسِ
 * پیامک** (`sms_log.duration_ms`). چیزی که اندازه گرفته **نمی‌شود**: زمانِ
 * رسیدنِ پیامک به گوشی — چون هیچ‌کس جز خودِ اپراتور آن را نمی‌داند.
 *
 * ولی همین برای تفکیکِ دو حالت کافی است:
 *
 *   • **مدت کوچک، پیامک دیر** → درخواستِ ما فوراً پذیرفته شده و تأخیر در
 *     صفِ سرویس یا اپراتور است. هیچ تغییری در کدِ سروا حلش نمی‌کند؛ باید
 *     با پشتیبانیِ SMS.ir و با `provider_message_id` پیگیری شود.
 *
 *   • **مدت بزرگ** → مشکل سمتِ ماست: شبکهٔ سرور، DNS، یا خودِ فراخوانی.
 *
 * ⚠️ و یک استدلالِ مستقل که پیش از هر عددی برقرار است:
 * `app/api/v1/auth/mobile/send-code/route.ts` تابعِ `sendOtpSms` را
 * **await** می‌کند و تازه بعدش پاسخ می‌دهد. پس اگر آن فراخوانی ده دقیقه
 * طول می‌کشید، صفحهٔ کاربر هم ده دقیقه می‌چرخید. اگر کاربر بلافاصله صفحهٔ
 * «کد را وارد کن» را می‌بیند، تأخیر قطعاً بعد از خداحافظیِ ما اتفاق افتاده.
 * این اسکریپت همان را با عدد نشان می‌دهد.
 *
 * ⚠️ روی دیتابیسِ **production** اجرا شود، وگرنه چیزی برای دیدن نیست:
 *
 *     DATABASE_URL="mysql://…" npx tsx --conditions=react-server scripts/sms-latency.ts
 *
 * ⚠️ هیچ شمارهٔ کاملی چاپ نمی‌شود. `sms_log.to_number` شمارهٔ واقعیِ کاربر
 * است و خروجیِ این اسکریپت معمولاً جایی paste می‌شود.
 */
process.loadEnvFile(".env.local");

import { query, getPool } from "@/lib/db";
import { isMissingColumn, isMissingTable } from "@/lib/db/errors";

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** شمارهٔ پوشیده — فقط چهار رقمِ آخر. */
function mask(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 4 ? `…${digits.slice(-4)}` : "…";
}

function ms(value: number | null): string {
  if (value === null) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(1)} ثانیه` : `${fa(value)} میلی‌ثانیه`;
}

async function main() {
  console.log("\n══ تشخیصِ کندیِ پیامک ══\n");

  /* ── ۱. آیا اصلاً ستون هست؟ ─────────────────────────────────────────── */
  let hasDuration = true;
  try {
    await query("select duration_ms from sms_log limit 1");
  } catch (err) {
    if (isMissingTable(err)) {
      console.log("جدولِ sms_log روی این دیتابیس نیست — migration ها اجرا نشده‌اند.\n");
      await getPool().end();
      return;
    }

    /* ⚠️⚠️ فقط «ستون نیست» گرفته می‌شود و هر خطای دیگری بالا می‌رود.

       نسخهٔ اولِ این اسکریپت هر خطایی را «ستون نیست» می‌فهمید. وقتی
       دیتابیس اصلاً در دسترس نبود (`connect ETIMEDOUT`)، با اطمینان چاپ
       می‌کرد که «migration ۰۱۶ اجرا نشده» — یک تشخیصِ کاملاً غلط، از
       ابزاری که کارش تشخیص است. بدترین نوعِ باگ در یک ابزارِ عیب‌یابی. */
    if (!isMissingColumn(err)) throw err;

    /* ⚠️ «ستون نیست» با «جدول نیست» فرق دارد و پیامِ متفاوتی می‌خواهد:
       اولی یعنی migration ۰۱۶ اجرا نشده و ردیف‌های قدیمی هم این عدد را
       ندارند، پس گزارشِ زیر فقط بخشِ شمارشی‌اش معنی دارد. */
    hasDuration = false;
    console.log("⚠️ ستونِ duration_ms نیست (migration ۰۱۶ اجرا نشده).");
    console.log("   شمارشِ ارسال‌ها نشان داده می‌شود ولی زمان‌ها نه.\n");
  }

  /* ── ۲. حجم و نتیجهٔ ارسال‌های اخیر ─────────────────────────────────── */
  const totals = await query<{ status: string; n: number; oldest: string; newest: string }>(
    `select status, count(*) as n, min(created_at) as oldest, max(created_at) as newest
       from sms_log
      where created_at > now(6) - interval 30 day
      group by status`,
  );

  if (totals.length === 0) {
    console.log("در سی روز گذشته هیچ پیامکی ثبت نشده است.\n");
    await getPool().end();
    return;
  }

  console.log("── سی روز گذشته ──");
  for (const row of totals) {
    console.log(`  ${row.status.padEnd(7)} ${fa(row.n)}   (${row.oldest} تا ${row.newest})`);
  }
  console.log();

  if (!hasDuration) {
    await getPool().end();
    return;
  }

  /* ── ۳. توزیعِ زمانِ رفت‌وبرگشت ─────────────────────────────────────── */
  /* ⚠️ صدک با یک کوئریِ ساده حساب نمی‌شود و `PERCENTILE_CONT` در MariaDB
     به‌شکلی که MySQL 8 دارد در دسترس نیست. تعدادِ ردیف‌ها کم است (چند هزار
     در ماه)، پس مرتب‌سازی در همین‌جا هم ارزان است و هم قابلِ اتکا روی هر
     دو موتور. */
  const durations = await query<{ duration_ms: number }>(
    `select duration_ms
       from sms_log
      where created_at > now(6) - interval 30 day
        and duration_ms is not null
      order by duration_ms`,
  );

  if (durations.length === 0) {
    console.log("هنوز ارسالی با زمانِ ثبت‌شده نیست — بعد از استقرارِ نسخهٔ تازه دوباره بزنید.\n");
    await getPool().end();
    return;
  }

  const values = durations.map((d) => Number(d.duration_ms));
  const at = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  console.log("── مدتِ رفت‌وبرگشتِ درخواست به سرویس ──");
  console.log(`  نمونه‌ها : ${fa(values.length)}`);
  console.log(`  میانه   : ${ms(at(0.5))}`);
  console.log(`  ۹۵٪     : ${ms(at(0.95))}`);
  console.log(`  بیشینه  : ${ms(values[values.length - 1])}`);
  console.log(`  میانگین : ${ms(avg)}`);
  console.log();

  /* ── ۴. کندترین ارسال‌های اخیر ──────────────────────────────────────── */
  const slowest = await query<{
    to_number: string;
    status: string;
    duration_ms: number;
    provider_message_id: string | null;
    created_at: string;
  }>(
    `select to_number, status, duration_ms, provider_message_id, created_at
       from sms_log
      where created_at > now(6) - interval 30 day
        and duration_ms is not null
      order by duration_ms desc
      limit 5`,
  );

  console.log("── کندترین‌ها ──");
  for (const row of slowest) {
    console.log(
      `  ${row.created_at}  ${mask(row.to_number)}  ${row.status.padEnd(7)}  ${ms(Number(row.duration_ms))}` +
        (row.provider_message_id ? `  msgId=${row.provider_message_id}` : ""),
    );
  }
  console.log();

  /* ── ۵. حکم ─────────────────────────────────────────────────────────── */
  /* ⚠️ آستانه‌ها صریح‌اند و دلیل دارند.

     یک فراخوانیِ HTTP به یک سرویسِ داخلی معمولاً زیرِ یک ثانیه است. پنج
     ثانیه یعنی چیزی در مسیرِ شبکه‌ای مشکل دارد. هیچ‌کدامِ این‌ها به ده
     دقیقه نزدیک هم نیستند — و همین نکته است. */
  const p95 = at(0.95);
  console.log("── حکم ──");
  if (p95 < 2000) {
    console.log("  درخواست‌های ما سریع پذیرفته می‌شوند (۹۵٪ زیرِ دو ثانیه).");
    console.log("  پس تأخیرِ رسیدنِ پیامک **سمتِ سرویس یا اپراتور** است و نه کدِ سروا.");
    console.log();
    console.log("  قدمِ بعدی: با پشتیبانیِ SMS.ir و همان msgIdهای بالا پیگیری کنید");
    console.log("  و بپرسید «زمانِ delivery این پیام‌ها چه بوده؟».");
    console.log("  در پنلِ SMS.ir هم وضعیتِ هر پیام با همین شناسه دیده می‌شود.");
  } else if (p95 < 10_000) {
    console.log("  ۹۵٪ بینِ دو تا ده ثانیه — کندتر از حدِ انتظار.");
    console.log("  احتمالاً شبکهٔ سرور یا DNS. ولی این هم ده دقیقه نیست:");
    console.log("  اگر پیامک ده دقیقه دیر می‌رسد، بخشِ اصلیِ تأخیر باز هم سمتِ سرویس است.");
  } else {
    console.log("  ۹۵٪ بالای ده ثانیه — مشکل سمتِ ماست.");
    console.log("  شبکهٔ سرور، DNS، یا مسدود بودنِ مسیر به api.sms.ir را بررسی کنید.");
  }
  console.log();

  await getPool().end();
}

main().catch(async (err) => {
  console.error("\nخطا:", err instanceof Error ? err.message : err);
  await getPool().end().catch(() => {});
  process.exit(1);
});
