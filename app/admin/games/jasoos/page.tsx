import type { Metadata } from "next";
import JasoosAdminPanel from "@/components/admin/JasoosAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { jasoosAdminList } from "@/lib/admin/jasoos-actions";

export const metadata: Metadata = {
  title: "مدیریت جاسوسِ نقش‌ها",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(jasoosAdminList);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return <JasoosAdminPanel initialLevels={result.data} />;
}
