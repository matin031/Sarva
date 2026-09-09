import "server-only";
import { transaction, type Tx } from "@/lib/db";

/**
 * نوشتنِ دسترسی — تنها جایی که ردیفِ `plus_entitlements` ساخته می‌شود.
 *
 * سه راه به دسترسی می‌رسد (خرید، هدیهٔ دستیِ مدیر، تمدید) و هر سه از همین
 * فایل می‌گذرند. اگر هرکدام قاعدهٔ خودش را می‌نوشت، اولین ناسازگاری در
 * محاسبهٔ «شروعِ دورهٔ تازه» ظاهر می‌شد و کاربر روزهایی را که خریده از دست
 * می‌داد.
 */

/* ───────────────────────── قفلِ هم‌زمانی ──────────────────────────────── */

/**
 * قفلِ سطحِ کاربر برای همهٔ نوشتن‌های دسترسی.
 *
 * ⚠️ چرا لازم است — سناریوی «تمدیدِ هم‌زمان»:
 *
 *   تراکنش الف: بیشترین پایانِ فعلی را می‌خواند → ۳۰ مهر
 *   تراکنش ب:  همان را می‌خواند                 → ۳۰ مهر
 *   الف می‌نویسد: ۳۰ مهر تا ۳۰ آبان
 *   ب  می‌نویسد: ۳۰ مهر تا ۳۰ آبان
 *
 * کاربر دو بار پول داده و یک ماه گرفته. هیچ خطایی هم رخ نداده — این همان
 * «lost update» کلاسیک است که فقط با قفل دیده می‌شود.
 *
 * قفلِ ردیفی (`for update`) اینجا کافی نیست: کاربری که هنوز هیچ ردیفی ندارد،
 * ردیفی برای قفل کردن هم ندارد. قفلِ مشورتیِ تراکنشی روی *شناسهٔ کاربر* این
 * حفره را ندارد و در پایانِ تراکنش خودبه‌خود آزاد می‌شود.
 *
 * عددِ ۹۱۸۲۷۳ فقط یک فضای‌نامِ دلخواه ولی ثابت است تا با قفل‌های دیگرِ پروژه
 * (مثلاً قفلِ migration) برخورد نکند.
 */
const LOCK_NAMESPACE = 918273;

async function lockUser(tx: Tx, userId: string): Promise<void> {
  await tx.execute("select pg_advisory_xact_lock($1, hashtext($2))", [LOCK_NAMESPACE, userId]);
}

/* ─────────────────────── محاسبهٔ بازهٔ دورهٔ تازه ───────────────────────── */

/**
 * دورهٔ تازه از کجا شروع می‌شود؟
 *
 * سیاست: **از انتهای دسترسیِ فعلی، نه از امروز.** کاربری که ۲۰ مهر تمدید
 * می‌کند و اشتراکش تا ۳۰ مهر است، دورهٔ تازه‌اش از ۳۰ مهر شروع می‌شود. اگر
 * از امروز شروع می‌شد، تمدیدِ زودهنگام مجازات داشت و هر کاربرِ عاقلی تا
 * آخرین لحظه صبر می‌کرد.
 *
 * ⚠️ و مهم‌تر: این تابع هرگز دسترسیِ موجود را **کوتاه** نمی‌کند. سناریوی
 * واقعی‌اش تعارضِ «هدیهٔ دستی» با «خرید» است: کاربری تا ۱۰ مهر دسترسیِ
 * آزمایشی دارد و ۵ مهر خرید می‌کند. اگر دورهٔ خریدش از ۵ مهر شمرده می‌شد،
 * پنج روزِ هدیه بلعیده می‌شد. اینجا از ۱۰ مهر شروع می‌شود.
 */
