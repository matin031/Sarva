import "server-only";
import { cache } from "react";
import { query } from "@/lib/db";
import { logger } from "@/lib/observability";
import { AuthError } from "@/lib/auth/types";
import { getCurrentUser } from "@/lib/auth/current-user";
import { expiringSoonDays, isPlusEnabled } from "./config";
import { resolveCoverage, type CoverageRow } from "./coverage";
import type { PlusSource, PlusStatus } from "./types";

/**
 * **تنها** جایی که پاسخ داده می‌شود: «این کاربر همین حالا پلاس دارد؟»
 *
 * هر قفلِ سمتِ سرور، هر نشانِ سمتِ کلاینت و هر صفحهٔ پنل از همین یک تابع
 * می‌گذرد. اگر جای دیگری از پروژه شرطِ خودش را برای «پلاس بودن» بنویسد، آن
 * شرط دیر یا زود با این یکی اختلاف پیدا می‌کند و نتیجه‌اش بدترین نوعِ باگ
 * است: کاربری که در یک صفحه پلاس است و در صفحهٔ بعد نیست.
 *
 * ── چیزهایی که پلاس **نمی‌سازند** ──────────────────────────────────────────
 * فهرست زیر عمدی است و هر عضوش یک اشتباهِ رایج:
 *
 *   ✗ `role = 'admin'` — مدیر بودن یک نقشِ عملیاتی است، نه اشتراک. اگر مدیر
 *     خودبه‌خود پلاس می‌شد، هیچ‌وقت نمی‌فهمید کاربرِ عادی چه می‌بیند.
 *   ✗ وجود یک سفارشِ `pending` — هنوز پولی تأیید نشده.
 *   ✗ هر چیزی در localStorage یا query string.
 *   ✗ ادعای داخلِ JWT. توکن پانزده دقیقه عمر دارد؛ لغوِ دسترسی باید فوری
 *     اثر کند، پس وضعیت هر بار از دیتابیس خوانده می‌شود.
 *
 * تنها چیزی که پلاس می‌سازد یک ردیفِ معتبر در `plus_entitlements` است.
 *
 * ── کاربرِ مسدود ────────────────────────────────────────────────────────────
 * هیچ بررسیِ جداگانه‌ای برای بن اینجا نیست و لازم هم نیست:
 * `getCurrentUser()` برای کاربرِ مسدود `null` برمی‌گرداند، پس او اصلاً به
 * لایهٔ دسترسی نمی‌رسد. یعنی «مسدود ولی پلاس» همچنان مسدود است — سیاستِ حساب
 * بر اشتراک مقدم است. (تستِ همین در `tests/plus/entitlement.test.ts`.)
 */

/* ─────────────────────────────── خطاها ─────────────────────────────────── */

/**
 * «این بخش فقط برای سروا پلاس است.»
 *
 * از AuthError ارث می‌برد تا `handleError` و `withRoute` آن را یک خطای
 * *مورد انتظار* بشناسند و در جدول خطا ردیف نسازند — درست مثل «وارد نشده‌اید».
 */
export class PlusRequiredError extends AuthError {
  readonly code = "plus_required";
  constructor(message = "این بخش با سروا پلاس در دسترس است.") {
    super(message, 403);
    this.name = "PlusRequiredError";
  }
}

/**
 * «نتوانستیم وضعیت اشتراک را بخوانیم.»
 *
 * ⚠️ فرقش با بالایی حیاتی است. این خطا یعنی *ما* مشکل داریم، نه کاربر. پیامش
 * هرگز نباید به «اشتراک نداری، بخر» تبدیل شود: کاربری که دیروز پول داده،
 * ممکن است دوباره بپردازد.
 */
export class PlusUnavailableError extends AuthError {
  readonly code = "plus_unavailable";
  constructor(message = "در بررسی وضعیت اشتراک مشکلی پیش آمد. لحظه‌ای بعد دوباره تلاش کنید.") {
    super(message, 503);
    this.name = "PlusUnavailableError";
  }
}

