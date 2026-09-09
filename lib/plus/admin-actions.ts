"use server";

import { revalidatePath } from "next/cache";
import { execute, query, queryOne, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/admin/audit";
import { enumArg, isUuid, uuidArg } from "@/lib/api/action-input";
import { tomansToRials, formatRials } from "./money";
import { extendEntitlement, manualGrant, revokeEntitlement } from "./grants";
import { settlePayment } from "./orders";
import { isPilotGrantEnabled } from "./config";
import { notify } from "./notifications";
import type { OrderStatus, TicketCategory, TicketStatus } from "./types";

/**
 * پنل مدیریتِ سروا پلاس.
 *
 * ⚠️ **هر تابعِ این فایل با `requireAdmin()` شروع می‌شود.** Server Action یک
 * endpoint شبکه است و امضای TypeScript در زمان اجرا وجود ندارد؛ اگر یکی از
 * این‌ها گاردش را نداشته باشد، هر کاربرِ واردشده‌ای می‌تواند به خودش اشتراکِ
 * دائمی بدهد.
 *
 * ⚠️ **هر عملیاتِ دستی audit می‌شود** — با نامِ مدیر، دلیل و زمان. شش ماه بعد
 * «چرا این حساب پلاس است؟» باید از روی همان ردیف‌ها قابلِ جواب باشد؛ و
 * دسترسی‌ای که کسی نمی‌داند از کجا آمده، از نبودش بدتر است.
 *
 * ⚠️ **هیچ credential ای اینجا خوانده یا برگردانده نمی‌شود.** کلیدِ درگاه فقط
 * در `lib/plus/payments/*` و از `process.env` می‌آید و هرگز به رابط کاربری
 * نمی‌رسد.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const ORDER_STATUSES = ["pending", "paid", "cancelled", "expired", "refunded"] as const;
const TICKET_STATUSES = [
  "open",
  "waiting_for_support",
  "waiting_for_user",
  "resolved",
  "closed",
] as const;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/* ═══════════════════════════ پلن و نسخه ═══════════════════════════════ */

export type AdminPlanRow = {
  id: string;
  code: string;
  title: string;
  subtitle: string | null;
  durationDays: number;
  isActive: boolean;
  sortIndex: number;
  versions: {
    id: string;
    version: number;
    title: string;
    durationDays: number;
    amountRials: number;
    isSellable: boolean;
    createdAt: string;
    note: string | null;
    /** چند سفارش با این نسخه ثبت شده — نسخه‌ای که فروش داشته حذف نمی‌شود. */
    orderCount: number;
  }[];
};

export async function adminListPlans(): Promise<AdminPlanRow[]> {
  await requireAdmin();

  const plans = await query<{
    id: string;
    code: string;
    title: string;
    subtitle: string | null;
    duration_days: number;
    is_active: boolean;
    sort_index: number;
  }>(
    `select id, code, title, subtitle, duration_days, is_active, sort_index
       from plus_plans order by sort_index, code`,
  );

  const versions = await query<{
    id: string;
    plan_id: string;
    version: number;
    title: string;
    duration_days: number;
    amount_rials: number;
    is_sellable: boolean;
    created_at: string;
    note: string | null;
    order_count: number;
  }>(
    `select v.id, v.plan_id, v.version, v.title, v.duration_days, v.amount_rials,
            v.is_sellable, v.created_at, v.note,
            (select count(*) from plus_orders o where o.plan_version_id = v.id) as order_count
       from plus_plan_versions v
      order by v.plan_id, v.version desc`,
  );

  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    subtitle: p.subtitle,
    durationDays: p.duration_days,
    isActive: p.is_active,
    sortIndex: p.sort_index,
    versions: versions
      .filter((v) => v.plan_id === p.id)
      .map((v) => ({
        id: v.id,
        version: v.version,
        title: v.title,
        durationDays: v.duration_days,
        amountRials: v.amount_rials,
        isSellable: v.is_sellable,
        createdAt: v.created_at,
        note: v.note,
        orderCount: v.order_count,
      })),
  }));
}

