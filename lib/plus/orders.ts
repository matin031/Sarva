import "server-only";
import { randomUUID } from "node:crypto";
import { execute, isUniqueViolation, query, queryOne, transaction } from "@/lib/db";
import { logger } from "@/lib/observability";
import { AuthError } from "@/lib/auth/types";
import { getSellableOfferByCode } from "./plans";
import { getPaymentProvider } from "./payments";
import { activateForOrder } from "./grants";
import { notify } from "./notifications";
import { orderNumber } from "./order-number";
import type { CANONICAL_CURRENCY } from "./money";
import type {
  OrderStatus,
  PaymentState,
  PlusOrderDetail,
  PlusOrderSummary,
} from "./types";

/**
 * چرخهٔ عمرِ خرید: سفارش → تلاشِ پرداخت → تأیید → دسترسی.
 *
 * ── قاعده‌هایی که همه‌جای این فایل رعایت می‌شوند ────────────────────────────
 *
 * ۱) **مرورگر مبلغ و مدت را تعیین نمی‌کند.** تنها ورودیِ کاربر `planCode`
 *    است. مبلغ از `plus_plan_versions` خوانده و در سفارش snapshot می‌شود.
 *
 * ۲) **هیچ پارامترِ URL دسترسی نمی‌سازد.** فعال‌سازی فقط از مسیرِ
 *    `settlePayment` می‌گذرد که خودش از آداپتورِ درگاه `verifyPayment`
 *    می‌گیرد. `?success=true` هیچ کاری نمی‌کند.
 *
 * ۳) **هر عملیاتِ حساس idempotent است.** دوبار کلیک، رفرش، دو تب، callback
 *    تکراری و retry بعد از تایم‌اوت هیچ‌کدام سفارش یا دسترسیِ دوم نمی‌سازند.
 *    محافظت در دیتابیس است (دو ایندکس یکتا) و نه در رابط کاربری.
 *
 * ۴) **مالکیت همیشه در کوئری است.** هر خواندنِ سفارش شرطِ `user_id = ?`
 *    دارد. بدون RLS، همین شرط تنها چیزی است که سفارشِ کاربر الف را از کاربر
 *    ب جدا می‌کند — و «شمارهٔ سفارش را عوض کن تا مالِ یکی دیگر را ببینی»
 *    دقیقاً همان‌جایی است که این شرط فراموش می‌شود.
 *
 * ── تفاوت‌های MySQL که در این فایل دیده می‌شوند ─────────────────────────────
 *   • `RETURNING` وجود ندارد: شناسه را اپ می‌سازد و بعد از INSERT همان ردیف
 *     خوانده می‌شود.
 *   • شمارهٔ خوانا از `order_seq` (AUTO_INCREMENT) در اپ ساخته می‌شود —
 *     چرایش در `lib/plus/order-number.ts`.
 *   • `make_interval(mins => …)` نیست: `interval ? minute`.
 */

/** خطای قابلِ نمایش با کدِ وضعیت — همان قراردادِ AuthError. */
class OrderError extends AuthError {
  constructor(message: string, status = 400) {
    super(message, status);
    this.name = "OrderError";
  }
}

/** سفارشِ رهاشده بعد از این مدت «منقضی» حساب می‌شود. */
const PENDING_TTL_MINUTES = 60;

type OrderRow = {
  id: string;
  order_seq: number;
  user_id: string;
  plan_code: string;
  plan_title: string;
  plan_version: number;
  plan_version_id: string;
  duration_days: number;
  amount_rials: number;
  currency: typeof CANONICAL_CURRENCY;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  pending_expires_at: string | null;
};

const ORDER_COLUMNS = `id, order_seq, user_id, plan_code, plan_title, plan_version,
                       plan_version_id, duration_days, amount_rials, currency,
                       status, created_at, paid_at, pending_expires_at`;

/** همان ستون‌ها با پیشوندِ جدول — برای کوئری‌هایی که زیرکوئری دارند.
 *  عمداً دستی نوشته شده و از روی رشتهٔ بالا ساخته نمی‌شود: `db:check-sql`
 *  کوئریِ ساخته‌شده در زمان اجرا را نمی‌تواند بازسازی کند. */
