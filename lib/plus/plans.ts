import "server-only";
import { query, queryOne } from "@/lib/db";
import { CANONICAL_CURRENCY, type Currency } from "./money";
import type { PlusPlanOffer } from "./types";

/**
 * کاتالوگِ فروش.
 *
 * ⚠️ قاعدهٔ بنیادیِ این فایل: **قیمت و مدت هرگز از مرورگر نمی‌آیند.**
 *
 * مرورگر فقط `planCode` (یا شناسهٔ نسخه) را می‌فرستد و سرور بقیه را از
 * دیتابیس می‌خواند. یعنی این کار نمی‌کند:
 *
 *     /checkout?price=1000&days=3650
 *
 * و این هم نه: فرستادنِ `amount` در بدنهٔ درخواستِ ساختِ سفارش — چون هیچ
 * تابعی در این فایل و در `orders.ts` مبلغ را به‌عنوان ورودی نمی‌پذیرد.
 * تنها امضایی که وجود دارد «کدِ پلن» است.
 */

type OfferRow = {
  plan_id: string;
  code: string;
  title: string;
  subtitle: string | null;
  duration_days: number;
  version_id: string;
  version: number;
  amount_rials: number;
  currency: Currency;
};

/** ستون‌های مشترکِ «پلن + نسخهٔ قابلِ فروشش». */
const OFFER_COLUMNS = `p.id as plan_id, p.code, p.subtitle,
                       v.id as version_id, v.version, v.title,
                       v.duration_days, v.amount_rials, v.currency`;

function toOffer(row: OfferRow, cheapestPerDay: number | null): PlusPlanOffer {
  const perDay = row.duration_days > 0 ? row.amount_rials / row.duration_days : null;

  return {
    planId: row.plan_id,
    code: row.code,
    // ⚠️ عنوان از *نسخه* می‌آید و نه از پلن: همان چیزی که در لحظهٔ ساختِ
    // نسخه ثبت شده. اگر از پلن می‌آمد، تغییرِ نامِ پلن، عنوانِ نسخه‌های
    // فروخته‌شده را هم عوض می‌کرد.
    title: row.title,
    subtitle: row.subtitle,
    durationDays: row.duration_days,
    planVersionId: row.version_id,
    version: row.version,
    amountRials: row.amount_rials,
    currency: row.currency,

    // «معادلِ ماهانه» فقط یک کمکِ خواندنی است. ۳۰ روز، همان قراردادی که
    // مدتِ پلن‌ها با آن نوشته می‌شود.
    monthlyEquivalentRials:
      perDay === null ? null : Math.round((perDay * 30) / 10) * 10,

    // ⚠️ درصدِ صرفه‌جویی نسبت به *ارزان‌ترین قیمتِ روزانه* حساب می‌شود و نه
    // نسبت به یک «قیمتِ قبلی» ساختگی. تخفیفِ جعلی («۵۰٪ تخفیف!» از قیمتی که
    // هیچ‌وقت وجود نداشته) در این پروژه ساخته نمی‌شود.
    savingPercent:
      perDay === null || cheapestPerDay === null || perDay >= cheapestPerDay
        ? null
        : Math.round((1 - perDay / cheapestPerDay) * 100) || null,
  };
}

/**
 * پلن‌هایی که همین حالا قابلِ خریدند.
 *
 * فقط پلنِ فعال، و فقط نسخه‌ای که `is_sellable` دارد. ایندکس یکتای
 * `plus_plan_versions_one_sellable_idx` تضمین می‌کند این join هیچ‌وقت دو
 * ردیف برای یک پلن ندهد.
 */
export async function listSellableOffers(): Promise<PlusPlanOffer[]> {
  const rows = await query<OfferRow>(
    `select ${OFFER_COLUMNS}
       from plus_plans p
       join plus_plan_versions v on v.plan_id = p.id and v.is_sellable
      where p.is_active
      order by p.sort_index, v.duration_days, p.code`,
  );

  // گران‌ترین «قیمتِ روزانه» مبنای مقایسه است: پلنِ کوتاه معمولاً گران‌ترین
  // نرخِ روزانه را دارد و پلن‌های بلندتر نسبت به آن صرفه دارند.
  const perDays = rows
    .filter((r) => r.duration_days > 0)
    .map((r) => r.amount_rials / r.duration_days);
  const reference = perDays.length ? Math.max(...perDays) : null;

  return rows.map((r) => toOffer(r, reference));
}

/**
 * یک پلنِ قابلِ خرید با کدش.
 *
 * null یعنی «چنین پلنی برای فروش نیست» — چه اصلاً وجود نداشته باشد، چه از
 * فروش خارج شده باشد. هر دو از دیدِ خریدار یک چیزند و کدِ فراخوان نباید
 * مجبور شود فرقشان را بفهمد.
 */
export async function getSellableOfferByCode(code: string): Promise<PlusPlanOffer | null> {
  const row = await queryOne<OfferRow>(
    `select ${OFFER_COLUMNS}
       from plus_plans p
       join plus_plan_versions v on v.plan_id = p.id and v.is_sellable
      where p.is_active and p.code = $1`,
    [code],
  );
  return row ? toOffer(row, null) : null;
}

/**
 * یک نسخهٔ مشخص با شناسه‌اش — حتی اگر دیگر قابلِ فروش نباشد.
 *
 * برای *نمایشِ* سفارش‌های قدیمی است و نه برای فروش. هر جا که خرید تازه‌ای
 * انجام می‌شود باید از `getSellableOfferByCode` استفاده شود، وگرنه نسخه‌ای
 * که از فروش خارج شده دوباره فروخته می‌شود.
 */
export async function getPlanVersion(versionId: string): Promise<
  (PlusPlanOffer & { isSellable: boolean }) | null
> {
  const row = await queryOne<OfferRow & { is_sellable: boolean }>(
    `select ${OFFER_COLUMNS}, v.is_sellable
       from plus_plan_versions v
       join plus_plans p on p.id = v.plan_id
      where v.id = $1`,
    [versionId],
  );
  if (!row) return null;
  return { ...toOffer(row, null), isSellable: row.is_sellable };
}

/** آیا اصلاً چیزی برای فروش هست؟ صفحهٔ «سروا پلاس» با این تصمیم می‌گیرد
 *  دکمهٔ خرید را نشان بدهد یا بنویسد «به‌زودی». */
export async function hasSellableOffers(): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    `select count(*) as n
       from plus_plans p
       join plus_plan_versions v on v.plan_id = p.id and v.is_sellable
      where p.is_active`,
  );
  return (row?.n ?? 0) > 0;
}

export { CANONICAL_CURRENCY };
