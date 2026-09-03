import type { Metadata } from "next";
import NinjaAdminPanel from "@/components/admin/NinjaAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { ninjaAdminOverview } from "@/lib/admin/ninja-actions";

export const metadata: Metadata = {
  title: "مدیریت نینجای دستور زبان",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; focus?: string }>;
}) {
  const sp = await searchParams;
  const result = await loadAdminData(ninjaAdminOverview);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return (
    <NinjaAdminPanel
      initialCategories={result.data}
      initialSelectedId={sp.category ?? null}
      focusId={sp.focus ?? null}
    />
  );
}