async function nextPeriodStart(tx: Tx, userId: string, now: Date): Promise<Date> {
  const row = await tx.queryOne<{ has_permanent: boolean; max_end: string | null }>(
    `select bool_or(ends_at is null) as has_permanent,
            max(ends_at) as max_end
       from plus_entitlements
      where user_id = $1
        and revoked_at is null
        and (ends_at is null or ends_at > $2)`,
    [userId, now.toISOString()],
  );

  // دسترسیِ دائمی: دورهٔ تازه چیزی به آن اضافه نمی‌کند و نباید هم بکند.
  // ردیفش ساخته می‌شود (سابقهٔ خرید باید بماند) ولی از همین حالا، چون
  // «انتهای بی‌نهایت» نقطهٔ شروعِ معنی‌داری نیست.
  if (row?.has_permanent) return now;

  const maxEnd = row?.max_end ? new Date(row.max_end) : null;
  return maxEnd && maxEnd.getTime() > now.getTime() ? maxEnd : now;
}

/** روز → میلی‌ثانیه، با همان قراردادِ صریحِ اسکیما (روزِ ۲۴ ساعته). */
function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

/* ───────────────────────── فعال‌سازی از روی سفارش ──────────────────────── */

export type ActivationResult = {
  /** false یعنی این سفارش قبلاً فعال شده بود — تکرارِ callback یا رفرش. */
  created: boolean;
  startsAt: string;
  endsAt: string;
  /** آیا دورهٔ تازه به دسترسیِ موجود *چسبیده* — یعنی تمدید است نه فعال‌سازی. */
  isRenewal: boolean;
};

/**
 * دسترسی‌ای که از یک سفارشِ پرداخت‌شده می‌آید.
 *
 * ⚠️ باید داخلِ همان تراکنشی صدا زده شود که سفارش را `paid` می‌کند. اگر
 * جدا بود، یک قطعیِ بین این دو یعنی «سفارش پرداخت شده ولی دسترسی نیست» —
 * بدترین حالتِ ممکن برای کاربر و سخت‌ترین برای پشتیبانی.
 */
export async function activateForOrder(
  tx: Tx,
  params: { orderId: string; userId: string; durationDays: number; now: Date },
): Promise<ActivationResult> {
  const { orderId, userId, durationDays, now } = params;

  await lockUser(tx, userId);

  // آیا این سفارش قبلاً دسترسی ساخته؟ (ایندکس یکتا هم پشتش هست، ولی خواندنِ
  // صریح یعنی می‌توانیم «قبلاً فعال شده» را به کاربر بگوییم، نه یک خطای
  // یکتایی.)
  const existing = await tx.queryOne<{ starts_at: string; ends_at: string | null }>(
    `select starts_at, ends_at from plus_entitlements where source_order_id = $1`,
    [orderId],
  );
  if (existing) {
    return {
      created: false,
      startsAt: existing.starts_at,
      endsAt: existing.ends_at ?? existing.starts_at,
      isRenewal: false,
    };
  }

  const startsAt = await nextPeriodStart(tx, userId, now);
  const endsAt = addDays(startsAt, durationDays);
  const isRenewal = startsAt.getTime() > now.getTime();

  const inserted = await tx.queryOne<{ id: string }>(
    // on conflict روی ایندکسِ *جزئیِ* source_order_id — همان چیزی که
    // callbackِ تکراری و رفرشِ صفحهٔ نتیجه را بی‌اثر می‌کند. اگر دو تراکنش
    // هم‌زمان به اینجا برسند، یکی برنده می‌شود و دیگری صفر ردیف می‌گیرد.
    `insert into plus_entitlements
       (user_id, source, source_order_id, starts_at, ends_at)
     values ($1, 'purchase', $2, $3, $4)
     on conflict (source_order_id) where source_order_id is not null do nothing
     returning id`,
    [userId, orderId, startsAt.toISOString(), endsAt.toISOString()],
  );

  return {
    created: inserted !== null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    isRenewal,
  };
}

/* ─────────────────────── هدیهٔ دستی و لغو (مدیر) ───────────────────────── */

export type ManualGrantParams = {
  userId: string;
  /** null یعنی دسترسیِ دائمی — همان «همیشگی» که مالک خواسته. */
  days: number | null;
  reason: string;
  grantedBy: string;
  /**
   * از انتهای دسترسیِ فعلی شروع شود یا از همین حالا؟
   * پیش‌فرض «انتها»، به همان دلیلی که در `nextPeriodStart` نوشته شده.
   */
  startFrom?: "now" | "end_of_current";
};

