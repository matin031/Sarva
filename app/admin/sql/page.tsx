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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const result = await loadAdminData(adminSchemaOverview);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  /* `?q=` فقط ویرایشگر را *پر* می‌کند و هیچ‌چیز را اجرا نمی‌کند — همان دکمهٔ
     همیشگی باید زده شود. این راهی است که «رفتن به همین مورد» برای بخش‌هایی
     مثل «پلِ وزن» که پنلِ ویرایش ندارند، مدیر را روی همان ردیف می‌نشاند. */
  return <SqlConsole schema={result.data} initialSql={q ?? ""} />;
}
