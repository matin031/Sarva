import ReceiptView from "@/components/UI/panel/views/ReceiptView";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { getOrderDetail } from "@/lib/plus/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

/**
 * جزئیات یک سفارش + رسیدِ قابلِ چاپ.
 *
 * ⚠️ **مالکیت روی سرور اعمال می‌شود.** `getOrderDetail` شرطِ `user_id` را در
 * خودِ کوئری دارد، پس عوض کردنِ شناسه در آدرس به سفارشِ کسِ دیگری نمی‌رسد —
 * «پیدا نشد» می‌گیرد. این تنها چیزی است که جلوی خواندنِ اطلاعات مالیِ بقیه
 * را می‌گیرد؛ در این پروژه RLS وجود ندارد.
 *
 * ⚠️ و این «فاکتور رسمی مالیاتی» **نیست** و هیچ‌جا چنین ادعایی نمی‌شود. یک
 * رسیدِ قابلِ چاپ است؛ فاکتور رسمی الزاماتِ حقوقی دارد که هنوز پیاده نشده.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/billing");

  const { orderId } = await params;
  const order = await getOrderDetail(user.id, orderId);
  if (!order) notFound();

  return <ReceiptView order={order} />;
}
