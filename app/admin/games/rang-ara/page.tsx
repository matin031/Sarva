import type { Metadata } from "next";
import RangAraAdminPanel from "@/components/admin/RangAraAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { rangAraAdminList } from "@/lib/admin/rang-ara-actions";

export const metadata: Metadata = {
  title: "مدیریت رنگ‌آرا",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams;
  const result = await loadAdminData(rangAraAdminList);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return <RangAraAdminPanel initialVerses={result.data} focusId={focus ?? null} />;
}