const ORDER_COLUMNS_O = `o.id, o.order_seq, o.user_id, o.plan_code, o.plan_title, o.plan_version,
                         o.plan_version_id, o.duration_days, o.amount_rials, o.currency,
                         o.status, o.created_at, o.paid_at, o.pending_expires_at`;

/* ─────────────────────────── ساختِ سفارش ────────────────────────────────── */

/**
 * سفارشِ در انتظار پرداخت — یا همان قبلی، اگر باز است.
 *
 * ⚠️ «یا همان قبلی» قلبِ idempotency است. سناریوها:
 *
 *   • دوبار کلیک روی «خرید»       → همان سفارش
 *   • رفرشِ صفحهٔ پرداخت           → همان سفارش
 *   • دکمهٔ back و دوباره خرید      → همان سفارش
 *   • دو تبِ باز                   → همان سفارش
 *
 * بدونِ این، کاربر در «خریدهای من» چهار سفارشِ در انتظار پرداخت می‌دید و
 * نمی‌دانست کدام را بپردازد؛ و اگر دوتا را می‌پرداخت، دوبار پول داده بود.
 *
 * ایندکس یکتای `plus_orders_one_open_key` این را در *دیتابیس* تضمین می‌کند،
 * نه در این تابع: دو درخواستِ کاملاً هم‌زمان هم فقط یک ردیف می‌سازند و
 * بازنده، سفارشِ برنده را برمی‌گرداند.
 */
export async function createOrGetPendingOrder(params: {
  userId: string;
  planCode: string;
  idempotencyKey?: string | null;
}): Promise<PlusOrderSummary> {
  const { userId, planCode } = params;
  const idempotencyKey = params.idempotencyKey?.trim() || null;

  // ⚠️ مبلغ و مدت *اینجا* از دیتابیس خوانده می‌شوند و نه از ورودی.
  const offer = await getSellableOfferByCode(planCode);
  if (!offer) {
    // نسخهٔ غیرقابلِ فروش هم همین پیام را می‌گیرد: از دیدِ خریدار فرقی ندارد
    // و افشای اینکه «این پلن هست ولی از فروش خارج شده» چیزی به او نمی‌دهد.
    throw new OrderError("این پلن برای خرید در دسترس نیست.", 404);
  }

  const row = await transaction(async (tx) => {
    // سفارشِ بازِ موجود برای همین نسخه؟
    const open = await tx.queryOne<OrderRow>(
      `select ${ORDER_COLUMNS} from plus_orders
        where user_id = ? and plan_version_id = ? and status = 'pending'`,
      [userId, offer.planVersionId],
    );
    if (open) return open;

    // کلیدِ idempotency ای که کلاینت فرستاده و قبلاً استفاده شده؟ (مثلاً
    // درخواستِ اول موفق بوده ولی پاسخش به مرورگر نرسیده و مرورگر retry کرده.)
    if (idempotencyKey) {
      const seen = await tx.queryOne<OrderRow>(
        `select ${ORDER_COLUMNS} from plus_orders
          where user_id = ? and idempotency_key = ?`,
        [userId, idempotencyKey],
      );
      if (seen) return seen;
    }

    const id = randomUUID();
    await tx.execute(
      `insert into plus_orders
         (id, user_id, plan_id, plan_version_id, plan_code, plan_title, plan_version,
          duration_days, amount_rials, currency, idempotency_key, pending_expires_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(6) + interval ? minute)`,
      [
        id,
        userId,
        offer.planId,
        offer.planVersionId,
        offer.code,
        offer.title,
        offer.version,
        offer.durationDays,
        offer.amountRials,
        offer.currency,
        idempotencyKey,
        PENDING_TTL_MINUTES,
      ],
    );

    // MySQL معادلِ `returning` ندارد؛ شناسه را خودمان ساخته‌ایم، پس یک
    // خواندنِ دقیق کافی است.
    const created = await tx.queryOne<OrderRow>(
      `select ${ORDER_COLUMNS} from plus_orders where id = ?`,
      [id],
    );
    if (!created) throw new OrderError("ساخت سفارش انجام نشد.", 500);
    return created;
  }).catch(async (err: unknown) => {
    // مسابقهٔ واقعی: دو درخواستِ هم‌زمان، هر دو «سفارشِ باز» را ندیدند و هر
    // دو insert زدند. یکی برنده شد و دیگری خطای یکتایی گرفت. پاسخِ درست
    // برای بازنده «خطا» نیست — سفارشِ برنده است.
    if (isUniqueViolation(err)) {
      const existing = await queryOne<OrderRow>(
        `select ${ORDER_COLUMNS} from plus_orders
          where user_id = ? and plan_version_id = ? and status = 'pending'`,
        [userId, offer.planVersionId],
      );
      if (existing) return existing;
    }
    throw err;
  });

  return toSummary(row, null);
}

