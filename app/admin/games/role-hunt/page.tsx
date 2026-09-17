import type { Metadata } from "next";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import RoleHuntAdminPanel from "@/components/admin/RoleHuntAdminPanel";
import { roleHuntAdminList, roleHuntAdminTotals } from "@/lib/admin/role-hunt-actions";

export const metadata: Metadata = {
  title: "شکار نقش‌ها",
  robots: { index: false, follow: false },
};

// شمارش‌ها باید همان چیزی باشند که همین الان در دیتابیس است.
export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(async () => {
    const [totals, data] = await Promise.all([roleHuntAdminTotals(), roleHuntAdminList()]);
    return { totals, data };
  });
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <RoleHuntAdminPanel totals={result.data.totals} data={result.data.data} />;
}
