import type { Metadata } from "next";
import { adminListUsers } from "@/lib/admin/user-actions";
import { USER_PAGE_SIZE } from "@/lib/admin/log-constants";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import UserAdminPanel from "@/components/admin/UserAdminPanel";

export const metadata: Metadata = {
  title: "مدیریت کاربران",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const result = await loadAdminData(() => adminListUsers({ limit: USER_PAGE_SIZE }));
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  return <UserAdminPanel initialUsers={result.data.users} initialTotal={result.data.total} />;
}
