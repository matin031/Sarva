import type { Metadata } from "next";
import { reportAdminCounts, reportAdminList } from "@/lib/admin/report-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import ReportsPanel from "@/components/admin/ReportsPanel";

export const metadata: Metadata = {
  title: "گزارش‌های محتوا",
  robots: { index: false, follow: false },
};

// گزارشِ تازه باید همان لحظه دیده شود؛ یک صفحهٔ کش‌شده اینجا بی‌معنی است.
export const dynamic = "force-dynamic";

async function load() {
  const [initial, counts] = await Promise.all([
    reportAdminList({ status: "open" }),
    reportAdminCounts(),
  ]);
  return { initial, counts };
}

export default async function Page() {
  const result = await loadAdminData(load);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <ReportsPanel initial={result.data.initial} counts={result.data.counts} />;
}
