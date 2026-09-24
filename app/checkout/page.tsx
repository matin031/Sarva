import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PurchaseSteps from "@/components/UI/plus/purchase/PurchaseSteps";
import CheckoutPanel, { type CheckoutOffer } from "@/components/UI/plus/purchase/CheckoutPanel";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listSellableOffers } from "@/lib/plus/plans";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { isPlusEnabled, paymentProviderName, purchaseTerms } from "@/lib/plus/config";
import { listAmbiguousOrders, reconcileOpenOrders } from "@/lib/plus/orders";
import { testGatewayAllowedFor } from "@/lib/plus/payments";
import { formatPhone } from "@/lib/auth/phone";
import css from "@/components/UI/plus/purchase/checkout.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تکمیل خرید",
  robots: { index: false, follow: false },
};

const MS_PER_DAY = 86_400_000;

/**
 * پایانِ اعتبار اگر همین حالا پرداخت شود: از انتهای اشتراکِ فعلی (اگر هست)
 * وگرنه از همین لحظه — همان قاعدهٔ `lib/plus/grants.ts`.
 */
function accessUntil(activeUntil: string | null, days: number): string {
  const now = Date.now();
  const end = activeUntil ? new Date(activeUntil).getTime() : 0;
  return new Date(Math.max(now, end) + days * MS_PER_DAY).toISOString();
}

/**
 * صفحهٔ خرید: انتخاب مدت ← خلاصه ← درگاه.
 *
 * ⚠️ **سبد خرید نیست.** سروا کالای فیزیکی نمی‌فروشد؛ جریان یک خطی است:
 * انتخاب مدت ← همین صفحه ← درگاه ← فعال‌سازی.
 *
 * ⚠️ **قیمت از سرور خوانده می‌شود.** `/checkout?plan=plus_1m&price=1000`
 * هیچ اثری ندارد؛ `plan` فقط انتخابِ پیش‌فرض را تعیین می‌کند.
 *
 * ⚠️ **ورودِ وسطِ خرید، انتخاب را از بین نمی‌برد.** کاربرِ واردنشده به
 * `/auth?returnTo=/checkout?plan=…` می‌رود و بعد از ورود — با رمز، پیامک یا
 * گوگل، و حتی اگر اول باید نامش را کامل کند — دقیقاً به همین صفحه برمی‌گردد.
 *
 * ⚠️ هیچ حالتی به ۴۰۴ ختم نمی‌شود. کسی که وسطِ خرید است و پلنش همان لحظه
 * از فروش برداشته شده، باید بفهمد چه شد و راهِ بعدی را ببیند.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const requested = typeof plan === "string" ? plan.trim() : "";

  if (!(await isPlusEnabled())) {
    return (
      <Notice title="فروش اشتراک فعلاً بسته است">
        همهٔ بخش‌های سروا در حال حاضر رایگان است.
      </Notice>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const back = requested ? `/checkout?plan=${encodeURIComponent(requested)}` : "/checkout";
    redirect(`/auth?returnTo=${encodeURIComponent(back)}`);
  }

  // پرداختی که کاربر در بانک انجام داده ولی به سایت برنگشته، پیش از هر چیز
  // روشن می‌شود — وگرنه همین صفحه به او پیشنهادِ پرداختِ دوباره می‌داد.
  await reconcileOpenOrders(user.id);

  const [offers, status, terms, provider, ambiguous] = await Promise.all([
    listSellableOffers(),
    getPlusStatus(),
    purchaseTerms(),
    paymentProviderName(),
    listAmbiguousOrders(user.id),
  ]);

  if (offers.length === 0) {
    return (
      <Notice title="فروش اشتراک فعلاً بسته است">
        به‌زودی دوباره باز می‌شود.
      </Notice>
    );
  }

  const selected = offers.find((o) => o.code === requested);
  const staleChoice = requested !== "" && !selected;

  const activeUntil = status.state === "active" ? status.expiresAt : null;

  const checkoutOffers: CheckoutOffer[] = offers.map((o) => ({
    code: o.code,
    title: o.title,
    subtitle: o.subtitle,
    durationDays: o.durationDays,
    amountRials: o.amountRials,
    compareAtRials: o.compareAtRials,
    discountPercent: o.discountPercent,
    savingPercent: o.savingPercent,
    accessUntil: accessUntil(activeUntil, o.durationDays),
  }));

  const isTest = provider === "test";
  const permanent = status.state === "active" && status.expiresAt === null;

  const blockedReason = permanent
    ? "اشتراک تو دائمی است و نیازی به خرید نداری."
    : status.state === "unavailable"
      ? "وضعیت اشتراکت الان خوانده نشد. کمی بعد دوباره امتحان کن."
      : isTest && !testGatewayAllowedFor(user.role)
        ? "پرداخت آنلاین به‌زودی فعال می‌شود."
        : null;

  const phone = formatPhone(user.phone);

  return (
    <main dir="rtl" className="container relative isolate z-20 mx-auto mb-32 mt-10 max-w-5xl px-4">
      <div aria-hidden className={css.aurora}>
        <span />
        <span />
        <span />
      </div>

      <PurchaseSteps current={2} />

      <h1 className="mt-8 bg-gradient-to-l from-foreground via-primary to-foreground bg-clip-text text-center text-3xl font-black text-transparent sm:text-4xl">
        {status.state === "active" && !permanent ? "تمدید سروا پلاس" : "خرید سروا پلاس"}
      </h1>

      {staleChoice && (
        <p className="mx-auto mt-4 max-w-xl rounded-xl border border-gold/40 bg-gold/10 p-3 text-center text-xs plus-ink">
          پلنی که انتخاب کرده بودی دیگر فروخته نمی‌شود. یکی از مدت‌های زیر را انتخاب کن.
        </p>
      )}

      {ambiguous.length > 0 && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs leading-relaxed plus-ink"
        >
          نتیجهٔ پرداختِ سفارش{" "}
          {ambiguous.map((o, i) => (
            <span key={o.id}>
              {i > 0 && "، "}
              <Link href={`/panel/billing/${o.id}`} className="font-bold underline underline-offset-4">
                {o.orderNumber}
              </Link>
            </span>
          ))}{" "}
          هنوز مشخص نیست. اگر مبلغی از حسابت کم شده، دوباره پرداخت نکن.
        </div>
      )}

      <div className="mt-2">
        <CheckoutPanel
          offers={checkoutOffers}
          initialCode={(selected ?? offers[0]).code}
          account={user.email ?? phone ?? "—"}
          accountLtr={!user.email}
          holder={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "دانش‌آموز سروا"}
          activeUntil={status.state === "active" && !permanent ? status.expiresAt : null}
          blockedReason={blockedReason}
          isTestGateway={isTest}
        />
      </div>

      <div className="mx-auto mt-8 max-w-2xl space-y-2 text-center text-xs leading-relaxed text-muted-foreground">
        <p>{terms ?? "پیش‌پرداخت است و تمدید خودکار ندارد."}</p>
        <p>
          سؤالی داری؟{" "}
          <Link href="/panel/support" className="text-primary underline underline-offset-4">
            پشتیبانی
          </Link>
          {" • "}
          <Link href="/plus" className="underline underline-offset-4">
            دربارهٔ سروا پلاس
          </Link>
        </p>
      </div>
    </main>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-16 max-w-md px-4">
      <div className="glass space-y-3 rounded-2xl p-6 text-center">
        <h1 className="text-lg font-extrabold">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
        <Link
          href="/"
          className="inline-block rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          صفحهٔ اصلی
        </Link>
      </div>
    </main>
  );
}
