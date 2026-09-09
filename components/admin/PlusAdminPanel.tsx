"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  adminCreatePlan,
  adminCreatePlanVersion,
  adminExtendEntitlement,
  adminGrantPlus,
  adminListEntitlements,
  adminListOrders,
  adminListPlans,
  adminPilotActivate,
  adminReconcileOrder,
  adminRevokeEntitlement,
  adminSetOrderStatus,
  adminSetVersionSellable,
  adminUpdatePlan,
  type AdminEntitlementRow,
  type AdminOrderRow,
  type AdminPlanRow,
} from "@/lib/plus/admin-actions";
import { useAdminToast } from "@/components/admin/AdminToast";
import { formatRials } from "@/lib/plus/money";
import { orderStatusLabel } from "@/lib/plus/labels";
import { fa, jalaliLong } from "@/lib/panel/format";

/**
 * پنل مدیریتِ سروا پلاس.
 *
 * سه بخش، و ترتیبشان عمدی است:
 *   ۱) پلن‌ها      — «چه چیزی می‌فروشیم و چند».
 *   ۲) سفارش‌ها    — «چه کسی خرید و چه شد».
 *   ۳) دسترسی‌ها   — «چه کسی همین حالا پلاس دارد» + اعطای دستی.
 *
 * ⚠️ نکته‌ای که در رابط کاربری هم به مدیر گفته می‌شود: **قیمت ویرایش
 * نمی‌شود، نسخهٔ تازه ساخته می‌شود.** اگر قیمت قابلِ ویرایش بود، تغییرش
 * گذشته را هم بازنویسی می‌کرد و فاکتورِ کسی که سه ماه پیش خریده، عددِ امروز
 * را نشان می‌داد. تریگرِ دیتابیس هم همین را اجبار می‌کند.
 *
 * ⚠️ و «فعال‌سازی دستی» هیچ‌وقت به‌عنوان پرداخت ثبت نمی‌شود — نه اینجا و نه
 * در دیتابیس. برای کاربر «دسترسی آزمایشی» نوشته می‌شود.
 */

type Tab = "plans" | "orders" | "entitlements";

