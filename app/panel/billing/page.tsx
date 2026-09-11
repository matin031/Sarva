import BillingView from "@/components/UI/panel/views/BillingView";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { countUnsettledOrders, listOrders } from "@/lib/plus/orders";

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
  const page = Math.max(1, Number(p) || 1);

  const [{ orders, hasMore }, unsettled] = await Promise.all([
    listOrders(user.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countUnsettledOrders(user.id),
  ]);

  return <BillingView orders={orders} hasMore={hasMore} unsettled={unsettled} page={page} />;
}
