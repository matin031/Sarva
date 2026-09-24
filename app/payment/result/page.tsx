import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, CircleSlash, Hourglass, SearchX } from "lucide-react";
import RecheckButton from "@/components/UI/plus/RecheckButton";
import PurchaseSteps from "@/components/UI/plus/purchase/PurchaseSteps";
import PayOrderButton from "@/components/UI/plus/purchase/PayOrderButton";
import PaymentCelebration from "@/components/UI/plus/purchase/PaymentCelebration";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { getOrderDetail } from "@/lib/plus/orders";
import { formatRials } from "@/lib/plus/money";
import { jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نتیجهٔ پرداخت",
  robots: { index: false, follow: false },
};

/** جشن فقط وقتی که پرداخت همین حالا تأیید شده؛ نه برای بازدیدِ روزهای بعد. */
const CELEBRATE_WITHIN_MS = 30 * 60_000;

function paidJustNow(paidAt: string | null): boolean {
  return !!paidAt && Date.now() - new Date(paidAt).getTime() < CELEBRATE_WITHIN_MS;
}

/**
 * صفحهٔ نتیجهٔ پرداخت.
 *
 * ⚠️ **هیچ چیزِ این صفحه از query string ساخته نمی‌شود.** تنها پارامتر شناسهٔ
 * سفارش است و آن هم فقط برای پیدا کردنِ ردیف؛ وضعیت از دیتابیس می‌آید.
 * `/payment/result?order=…&success=true` هیچ اثری ندارد.
 *
 * ⚠️ حالت‌ها **صریحاً از هم جدا** نمایش داده می‌شوند. مهم‌ترینشان «نامعلوم»
 * است: پرداختی که تکلیفش روشن نیست هرگز «ناموفق» نوشته نمی‌شود، چون کاربری
 * که پولش کم شده، با دیدنِ «ناموفق» دوباره پرداخت می‌کند.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const validId = typeof orderId === "string" && isUuid(orderId) ? orderId : null;

  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/auth?returnTo=${encodeURIComponent(validId ? `/payment/result?order=${validId}` : "/panel/billing")}`,
    );
  }

  // مالکیت در همان تابع بررسی می‌شود: سفارشِ کسِ دیگری «پیدا نشد» است.
  const order = validId ? await getOrderDetail(user.id, validId) : null;
  if (!order) {
    return (
      <Shell step={2} icon={<SearchX className="size-7" />} tone="neutral" title="سفارش پیدا نشد">
        <p>این سفارش در حساب تو نیست.</p>
        <Links items={[{ href: "/panel/billing", label: "خریدهای من" }]} />
      </Shell>
    );
  }

  const checkoutHref = `/checkout?plan=${encodeURIComponent(order.planCode)}`;
  const supportHref = `/panel/support?order=${order.id}`;

  /* ── پرداخت‌شده ─────────────────────────────────────────────────── */
  if (order.status === "paid") {
    const celebrate = paidJustNow(order.paidAt);
    return (
      <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-10 max-w-lg px-4">
        <PurchaseSteps current={4} />
        <div className="mt-8">
          <PaymentCelebration
            title={order.isRenewal ? "سروا پلاس تمدید شد" : "سروا پلاس فعال شد"}
            subtitle={
              order.isRenewal
                ? "دورهٔ تازه به انتهای اشتراک قبلی‌ات اضافه شد."
                : "پرداخت تأیید شد. همهٔ امکانات پلاس برایت باز است."
            }
            celebrate={celebrate}
            primary={{ href: "/panel/analysis", label: "شروع استفاده" }}
          >
            <dl className="space-y-2.5 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm">
              <Row label="شماره سفارش" value={order.orderNumber} mono />
              <Row label="اشتراک" value={order.planTitle} />
              <Row label="مبلغ" value={formatRials(order.amountRials)} />
              {order.accessTo && <Row label="اعتبار تا" value={jalaliLong(order.accessTo)} />}
              {order.trackingId && <Row label="شماره پیگیری" value={order.trackingId} mono />}
            </dl>
          </PaymentCelebration>
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href={`/panel/billing/${order.id}`} className="text-primary underline underline-offset-4">
            مشاهدهٔ فاکتور
          </Link>
        </p>
      </main>
    );
  }

  /* ── سفارشِ بسته‌شده ───────────────────────────────────────────── */
  if (order.status !== "pending") {
    const text =
      order.status === "refunded"
        ? "مبلغ این سفارش بازگردانده شده است."
        : order.status === "cancelled"
          ? "این سفارش لغو شده است."
          : "مهلت پرداخت این سفارش تمام شده است.";
    return (
      <Shell step={2} icon={<CircleSlash className="size-7" />} tone="neutral" title="این سفارش بسته شده است">
        <p>{text}</p>
        <Links
          items={[
            { href: checkoutHref, label: "خرید دوباره", primary: true },
            { href: `/panel/billing/${order.id}`, label: "جزئیات سفارش" },
          ]}
        />
      </Shell>
    );
  }

  const attemptState = order.latestPaymentState;

  // هنوز هیچ پرداختی شروع نشده (مثلاً آدرس دستی باز شده): برگرد به خرید.
  if (!attemptState || attemptState === "created") redirect(checkoutHref);

  /* ── لغو شده ───────────────────────────────────────────────────── */
  if (attemptState === "cancelled") {
    return (
      <Shell step={2} icon={<CircleSlash className="size-7" />} tone="neutral" title="پرداخت لغو شد">
        <p>مبلغی از حسابت کم نشده است.</p>
        <OrderLine order={order} />
        <div className="mt-5 space-y-3">
          <PayOrderButton orderId={order.id} planCode={order.planCode} />
          <Links items={[{ href: checkoutHref, label: "تغییر پلن" }]} />
        </div>
      </Shell>
    );
  }

  /* ── ناموفق ────────────────────────────────────────────────────── */
  if (attemptState === "failed") {
    const reason = order.attempts[0]?.errorMessage;
    return (
      <Shell step={2} icon={<CircleAlert className="size-7" />} tone="error" title="پرداخت ناموفق بود">
        {reason && <p>{reason}</p>}
        <p>
          اگر مبلغی از حسابت کم شده، حداکثر تا ۷۲ ساعت به حسابت برمی‌گردد.
        </p>
        <OrderLine order={order} />
        <div className="mt-5 space-y-3">
          <PayOrderButton orderId={order.id} planCode={order.planCode} />
          <Links items={[{ href: supportHref, label: "پشتیبانی" }]} />
        </div>
      </Shell>
    );
  }

  /* ── نامعلوم / در انتظار ───────────────────────────────────────── */
  return (
    <Shell step={2} icon={<Hourglass className="size-7" />} tone="pending" title="در انتظار تأیید بانک">
      <p>
        نتیجهٔ پرداخت هنوز از بانک نرسیده است. اگر مبلغی از حسابت کم شده، <b>دوباره پرداخت نکن</b>؛
        به محض تأیید، اشتراک فعال می‌شود.
      </p>
      <OrderLine order={order} />
      <div className="mt-5 space-y-3">
        <RecheckButton orderId={order.id} />
        <Links items={[{ href: supportHref, label: "پشتیبانی" }]} />
      </div>
    </Shell>
  );
}