/* ──────────────────────────── خواندنِ وضعیت ─────────────────────────────── */

type Row = {
  starts_at: string;
  ends_at: string | null;
  source: PlusSource;
  revoked_at: string | null;
};

/** سقفِ ردیف‌هایی که خوانده می‌شود.
 *
 *  تعدادِ دسترسی‌های یک کاربر برابرِ تعدادِ خرید و هدیه‌هایش است — یعنی در
 *  عمل چند ردیف. سقف برای این است که یک ردیفِ خرابِ تکراری نتواند این کوئریِ
 *  داغ را سنگین کند. */
const MAX_ENTITLEMENT_ROWS = 200;

const MS_PER_DAY = 86_400_000;

function freeStatus(state: PlusStatus["state"]): PlusStatus {
  return {
    state,
    isActive: false,
    expiresAt: null,
    startsAt: null,
    daysRemaining: null,
    expiringSoon: false,
    source: null,
    isTrial: false,
  };
}

/**
 * وضعیتِ پلاسِ یک کاربر.
 *
 * ⚠️ `cache()` از React: نتیجه در محدودهٔ **یک درخواست** نگه داشته می‌شود.
 * یک صفحهٔ پنل ممکن است در سه کامپوننتِ سروری این را صدا بزند؛ بدون کش سه
 * کوئری می‌خورد. و چون عمرِ کش به همان درخواست است، هیچ دادهٔ کهنه‌ای بین دو
 * درخواست — یا بین دو کاربر — نشت نمی‌کند. این مهم‌ترین دلیلِ نبودِ یک کشِ
 * سراسریِ حافظه‌ای اینجاست: کشِ سراسری دقیقاً همان جایی است که «کاربر B
 * وضعیتِ کاربر A را دید» متولد می‌شود.
 */
export const getPlusStatusFor = cache(async (userId: string): Promise<PlusStatus> => {
  // خاموش بودنِ کلِ پلاس، قبل از هر کوئری بررسی می‌شود: وقتی سایت رایگان
  // است، حتی یک select هم نباید بابتش زده شود.
  let enabled: boolean;
  try {
    enabled = await isPlusEnabled();
  } catch (err) {
    // خواندنِ تنظیمات هم از دیتابیس می‌آید. اگر آن هم شکست بخورد، «نمی‌دانم»
    // درست‌ترین پاسخ است — نه «رایگان» (که قفل‌ها را باز می‌کند) و نه
    // «ندارد» (که به کاربرِ پولی می‌گوید اشتراک ندارد).
    logger.error("خواندن تنظیمات سروا پلاس شکست خورد", { event: "plus.config.failed", err });
    return freeStatus("unavailable");
  }
  if (!enabled) return freeStatus("off");

  const now = new Date();

  let rows: Row[];
  try {
    // ⚠️ همهٔ دسترسی‌های *لغونشده* خوانده می‌شوند و نه فقط دسترسیِ فعالِ
    // امروز. دلیلش یک باگِ واقعی است: کاربری که دو دورهٔ پشتِ‌سرِهم خریده،
    // با خواندنِ تنها یک ردیف «۳۰ روز باقی‌مانده» می‌دید در حالی که ۶۰ روز
    // خریده بود — و هشدارِ «نزدیک پایان» هم زودتر شلیک می‌شد. جزئیاتش بالای
    // `lib/plus/coverage.ts`.
    //
    // فیلترِ `revoked_at is null` همان‌جایی است که ایندکسِ جزئی
    // `plus_entitlements_active_idx` رویش بسته شده.
    rows = await query<Row>(
      `select starts_at, ends_at, source, revoked_at
         from plus_entitlements
        where user_id = $1
        order by ends_at desc nulls first
        limit $2`,
      [userId, MAX_ENTITLEMENT_ROWS],
    );
  } catch (err) {
    logger.error("خواندن وضعیت سروا پلاس شکست خورد", {
      event: "plus.entitlement.failed",
      err,
      // ⚠️ شناسهٔ کاربر لاگ می‌شود ولی ایمیلش نه — برای پیدا کردنِ مشکل
      // کافی است و شناسایی‌کننده نیست.
      user_id: userId,
    });
    return freeStatus("unavailable");
  }

  const live: CoverageRow[] = rows
    .filter((row) => row.revoked_at === null)
    .map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at, source: row.source }));

  const coverage = resolveCoverage(live, now);

  if (!coverage.active) {
    if (rows.length === 0) return freeStatus("free");
    // ⚠️ «لغو شده» فقط وقتی که *تازه‌ترین* دسترسی لغو شده باشد. اگر کاربر
    // دسترسیِ لغوشده‌ای در گذشته دارد ولی بعدش خرید تمام‌شده هم دارد،
    // حالتِ درست «تمام شد» است نه «لغو شد».
    return freeStatus(rows[0]?.revoked_at ? "revoked" : "expired");
  }

  const endsAt = coverage.endsAt;
  const daysRemaining =
    endsAt === null
      ? null
      : Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / MS_PER_DAY));

  let soonThreshold = 7;
  try {
    soonThreshold = await expiringSoonDays();
  } catch {
    /* تنظیمِ ناخوانا نباید وضعیتِ فعال را خراب کند؛ پیش‌فرض کافی است. */
  }

  return {
    state: "active",
    isActive: true,
    startsAt: coverage.startsAt,
    expiresAt: endsAt,
    daysRemaining,
    expiringSoon: daysRemaining !== null && daysRemaining <= soonThreshold,
    source: coverage.source,
    isTrial: coverage.source === "manual_grant",
  };
});