export type ManualGrantResult = { id: string; startsAt: string; endsAt: string | null };

/**
 * دسترسیِ دستی — «دسترسی آزمایشی» یا هدیه.
 *
 * ⚠️ نتیجهٔ این تابع هرگز نباید به کاربر به‌عنوان «پرداخت موفق» نشان داده
 * شود. برای همین `source` صریحاً `manual_grant` است و رابط کاربری از روی
 * همان، عبارتِ «دسترسی آزمایشی» را می‌نویسد. جا زدنش به‌عنوان خرید، در
 * اولین تماسِ پشتیبانی («فاکتورم کو؟») خودش را نشان می‌دهد.
 *
 * `reason` اجباری است: شش ماه بعد، «چرا این حساب پلاس است؟» باید از خودِ
 * ردیف قابلِ جواب باشد.
 */
export async function manualGrant(params: ManualGrantParams): Promise<ManualGrantResult> {
  const { userId, days, reason, grantedBy, startFrom = "end_of_current" } = params;

  return transaction(async (tx) => {
    await lockUser(tx, userId);

    const now = new Date();
    const startsAt = startFrom === "now" ? now : await nextPeriodStart(tx, userId, now);
    const endsAt = days === null ? null : addDays(startsAt, days);

    const row = await tx.queryOne<{ id: string; starts_at: string; ends_at: string | null }>(
      `insert into plus_entitlements
         (user_id, source, starts_at, ends_at, reason, granted_by)
       values ($1, 'manual_grant', $2, $3, $4, $5)
       returning id, starts_at, ends_at`,
      [userId, startsAt.toISOString(), endsAt?.toISOString() ?? null, reason, grantedBy],
    );

    if (!row) throw new Error("ثبت دسترسی انجام نشد.");
    return { id: row.id, startsAt: row.starts_at, endsAt: row.ends_at };
  });
}

/**
 * لغوِ دسترسی.
 *
 * ⚠️ ردیف حذف نمی‌شود، فقط `revoked_at` می‌خورد. حذف یعنی «این هرگز وجود
 * نداشت» — که دروغ است و پاسخ دادن به «چرا دسترسی‌ام قطع شد؟» را ناممکن
 * می‌کند.
 *
 * اثرش فوری است چون هیچ کشِ بین‌درخواستی‌ای برای وضعیت وجود ندارد
 * (`getPlusStatusFor` فقط در محدودهٔ یک درخواست کش می‌شود).
 */
export async function revokeEntitlement(entitlementId: string): Promise<{ userId: string } | null> {
  const row = await transaction(async (tx) => {
    return tx.queryOne<{ user_id: string }>(
      `update plus_entitlements
          set revoked_at = now()
        where id = $1 and revoked_at is null
        returning user_id`,
      [entitlementId],
    );
  });
  return row ? { userId: row.user_id } : null;
}

/** تمدیدِ دستیِ یک دسترسیِ موجود — برای جبرانِ خرابی یا عذرخواهی. */
export async function extendEntitlement(
  entitlementId: string,
  extraDays: number,
): Promise<{ userId: string; endsAt: string | null } | null> {
  return transaction(async (tx) => {
    const row = await tx.queryOne<{ user_id: string; ends_at: string | null }>(
      // ⚠️ دسترسیِ دائمی (ends_at null) تمدید نمی‌شود و *نباید* بشود: هر
      // عددی که به «بی‌نهایت» اضافه کنیم، در عمل کوتاهش می‌کند.
      `update plus_entitlements
          set ends_at = greatest(ends_at, now()) + make_interval(days => $2::int)
        where id = $1 and revoked_at is null and ends_at is not null
        returning user_id, ends_at`,
      [entitlementId, extraDays],
    );
    return row ? { userId: row.user_id, endsAt: row.ends_at } : null;
  });
}
