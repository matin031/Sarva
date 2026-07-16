import { AdminToastProvider } from "@/components/admin/AdminToast";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminToastProvider>
      <AdminShell>{children}</AdminShell>
    </AdminToastProvider>
  );
}
