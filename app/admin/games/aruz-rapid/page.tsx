import type { Metadata } from "next";
import AruzRapidAdminPanel from "@/components/admin/AruzRapidAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { aruzRapidAdminList } from "@/lib/admin/aruz-rapid-actions";

export const metadata: Metadata = {
  title: "مدیریت کوتاه یا بلند؟",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(aruzRapidAdminList);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <AruzRapidAdminPanel initialQuestions={result.data} />;
}
