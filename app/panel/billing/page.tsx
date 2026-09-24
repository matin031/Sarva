import BillingView from "@/components/UI/panel/views/BillingView";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { listAmbiguousOrders, listOrders, reconcileOpenOrders } from "@/lib/plus/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "خریدهای من",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 10;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/billing");

  const { p } = await searchParams;
  const page = Math.max(1, Math.floor(Number(p)) || 1);

  // پرداختی که کاربر در بانک انجام داده ولی به سایت برنگشته، همین‌جا روشن
  // می‌شود؛ فهرست بعد از آن خوانده می‌شود تا وضعیتِ تازه را نشان بدهد.
  await reconcileOpenOrders(user.id);

  const [{ orders, hasMore }, unsettled] = await Promise.all([
    listOrders(user.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    listAmbiguousOrders(user.id),
  ]);

  return (
    <BillingView orders={orders} hasMore={hasMore} unsettled={unsettled.length} page={page} />
  );
}