/** وضعیتِ کاربرِ درخواستِ جاری. برای مهمان همان «رایگان» است. */
export async function getPlusStatus(): Promise<PlusStatus> {
  const user = await getCurrentUser();
  if (!user) {
    // مهمان: پلاس ندارد، ولی اگر کلِ پلاس خاموش است باید همان را بگوییم تا
    // رابط کاربری صفحهٔ خرید را به مهمان هم نشان ندهد.
    try {
      return (await isPlusEnabled()) ? freeStatus("free") : freeStatus("off");
    } catch {
      return freeStatus("unavailable");
    }
  }
  return getPlusStatusFor(user.id);
}

/** پاسخِ بولیِ ساده — فقط برای جایی که واقعاً یک بولی می‌خواهد. */
export async function hasActivePlus(userId: string): Promise<boolean> {
  const status = await getPlusStatusFor(userId);
  return status.isActive;
}

/* ──────────────────────────── گاردِ سمتِ سرور ───────────────────────────── */

/**
 * گاردِ قابلیت‌های پلاس — برای Server Component، Route Handler و Server Action.
 *
 * ⚠️ قفلِ رابط کاربری فقط برای تجربهٔ کاربری است. اگر کسی مستقیماً endpoint را
 * صدا بزند، تنها چیزی که جلویش را می‌گیرد همین تابع است. پس هر مسیری که
 * دادهٔ پولی می‌دهد باید صدایش بزند — نه فقط صفحه‌ای که دکمه‌اش را نشان
 * می‌دهد.
 *
 * سه خروجیِ ممکن، و هر سه معنیِ متفاوتی برای کاربر دارند:
 *   • برمی‌گردد            → اجازه دارد (یا کلِ پلاس خاموش است و همه‌چیز باز).
 *   • PlusRequiredError    → «این بخش با پلاس در دسترس است.»
 *   • PlusUnavailableError → «نتوانستیم بررسی کنیم؛ دوباره تلاش کنید.»
 */
export async function requirePlus(): Promise<PlusStatus> {
  const status = await getPlusStatus();

  // پلاس خاموش است: سایت رایگان است و هیچ‌چیز قفل نیست.
  if (status.state === "off") return status;

  if (status.state === "unavailable") throw new PlusUnavailableError();
  if (!status.isActive) throw new PlusRequiredError();

  return status;
}
