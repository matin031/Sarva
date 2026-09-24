import ReceiptView from "@/components/UI/panel/views/ReceiptView";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatPhone } from "@/lib/auth/phone";
import { isUuid } from "@/lib/api/action-input";
import { getOrderDetail, reconcileOpenOrders } from "@/lib/plus/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

/**
 * جزئیات یک سفارش + فاکتورِ قابلِ چاپ.
 *
 * ⚠️ **مالکیت روی سرور اعمال می‌شود.** `getOrderDetail` شرطِ `user_id` را در
 * خودِ کوئری دارد، پس عوض کردنِ شناسه در آدرس به سفارشِ کسِ دیگری نمی‌رسد —
 * «پیدا نشد» می‌گیرد. در این پروژه RLS وجود ندارد.
 *
 * ⚠️ «فاکتور رسمی مالیاتی» **نیست** و هیچ‌جا چنین ادعایی نمی‌شود.
 *
 * پیش از نمایش، اگر نتیجهٔ پرداختی هنوز مبهم است از درگاه پرسیده می‌شود:
 * کسی که بعد از پرداخت اتصالش قطع شده، همین‌جا باید اشتراکِ فعال ببیند.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?returnTo=${encodeURIComponent(`/panel/billing/${orderId}`)}`);
  if (!isUuid(orderId)) notFound();

  await reconcileOpenOrders(user.id);

  const order = await getOrderDetail(user.id, orderId);
  if (!order) notFound();

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.fullName || "—";
  const phone = formatPhone(user.phone);

  return (
    <ReceiptView
      order={order}
      buyer={{ name, contact: user.email ?? phone, contactLtr: !user.email }}
    />
  );
}
