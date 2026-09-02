import type { Metadata } from "next";
import { announcementAdminList } from "@/lib/admin/announcement-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import AnnouncementsPanel from "@/components/admin/AnnouncementsPanel";

export const metadata: Metadata = {
  title: "اعلان سایت",
  robots: { index: false, follow: false },
};

// وضعیتِ «در حال نمایش» از روی ساعت محاسبه می‌شود؛ یک صفحهٔ کش‌شده دروغ
// می‌گوید.
export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(announcementAdminList);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <AnnouncementsPanel initial={result.data} />;
}
