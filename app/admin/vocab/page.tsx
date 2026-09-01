import type { Metadata } from "next";
import VocabAdminPanel from "@/components/admin/VocabAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { vocabAdminList } from "@/lib/admin/vocab-actions";

export const metadata: Metadata = {
  title: "مدیریت واژه‌یاب",
  robots: { index: false, follow: false },
};

export default async function Page() {
  // open on the seeded lesson (فارسی دهم — درس دوم) by default
  const result = await loadAdminData(() => vocabAdminList("dahom", 2));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return <VocabAdminPanel initialGrade="dahom" initialLesson={2} initialWords={result.data} />;
}
