import SubscriptionView from "@/components/UI/panel/views/SubscriptionView";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { expiringSoonDays, isPlusEnabled } from "@/lib/plus/config";
import { listOrders } from "@/lib/plus/orders";
import { hasSellableOffers } from "@/lib/plus/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سروا پلاس من",
  robots: { index: false, follow: false },
};

/**
 * «سروا پلاس من».
 *
 * ⚠️ این صفحه برای **همهٔ** کاربرانِ واردشده باز است — نه فقط مشترکان. کاربر
 * رایگان اینجا معرفیِ کوتاه و دکمهٔ فعال‌سازی می‌بیند، و کاربری که اشتراکش
 * تمام شده تاریخِ پایان و دکمهٔ تمدید. قفل کردنِ همین صفحه یعنی کسی که
 * پرداخت کرده ولی فعال نشده، هیچ‌جا برای دیدنِ وضعیتش ندارد.
 *
 * ⚠️ و حالتِ «نامعلوم» صریحاً از «اشتراک نداری» جدا است. اگر خواندنِ وضعیت
 * شکست بخورد، به کاربر گفته می‌شود «مشکلی در بررسی پیش آمد» و دکمهٔ تلاش
 * دوباره داده می‌شود — نه دکمهٔ خرید. آن پیام به کسی که دیروز پول داده
 * می‌گوید پولش را دور ریخته.
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/subscription");

  const [status, sellable, soonDays, recent] = await Promise.all([
    getPlusStatus(),
    hasSellableOffers(),
    expiringSoonDays(),
    listOrders(user.id, { limit: 3 }),
  ]);

  const plusOn = await isPlusEnabled();

  return <SubscriptionView status={status} sellable={sellable} soonDays={soonDays} recent={recent} plusOn={plusOn} />;
}