/* ──────────────────────────── شروعِ پرداخت ──────────────────────────────── */

/**
 * تلاشِ پرداخت می‌سازد و آدرسِ درگاه را برمی‌گرداند.
 *
 * ⚠️ آدرسِ بازگشت را سرور می‌سازد و نه کلاینت. اگر از ورودی می‌آمد، یک
 * open-redirect بود که کاربر را بعد از پرداخت به هر دامنه‌ای می‌فرستاد.
 */
export async function startPayment(params: {
  userId: string;
  orderId: string;
  origin: string;
}): Promise<{ redirectUrl: string; attemptId: string }> {
  const order = await requireOwnedOrder(params.userId, params.orderId);

  if (order.status === "paid") throw new OrderError("این سفارش قبلاً پرداخت شده است.", 409);
  if (order.status !== "pending") throw new OrderError("این سفارش دیگر قابل پرداخت نیست.", 409);

  const provider = await getPaymentProvider();

  // آدرسِ بازگشت: مسیرِ داخلیِ ثابت + شناسهٔ سفارش. هیچ چیزِ دیگری، تا
  // پارامترهای درگاه نتوانند مقصد را عوض کنند.
  const returnUrl = `${params.origin}/payment/return?order=${encodeURIComponent(order.id)}`;

  const attemptId = randomUUID();
  await execute(
    `insert into plus_payment_attempts (id, order_id, provider, amount_rials, state)
     values (?, ?, ?, ?, 'created')`,
    [attemptId, order.id, provider.name, order.amount_rials],
  );

  const created = await provider.createPayment({
    orderId: order.id,
    orderNumber: orderNumber(order.order_seq),
    amountRials: order.amount_rials,
    description: `سروا پلاس — ${order.plan_title}`,
    returnUrl,
  });

  if (!created.ok) {
    await execute(
      `update plus_payment_attempts
          set state = 'failed', failed_at = now(6), error_code = ?, error_message = ?
        where id = ?`,
      [created.errorCode, created.errorMessage, attemptId],
    );
    throw new OrderError(created.errorMessage || "ارتباط با درگاه پرداخت برقرار نشد.", 502);
  }

  await execute(
    `update plus_payment_attempts
        set state = 'redirected', redirected_at = now(6), provider_ref = ?
      where id = ?`,
    [created.providerRef, attemptId],
  );

  return { redirectUrl: created.redirectUrl, attemptId };
}

/* ───────────────────────── تأیید و فعال‌سازی ────────────────────────────── */

export type SettleResult = {
  state: PaymentState;
  orderId: string;
  orderNumber: string;
  /** فقط وقتی که این فراخوانی *واقعاً* دسترسی ساخت. رفرش دوباره false است. */
  activatedNow: boolean;
  isRenewal: boolean;
  accessEndsAt: string | null;
  trackingId: string | null;
  message: string | null;
};

/**
 * نتیجهٔ پرداخت را از درگاه می‌پرسد و در صورت تأیید، دسترسی می‌سازد.
 *
 * ⚠️ این تابع تنها راهِ فعال‌شدنِ پلاس از مسیرِ خرید است. سه ورودیِ ممکن
 * دارد و هر سه به یک جا می‌رسند:
 *   • بازگشتِ مرورگر از درگاه
 *   • «بررسی دوباره»ی کاربر در صفحهٔ خریدها
 *   • بازبینیِ مدیر
 *
 * یعنی «کاربر بعد از پرداخت اینترنتش قطع شد» یک حالتِ خاص نیست؛ فقط یعنی
 * این تابع دیرتر و از مسیرِ دیگری صدا زده می‌شود.
 */
