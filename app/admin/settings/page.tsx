import type { Metadata } from "next";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import SettingsPanel from "@/components/admin/SettingsPanel";
import { adminAdapterStatus, adminListSettings } from "@/lib/admin/settings-actions";

export const metadata: Metadata = {
  title: "تنظیمات",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const result = await loadAdminData(async () => {
    const [settings, adapters] = await Promise.all([adminListSettings(), adminAdapterStatus()]);
    return { settings, adapters };
  });

  if (!result.ok) return <AdminAccessDenied message={result.message} />;

  return <SettingsPanel settings={result.data.settings} adapters={result.data.adapters} />;
}
