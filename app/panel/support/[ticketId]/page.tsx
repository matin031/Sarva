import TicketView from "@/components/UI/panel/views/TicketView";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { getTicket } from "@/lib/plus/support";
import { markTicketRead } from "@/lib/plus/support-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تیکت پشتیبانی",
  robots: { index: false, follow: false },
};

/**
 * رشتهٔ گفت‌وگوی یک تیکت.
 *
 * ⚠️ **مالکیت در کوئری است.** `getTicket(userId, ticketId)` شرطِ `user_id`
 * دارد، پس عوض کردنِ شناسه در آدرس به تیکتِ کسِ دیگری نمی‌رسد. بدونِ RLS،
 * همین شرط تنها چیزی است که گفت‌وگوی خصوصیِ یک دانش‌آموز با پشتیبانی را از
 * بقیه جدا می‌کند.
 *
 * ⚠️ **متنِ پیام‌ها به‌صورت متنِ ساده رندر می‌شود.** هیچ‌جای این صفحه
 * `dangerouslySetInnerHTML` نیست — یعنی اگر کسی `<script>` بنویسد، همان
 * رشته نمایش داده می‌شود و اجرا نمی‌شود. (پاک‌سازیِ ورودی در سرور یک لایهٔ
 * اضافه است، نه جایگزینِ این.)
 */
export default async function Page({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/support");

  const { ticketId } = await params;
  const ticket = await getTicket(user.id, ticketId);
  if (!ticket) notFound();

  // باز کردنِ تیکت، نشانِ «پاسخ تازه» را برمی‌دارد. خودش هم مالکیت را دوباره
  // بررسی می‌کند.
  if (ticket.hasUnread) await markTicketRead(ticket.id);

  return <TicketView ticket={ticket} />;
}
