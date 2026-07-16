import type { Metadata } from "next";
import { adminListUsers } from "@/lib/admin/user-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import AdminNav from "@/components/admin/AdminNav";
import UserAdminPanel from "@/components/admin/UserAdminPanel";

export const metadata: Metadata = {
  title: "مدیریت کاربران",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const result = await loadAdminData(() => adminListUsers());
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  return (
    <>
      <AdminNav />
      <UserAdminPanel initialUsers={result.data} />
    </>
  );
}
