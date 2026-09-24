import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SandboxGateway from "@/components/UI/plus/purchase/SandboxGateway";
import { getCurrentUser } from "@/lib/auth/current-user";
import { paymentProviderName } from "@/lib/plus/config";
import { testGatewayAllowedFor } from "@/lib/plus/payments";
import { loadSandboxAttempt } from "@/lib/plus/payments/sandbox";
import { sandboxOutcomeOf } from "@/lib/plus/payments/test-provider";
import { formatRials } from "@/lib/plus/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درگاه پرداخت آزمایشی",
  robots: { index: false, follow: false },
};

/**
 * شبیه‌سازِ صفحهٔ بانک.
 *
 * ⚠️ چهار قفل، و هر چهار لازم‌اند:
 *   ۱) فقط وقتی درگاهِ انتخاب‌شده «آزمایشی» است.
 *   ۲) روی سرورِ اصلی فقط برای مدیر (`testGatewayAllowedFor`).
 *   ۳) فقط کاربرِ واردشده.
 *   ۴) فقط اگر این تلاشِ پرداخت مالِ سفارشِ *همین* کاربر باشد.
 *
 * ⚠️ دکمه‌ها لینک نیستند؛ فرم‌اند و به `/payment/sandbox/submit` می‌روند. آنجا
 * نتیجه در «دفترِ بانک» ثبت می‌شود و توکنِ امضاشده ساخته می‌شود. آدرسِ
 * بازگشت را هم همان‌جا سرور از روی سفارش می‌سازد — هیچ مقصدی از query
 * خوانده نمی‌شود، پس این صفحه نمی‌تواند Open Redirect باشد.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  if ((await paymentProviderName()) !== "test") notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/auth?returnTo=/panel/billing");
  if (!testGatewayAllowedFor(user.role)) notFound();

  const { ref } = await searchParams;
  const attempt = ref ? await loadSandboxAttempt(ref, user.id) : null;
  if (!ref || !attempt) notFound();

  const recorded = sandboxOutcomeOf(ref);
  const state = recorded || attempt.orderStatus === "paid"
    ? "done"
    : attempt.expired
      ? "expired"
      : "open";

  return (
    <SandboxGateway
      providerRef={ref}
      amount={formatRials(attempt.amountRials)}
      orderNumber={attempt.orderNumber}
      planTitle={attempt.planTitle}
      deadline={attempt.deadline}
      state={state}
    />
  );
}