export async function settlePayment(params: {
  userId: string;
  orderId: string;
  returnParams: Record<string, string>;
  /** بدونِ بازگشتِ مرورگر (بررسی دوباره) — از getPaymentStatus استفاده می‌شود. */
  mode?: "verify" | "recheck";
}): Promise<SettleResult> {
  const order = await requireOwnedOrder(params.userId, params.orderId);

  const base = {
    orderId: order.id,
    orderNumber: orderNumber(order.order_seq),
    activatedNow: false,
    isRenewal: false,
    accessEndsAt: null as string | null,
    trackingId: null as string | null,
  };

  // ⚠️ سفارشِ از قبل پرداخت‌شده: رفرشِ صفحهٔ نتیجه، callback تکراری یا سه تبِ
  // باز همگی به اینجا می‌رسند. هیچ‌کدام نباید دوباره درگاه را صدا بزنند یا
  // دسترسیِ دوم بسازند.
  if (order.status === "paid") {
    const access = await queryOne<{ ends_at: string | null; tracking: string | null }>(
      `select e.ends_at,
              (select a.provider_tracking_id from plus_payment_attempts a
                where a.order_id = ? and a.state = 'verified'
                order by a.verified_at desc limit 1) as tracking
         from plus_entitlements e where e.source_order_id = ?`,
      [order.id, order.id],
    );
    return {
      ...base,
      state: "verified",
      accessEndsAt: access?.ends_at ?? null,
      trackingId: access?.tracking ?? null,
      message: null,
    };
  }

  const attempt = await queryOne<{ id: string; provider: string; provider_ref: string | null }>(
    `select id, provider, provider_ref
       from plus_payment_attempts
      where order_id = ? and provider_ref is not null
      order by created_at desc limit 1`,
    [order.id],
  );

  if (!attempt?.provider_ref) {
    // هیچ تلاشی به درگاه نرسیده. این «ناموفق» نیست — کاربر هنوز پرداخت را
    // شروع نکرده یا در همان لحظهٔ اول منصرف شده.
    return { ...base, state: "created", message: "هنوز پرداختی برای این سفارش شروع نشده است." };
  }

  const provider = await getPaymentProvider();
  const verifyInput = {
    orderId: order.id,
    amountRials: order.amount_rials,
    providerRef: attempt.provider_ref,
    returnParams: params.returnParams,
  };

  let result;
  try {
    result =
      params.mode === "recheck"
        ? await provider.getPaymentStatus(verifyInput)
        : await provider.verifyPayment(verifyInput);
  } catch (err) {
    // ⚠️ خطای شبکه یا تایم‌اوتِ درگاه **شکست نیست**. اگر اینجا failed ثبت
    // می‌کردیم، پرداختی که واقعاً انجام شده «ناموفق» علامت می‌خورد و کاربر
    // دوباره پول می‌داد.
    logger.error("تأیید پرداخت شکست خورد", {
      event: "plus.payment.verify_error",
      err,
      order_id: order.id,
    });
    await setAttemptState(attempt.id, "unknown", { errorCode: "verify_error" });
    return {
      ...base,
      state: "unknown",
      message: "وضعیت پرداخت هنوز نهایی نشده است. لحظه‌ای بعد «بررسی دوباره» را بزنید.",
    };
  }

  // ⚠️ بررسیِ مبلغ. اگر درگاه مبلغِ پرداخت‌شده را بدهد و با سفارش نخواند،
  // تأیید پذیرفته نمی‌شود. بدونِ این، هر خرابی یا دستکاری در سمتِ درگاه
  // می‌توانست با مبلغی ناچیز اشتراکِ کامل بسازد.
  if (
    result.state === "verified" &&
    result.paidAmountRials !== undefined &&
    result.paidAmountRials !== order.amount_rials
  ) {
    logger.error("مبلغ تأییدشدهٔ درگاه با سفارش نمی‌خواند", {
      event: "plus.payment.amount_mismatch",
      order_id: order.id,
    });
    await setAttemptState(attempt.id, "unknown", { errorCode: "amount_mismatch" });
    return {
      ...base,
      state: "unknown",
      message: "مبلغ پرداخت با سفارش هم‌خوانی ندارد. پشتیبانی این مورد را بررسی می‌کند.",
    };
  }

  if (result.state !== "verified") {
    await setAttemptState(attempt.id, result.state, {
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });

    // ⚠️ لغو، شکست و «نامعلوم» هیچ‌کدام سفارش را نمی‌بندند. کاربر باید بتواند
    // دوباره تلاش کند و — مهم‌تر — اگر پول واقعاً کم شده باشد، همین سفارش
    // بعداً قابلِ ترمیم بماند.
    return {
      ...base,
      state: result.state,
      message: result.errorMessage ?? null,
    };
  }

  /* ── تأیید شد: سفارش و دسترسی، در یک تراکنش ───────────────────────────── */
  const activation = await transaction(async (tx) => {
    await tx.execute(
      `update plus_payment_attempts
          set state = 'verified', verified_at = now(6), provider_tracking_id = ?
        where id = ?`,
      [result.trackingId ?? null, attempt.id],
    );

    // `and status = 'pending'` یعنی اگر تراکنشِ موازیِ دیگری زودتر رسیده
    // باشد، این یکی صفر ردیف می‌گیرد و دسترسیِ دوم هم نمی‌سازد (ایندکس یکتا).
    await tx.execute(
      `update plus_orders set status = 'paid', paid_at = now(6)
        where id = ? and status = 'pending'`,
      [order.id],
    );

    return activateForOrder(tx, {
      orderId: order.id,
      userId: order.user_id,
      durationDays: order.duration_days,
      now: new Date(),
    });
  });

  if (activation.created) {
    // اعلانِ درون‌سایتی. شکستش نباید خرید را بشکند — پول گرفته شده و
    // دسترسی ساخته شده؛ یک اعلانِ ثبت‌نشده در مقایسه با آن هیچ است.
    await notify({
      userId: order.user_id,
      kind: activation.isRenewal ? "plus_renewed" : "plus_activated",
      title: activation.isRenewal ? "سروا پلاس تمدید شد ✦" : "سروا پلاس فعال شد ✦",
      body: `سفارش ${orderNumber(order.order_seq)} تأیید شد.`,
      href: "/panel/subscription",
    }).catch(() => {});
  }

  return {
    ...base,
    state: "verified",
    activatedNow: activation.created,
    isRenewal: activation.isRenewal,
    accessEndsAt: activation.endsAt,
    trackingId: result.trackingId ?? null,
    message: null,
  };
}

