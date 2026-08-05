import type { Metadata } from "next";
import ClubAdminPanel from "@/components/admin/ClubAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import {
  clubAdminListComments,
  clubAdminListPosts,
  clubAdminListReports,
  clubAdminStats,
} from "@/lib/club/admin-actions";

export const metadata: Metadata = {
  title: "مدیریت سروا کلاب",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(async () => {
    const [stats, posts, comments, reports] = await Promise.all([
      clubAdminStats(),
      clubAdminListPosts("pending"),
      clubAdminListComments("pending"),
      clubAdminListReports("open"),
    ]);
    return { stats, posts, comments, reports };
  });
  if (!result.ok) return <AdminAccessDenied message={result.message} />;

  return (
    <ClubAdminPanel
      stats={result.data.stats}
      initialPosts={result.data.posts}
      initialComments={result.data.comments}
      initialReports={result.data.reports}
    />
  );
}
