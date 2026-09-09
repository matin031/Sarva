import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import RecheckButton from "@/components/UI/plus/RecheckButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrderDetail } from "@/lib/plus/orders";
import { formatRials } from "@/lib/plus/money";
import { jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نتیجهٔ پرداخت",
  robots: { index: false, follow: false },
};

/**
 * صفحهٔ نتیجهٔ پرداخت.
 *
 * ⚠️ **هیچ چیزِ این صفحه از query string ساخته نمی‌شود.** تنها پارامتری که
 * خوانده می‌شود شناسهٔ سفارش است، و آن هم فقط برای پیدا کردنِ ردیف؛ خودِ
 * وضعیت از دیتابیس می‌آید. یعنی این آدرس هیچ اثری ندارد:
 *
 *     /payment/result?order=…&success=true
 *
 * ⚠️ و چهار حالت **صریحاً از هم جدا** نمایش داده می‌شوند. مهم‌ترینشان
 * «نامعلوم» است: پرداختی که تکلیفش روشن نیست هرگز نباید «ناموفق» نوشته شود،
 * چون کاربری که پولش کم شده، با دیدنِ «ناموفق» دوباره پرداخت می‌کند.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?returnTo=/panel/billing");

  const { order: orderId } = await searchParams;

  // مالکیت در همان تابع بررسی می‌شود: سفارشِ کسِ دیگری «پیدا نشد» است.
  const order = orderId ? await getOrderDetail(user.id, orderId) : null;
  if (!order) {
    return (
      <Shell title="سفارش پیدا نشد">
        <p className="text-sm text-muted-foreground">
          این سفارش در حساب شما نیست. فهرست خریدهایتان را ببینید.
        </p>
        <Actions primary={{ href: "/panel/billing", label: "خریدهای من" }} />
      </Shell>
    );
  }

  const attemptState = order.latestPaymentState;

  /* ── پرداخت‌شده ─────────────────────────────────────────────────── */
  if (order.status === "paid") {
    return (
      <Shell title="پرداخت تأیید شد و سروا پلاس فعال شد ✦" tone="success">
        <dl className="space-y-2 text-sm">
          <Row label="شماره سفارش" value={order.orderNumber} />
          <Row label="مبلغ" value={formatRials(order.amountRials)} />
          {order.accessTo && <Row label="اعتبار تا" value={jalaliLong(order.accessTo)} />}
          {order.trackingId && <Row label="شماره پیگیری" value={order.trackingId} />}
        </dl>
        <Actions
          primary={{ href: "/panel/analysis", label: "مشاهدهٔ برنامهٔ من" }}
          secondary={{ href: `/panel/billing/${order.id}`, label: "مشاهدهٔ رسید" }}
        />
      </Shell>
    );
  }

  /* ── لغو شده ───────────────────────────────────────────────────── */
  if (attemptState === "cancelled") {
    return (
      <Shell title="پرداخت تکمیل نشد" tone="neutral">
        <p className="text-sm text-muted-foreground">
          پرداخت لغو شد و مبلغی از حساب شما کم نشده است. هر وقت خواستید
          می‌توانید دوباره تلاش کنید.
        </p>
        <Actions
          primary={{ href: "/plus", label: "تلاش دوباره" }}
          secondary={{ href: "/panel/billing", label: "خریدهای من" }}
        />
      </Shell>
    );
  }

  /* ── ناموفق ────────────────────────────────────────────────────── */
  if (attemptState === "failed") {
    return (
      <Shell title="پرداخت تأیید نشد" tone="error">
        <p className="text-sm text-muted-foreground">
          درگاه این پرداخت را تأیید نکرد. اگر مبلغی از حسابتان کم شده، معمولاً
          طی ۷۲ ساعت به‌طور خودکار برمی‌گردد؛ در غیر این صورت با شمارهٔ سفارش{" "}
          <b>{order.orderNumber}</b> به پشتیبانی پیام بدهید.
        </p>
        <RecheckButton orderId={order.id} />
        <Actions
          primary={{ href: "/plus", label: "تلاش دوباره" }}
          secondary={{ href: "/panel/support", label: "پشتیبانی" }}
        />
      </Shell>
    );
  }

  /* ── نامعلوم / در انتظار ───────────────────────────────────────── */
  return (
    <Shell title="وضعیت پرداخت هنوز نهایی نشده است" tone="pending">
      <p className="text-sm leading-relaxed text-muted-foreground">
        هنوز پاسخِ قطعی از درگاه نگرفته‌ایم. اگر مبلغی از حسابتان کم شده،
        نگران نباشید: سفارش <b>{order.orderNumber}</b> ثبت است و به‌محضِ روشن
        شدنِ وضعیت، اشتراک فعال می‌شود. <b>دوباره پرداخت نکنید.</b>
      </p>
      <RecheckButton orderId={order.id} />
      <Actions
        primary={{ href: "/panel/billing", label: "خریدهای من" }}
        secondary={{ href: "/panel/support", label: "پشتیبانی" }}
      />
    </Shell>
  );
}

/* ─────────────────────────── قطعه‌های نمایشی ────────────────────────────── */

const TONE: Record<string, { ring: string; icon: string }> = {
  success: { ring: "border-primary/40", icon: "✓" },
  error: { ring: "border-destructive/40", icon: "✕" },
  pending: { ring: "border-gold/40", icon: "…" },
  neutral: { ring: "border-border", icon: "•" },
};

function Shell({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: keyof typeof TONE;
  children: React.ReactNode;
}) {
  const t = TONE[tone] ?? TONE.neutral;
  return (
    <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-12 max-w-lg">
      <div className={`glass space-y-4 rounded-2xl border ${t.ring} p-6`}>
        {/* ⚠️ وضعیت با آیکن *و* متن مشخص می‌شود، نه فقط با رنگ. */}
        <h1 className="flex items-start gap-2 text-lg font-extrabold">
          <span aria-hidden="true">{t.icon}</span>
          <span>{title}</span>
        </h1>
        {children}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      {/* شمارهٔ سفارش و پیگیری باید قابلِ انتخاب و کپی باشند. */}
      <dd className="select-all font-medium">{value}</dd>
    </div>
  );
}

function Actions({
  primary,
  secondary,
}: {
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Link
        href={primary.href}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
      >
        {primary.label}
      </Link>
      {secondary && (
        <Link
          href={secondary.href}
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          {secondary.label}
        </Link>
      )}
    </div>
  );
}
