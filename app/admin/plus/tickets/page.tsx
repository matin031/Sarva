import type { Metadata } from "next";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import PlusTicketsPanel from "@/components/admin/PlusTicketsPanel";
import { adminListTickets } from "@/lib/plus/admin-actions";

export const metadata: Metadata = {
  title: "تیکت‌های پشتیبانی",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(() => adminListTickets({ limit: 25 }));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <PlusTicketsPanel initial={result.data} />;
}