export async function adminCreatePlan(input: {
  code: unknown;
  title: unknown;
  subtitle?: unknown;
  durationDays: unknown;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const code = text(input.code, 40).toLowerCase();
  if (!/^[a-z0-9_]{2,40}$/.test(code)) {
    return { ok: false, errors: ["کد پلن فقط حروف کوچک انگلیسی، عدد و زیرخط باشد."] };
  }

  const title = text(input.title, 120);
  if (title.length < 2) return { ok: false, errors: ["عنوان پلن را بنویسید."] };

  const durationDays = Number(input.durationDays);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
    return { ok: false, errors: ["مدت پلن باید عددی بین ۱ و ۳۶۵۰ روز باشد."] };
  }

  const exists = await queryOne<{ id: string }>("select id from plus_plans where code = $1", [code]);
  if (exists) return { ok: false, errors: ["پلنی با این کد از قبل وجود دارد."] };

  const row = await queryOne<{ id: string }>(
    `insert into plus_plans (code, title, subtitle, duration_days, sort_index)
     values ($1, $2, $3, $4, coalesce((select max(sort_index) + 1 from plus_plans), 0))
     returning id`,
    [code, title, text(input.subtitle, 200) || null, durationDays],
  );
  if (!row) return { ok: false, errors: ["ساخت پلن انجام نشد."] };

  await recordAudit({
    actor: admin,
    action: "plus.plan_create",
    targetType: "plus_plan",
    targetId: row.id,
    summary: `پلن «${title}» با کد ${code} و مدت ${durationDays} روز ساخته شد`,
    metadata: { code, durationDays },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: { id: row.id } };
}

export async function adminUpdatePlan(
  planId: unknown,
  input: { title?: unknown; subtitle?: unknown; isActive?: unknown; durationDays?: unknown },
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(planId, "شناسهٔ پلن نامعتبر است.");

  const current = await queryOne<{ title: string; code: string }>(
    "select title, code from plus_plans where id = $1",
    [id],
  );
  if (!current) return { ok: false, errors: ["پلن پیدا نشد."] };

  const title = input.title === undefined ? null : text(input.title, 120);
  if (title !== null && title.length < 2) return { ok: false, errors: ["عنوان پلن را بنویسید."] };

  const durationDays = input.durationDays === undefined ? null : Number(input.durationDays);
  if (
    durationDays !== null &&
    (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)
  ) {
    return { ok: false, errors: ["مدت پلن باید عددی بین ۱ و ۳۶۵۰ روز باشد."] };
  }

  await execute(
    // ⚠️ فقط پلن عوض می‌شود و نه نسخه‌ها. نسخه‌ها snapshot خودشان را دارند و
    // تریگرِ دیتابیس اجازهٔ تغییرشان را نمی‌دهد — یعنی سفارش‌های قدیمی با
    // ویرایشِ امروز بازنویسی نمی‌شوند.
    `update plus_plans
        set title = coalesce($2, title),
            subtitle = coalesce($3, subtitle),
            is_active = coalesce($4, is_active),
            duration_days = coalesce($5, duration_days)
      where id = $1`,
    [
      id,
      title,
      input.subtitle === undefined ? null : text(input.subtitle, 200) || null,
      typeof input.isActive === "boolean" ? input.isActive : null,
      durationDays,
    ],
  );

  await recordAudit({
    actor: admin,
    action: "plus.plan_update",
    targetType: "plus_plan",
    targetId: id,
    summary: `پلن «${current.title}» ویرایش شد`,
    metadata: { code: current.code },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: null };
}

/**
 * نسخهٔ قیمتیِ تازه.
 *
 * ⚠️ تنها راهِ تغییر قیمت همین است. `update` روی نسخهٔ موجود را تریگرِ
 * `plus_plan_versions_immutable` رد می‌کند — چون آن نسخه ممکن است فروخته شده
 * باشد و بازنویسی‌اش یعنی بازنویسیِ فاکتورِ کسانی که قبلاً خریده‌اند.
 *
 * مبلغ به **تومان** گرفته می‌شود (مدیر با تومان فکر می‌کند) و دقیقاً همین‌جا،
 * یک بار، به ریال تبدیل می‌شود.
 */
export async function adminCreatePlanVersion(input: {
  planId: unknown;
  amountTomans: unknown;
  note?: unknown;
  makeSellable?: unknown;
}): Promise<ActionResult<{ id: string; version: number }>> {
  const admin = await requireAdmin();
  const planId = uuidArg(input.planId, "شناسهٔ پلن نامعتبر است.");

  const amountTomans = Number(input.amountTomans);
  if (!Number.isInteger(amountTomans) || amountTomans < 0 || amountTomans > 100_000_000) {
    return { ok: false, errors: ["مبلغ باید عددی صحیح و معقول بر حسب تومان باشد."] };
  }

  let amountRials: number;
  try {
    amountRials = tomansToRials(amountTomans);
  } catch {
    return { ok: false, errors: ["مبلغ معتبر نیست."] };
  }

  const plan = await queryOne<{ title: string; duration_days: number; code: string }>(
    "select title, duration_days, code from plus_plans where id = $1",
    [planId],
  );
  if (!plan) return { ok: false, errors: ["پلن پیدا نشد."] };

  const makeSellable = input.makeSellable === true;

  const created = await transaction(async (tx) => {
    if (makeSellable) {
      // ایندکسِ یکتای «حداکثر یک نسخهٔ قابلِ فروش» یعنی نسخهٔ قبلی باید *قبل*
      // از insert از فروش خارج شود، وگرنه insert با خطای یکتایی می‌افتد.
      await tx.execute(
        "update plus_plan_versions set is_sellable = false where plan_id = $1 and is_sellable",
        [planId],
      );
    }

    return tx.queryOne<{ id: string; version: number }>(
      `insert into plus_plan_versions
         (plan_id, version, title, duration_days, amount_rials, is_sellable, note, created_by)
       values ($1,
               coalesce((select max(version) + 1 from plus_plan_versions where plan_id = $1), 1),
               $2, $3, $4, $5, $6, $7)
       returning id, version`,
      [planId, plan.title, plan.duration_days, amountRials, makeSellable, text(input.note, 300) || null, admin.id],
    );
  });

  if (!created) return { ok: false, errors: ["ساخت نسخه انجام نشد."] };

  await recordAudit({
    actor: admin,
    action: "plus.plan_version_create",
    targetType: "plus_plan_version",
    targetId: created.id,
    summary: `نسخهٔ ${created.version} پلن «${plan.title}» با مبلغ ${formatRials(amountRials)} ساخته شد`,
    metadata: { planCode: plan.code, amountRials, sellable: makeSellable },
  });

  revalidatePath("/admin/plus");
  revalidatePath("/plus");
  return { ok: true, data: created };
}

export async function adminSetVersionSellable(
  versionId: unknown,
  sellable: unknown,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(versionId, "شناسهٔ نسخه نامعتبر است.");
  const on = sellable === true;

  const version = await queryOne<{ plan_id: string; version: number; title: string }>(
    "select plan_id, version, title from plus_plan_versions where id = $1",
    [id],
  );
  if (!version) return { ok: false, errors: ["نسخه پیدا نشد."] };

  await transaction(async (tx) => {
    if (on) {
      await tx.execute(
        "update plus_plan_versions set is_sellable = false where plan_id = $1 and is_sellable and id <> $2",
        [version.plan_id, id],
      );
    }
    await tx.execute("update plus_plan_versions set is_sellable = $2 where id = $1", [id, on]);
  });

  await recordAudit({
    actor: admin,
    action: "plus.plan_version_sellable",
    targetType: "plus_plan_version",
    targetId: id,
    summary: `نسخهٔ ${version.version} «${version.title}» ${on ? "برای فروش فعال" : "از فروش خارج"} شد`,
    metadata: { sellable: on },
  });

  revalidatePath("/admin/plus");
  revalidatePath("/plus");
  return { ok: true, data: null };
}

/* ═══════════════════════════════ سفارش‌ها ═══════════════════════════════ */

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  userEmail: string;
  userId: string;
  planTitle: string;
  amountRials: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  latestPaymentState: string | null;
  hasEntitlement: boolean;
};

export async function adminListOrders(params: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ orders: AdminOrderRow[]; total: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  const search = params.search?.trim();
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(o.order_number ilike $${values.length} or u.email ilike $${values.length})`);
  }
  if (params.status) {
    values.push(enumArg(params.status, ORDER_STATUSES, "وضعیت نامعتبر است."));
    conditions.push(`o.status = $${values.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(Math.max(params.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const rows = await query<{
    id: string;
    order_number: string;
    email: string;
    user_id: string;
    plan_title: string;
    amount_rials: number;
    status: OrderStatus;
    created_at: string;
    paid_at: string | null;
    latest_state: string | null;
    has_entitlement: boolean;
    total_count: number;
  }>(
    `select o.id, o.order_number, u.email, o.user_id, o.plan_title, o.amount_rials,
            o.status, o.created_at, o.paid_at,
            (select a.state from plus_payment_attempts a
              where a.order_id = o.id order by a.created_at desc limit 1) as latest_state,
            exists (select 1 from plus_entitlements e where e.source_order_id = o.id) as has_entitlement,
            count(*) over () as total_count
       from plus_orders o
       join users u on u.id = o.user_id
       ${where}
      -- شکنندهٔ تساوی، تا صفحه‌بندی پایدار بماند.
      order by o.created_at desc, o.id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

  return {
    total: rows[0]?.total_count ?? 0,
    orders: rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      userEmail: r.email,
      userId: r.user_id,
      planTitle: r.plan_title,
      amountRials: r.amount_rials,
      status: r.status,
      createdAt: r.created_at,
      paidAt: r.paid_at,
      latestPaymentState: r.latest_state,
      hasEntitlement: r.has_entitlement,
    })),
  };
}

/**
 * بازبینیِ یک سفارشِ معلق — «واقعاً پرداخت شده؟»
 *
 * همان مسیرِ `settlePayment` را با حالتِ `recheck` صدا می‌زند، یعنی دقیقاً
 * همان چیزی که کاربر با دکمهٔ «بررسی دوباره» می‌بیند. عمداً مسیرِ جداگانه‌ای
 * برای مدیر ساخته نشده: مسیرِ دوم یعنی دو رفتارِ متفاوت و یکی از آن‌ها
 * دیر یا زود اشتباه می‌شود.
 */
export async function adminReconcileOrder(orderId: unknown): Promise<ActionResult<{ state: string }>> {
  const admin = await requireAdmin();
  const id = uuidArg(orderId, "شناسهٔ سفارش نامعتبر است.");

  const order = await queryOne<{ user_id: string; order_number: string }>(
    "select user_id, order_number from plus_orders where id = $1",
    [id],
  );
  if (!order) return { ok: false, errors: ["سفارش پیدا نشد."] };

  const result = await settlePayment({
    userId: order.user_id,
    orderId: id,
    returnParams: {},
    mode: "recheck",
  });

  await recordAudit({
    actor: admin,
    action: "plus.order_reconcile",
    targetType: "plus_order",
    targetId: id,
    summary: `سفارش ${order.order_number} بازبینی شد؛ نتیجه: ${result.state}`,
    metadata: { state: result.state, activatedNow: result.activatedNow },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: { state: result.state } };
}

/**
 * تغییر دستیِ وضعیت سفارش — برای اصلاح و بازپرداختِ خارج از سیستم.
 *
 * ⚠️ `paid` عمداً در فهرست نیست. اگر مدیر می‌توانست سفارشی را دستی
 * «پرداخت‌شده» کند، یک پرداختِ جعلی در تاریخچهٔ مالی می‌نشست که هیچ تلاشِ
 * پرداختِ تأییدشده‌ای پشتش نیست. راهِ دادنِ دسترسی بدونِ پرداخت، «دسترسی
 * آزمایشی» است که صادقانه همان را می‌گوید.
 *
 * ⚠️ `refunded` هم فقط *ثبتِ* یک بازپرداختِ انجام‌شده در بیرون است؛ سروا هیچ
 * پولی برنمی‌گرداند و وانمود هم نمی‌کند که برمی‌گرداند.
 */
export async function adminSetOrderStatus(
  orderId: unknown,
  status: unknown,
  reason: unknown,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(orderId, "شناسهٔ سفارش نامعتبر است.");
  const next = enumArg(status, ["cancelled", "expired", "refunded"], "وضعیت نامعتبر است.");

  const why = text(reason, 300);
  if (why.length < 3) return { ok: false, errors: ["دلیل تغییر وضعیت را بنویسید."] };

  const order = await queryOne<{ order_number: string; status: OrderStatus }>(
    "select order_number, status from plus_orders where id = $1",
    [id],
  );
  if (!order) return { ok: false, errors: ["سفارش پیدا نشد."] };

  await execute(
    `update plus_orders
        set status = $2,
            cancelled_at = case when $2 = 'cancelled' then now() else cancelled_at end
      where id = $1`,
    [id, next],
  );

  await recordAudit({
    actor: admin,
    action: "plus.order_status",
    targetType: "plus_order",
    targetId: id,
    summary: `وضعیت سفارش ${order.order_number} از ${order.status} به ${next} تغییر کرد — ${why}`,
    metadata: { from: order.status, to: next, reason: why },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: null };
}

/**
 * مسیرِ پایلوت: دسترسی بدونِ پرداخت، روی یک سفارشِ موجود.
 *
 * ⚠️ سفارش «پرداخت‌شده» نمی‌شود. سفارش لغو می‌شود و به‌جایش یک دسترسیِ
 * `manual_grant` ساخته می‌شود که در همه‌جای رابط کاربری «دسترسی آزمایشی»
 * نوشته می‌شود. اگر به‌عنوان خرید ثبت می‌شد، گزارشِ مالی دروغ می‌گفت و کاربر
 * دنبال فاکتوری می‌گشت که وجود ندارد.
 */
export async function adminPilotActivate(
  orderId: unknown,
  reason: unknown,
): Promise<ActionResult<{ endsAt: string | null }>> {
  const admin = await requireAdmin();

  if (!(await isPilotGrantEnabled())) {
    return {
      ok: false,
      errors: ["مسیر پایلوت خاموش است. از تنظیمات سروا پلاس روشنش کنید."],
    };
  }

  const id = uuidArg(orderId, "شناسهٔ سفارش نامعتبر است.");
  const why = text(reason, 300);
  if (why.length < 3) return { ok: false, errors: ["دلیل فعال‌سازی را بنویسید."] };

  const order = await queryOne<{
    user_id: string;
    order_number: string;
    duration_days: number;
    status: OrderStatus;
  }>("select user_id, order_number, duration_days, status from plus_orders where id = $1", [id]);
  if (!order) return { ok: false, errors: ["سفارش پیدا نشد."] };
  if (order.status !== "pending") {
    return { ok: false, errors: ["فقط سفارش در انتظار پرداخت را می‌توان آزمایشی فعال کرد."] };
  }

  const granted = await manualGrant({
    userId: order.user_id,
    days: order.duration_days,
    reason: `دسترسی آزمایشی برای سفارش ${order.order_number} — ${why}`,
    grantedBy: admin.id,
  });

  await execute(
    "update plus_orders set status = 'cancelled', cancelled_at = now() where id = $1 and status = 'pending'",
    [id],
  );

  await notify({
    userId: order.user_id,
    kind: "plus_activated",
    title: "دسترسی آزمایشی سروا پلاس فعال شد ✦",
    body: "این دسترسی از طرف تیم سروا فعال شده و پرداختی بابتش ثبت نشده است.",
    href: "/panel/subscription",
  });

  await recordAudit({
    actor: admin,
    action: "plus.pilot_activate",
    targetType: "plus_order",
    targetId: id,
    summary: `دسترسی آزمایشی ${order.duration_days} روزه برای سفارش ${order.order_number} فعال شد — ${why}`,
    metadata: { days: order.duration_days, reason: why, entitlementId: granted.id },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: { endsAt: granted.endsAt } };
}

/* ═══════════════════════════ دسترسی‌ها ═══════════════════════════════ */

export type AdminEntitlementRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  source: "purchase" | "manual_grant";
  startsAt: string;
  endsAt: string | null;
  revokedAt: string | null;
  reason: string | null;
  orderNumber: string | null;
  isActive: boolean;
};

export async function adminListEntitlements(params: {
  search?: string;
  state?: "active" | "expired" | "revoked";
  limit?: number;
  offset?: number;
} = {}): Promise<{ entitlements: AdminEntitlementRow[]; total: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  const search = params.search?.trim();
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(u.email ilike $${values.length} or u.full_name ilike $${values.length})`);
  }
  if (params.state === "active") {
    conditions.push("e.revoked_at is null and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())");
  } else if (params.state === "expired") {
    conditions.push("e.revoked_at is null and e.ends_at is not null and e.ends_at <= now()");
  } else if (params.state === "revoked") {
    conditions.push("e.revoked_at is not null");
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(Math.max(params.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const rows = await query<{
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    source: "purchase" | "manual_grant";
    starts_at: string;
    ends_at: string | null;
    revoked_at: string | null;
    reason: string | null;
    order_number: string | null;
    is_active: boolean;
    total_count: number;
  }>(
    `select e.id, e.user_id, u.email, u.full_name, e.source, e.starts_at, e.ends_at,
            e.revoked_at, e.reason, o.order_number,
            (e.revoked_at is null and e.starts_at <= now()
             and (e.ends_at is null or e.ends_at > now())) as is_active,
            count(*) over () as total_count
       from plus_entitlements e
       join users u on u.id = e.user_id
       left join plus_orders o on o.id = e.source_order_id
       ${where}
      order by e.created_at desc, e.id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

  return {
    total: rows[0]?.total_count ?? 0,
    entitlements: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.email,
      userName: r.full_name,
      source: r.source,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      revokedAt: r.revoked_at,
      reason: r.reason,
      orderNumber: r.order_number,
      isActive: r.is_active,
    })),
  };
}

/**
 * اعطای دستیِ پلاس — همان چیزی که مالک خواسته: «بعضی کاربرها را دستی پلاس
 * کنم، برای یک مدت خاص یا همیشگی».
 *
 * `days = null` یعنی دائمی.
 */
export async function adminGrantPlus(input: {
  email: unknown;
  days: unknown;
  permanent?: unknown;
  reason: unknown;
  startFromNow?: unknown;
}): Promise<ActionResult<{ endsAt: string | null; userEmail: string }>> {
  const admin = await requireAdmin();

  const email = text(input.email, 200).toLowerCase();
  if (!email.includes("@")) return { ok: false, errors: ["ایمیل کاربر را درست وارد کنید."] };

  const why = text(input.reason, 300);
  if (why.length < 3) return { ok: false, errors: ["دلیل اعطای دسترسی را بنویسید."] };

  const permanent = input.permanent === true;
  let days: number | null = null;
  if (!permanent) {
    days = Number(input.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return { ok: false, errors: ["مدت باید عددی بین ۱ و ۳۶۵۰ روز باشد، یا «دائمی» را انتخاب کنید."] };
    }
  }

  // citext است، پس مقایسه خودبه‌خود بی‌توجه به بزرگی و کوچکی حروف انجام می‌شود.
  const user = await queryOne<{ id: string; email: string; is_banned: boolean }>(
    "select id, email, is_banned from users where email = $1",
    [email],
  );
  if (!user) return { ok: false, errors: ["کاربری با این ایمیل پیدا نشد."] };

  const granted = await manualGrant({
    userId: user.id,
    days,
    reason: why,
    grantedBy: admin.id,
    startFrom: input.startFromNow === true ? "now" : "end_of_current",
  });

  await notify({
    userId: user.id,
    kind: "plus_activated",
    title: "دسترسی سروا پلاس برای حساب تو فعال شد ✦",
    body: permanent ? "این دسترسی محدودیت زمانی ندارد." : `این دسترسی ${days} روزه است.`,
    href: "/panel/subscription",
  });

  await recordAudit({
    actor: admin,
    action: "plus.grant",
    targetType: "plus_entitlement",
    targetId: granted.id,
    summary: `دسترسی ${permanent ? "دائمی" : `${days} روزه`} سروا پلاس به ${user.email} داده شد — ${why}`,
    metadata: { userId: user.id, days, permanent, reason: why, banned: user.is_banned },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: { endsAt: granted.endsAt, userEmail: user.email } };
}

export async function adminExtendEntitlement(
  entitlementId: unknown,
  days: unknown,
  reason: unknown,
): Promise<ActionResult<{ endsAt: string | null }>> {
  const admin = await requireAdmin();
  const id = uuidArg(entitlementId, "شناسهٔ دسترسی نامعتبر است.");

  const extra = Number(days);
  if (!Number.isInteger(extra) || extra < 1 || extra > 3650) {
    return { ok: false, errors: ["مدت تمدید باید عددی بین ۱ و ۳۶۵۰ روز باشد."] };
  }

  const why = text(reason, 300);
  if (why.length < 3) return { ok: false, errors: ["دلیل تمدید را بنویسید."] };

  const result = await extendEntitlement(id, extra);
  if (!result) {
    return {
      ok: false,
      errors: ["این دسترسی تمدید نشد — یا پیدا نشد، یا لغو شده، یا از قبل دائمی است."],
    };
  }

  await recordAudit({
    actor: admin,
    action: "plus.extend",
    targetType: "plus_entitlement",
    targetId: id,
    summary: `دسترسی سروا پلاس ${extra} روز تمدید شد — ${why}`,
    metadata: { days: extra, reason: why, endsAt: result.endsAt },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: { endsAt: result.endsAt } };
}

export async function adminRevokeEntitlement(
  entitlementId: unknown,
  reason: unknown,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(entitlementId, "شناسهٔ دسترسی نامعتبر است.");

  const why = text(reason, 300);
  if (why.length < 3) return { ok: false, errors: ["دلیل لغو را بنویسید."] };

  const result = await revokeEntitlement(id);
  if (!result) return { ok: false, errors: ["این دسترسی پیدا نشد یا از قبل لغو شده است."] };

  await notify({
    userId: result.userId,
    kind: "plus_revoked",
    title: "دسترسی سروا پلاس متوقف شد",
    body: "اگر فکر می‌کنی اشتباهی رخ داده، از بخش پشتیبانی پیام بده.",
    href: "/panel/support",
  });

  await recordAudit({
    actor: admin,
    action: "plus.revoke",
    targetType: "plus_entitlement",
    targetId: id,
    summary: `دسترسی سروا پلاس لغو شد — ${why}`,
    metadata: { userId: result.userId, reason: why },
  });

  revalidatePath("/admin/plus");
  return { ok: true, data: null };
}

/* ═══════════════════════════ تیکت‌ها ═══════════════════════════════ */

export type AdminTicketRow = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  userEmail: string;
  lastActivityAt: string;
  adminUnread: boolean;
  orderNumber: string | null;
};

export async function adminListTickets(params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ tickets: AdminTicketRow[]; total: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  if (params.status) {
    values.push(enumArg(params.status, TICKET_STATUSES, "وضعیت نامعتبر است."));
    conditions.push(`t.status = $${values.length}`);
  }
  const search = params.search?.trim();
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(t.ticket_number ilike $${values.length} or t.subject ilike $${values.length} or u.email ilike $${values.length})`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(Math.max(params.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const rows = await query<{
    id: string;
    ticket_number: string;
    subject: string;
    category: TicketCategory;
    status: TicketStatus;
    email: string;
    last_activity_at: string;
    admin_unread: boolean;
    order_number: string | null;
    total_count: number;
  }>(
    `select t.id, t.ticket_number, t.subject, t.category, t.status, u.email,
            t.last_activity_at, t.admin_unread, o.order_number,
            count(*) over () as total_count
       from plus_tickets t
       join users u on u.id = t.user_id
       left join plus_orders o on o.id = t.order_id
       ${where}
      order by t.admin_unread desc, t.last_activity_at desc, t.id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

  return {
    total: rows[0]?.total_count ?? 0,
    tickets: rows.map((r) => ({
      id: r.id,
      ticketNumber: r.ticket_number,
      subject: r.subject,
      category: r.category,
      status: r.status,
      userEmail: r.email,
      lastActivityAt: r.last_activity_at,
      adminUnread: r.admin_unread,
      orderNumber: r.order_number,
    })),
  };
}

export type AdminTicketDetail = AdminTicketRow & {
  userId: string;
  messages: { id: string; authorRole: "user" | "admin"; body: string; createdAt: string }[];
};

/**
 * یک تیکت برای پشتیبان.
 *
 * ⚠️ عمداً هیچ‌چیز از تاریخچهٔ آموزشیِ کاربر اینجا نیست. پشتیبان برای پاسخ به
 * «پرداختم فعال نشد» به پاسخ‌های عروضِ او نیازی ندارد؛ و دسترسیِ لازم‌نداشته،
 * دسترسیِ نشت‌کننده است. تنها دادهٔ فراتر از رشتهٔ گفت‌وگو، سفارشی است که خودِ
 * کاربر ضمیمه کرده.
 */
export async function adminGetTicket(ticketId: unknown): Promise<AdminTicketDetail | null> {
  await requireAdmin();
  if (!isUuid(ticketId)) return null;

  const row = await queryOne<{
    id: string;
    ticket_number: string;
    subject: string;
    category: TicketCategory;
    status: TicketStatus;
    email: string;
    user_id: string;
    last_activity_at: string;
    admin_unread: boolean;
    order_number: string | null;
  }>(
    `select t.id, t.ticket_number, t.subject, t.category, t.status, u.email, t.user_id,
            t.last_activity_at, t.admin_unread, o.order_number
       from plus_tickets t
       join users u on u.id = t.user_id
       left join plus_orders o on o.id = t.order_id
      where t.id = $1`,
    [ticketId],
  );
  if (!row) return null;

  const messages = await query<{
    id: string;
    author_role: "user" | "admin";
    body: string;
    created_at: string;
  }>(
    `select id, author_role, body, created_at
       from plus_ticket_messages where ticket_id = $1
      order by created_at, id limit 200`,
    [ticketId],
  );

  // باز کردنِ تیکت، نشانِ «پاسخ تازه»ی صف را برمی‌دارد.
  await execute("update plus_tickets set admin_unread = false where id = $1 and admin_unread", [
    ticketId,
  ]);

  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    subject: row.subject,
    category: row.category,
    status: row.status,
    userEmail: row.email,
    userId: row.user_id,
    lastActivityAt: row.last_activity_at,
    adminUnread: row.admin_unread,
    orderNumber: row.order_number,
    messages: messages.map((m) => ({
      id: m.id,
      authorRole: m.author_role,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

export async function adminReplyTicket(input: {
  ticketId: unknown;
  message: unknown;
  status?: unknown;
}): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(input.ticketId, "شناسهٔ تیکت نامعتبر است.");

  const body = text(input.message, 4000);
  if (body.length < 2) return { ok: false, errors: ["متن پاسخ خالی است."] };

  const nextStatus =
    input.status === undefined || input.status === null
      ? "waiting_for_user"
      : enumArg(input.status, TICKET_STATUSES, "وضعیت نامعتبر است.");

  const ticket = await transaction(async (tx) => {
    const t = await tx.queryOne<{ id: string; user_id: string; ticket_number: string }>(
      `update plus_tickets
          set status = $2, last_activity_at = now(), user_unread = true, admin_unread = false
        where id = $1
        returning id, user_id, ticket_number`,
      [id, nextStatus],
    );
    if (!t) return null;

    await tx.execute(
      // author_role همیشه 'admin' نوشته می‌شود و از ورودی نمی‌آید.
      `insert into plus_ticket_messages (ticket_id, author_id, author_role, body)
       values ($1, $2, 'admin', $3)`,
      [id, admin.id, body],
    );
    return t;
  });

  if (!ticket) return { ok: false, errors: ["تیکت پیدا نشد."] };

  await notify({
    userId: ticket.user_id,
    kind: "ticket_reply",
    title: "پشتیبانی به تیکت تو پاسخ داد",
    body: `تیکت ${ticket.ticket_number}`,
    href: "/panel/support",
  });

  await recordAudit({
    actor: admin,
    action: "plus.ticket_reply",
    targetType: "plus_ticket",
    targetId: id,
    // ⚠️ متنِ پاسخ در خلاصه نمی‌آید: ممکن است اطلاعات شخصیِ کاربر را نقل کند.
    summary: `به تیکت ${ticket.ticket_number} پاسخ داده شد`,
    metadata: { status: nextStatus },
  });

  revalidatePath("/admin/plus/tickets");
  return { ok: true, data: null };
}

export async function adminSetTicketStatus(
  ticketId: unknown,
  status: unknown,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  const id = uuidArg(ticketId, "شناسهٔ تیکت نامعتبر است.");
  const next = enumArg(status, TICKET_STATUSES, "وضعیت نامعتبر است.");

  const affected = await execute(
    "update plus_tickets set status = $2, last_activity_at = now() where id = $1",
    [id, next],
  );
  if (!affected) return { ok: false, errors: ["تیکت پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: "plus.ticket_status",
    targetType: "plus_ticket",
    targetId: id,
    summary: `وضعیت تیکت به ${next} تغییر کرد`,
    metadata: { status: next },
  });

  revalidatePath("/admin/plus/tickets");
  return { ok: true, data: null };
}
