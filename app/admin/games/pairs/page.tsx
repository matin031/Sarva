import type { Metadata } from "next";
import PairsAdminPanel from "@/components/admin/PairsAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { pairsAdminCounts, pairsAdminList } from "@/lib/admin/pairs-actions";
import { isMemoryGrade, isMemoryTerm } from "@/lib/literary-pairs";

export const metadata: Metadata = {
  title: "مدیریت جفت‌های ادبی",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; term?: string; focus?: string }>;
}) {
  const sp = await searchParams;
  // نشانیِ آمده از گزارش، و اگر بی‌معنی بود همان دستهٔ پیش‌فرض.
  const grade = sp.grade && isMemoryGrade(sp.grade) ? sp.grade : "dahom";
  const term = sp.term && isMemoryTerm(sp.term) ? sp.term : "dey";

  const result = await loadAdminData(async () => {
    const [pairs, counts] = await Promise.all([
      pairsAdminList(grade, term),
      pairsAdminCounts(),
    ]);
    return { pairs, counts };
  });
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return (
    <PairsAdminPanel
      initialGrade={grade}
      initialTerm={term}
      initialPairs={result.data.pairs}
      initialCounts={result.data.counts}
      focusId={sp.focus ?? null}
    />
  );
}
