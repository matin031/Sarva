import type { Metadata } from "next";
import PairsAdminPanel from "@/components/admin/PairsAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { pairsAdminCounts, pairsAdminList } from "@/lib/admin/pairs-actions";

export const metadata: Metadata = {
  title: "مدیریت جفت‌های ادبی",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(async () => {
    const [pairs, counts] = await Promise.all([
      pairsAdminList("dahom", "dey"),
      pairsAdminCounts(),
    ]);
    return { pairs, counts };
  });
  if (!result.ok) return <AdminAccessDenied message={result.message} />;

  return (
    <PairsAdminPanel
      initialGrade="dahom"
      initialTerm="dey"
      initialPairs={result.data.pairs}
      initialCounts={result.data.counts}
    />
  );
}
