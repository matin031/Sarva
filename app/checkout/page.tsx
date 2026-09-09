import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CheckoutButton from "@/components/UI/plus/CheckoutButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSellableOfferByCode } from "@/lib/plus/plans";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { isPlusEnabled, purchaseTerms } from "@/lib/plus/config";
import { formatRials } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تکمیل خرید",
  robots: { index: false, follow: false },
};

/**
 * صفحهٔ تأییدِ خرید، پیش از رفتن به درگاه.
 *
 * ⚠️ **سبد خرید نیست.** سروا کالای فیزیکی نمی‌فروشد، پس هیچ‌کدام از این‌ها
 * اینجا نیست و نباید باشد: افزودن به سبد، آدرس پستی، شیوهٔ ارسال، کد تخفیف.
 * جریان یک خطی است: انتخاب مدت → همین صفحه → درگاه → فعال‌سازی.
 *
 * ⚠️ **قیمت از سرور خوانده می‌شود.** آدرسِ زیر هیچ اثری ندارد:
 *
 *     /checkout?plan=plus_1m&price=1000
 *
 * تنها پارامترِ خوانده‌شده `plan` است و آن هم فقط برای پیدا کردنِ ردیفِ
 * `plus_plan_versions`؛ مبلغ از همان ردیف می‌آید.
 *
 * ⚠️ **ورودِ وسطِ خرید، انتخاب را از بین نمی‌برد.** کاربرِ واردنشده به
 * `/auth?returnTo=/checkout?plan=…` می‌رود و بعد از ورود دقیقاً به همین صفحه
 * برمی‌گردد. `returnTo` روی سرور از allowlist رد می‌شود
 * (`lib/auth/return-to.ts`) تا به یک Open Redirect تبدیل نشود.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (!(await isPlusEnabled())) notFound();

  const { plan } = await searchParams;
  const planCode = typeof plan === "string" ? plan.trim() : "";
  if (!planCode) redirect("/plus");

  const offer = await getSellableOfferByCode(planCode);
  if (!offer) notFound();

  const user = await getCurrentUser();
  if (!user) {
    // قصدِ خرید در آدرسِ بازگشت حفظ می‌شود.
    redirect(`/auth?returnTo=${encodeURIComponent(`/checkout?plan=${offer.code}`)}`);
  }

  const [status, terms] = await Promise.all([getPlusStatus(), purchaseTerms()]);

  return (
    <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-10 max-w-lg">
      <h1 className="text-center text-2xl font-extrabold">تکمیل خرید سروا پلاس</h1>

      <div className="glass mt-6 space-y-4 rounded-2xl p-6">
        <Row label="محصول" value="سروا پلاس" />
        <Row label="مدت" value={`${fa(offer.durationDays)} روز`} />
        <Row label="مبلغ" value={formatRials(offer.amountRials)} strong />
        {/* حسابی که اشتراک روی آن فعال می‌شود — تا کسی که دو حساب دارد
            اشتباهی برای حسابِ دیگر نخرد. */}
        <Row label="فعال‌سازی برای" value={user.email} />
        <Row label="تمدید خودکار" value="ندارد — پیش‌پرداخت است" />

        {status.state === "active" && (
          /* ⚠️ تمدیدِ زودهنگام نباید ترسناک باشد: کاربر باید *قبل* از پرداخت
             بداند روزهای باقی‌مانده‌اش از بین نمی‌رود. */
          <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs leading-relaxed plus-ink">
            اشتراک فعلی تو
            {status.expiresAt ? ` تا ${jalaliLong(status.expiresAt)}` : " بدون محدودیت زمانی"} اعتبار
            دارد. این خرید <b>به انتهای همان دوره اضافه می‌شود</b> و روزهای باقی‌مانده‌ات از بین
            نمی‌رود.
          </p>
        )}

        <div className="border-t border-border/60 pt-4">
          <CheckoutButton planCode={offer.code} />
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {terms ?? "شرایط خرید هنوز ثبت نشده است."}
          <br />
          مشکلی پیش آمد؟{" "}
          <Link href="/panel/support" className="text-primary underline underline-offset-4">
            پشتیبانی
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/plus" className="underline underline-offset-4">
          بازگشت به پلن‌ها
        </Link>
      </p>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-left ${strong ? "text-base font-extrabold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
