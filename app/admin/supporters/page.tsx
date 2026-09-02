import type { Metadata } from "next";
import { supporterAdminList } from "@/lib/admin/supporter-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import SupportersPanel from "@/components/admin/SupportersPanel";

export const metadata: Metadata = {
  title: "حامیان",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(supporterAdminList);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <SupportersPanel initial={result.data} />;
}
