import SupportView from "@/components/UI/panel/views/SupportView";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { listTickets } from "@/lib/plus/support";
import { listOrders } from "@/lib/plus/orders";

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
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/support");

  const [{ tickets }, orders] = await Promise.all([
    listTickets(user.id, { limit: 30 }),
    // فقط برای فهرستِ «سفارش مرتبط» در فرم — و فقط سفارش‌های خودِ کاربر.
    listOrders(user.id, { limit: 20 }),
  ]);

  return <SupportView tickets={tickets} orders={orders} />;
}
