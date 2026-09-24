import SupportView from "@/components/UI/panel/views/SupportView";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { listTickets } from "@/lib/plus/support";
import { getOrderDetail, listOrders } from "@/lib/plus/orders";
import { isUuid } from "@/lib/api/action-input";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پشتیبانی",
  robots: { index: false, follow: false },
};

/**
 * پشتیبانی.
 *
 * ⚠️ **این صفحه هرگز پشتِ اشتراک نمی‌رود.** بیشترِ تیکت‌های یک محصولِ پولی
 * دقیقاً از کسانی می‌آید که هنوز اشتراک ندارند («پول دادم فعال نشد»، «نمی‌توانم
 * وارد شوم»). قفل کردنِ پشتیبانی پشتِ همان چیزی که کاربر دربارهٔ آن مشکل دارد،
 * بدترین حلقهٔ ممکن است. پس هیچ‌جای این مسیر `requirePlus` صدا زده نمی‌شود.
 *
 * `?order=` از دکمهٔ «پشتیبانی این سفارش» می‌آید و فرم را با همان سفارش باز
 * می‌کند — فقط اگر سفارش مالِ همین کاربر باشد (`getOrderDetail` مالکیت را
 * در کوئری دارد).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/support");

  const { order } = await searchParams;
  const wanted = typeof order === "string" && isUuid(order) ? order : null;

  const [{ tickets }, recent, preset] = await Promise.all([
    listTickets(user.id, { limit: 30 }),
    // فقط برای فهرستِ «سفارش مرتبط» در فرم — و فقط سفارش‌های خودِ کاربر.
    listOrders(user.id, { limit: 20 }),
    wanted ? getOrderDetail(user.id, wanted) : Promise.resolve(null),
  ]);

  // سفارشِ خواسته‌شده ممکن است قدیمی‌تر از بیست خریدِ آخر باشد.
  const orders =
    preset && !recent.orders.some((o) => o.id === preset.id)
      ? [preset, ...recent.orders]
      : recent.orders;

  return <SupportView tickets={tickets} orders={{ orders }} initialOrderId={preset?.id ?? ""} />;
}
