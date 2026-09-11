/**
 * پلن‌های فروشِ سروا پلاس — یک‌ماهه، دوماهه، سه‌ماهه.
 *
 *     DATABASE_URL=… npm run db:seed-plus
 *
 * ⚠️ این اسکریپت **قیمت را تعیین نمی‌کند، فقط شروعش می‌کند.** بعد از اجرا،
 * هر تغییر قیمت از «پنل مدیریت ← سروا پلاس» انجام می‌شود و همان‌جا هم یک
 * *نسخهٔ تازه* می‌سازد تا فاکتورِ خریدهای قبلی دست‌نخورده بماند. اینجا فقط
 * برای این است که سایت از روزِ اول چیزی برای فروش داشته باشد.
 *
 * ── چرا اجرای دوباره بی‌خطر است ───────────────────────────────────────────
 * پلنی که از قبل هست دست نمی‌خورد، و نسخهٔ قیمتی فقط وقتی ساخته می‌شود که
 * آن پلن *هیچ* نسخه‌ای نداشته باشد.
 *
 * دلیلش یک اشتباهِ کاملاً محتمل است: کسی اسکریپت را روی سرورِ اصلی دوباره
 * اجرا می‌کند تا «مطمئن شود پلن‌ها هستند». اگر قیمت را بازنویسی می‌کرد،
 * قیمتی که مالک از پنل تنظیم کرده بی‌صدا به عددِ داخلِ کد برمی‌گشت.
 *
 * ⚠️ و چرا `lib/db` وارد نمی‌شود: آن ماژول `server-only` است و از یک اسکریپتِ
 * نودِ ساده بارگذاری نمی‌شود. همان `connect` که بقیهٔ seed ها استفاده می‌کنند.
 */

import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { connect } from "./mysql/script-db.mjs";
import { tomansToRials } from "../lib/plus/money";

/**
 * ⚠️ واحد: **تومان**.
 *
 * `tomansToRials` تنها جایی است که ضرب در ۱۰ انجام می‌شود و ستون دیتابیس
 * همیشه ریال است. هیچ عددِ ریالی در این فایل نوشته نمی‌شود — همان قاعده‌ای
 * که بالای `lib/plus/money.ts` توضیح داده شده و دلیلش «فاکتورِ ده برابر» است.
 */
const PLANS = [
  {
    code: "plus_1m",
    title: "سروا پلاس یک‌ماهه",
    subtitle: "برای امتحان کردن",
    durationDays: 30,
    priceTomans: 149_000,
    /** قیمتِ پیش از تخفیف. null یعنی این پلن تخفیف ندارد. */
    compareAtTomans: null as number | null,
  },
  {
    code: "plus_2m",
    title: "سروا پلاس دوماهه",
    subtitle: "دو ماه، کمتر از دو برابرِ یک‌ماهه",
    durationDays: 60,
    priceTomans: 270_000,
    // ⚠️ ۲۹۸ = دو برابرِ قیمتِ یک‌ماهه. یعنی این عدد یک مرجعِ *واقعی* است و
    // نه عددی که بزرگ‌تر انتخاب شده تا درصدِ تخفیف بسازد.
    compareAtTomans: 298_000,
  },
  {
    code: "plus_3m",
    title: "سروا پلاس سه‌ماهه",
    subtitle: "کمترین هزینهٔ ماهانه",
    durationDays: 90,
    priceTomans: 389_000,
    // ۴۴۷ = سه برابرِ قیمتِ یک‌ماهه.
    compareAtTomans: 447_000,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  const conn = await connect(url);
  let created = 0;
  let priced = 0;

  try {
    for (const [index, plan] of PLANS.entries()) {
      const [found] = await conn.query<(RowDataPacket & { id: string })[]>(
        "select id from plus_plans where code = ?",
        [plan.code],
      );

      let planId: string;
      if (found.length > 0) {
        planId = found[0].id;
        console.log(`• ${plan.code} از قبل هست — دست نخورد.`);
      } else {
        planId = randomUUID();
        await conn.execute(
          `insert into plus_plans (id, code, title, subtitle, duration_days, sort_index, is_active)
           values (?, ?, ?, ?, ?, ?, 1)`,
          [planId, plan.code, plan.title, plan.subtitle, plan.durationDays, index],
        );
        created++;
        console.log(`✓ ${plan.code} ساخته شد.`);
      }

      // ⚠️ فقط وقتی هیچ نسخه‌ای نیست. پلنی که نسخه دارد یعنی قیمتش یک بار
      // تعیین شده — چه اینجا و چه از پنل — و بازنویسی‌اش یعنی پاک کردنِ
      // تصمیمِ مالک.
      const [versions] = await conn.query<(RowDataPacket & { id: string })[]>(
        "select id from plus_plan_versions where plan_id = ? limit 1",
        [planId],
      );
      if (versions.length > 0) {
        console.log("  ↳ نسخهٔ قیمتی از قبل دارد — دست نخورد.");
        continue;
      }

      await conn.execute(
        `insert into plus_plan_versions
           (id, plan_id, version, title, duration_days, amount_rials, compare_at_rials,
            is_sellable, note)
         values (?, ?, 1, ?, ?, ?, ?, 1, ?)`,
        [
          randomUUID(),
          planId,
          plan.title,
          plan.durationDays,
          tomansToRials(plan.priceTomans),
          plan.compareAtTomans === null ? null : tomansToRials(plan.compareAtTomans),
          "نسخهٔ اولیه، از seed",
        ],
      );
      priced++;
      console.log(`  ↳ نسخهٔ ۱ با ${plan.priceTomans.toLocaleString("fa-IR")} تومان ساخته شد.`);
    }

    console.log(`\n${created} پلن تازه، ${priced} نسخهٔ قیمتی.`);
    console.log("تغییر قیمت از این به بعد: پنل مدیریت ← سروا پلاس.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