/* ─────────────────────────── قطعه‌های نمایشی ────────────────────────────── */

const TONE = {
  error: "bg-destructive/10 text-destructive",
  pending: "bg-gold/15 plus-ink",
  neutral: "bg-foreground/5 text-muted-foreground",
} as const;

function Shell({
  step,
  icon,
  tone,
  title,
  children,
}: {
  step: 0 | 1 | 2 | 3 | 4;
  icon: React.ReactNode;
  tone: keyof typeof TONE;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-10 max-w-lg px-4">
      <PurchaseSteps current={step} />
      <section className="glass mt-8 rounded-3xl p-6 text-center">
        {/* ⚠️ وضعیت با آیکن *و* متن مشخص می‌شود، نه فقط با رنگ. */}
        <span className={`mx-auto flex size-14 items-center justify-center rounded-full ${TONE[tone]}`}>
          {icon}
        </span>
        <h1 className="mt-4 text-xl font-extrabold">{title}</h1>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </section>
    </main>
  );
}

function OrderLine({ order }: { order: { orderNumber: string; planTitle: string; amountRials: number } }) {
  return (
    <p className="pt-1 text-xs">
      سفارش <span className="select-all font-mono">{order.orderNumber}</span> • {order.planTitle} •{" "}
      {formatRials(order.amountRials)}
    </p>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      {/* شمارهٔ سفارش و پیگیری باید قابلِ انتخاب و کپی باشند. */}
      <dd className={`select-all font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Links({ items }: { items: { href: string; label: string; primary?: boolean }[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            item.primary
              ? "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              : "rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground"
          }
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