async function setAttemptState(
  attemptId: string,
  state: PaymentState,
  extra: { errorCode?: string; errorMessage?: string } = {},
): Promise<void> {
  await execute(
    `update plus_payment_attempts
        set state = ?,
            failed_at = case when ? in ('failed', 'cancelled') then now(6) else failed_at end,
            error_code = coalesce(?, error_code),
            error_message = coalesce(?, error_message)
      where id = ?`,
    // ⚠️ در MySQL هر `?` پارامترِ بعدی را مصرف می‌کند؛ `state` دوبار در کوئری
    // آمده پس دوبار هم فرستاده می‌شود. (در Postgres `$2` دوبار نوشته می‌شد و
    // یک بار فرستاده. `lib/db` عمداً این را پنهان نمی‌کند.)
    [state, state, extra.errorCode ?? null, extra.errorMessage ?? null, attemptId],
  );
}

/* ─────────────────────────── خواندنِ سفارش ──────────────────────────────── */

/**
 * سفارش، فقط اگر مالِ همین کاربر باشد.
 *
 * ⚠️ پاسخِ «مالِ تو نیست» و «وجود ندارد» عمداً یکی است. اگر فرق داشتند،
 * کاربر می‌توانست با تغییرِ شناسه بفهمد کدام سفارش‌ها وجود دارند.
 */
async function requireOwnedOrder(userId: string, orderId: string): Promise<OrderRow> {
  const row = await queryOne<OrderRow>(
    `select ${ORDER_COLUMNS} from plus_orders where id = ? and user_id = ?`,
    [orderId, userId],
  );
  if (!row) throw new OrderError("این سفارش پیدا نشد.", 404);
  return row;
}

