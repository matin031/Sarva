import type { Metadata } from "next";
import { adminSchemaOverview } from "@/lib/admin/sql-console";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import SqlConsole from "@/components/admin/SqlConsole";

export const metadata: Metadata = {
  title: "کنسول SQL",
  robots: { index: false, follow: false },
};

// ساختار جدول‌ها باید همان چیزی باشد که همین الان در دیتابیس است — یک راهنمای
// کش‌شده بعد از اولین migration دروغ می‌گوید.
export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(adminSchemaOverview);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return <SqlConsole schema={result.data} />;
}