export default function PlusAdminPanel({
  initialPlans,
  initialOrders,
  initialEntitlements,
  pilotEnabled,
  plusEnabled,
}: {
  initialPlans: AdminPlanRow[];
  initialOrders: { orders: AdminOrderRow[]; total: number };
  initialEntitlements: { entitlements: AdminEntitlementRow[]; total: number };
  pilotEnabled: boolean;
  plusEnabled: boolean;
}) {
  const toast = useAdminToast();
  const [tab, setTab] = useState<Tab>("plans");
  const [pending, startTransition] = useTransition();

  const [plans, setPlans] = useState(initialPlans);
  const [orders, setOrders] = useState(initialOrders);
  const [entitlements, setEntitlements] = useState(initialEntitlements);

  const refreshPlans = () => adminListPlans().then(setPlans).catch(() => {});
  const refreshOrders = (search = "") =>
    adminListOrders({ search }).then(setOrders).catch(() => {});
  const refreshEntitlements = (search = "") =>
    adminListEntitlements({ search }).then(setEntitlements).catch(() => {});

  return (
    <div dir="rtl" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">سروا پلاس</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            پلن‌ها، سفارش‌ها و دسترسی‌ها
          </p>
        </div>

        {/* ⚠️ کلیدِ اصلیِ روشن/خاموش عمداً اینجا نیست: جایش «تنظیمات» است،
            کنارِ بقیهٔ کلیدهای سایت. اینجا فقط وضعیتش گفته می‌شود و یک
            میان‌بُر، تا مدیر دنبالش نگردد. */}
        <Link
          href="/admin/settings"
          className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
            plusEnabled ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          {plusEnabled ? "سروا پلاس روشن است" : "سروا پلاس خاموش است"} — تغییر در تنظیمات
        </Link>
      </header>

      <nav className="flex gap-2 overflow-x-auto">
        {(
          [
            ["plans", "پلن‌ها"],
            ["orders", `سفارش‌ها (${fa(orders.total)})`],
            ["entitlements", `دسترسی‌ها (${fa(entitlements.total)})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              tab === key ? "bg-primary text-primary-foreground" : "border border-border"
            }`}
          >
            {label}
          </button>
        ))}
        <Link
          href="/admin/plus/tickets"
          className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          تیکت‌ها
        </Link>
      </nav>

      {tab === "plans" && (
        <PlansTab
          plans={plans}
          busy={pending}
          onDone={(message) => {
            toast(message, "success");
            startTransition(() => void refreshPlans());
          }}
          onError={(message) => toast(message)}
        />
      )}

      {tab === "orders" && (
        <OrdersTab
          data={orders}
          pilotEnabled={pilotEnabled}
          onSearch={(q) => startTransition(() => void refreshOrders(q))}
          onDone={(message) => {
            toast(message, "success");
            startTransition(() => void refreshOrders());
          }}
          onError={(message) => toast(message)}
        />
      )}

      {tab === "entitlements" && (
        <EntitlementsTab
          data={entitlements}
          onSearch={(q) => startTransition(() => void refreshEntitlements(q))}
          onDone={(message) => {
            toast(message, "success");
            startTransition(() => void refreshEntitlements());
          }}
          onError={(message) => toast(message)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════ پلن‌ها ═══════════════════════════════════ */

function PlansTab({
  plans,
  busy,
  onDone,
  onError,
}: {
  plans: AdminPlanRow[];
  busy: boolean;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [days, setDays] = useState("30");

  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});

  async function createPlan() {
    const result = await adminCreatePlan({
      code,
      title,
      subtitle,
      durationDays: Number(days),
    });
    if (!result.ok) return onError(result.errors.join("\n"));
    setCode("");
    setTitle("");
    setSubtitle("");
    onDone("پلن ساخته شد.");
  }

  async function addVersion(planId: string) {
    const raw = priceDraft[planId] ?? "";
    const result = await adminCreatePlanVersion({
      planId,
      amountTomans: Number(raw),
      makeSellable: true,
    });
    if (!result.ok) return onError(result.errors.join("\n"));
    setPriceDraft((prev) => ({ ...prev, [planId]: "" }));
    onDone("نسخهٔ تازه ساخته شد و برای فروش فعال است.");
  }

  return (
    <div className="space-y-4">
      <section className="glass space-y-3 rounded-2xl p-5">
        <h2 className="font-bold">پلن تازه</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          پلن یعنی «یک گونهٔ فروشِ سروا پلاس» — مثلاً یک‌ماهه یا سه‌ماهه. سطحِ
          متفاوت (نقره‌ای/طلایی) نیست؛ محصول یکی است و این‌ها فقط مدت‌های
          فروشش‌اند.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="کد (انگلیسی)" value={code} onChange={setCode} placeholder="plus_1m" />
          <Input label="عنوان" value={title} onChange={setTitle} placeholder="سروا پلاس یک‌ماهه" />
          <Input label="زیرعنوان" value={subtitle} onChange={setSubtitle} />
          <Input label="مدت (روز)" value={days} onChange={setDays} placeholder="۳۰" />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={createPlan}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          ساخت پلن
        </button>
      </section>

      {plans.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          هنوز پلنی ساخته نشده. تا وقتی پلنِ قابلِ فروشی نباشد، صفحهٔ «سروا
          پلاس» چیزی برای خرید نشان نمی‌دهد.
        </p>
      ) : (
        plans.map((plan) => (
          <section key={plan.id} className="glass space-y-3 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">
                  {plan.title}{" "}
                  <span className="font-mono text-xs text-muted-foreground">{plan.code}</span>
                </h3>
                <p className="text-xs text-muted-foreground">{fa(plan.durationDays)} روز</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const result = await adminUpdatePlan(plan.id, { isActive: !plan.isActive });
                  if (!result.ok) return onError(result.errors.join("\n"));
                  onDone(plan.isActive ? "پلن از کاتالوگ برداشته شد." : "پلن فعال شد.");
                }}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold"
              >
                {plan.isActive ? "غیرفعال کن" : "فعال کن"}
              </button>
            </div>

            {/* نسخه‌ها */}
            <ul className="space-y-1.5 text-sm">
              {plan.versions.map((version) => (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 p-2.5"
                >
                  <span>
                    نسخهٔ {fa(version.version)} — <b>{formatRials(version.amountRials)}</b>{" "}
                    <span className="text-xs text-muted-foreground">
                      ({fa(version.durationDays)} روز • {fa(version.orderCount)} سفارش)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await adminSetVersionSellable(version.id, !version.isSellable);
                      if (!result.ok) return onError(result.errors.join("\n"));
                      onDone("وضعیت فروش نسخه تغییر کرد.");
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      version.isSellable
                        ? "bg-primary/15 text-primary"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {version.isSellable ? "در حال فروش" : "خارج از فروش"}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-end gap-2 border-t border-border/50 pt-3">
              <Input
                label="قیمت تازه (تومان)"
                value={priceDraft[plan.id] ?? ""}
                onChange={(value) => setPriceDraft((prev) => ({ ...prev, [plan.id]: value }))}
                placeholder="۱۹۹۰۰۰"
              />
              <button
                type="button"
                onClick={() => addVersion(plan.id)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                نسخهٔ تازه
              </button>
            </div>
            {/* ⚠️ همان جمله‌ای که مدیر باید بداند، درست کنارِ دکمه. */}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              قیمتِ نسخهٔ موجود قابلِ ویرایش نیست. تغییر قیمت یعنی ساختِ نسخهٔ
              تازه؛ نسخهٔ قبلی می‌ماند تا فاکتورِ خریدهای گذشته دست‌نخورده
              بماند.
            </p>
          </section>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════ سفارش‌ها ═════════════════════════════════ */

function OrdersTab({
  data,
  pilotEnabled,
  onSearch,
  onDone,
  onError,
}: {
  data: { orders: AdminOrderRow[]; total: number };
  pilotEnabled: boolean;
  onSearch: (query: string) => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  /* ⚠️ به‌جای یک دیالوگِ شناور، فرمِ دلیل *زیرِ خودِ سفارش* باز می‌شود.
     در پنلی که چند سفارش کنارِ هم است، مودالِ بی‌زمینه این خطر را دارد که
     مدیر فکر کند دربارهٔ سفارشِ دیگری تصمیم می‌گیرد. */
  const [acting, setActing] = useState<{ id: string; kind: "cancel" | "pilot" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function runOrderAction() {
    if (!acting || busy) return;
    setBusy(true);
    const result =
      acting.kind === "cancel"
        ? await adminSetOrderStatus(acting.id, "cancelled", reason)
        : await adminPilotActivate(acting.id, reason);
    setBusy(false);
    if (!result.ok) return onError(result.errors.join("\n"));
    setActing(null);
    setReason("");
    onDone("انجام شد.");
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="شمارهٔ سفارش یا ایمیل"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm font-bold">
          جست‌وجو
        </button>
      </form>

      {data.orders.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          سفارشی پیدا نشد.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.orders.map((order) => (
            <li key={order.id} className="glass rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs">{order.orderNumber}</p>
                  <p className="mt-0.5 truncate font-bold">{order.userEmail}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {order.planTitle} • {formatRials(order.amountRials)} •{" "}
                    {jalaliLong(order.createdAt)}
                  </p>
                </div>
                <div className="text-left text-xs">
                  <p className="font-bold">
                    {orderStatusLabel(order.status, order.latestPaymentState as never)}
                  </p>
                  {order.hasEntitlement && <p className="mt-0.5 plus-ink">دسترسی ساخته شده</p>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    const result = await adminReconcileOrder(order.id);
                    if (!result.ok) return onError(result.errors.join("\n"));
                    onDone(`نتیجهٔ بازبینی: ${result.data.state}`);
                  }}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-bold"
                >
                  بازبینی پرداخت
                </button>

                {order.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setReason("");
                        setActing({ id: order.id, kind: "cancel" });
                      }}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-bold"
                    >
                      لغو سفارش
                    </button>

                    {pilotEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setReason("");
                          setActing({ id: order.id, kind: "pilot" });
                        }}
                        className="rounded-lg border border-gold/50 px-3 py-1 text-xs font-bold plus-ink"
                      >
                        دسترسی آزمایشی به‌جای پرداخت
                      </button>
                    )}
                  </>
                )}
              </div>

              {acting?.id === order.id && (
                <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {acting.kind === "cancel"
                      ? "این سفارش لغو می‌شود. دلیل در گزارش فعالیت مدیران ثبت می‌شود."
                      : "سفارش لغو می‌شود و به‌جایش «دسترسی آزمایشی» با همان مدت به کاربر داده می‌شود. این پرداخت به‌شمار نمی‌رود و برای کاربر هم «آزمایشی» نوشته می‌شود."}
                  </p>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="دلیل (اجباری)"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={runOrderAction}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {acting.kind === "cancel" ? "لغو کن" : "دسترسی بده"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActing(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

/* ═══════════════════════════ دسترسی‌ها ════════════════════════════════ */

function EntitlementsTab({
  data,
  onSearch,
  onDone,
  onError,
}: {
  data: { entitlements: AdminEntitlementRow[]; total: number };
  onSearch: (query: string) => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");

  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [permanent, setPermanent] = useState(false);
  const [reason, setReason] = useState("");

  /* همان دلیلِ سفارش‌ها: فرمِ عمل زیرِ خودِ ردیف باز می‌شود تا مدیر همیشه
     ببیند دربارهٔ کدام کاربر تصمیم می‌گیرد. */
  const [acting, setActing] = useState<{ id: string; kind: "revoke" | "extend" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [extraDays, setExtraDays] = useState("7");
  const [busy, setBusy] = useState(false);

  async function runAction() {
    if (!acting || busy) return;
    setBusy(true);
    const result =
      acting.kind === "revoke"
        ? await adminRevokeEntitlement(acting.id, actionReason)
        : await adminExtendEntitlement(acting.id, Number(extraDays), actionReason);
    setBusy(false);
    if (!result.ok) return onError(result.errors.join("\n"));
    setActing(null);
    setActionReason("");
    onDone("انجام شد.");
  }

  return (
    <div className="space-y-4">
      {/* ── اعطای دستی ─────────────────────────────────────────── */}
      <section className="plus-surface space-y-3 rounded-2xl p-5">
        <h2 className="font-bold plus-ink">اعطای دستی سروا پلاس</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          برای کاربرِ پایلوت یا جبرانِ خرابی. به کاربر «دسترسی آزمایشی» نشان
          داده می‌شود و نه «پرداخت موفق». دوره به انتهای دسترسیِ فعلی‌اش اضافه
          می‌شود، پس چیزی از او کم نمی‌شود.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="ایمیل کاربر" value={email} onChange={setEmail} placeholder="student@example.com" />
          <Input
            label="مدت (روز)"
            value={days}
            onChange={setDays}
            placeholder="۳۰"
            disabled={permanent}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permanent}
            onChange={(e) => setPermanent(e.target.checked)}
            className="size-4"
          />
          دسترسی دائمی (بدون تاریخ پایان)
        </label>

        <Input label="دلیل (اجباری)" value={reason} onChange={setReason} />

        <button
          type="button"
          onClick={async () => {
            const result = await adminGrantPlus({
              email,
              days: Number(days),
              permanent,
              reason,
            });
            if (!result.ok) return onError(result.errors.join("\n"));
            setEmail("");
            setReason("");
            onDone(`دسترسی برای ${result.data.userEmail} فعال شد.`);
          }}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          اعطای دسترسی
        </button>
      </section>

      {/* ── فهرست ──────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ایمیل یا نام کاربر"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm font-bold">
          جست‌وجو
        </button>
      </form>

      {data.entitlements.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          دسترسی‌ای پیدا نشد.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.entitlements.map((row) => (
            <li key={row.id} className="glass rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{row.userEmail}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.source === "manual_grant" ? "دسترسی اعطاشده" : "خرید"}
                    {row.orderNumber ? ` • ${row.orderNumber}` : ""} •{" "}
                    {jalaliLong(row.startsAt)} تا{" "}
                    {row.endsAt ? jalaliLong(row.endsAt) : "دائمی"}
                  </p>
                  {row.reason && (
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">
                      دلیل: {row.reason}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-bold ${
                    row.revokedAt
                      ? "text-destructive"
                      : row.isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {row.revokedAt ? "لغوشده" : row.isActive ? "فعال" : "تمام‌شده"}
                </span>
              </div>

              {!row.revokedAt && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActionReason("");
                      setActing({ id: row.id, kind: "extend" });
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-bold"
                  >
                    تمدید دستی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionReason("");
                      setActing({ id: row.id, kind: "revoke" });
                    }}
                    className="rounded-lg border border-destructive/50 px-3 py-1 text-xs font-bold text-destructive"
                  >
                    لغو دسترسی
                  </button>
                </div>
              )}

              {acting?.id === row.id && (
                <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {acting.kind === "revoke"
                      ? "دسترسی بلافاصله قطع می‌شود. ردیف حذف نمی‌شود و سابقه‌اش می‌ماند."
                      : "چند روز به انتهای این دسترسی اضافه می‌شود. دسترسی دائمی تمدید نمی‌شود."}
                  </p>
                  {acting.kind === "extend" && (
                    <input
                      value={extraDays}
                      onChange={(e) => setExtraDays(e.target.value)}
                      placeholder="تعداد روز"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  )}
                  <input
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="دلیل (اجباری)"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={runAction}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${
                        acting.kind === "revoke"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {acting.kind === "revoke" ? "لغو کن" : "تمدید کن"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActing(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

/* ═══════════════════════════ ورودیِ مشترک ═════════════════════════════ */

function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 disabled:opacity-50"
      />
    </label>
  );
}