function toSummary(row: OrderRow, latestPaymentState: PaymentState | null): PlusOrderSummary {
  return {
    id: row.id,
    orderNumber: orderNumber(row.order_seq),
    planTitle: row.plan_title,
    durationDays: row.duration_days,
    amountRials: row.amount_rials,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    latestPaymentState,
  };
}

/**
 * صفحه‌ای از خریدهای کاربر.
 *
 * ⚠️ مرتب‌سازی با شکنندهٔ تساوی (`id`) است. بدونِ آن، دو سفارشِ هم‌ثانیه
 * می‌توانند در دو صفحهٔ متوالی تکرار شوند یا اصلاً دیده نشوند — باگی که فقط
 * وقتی خودش را نشان می‌دهد که کاربر شکایت کند «یک خریدم نیست».
 */
export async function listOrders(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ orders: PlusOrderSummary[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);

  const rows = await query<OrderRow & { latest_state: PaymentState | null }>(
    `select ${ORDER_COLUMNS_O},
            (select a.state from plus_payment_attempts a
              where a.order_id = o.id
              order by a.created_at desc limit 1) as latest_state
       from plus_orders o
      where o.user_id = ?
      order by o.created_at desc, o.id
      limit ? offset ?`,
    [userId, limit + 1, offset],
  );

  return {
    orders: rows.slice(0, limit).map((r) => toSummary(r, r.latest_state)),
    hasMore: rows.length > limit,
  };
}

/** جزئیاتِ یک سفارش — با تلاش‌های پرداخت و بازهٔ دسترسی‌اش. */
export async function getOrderDetail(
  userId: string,
  orderId: string,
): Promise<PlusOrderDetail | null> {
  let order: OrderRow;
  try {
    order = await requireOwnedOrder(userId, orderId);
  } catch {
    return null;
  }

  const attempts = await query<{
    id: string;
    provider: string;
    state: PaymentState;
    provider_tracking_id: string | null;
    error_message: string | null;
    created_at: string;
  }>(
    `select id, provider, state, provider_tracking_id, error_message, created_at
       from plus_payment_attempts
      where order_id = ?
      order by created_at desc, id
      limit 20`,
    [orderId],
  );

  const access = await queryOne<{ starts_at: string; ends_at: string | null }>(
    `select starts_at, ends_at from plus_entitlements where source_order_id = ?`,
    [orderId],
  );

  const verified = attempts.find((a) => a.state === "verified");

  return {
    ...toSummary(order, attempts[0]?.state ?? null),
    planCode: order.plan_code,
    planVersion: order.plan_version,
    trackingId: verified?.provider_tracking_id ?? null,
    accessFrom: access?.starts_at ?? null,
    accessTo: access?.ends_at ?? null,
    attempts: attempts.map((a) => ({
      id: a.id,
      provider: a.provider,
      state: a.state,
      trackingId: a.provider_tracking_id,
      errorMessage: a.error_message,
      createdAt: a.created_at,
    })),
  };
}

/** آیا این کاربر سفارشی دارد که تکلیفش روشن نیست؟ (نوارِ هشدار در پنل) */
export async function countUnsettledOrders(userId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `select count(*) as n
       from plus_orders o
      where o.user_id = ?
        and o.status = 'pending'
        and exists (select 1 from plus_payment_attempts a
                     where a.order_id = o.id
                       and a.state in ('redirected', 'pending', 'unknown'))`,
    [userId],
  );
  return row?.n ?? 0;
}

/**
 * سفارش‌های رهاشده را منقضی می‌کند.
 *
 * ⚠️ فقط سفارش‌هایی که *هیچ* تلاشِ پرداختِ مبهمی ندارند. سفارشی که یک تلاشِ
 * `unknown` یا `redirected` دارد ممکن است پولی پشتش باشد و بستنش یعنی
 * از دست دادنِ راهِ ترمیم.
 */
export async function expireStaleOrders(): Promise<number> {
  return transaction(async (tx) =>
    tx.execute(
      `update plus_orders o
          set o.status = 'expired'
        where o.status = 'pending'
          and o.pending_expires_at is not null
          and o.pending_expires_at < now(6)
          and not exists (select 1 from plus_payment_attempts a
                           where a.order_id = o.id
                             and a.state in ('redirected', 'pending', 'unknown', 'verified'))`,
    ),
  );
}
